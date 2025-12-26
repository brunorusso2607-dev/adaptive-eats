import { useState, useEffect, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Flame, Check, Loader2, Sparkles, PenLine, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFoodsSearch, type Food } from "@/hooks/useFoodsSearch";
import { useMealConsumption, type ConsumedItem } from "@/hooks/useMealConsumption";
import { useIngredientConflictCheck } from "@/hooks/useIngredientConflictCheck";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";
import { checkUserIntoleranceConflict, getIntoleranceLabel } from "@/lib/intoleranceDetection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_da_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia",
};

const UNIT_LABELS: Record<string, string> = {
  g: "g",
  ml: "ml",
  un: "un",
  fatia: "fatia(s)",
};

interface FoodSearchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mealPlanItemId: string;
  mealType?: string;
  onSuccess: () => void;
}

interface SelectedFood extends Food {
  quantity: number; // Em gramas/ml para cálculo
  displayQuantity: number; // Quantidade exibida (unidades, fatias, etc.)
}

interface AISuggestion {
  name: string;
  portion_description: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: "alta" | "média" | "baixa";
}

export default function FoodSearchDrawer({
  open,
  onOpenChange,
  mealPlanItemId,
  mealType,
  onSuccess,
}: FoodSearchDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [userProfile, setUserProfile] = useState<{ intolerances: string[] | null; dietary_preference: string | null } | null>(null);
  const [conflictDialog, setConflictDialog] = useState<{ open: boolean; food: Food | null; conflict: { ingredient: string; restriction: string; restrictionLabel: string } | null }>({
    open: false,
    food: null,
    conflict: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  // AI intolerance analysis state
  const [isAnalyzingIntolerance, setIsAnalyzingIntolerance] = useState(false);
  const [aiIntoleranceDialog, setAiIntoleranceDialog] = useState<{
    open: boolean;
    food: Food | null;
    conflicts: Array<{ intolerance: string; intoleranceLabel: string; foundIngredients: string[] }>;
    ingredients: string[];
  }>({
    open: false,
    food: null,
    conflicts: [],
    ingredients: [],
  });
  
  // Manual food modal state
  const [showManualModal, setShowManualModal] = useState(false);

  const { foods, isLoading, searchFoods, clearFoods } = useFoodsSearch();
  const { saveConsumption } = useMealConsumption();
  const { checkConflict } = useIngredientConflictCheck(userProfile);

  // Fetch user profile for conflict checking
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("intolerances, dietary_preference")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
      }
    };

    if (open) {
      fetchProfile();
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchFoods(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchFoods]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedFoods([]);
      clearFoods();
      setAiSuggestions([]);
      setShowAISuggestions(false);
    }
  }, [open, clearFoods]);

  // Fetch AI suggestions when no results found
  const fetchAISuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) return;
    
    setIsLoadingAI(true);
    setShowAISuggestions(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('suggest-food-ai', {
        body: { query }
      });

      if (error) throw error;

      if (data?.suggestions && data.suggestions.length > 0) {
        setAiSuggestions(data.suggestions);
      } else {
        setAiSuggestions([]);
      }
    } catch (error) {
      console.error("Error fetching AI suggestions:", error);
      setAiSuggestions([]);
    } finally {
      setIsLoadingAI(false);
    }
  }, []);

  // Show AI suggestions when database has no results
  useEffect(() => {
    if (!isLoading && foods.length === 0 && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        fetchAISuggestions(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    } else if (foods.length > 0 || searchQuery.length < 2) {
      setShowAISuggestions(false);
      setAiSuggestions([]);
    }
  }, [foods, isLoading, searchQuery, fetchAISuggestions]);

  // AI-powered intolerance analysis
  const analyzeWithAI = useCallback(async (foodName: string): Promise<{
    hasConflicts: boolean;
    conflicts: Array<{ intolerance: string; intoleranceLabel: string; foundIngredients: string[] }>;
    ingredients: string[];
  } | null> => {
    if (!userProfile?.intolerances || userProfile.intolerances.length === 0 || 
        userProfile.intolerances.every(i => i === "nenhuma")) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-intolerances', {
        body: { 
          foodName, 
          userIntolerances: userProfile.intolerances.filter(i => i !== "nenhuma") 
        }
      });

      if (error) {
        console.error("Erro na análise de IA:", error);
        return null;
      }

      return {
        hasConflicts: data.hasConflicts,
        conflicts: data.conflicts || [],
        ingredients: data.ingredients || [],
      };
    } catch (err) {
      console.error("Erro ao chamar análise de IA:", err);
      return null;
    }
  }, [userProfile]);

  // Check for intolerance conflicts - first local, then AI if needed
  const checkFoodConflicts = useCallback((foodName: string) => {
    // First check with hook (ingredient-based)
    const ingredientConflict = checkConflict(foodName);
    if (ingredientConflict) {
      return ingredientConflict;
    }
    
    // Then check with detection function (name-based for processed foods)
    if (userProfile?.intolerances) {
      const { hasConflict, conflicts } = checkUserIntoleranceConflict(
        foodName,
        userProfile.intolerances
      );
      if (hasConflict && conflicts.length > 0) {
        return {
          ingredient: foodName,
          restriction: conflicts[0],
          restrictionLabel: `intolerante a ${getIntoleranceLabel(conflicts[0])}`,
        };
      }
    }
    
    return null;
  }, [checkConflict, userProfile]);

  // Handle adding food with AI analysis for unknown foods
  const handleAddFood = useCallback(async (food: Food) => {
    // First, quick local check
    const localConflict = checkFoodConflicts(food.name);
    
    if (localConflict) {
      setConflictDialog({ open: true, food, conflict: localConflict });
      return;
    }

    // For foods not in local mapping, use AI analysis
    if (userProfile?.intolerances && 
        userProfile.intolerances.some(i => i !== "nenhuma")) {
      setIsAnalyzingIntolerance(true);
      
      const aiResult = await analyzeWithAI(food.name);
      
      setIsAnalyzingIntolerance(false);
      
      if (aiResult?.hasConflicts && aiResult.conflicts.length > 0) {
        setAiIntoleranceDialog({
          open: true,
          food,
          conflicts: aiResult.conflicts,
          ingredients: aiResult.ingredients,
        });
        return;
      }
    }

    addFoodToList(food);
  }, [checkFoodConflicts, userProfile, analyzeWithAI]);

  const addFoodToList = (food: Food) => {
    const defaultServing = food.default_serving_size || 100;
    const displayQty = food.serving_unit === 'g' || food.serving_unit === 'ml' ? defaultServing : 1;
    const actualGrams = food.serving_unit === 'g' || food.serving_unit === 'ml' ? defaultServing : defaultServing;

    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.id === food.id);
      if (existing) {
        const newDisplayQty = existing.displayQuantity + displayQty;
        const newQuantity = food.serving_unit === 'g' || food.serving_unit === 'ml' 
          ? newDisplayQty 
          : newDisplayQty * (food.default_serving_size || 100);
        return prev.map((f) =>
          f.id === food.id ? { ...f, displayQuantity: newDisplayQty, quantity: newQuantity } : f
        );
      }
      return [...prev, { ...food, displayQuantity: displayQty, quantity: actualGrams }];
    });
    setSearchQuery("");
    clearFoods();
    setAiSuggestions([]);
    setShowAISuggestions(false);
  };

  // State for AI suggestion conflict
  const [aiConflictDialog, setAiConflictDialog] = useState<{ 
    open: boolean; 
    suggestion: AISuggestion | null; 
    conflict: { ingredient: string; restriction: string; restrictionLabel: string } | null 
  }>({
    open: false,
    suggestion: null,
    conflict: null,
  });

  // Add AI suggestion as food (first save to database, then add to list)
  const handleAddAISuggestion = async (suggestion: AISuggestion, skipConflictCheck = false) => {
    // Check for intolerance conflicts first (unless skipping)
    if (!skipConflictCheck) {
      const conflict = checkFoodConflicts(suggestion.name);
      if (conflict) {
        setAiConflictDialog({ open: true, suggestion, conflict });
        return;
      }
    }

    try {
      const normalizedName = suggestion.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // Check if already exists
      const { data: existing } = await supabase
        .from("foods")
        .select("*")
        .eq("name_normalized", normalizedName)
        .maybeSingle();

      let food: Food;

      if (existing) {
        food = {
          ...existing,
          serving_unit: existing.serving_unit || 'g',
          default_serving_size: existing.default_serving_size || 100,
        } as Food;
      } else {
        // Calculate per 100g if portion is different
        const multiplier = 100 / suggestion.portion_grams;
        
        // Use auto-suggestion for serving unit based on food name
        const servingSuggestion = suggestServingByName(suggestion.name);
        const suggestedUnit = servingSuggestion.servingUnit;
        const suggestedSize = servingSuggestion.defaultServingSize;
        
        // Use AI portion if it's more specific, otherwise use category-based suggestion
        const finalServingSize = suggestion.portion_grams || suggestedSize;
        const finalServingUnit = suggestion.portion_grams && suggestion.portion_grams !== 100 ? 'un' : suggestedUnit;
        
        const { data: newFood, error } = await supabase
          .from("foods")
          .insert({
            name: suggestion.name,
            name_normalized: normalizedName,
            calories_per_100g: Math.round(suggestion.calories * multiplier),
            protein_per_100g: Math.round(suggestion.protein * multiplier * 10) / 10,
            carbs_per_100g: Math.round(suggestion.carbs * multiplier * 10) / 10,
            fat_per_100g: Math.round(suggestion.fat * multiplier * 10) / 10,
            source: "ai_suggestion",
            verified: false,
            confidence: suggestion.confidence === "alta" ? 0.9 : suggestion.confidence === "média" ? 0.7 : 0.5,
            serving_unit: finalServingUnit,
            default_serving_size: finalServingSize,
          })
          .select()
          .single();

        if (error) throw error;
        food = {
          ...newFood,
          serving_unit: newFood.serving_unit || 'un',
          default_serving_size: newFood.default_serving_size || suggestion.portion_grams,
        } as Food;
        toast.success(`${suggestion.name} adicionado ao banco de dados!`);
      }

      // Add to selected list with portion size
      setSelectedFoods((prev) => {
        const existing = prev.find((f) => f.id === food.id);
        if (existing) {
          return prev.map((f) =>
            f.id === food.id ? { 
              ...f, 
              displayQuantity: f.displayQuantity + 1, 
              quantity: f.quantity + (food.default_serving_size || 100) 
            } : f
          );
        }
        return [...prev, { 
          ...food, 
          displayQuantity: 1, 
          quantity: food.default_serving_size || 100 
        }];
      });
      
      setSearchQuery("");
      clearFoods();
      setAiSuggestions([]);
      setShowAISuggestions(false);
    } catch (error) {
      console.error("Error adding AI suggestion:", error);
      toast.error("Erro ao adicionar alimento");
    }
  };

  const handleManualFoodCreated = (food: { id: string; name: string; calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }) => {
    const fullFood: Food = {
      ...food,
      name_normalized: food.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      fiber_per_100g: null,
      sodium_per_100g: null,
      category: null,
      serving_unit: 'g',
      default_serving_size: 100,
    };
    addFoodToList(fullFood);
  };

  const handleConfirmConflict = () => {
    if (conflictDialog.food) {
      addFoodToList(conflictDialog.food);
    }
    setConflictDialog({ open: false, food: null, conflict: null });
  };

  const handleConfirmAIConflict = () => {
    if (aiConflictDialog.suggestion) {
      handleAddAISuggestion(aiConflictDialog.suggestion, true);
    }
    setAiConflictDialog({ open: false, suggestion: null, conflict: null });
  };

  const handleConfirmAIIntoleranceConflict = () => {
    if (aiIntoleranceDialog.food) {
      addFoodToList(aiIntoleranceDialog.food);
    }
    setAiIntoleranceDialog({ open: false, food: null, conflicts: [], ingredients: [] });
  };

  const updateDisplayQuantity = (foodId: string, newValue: string) => {
    const numValue = parseFloat(newValue) || 0;
    setSelectedFoods((prev) =>
      prev.map((f) => {
        if (f.id === foodId) {
          const actualGrams = f.serving_unit === 'g' || f.serving_unit === 'ml' 
            ? numValue 
            : numValue * (f.default_serving_size || 100);
          return { ...f, displayQuantity: numValue, quantity: actualGrams };
        }
        return f;
      }).filter((f) => f.displayQuantity > 0)
    );
  };

  const removeFood = (foodId: string) => {
    setSelectedFoods((prev) => prev.filter((f) => f.id !== foodId));
  };

  const calculateMacros = (food: SelectedFood) => {
    const multiplier = food.quantity / 100;
    return {
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
    };
  };

  const totals = selectedFoods.reduce(
    (acc, food) => {
      const macros = calculateMacros(food);
      return {
        calories: acc.calories + macros.calories,
        protein: acc.protein + macros.protein,
        carbs: acc.carbs + macros.carbs,
        fat: acc.fat + macros.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleSave = async () => {
    if (selectedFoods.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }

    setIsSaving(true);

    const items: ConsumedItem[] = selectedFoods.map((food) => {
      const macros = calculateMacros(food);
      return {
        food_id: food.id,
        food_name: food.name,
        quantity_grams: food.quantity,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      };
    });

    const result = await saveConsumption({
      mealPlanItemId,
      followedPlan: false,
      items,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalCarbs: totals.carbs,
      totalFat: totals.fat,
    });

    setIsSaving(false);

    if (result.success) {
      toast.success("Consumo registrado com sucesso! 🎉");
      onOpenChange(false);
      onSuccess();
    } else {
      toast.error("Erro ao registrar consumo");
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const colors = {
      alta: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      média: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      baixa: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[confidence as keyof typeof colors] || colors.baixa;
  };

  const getUnitLabel = (unit: string, quantity: number) => {
    if (unit === 'fatia') {
      return quantity === 1 ? 'fatia' : 'fatias';
    }
    if (unit === 'un') {
      return quantity === 1 ? 'un' : 'un';
    }
    return unit;
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[95vh] max-h-[95vh] flex flex-col">
          <DrawerHeader className="pb-1 pt-2 flex-shrink-0">
            <DrawerTitle className="text-base">
              {mealType ? `${MEAL_TYPE_LABELS[mealType] || mealType} - O que você comeu?` : "Registrar o que você comeu"}
            </DrawerTitle>
          </DrawerHeader>

          {/* Search input with dropdown results */}
          <div className="px-4 pb-3 flex-shrink-0 relative z-20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* Search results dropdown - positioned absolutely */}
            {(isLoading || foods.length > 0 || showAISuggestions) && (
              <div 
                className="absolute left-4 right-4 top-full mt-1 bg-background rounded-lg border shadow-lg z-50 max-h-80 overflow-y-auto"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                }}
                onTouchStart={(e) => {
                  const el = e.currentTarget;
                  (el as any)._startY = e.touches[0].clientY;
                }}
                onTouchMove={(e) => {
                  const el = e.currentTarget;
                  const startY = (el as any)._startY || 0;
                  const currentY = e.touches[0].clientY;
                  const deltaY = startY - currentY;
                  const isScrollingDown = deltaY > 0;
                  const isScrollingUp = deltaY < 0;
                  const isAtTop = el.scrollTop <= 0;
                  const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
                  if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
                    e.preventDefault();
                  }
                  e.stopPropagation();
                }}
              >
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                    Buscando...
                  </div>
                ) : foods.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {foods.map((food) => (
                      <button
                        key={food.id}
                        onClick={() => handleAddFood(food)}
                        disabled={isAnalyzingIntolerance}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-md transition-colors text-left disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2">
                          {isAnalyzingIntolerance ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 text-primary" />
                          )}
                          <span className="text-sm font-medium">{food.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {isAnalyzingIntolerance ? "analisando..." : "adicionar"}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : showAISuggestions && (
                  <div className="p-2 space-y-2">
                    {/* AI Header */}
                    <div className="flex items-center gap-2 px-2 py-1 border-b">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Sugestões da IA
                      </span>
                    </div>

                    {isLoadingAI ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                        Identificando alimento...
                      </div>
                    ) : aiSuggestions.length > 0 ? (
                      <>
                        {aiSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAddAISuggestion(suggestion)}
                            className="w-full p-3 hover:bg-muted rounded-md transition-colors text-left space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{suggestion.name}</span>
                              </div>
                              <span className={cn("text-xs px-2 py-0.5 rounded-full", getConfidenceBadge(suggestion.confidence))}>
                                {suggestion.confidence}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
                              <span>{suggestion.portion_description}</span>
                              <span className="flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {suggestion.calories}kcal
                              </span>
                              <span>P: {suggestion.protein}g</span>
                              <span>C: {suggestion.carbs}g</span>
                              <span>G: {suggestion.fat}g</span>
                            </div>
                          </button>
                        ))}
                      </>
                    ) : (
                      <div className="p-3 text-center text-muted-foreground text-sm">
                        Nenhuma sugestão encontrada
                      </div>
                    )}

                    {/* Manual entry option */}
                    <div className="border-t pt-2">
                      <button
                        onClick={() => setShowManualModal(true)}
                        className="w-full flex items-center gap-2 p-3 hover:bg-muted rounded-md transition-colors text-left"
                      >
                        <PenLine className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Cadastrar "{searchQuery}" manualmente
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scrollable content area */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-4 pb-4">

              {/* Selected foods */}
              {selectedFoods.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Alimentos selecionados
                  </h4>
                  <div className="space-y-2">
                    {selectedFoods.map((food) => {
                      const macros = calculateMacros(food);
                      const unitLabel = getUnitLabel(food.serving_unit, food.displayQuantity);
                      return (
                        <div
                          key={food.id}
                          className="bg-card border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{food.name}</span>
                            <button
                              onClick={() => removeFood(food.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Quantity input - editable field */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={food.displayQuantity}
                                onChange={(e) => updateDisplayQuantity(food.id, e.target.value)}
                                className="w-20 h-8 text-center text-sm"
                                min="0"
                                step={food.serving_unit === 'g' || food.serving_unit === 'ml' ? "10" : "1"}
                              />
                              <span className="text-sm text-muted-foreground">
                                {unitLabel}
                              </span>
                              {(food.serving_unit === 'un' || food.serving_unit === 'fatia') && (
                                <span className="text-xs text-muted-foreground">
                                  ({Math.round(food.quantity)}g)
                                </span>
                              )}
                            </div>

                            {/* Macros display */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {macros.calories}
                              </span>
                              <span>P: {macros.protein}g</span>
                              <span>C: {macros.carbs}g</span>
                              <span>G: {macros.fat}g</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add more foods button */}
              {selectedFoods.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() => {
                    const input = document.querySelector<HTMLInputElement>('input[placeholder="Buscar alimento..."]');
                    input?.focus();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar alimento
                </Button>
              )}

              {/* Totals */}
              {selectedFoods.length > 0 && (
                <div className="bg-primary/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Total</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-primary">{totals.calories}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-500">{totals.protein.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Proteína</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-amber-500">{totals.carbs.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Carbos</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">{totals.fat.toFixed(1)}</p>
                      <p className="text-xs text-muted-foreground">Gordura</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Save button - fixed at bottom */}
          <div className="px-4 py-4 border-t flex-shrink-0 bg-background">
            <Button
              className="w-full gradient-primary"
              onClick={handleSave}
              disabled={selectedFoods.length === 0 || isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Salvar consumo
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Conflict Dialog - Design sutil */}
      <AlertDialog
        open={conflictDialog.open}
        onOpenChange={(open) =>
          !open && setConflictDialog({ open: false, food: null, conflict: null })
        }
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-medium">
              {conflictDialog.food?.name}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                  Contém {conflictDialog.conflict?.restrictionLabel?.toLowerCase()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Você indicou ter restrição a este tipo de alimento. Deseja adicionar mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConflict}>
              Adicionar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Suggestion Conflict Dialog */}
      <AlertDialog
        open={aiConflictDialog.open}
        onOpenChange={(open) =>
          !open && setAiConflictDialog({ open: false, suggestion: null, conflict: null })
        }
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {aiConflictDialog.suggestion?.name}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
                  ⚠️ Este alimento pode conter {aiConflictDialog.conflict?.restriction && getIntoleranceLabel(aiConflictDialog.conflict.restriction)}
                </p>
                <p className="text-sm text-muted-foreground">
                  De acordo com seu perfil, você é {aiConflictDialog.conflict?.restrictionLabel}. Deseja adicionar mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAIConflict}>
              Adicionar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Intolerance Analysis Dialog - Detailed */}
      <AlertDialog
        open={aiIntoleranceDialog.open}
        onOpenChange={(open) =>
          !open && setAiIntoleranceDialog({ open: false, food: null, conflicts: [], ingredients: [] })
        }
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Análise de Intolerâncias
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <p className="text-sm font-medium">
                  {aiIntoleranceDialog.food?.name}
                </p>
                
                {aiIntoleranceDialog.ingredients.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Ingredientes detectados:</span>
                    <p className="mt-1">{aiIntoleranceDialog.ingredients.slice(0, 8).join(", ")}{aiIntoleranceDialog.ingredients.length > 8 ? "..." : ""}</p>
                  </div>
                )}

                <div className="space-y-2">
                  {aiIntoleranceDialog.conflicts.map((conflict, idx) => (
                    <div 
                      key={idx}
                      className="text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 rounded-md"
                    >
                      <p className="font-medium text-red-700 dark:text-red-400">
                        ⚠️ Contém {conflict.intoleranceLabel}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Encontrado: {conflict.foundIngredients.join(", ")}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  De acordo com seu perfil, você tem restrição a estes ingredientes. Deseja adicionar mesmo assim?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAIIntoleranceConflict}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Adicionar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manual Food Modal */}
      <ManualFoodModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        initialName={searchQuery}
        onFoodCreated={handleManualFoodCreated}
      />
    </>
  );
}
