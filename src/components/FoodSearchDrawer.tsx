import { useState, useEffect, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Flame, Check, Loader2, Sparkles, PenLine, AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFoodsSearch, type Food } from "@/hooks/useFoodsSearch";
import { useMealConsumption, type ConsumedItem } from "@/hooks/useMealConsumption";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";

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
  // Track foods with conflicts for display
  const [foodsWithConflicts, setFoodsWithConflicts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  // AI intolerance analysis state
  const [isAnalyzingIntolerance, setIsAnalyzingIntolerance] = useState(false);
  
  // Manual food modal state
  const [showManualModal, setShowManualModal] = useState(false);
  
  // Removing animation state
  const [removingFoodIds, setRemovingFoodIds] = useState<Set<string>>(new Set());

  const { foods, isLoading, searchFoods, clearFoods } = useFoodsSearch();
  const { saveConsumption } = useMealConsumption();
  const { checkFood, hasIntolerances, intolerances } = useIntoleranceWarning();

  // Helper to convert new hook format to legacy format for dialogs
  const checkFoodConflicts = useCallback((foodName: string) => {
    const result = checkFood(foodName);
    if (result.hasConflict) {
      return {
        ingredient: foodName,
        restriction: result.conflicts[0],
        restrictionLabel: `intolerante a ${result.badgeLabel}`,
      };
    }
    return null;
  }, [checkFood]);

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
      setFoodsWithConflicts([]);
      setRemovingFoodIds(new Set()); // Reset animation state
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
    if (!hasIntolerances || intolerances.length === 0) {
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-intolerances', {
        body: { 
          foodName, 
          userIntolerances: intolerances
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
  }, [hasIntolerances, intolerances]);

  // Handle adding food - always add, just show warning if conflict
  const handleAddFood = useCallback(async (food: Food) => {
    // First, quick local check
    const localConflict = checkFoodConflicts(food.name);
    
    if (localConflict) {
      // Add food and show informative toast
      addFoodToList(food);
      setFoodsWithConflicts(prev => [...new Set([...prev, food.name])]);
      toast.warning(
        `${food.name} contém ${localConflict.restrictionLabel.replace('intolerante a ', '')}`,
        { duration: 4000 }
      );
      return;
    }

    // For foods not in local mapping, use AI analysis
    if (hasIntolerances) {
      setIsAnalyzingIntolerance(true);
      
      const aiResult = await analyzeWithAI(food.name);
      
      setIsAnalyzingIntolerance(false);
      
      if (aiResult?.hasConflicts && aiResult.conflicts.length > 0) {
        // Add food and show informative toast with details
        addFoodToList(food);
        setFoodsWithConflicts(prev => [...new Set([...prev, food.name])]);
        const conflictLabels = aiResult.conflicts.map(c => c.intoleranceLabel).join(', ');
        toast.warning(
          `${food.name} contém ${conflictLabels}`,
          { duration: 4000 }
        );
        return;
      }
    }

    addFoodToList(food);
  }, [checkFoodConflicts, hasIntolerances, analyzeWithAI]);

  const addFoodToList = (food: Food) => {
    const defaultServing = food.default_serving_size || 100;
    const displayQty = food.serving_unit === 'g' || food.serving_unit === 'ml' ? defaultServing : 1;
    const actualGrams = food.serving_unit === 'g' || food.serving_unit === 'ml' ? defaultServing : defaultServing;

    // Ensure food is not in removing state (in case it was being removed)
    setRemovingFoodIds((prev) => {
      if (prev.has(food.id)) {
        const next = new Set(prev);
        next.delete(food.id);
        return next;
      }
      return prev;
    });

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

  // Add AI suggestion as food (first save to database, then add to list)
  const handleAddAISuggestion = async (suggestion: AISuggestion) => {
    // Check for intolerance conflicts - add anyway but show warning
    const conflict = checkFoodConflicts(suggestion.name);
    const hasLocalConflict = !!conflict;

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

      // Show warning toast if there was a conflict
      if (hasLocalConflict && conflict) {
        setFoodsWithConflicts(prev => [...new Set([...prev, suggestion.name])]);
        toast.warning(
          `${suggestion.name} contém ${conflict.restrictionLabel.replace('intolerante a ', '')}`,
          { duration: 4000 }
        );
      }
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


  const updateDisplayQuantity = (foodId: string, newValue: string) => {
    console.log('[DEBUG] updateDisplayQuantity called:', { foodId, newValue });
    console.log('[DEBUG] Current selectedFoods:', selectedFoods.map(f => ({ id: f.id, name: f.name, qty: f.displayQuantity })));
    console.log('[DEBUG] Current removingFoodIds:', [...removingFoodIds]);
    
    // Allow empty string during typing - don't remove items until save
    const numValue = newValue === '' ? 0 : parseFloat(newValue) || 0;
    setSelectedFoods((prev) => {
      console.log('[DEBUG] setSelectedFoods prev:', prev.map(f => ({ id: f.id, name: f.name, qty: f.displayQuantity })));
      const result = prev.map((f) => {
        if (f.id === foodId) {
          const actualGrams = f.serving_unit === 'g' || f.serving_unit === 'ml' 
            ? numValue 
            : numValue * (f.default_serving_size || 100);
          return { ...f, displayQuantity: numValue, quantity: actualGrams };
        }
        return f;
      });
      console.log('[DEBUG] setSelectedFoods result:', result.map(f => ({ id: f.id, name: f.name, qty: f.displayQuantity })));
      return result;
    });
  };

  const removeFood = (foodId: string, foodName: string) => {
    // Find and store the food before removing
    const foodToRemove = selectedFoods.find((f) => f.id === foodId);
    if (!foodToRemove) return;

    // Start fade-out animation
    setRemovingFoodIds((prev) => new Set(prev).add(foodId));

    // Wait for animation to complete, then remove
    setTimeout(() => {
      setSelectedFoods((prev) => prev.filter((f) => f.id !== foodId));
      setRemovingFoodIds((prev) => {
        const next = new Set(prev);
        next.delete(foodId);
        return next;
      });
    }, 300);

    // Show toast with undo option
    toast(`"${foodName}" removido`, {
      action: {
        label: "Desfazer",
        onClick: () => {
          // Remove from removing set if still animating
          setRemovingFoodIds((prev) => {
            const next = new Set(prev);
            next.delete(foodId);
            return next;
          });
          // Restore food if not already in list
          setSelectedFoods((prev) => {
            if (prev.find((f) => f.id === foodId)) return prev;
            return [...prev, foodToRemove];
          });
          toast.success(`"${foodName}" restaurado`);
        },
      },
      duration: 5000,
    });
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
                    {foods.map((food) => {
                      const conflict = checkFoodConflicts(food.name);
                      return (
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
                            {conflict && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {conflict && (
                              <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                {conflict.restrictionLabel.replace('intolerante a ', '')}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {food.calories_per_100g} kcal/100g
                            </span>
                          </div>
                        </button>
                      );
                    })}
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
                        {aiSuggestions.map((suggestion, idx) => {
                          const conflict = checkFoodConflicts(suggestion.name);
                          return (
                            <button
                              key={idx}
                              onClick={() => handleAddAISuggestion(suggestion)}
                              className="w-full p-3 hover:bg-muted rounded-md transition-colors text-left space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium">{suggestion.name}</span>
                                  {conflict && (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {conflict && (
                                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                      {conflict.restrictionLabel.replace('intolerante a ', '')}
                                    </span>
                                  )}
                                  <span className={cn("text-xs px-2 py-0.5 rounded-full", getConfidenceBadge(suggestion.confidence))}>
                                    {suggestion.confidence}
                                  </span>
                                </div>
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
                          );
                        })}
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
                      const conflict = checkFoodConflicts(food.name);
                      return (
                        <div
                          key={food.id}
                          className={cn(
                            "bg-card border rounded-lg p-3 space-y-2 transition-all duration-300",
                            conflict && "border-amber-200 bg-amber-50/30",
                            removingFoodIds.has(food.id) && "opacity-0 scale-95 -translate-x-4"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{food.name}</span>
                              {conflict && (
                                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle className="w-3 h-3" />
                                  {conflict.restrictionLabel.replace('intolerante a ', '')}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeFood(food.id, food.name)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                              title="Remover alimento"
                            >
                              <Trash2 className="w-4 h-4" />
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
