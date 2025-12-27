import { useState, useEffect, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Flame, Check, Loader2, Sparkles, PenLine, Clock, UtensilsCrossed, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFoodsSearch, type Food } from "@/hooks/useFoodsSearch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { getMealLabelsSync, getMealOrderSync } from "@/lib/mealTimeConfig";

interface FreeFormMealLoggerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SelectedFood extends Food {
  quantity: number;
  displayQuantity: number;
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

export default function FreeFormMealLogger({
  open,
  onOpenChange,
  onSuccess,
}: FreeFormMealLoggerProps) {
  // Ref for search input focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Step management: 'foods' -> 'meal-type' -> 'time'
  const [step, setStep] = useState<'foods' | 'meal-type' | 'time'>('foods');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [customMealName, setCustomMealName] = useState("");
  
  const [userProfile, setUserProfile] = useState<{ intolerances: string[] | null; dietary_preference: string | null } | null>(null);
  // Track foods with conflicts for informative display
  const [foodsWithConflicts, setFoodsWithConflicts] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  // Manual food modal state
  const [showManualModal, setShowManualModal] = useState(false);

  const { foods, isLoading, searchFoods, clearFoods } = useFoodsSearch();
  const { checkFood, checkConflict } = useIntoleranceWarning();
  
  // Get meal labels and order
  const mealLabels = getMealLabelsSync();
  const mealOrder = getMealOrderSync();

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
      setFoodsWithConflicts([]);
      setSelectedMealType(null);
      setStep('foods');
      setCustomMealName("");
      clearFoods();
      setAiSuggestions([]);
      setShowAISuggestions(false);
      // Reset time to now
      const now = new Date();
      setSelectedTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
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

  // Check for intolerance conflicts
  const checkFoodConflicts = useCallback((foodName: string) => {
    const ingredientConflict = checkConflict(foodName);
    if (ingredientConflict) {
      return ingredientConflict;
    }
    
    const intoleranceResult = checkFood(foodName);
    if (intoleranceResult.hasConflict && intoleranceResult.conflicts.length > 0) {
      return {
        ingredient: foodName,
        restriction: intoleranceResult.conflicts[0],
        restrictionLabel: `intolerante a ${intoleranceResult.labels[0]}`,
      };
    }
    
    return null;
  }, [checkConflict, checkFood]);

  // Handle adding food - always add, just show warning if conflict
  const handleAddFood = useCallback(async (food: Food) => {
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

    addFoodToList(food);
  }, [checkFoodConflicts]);

  const addFoodToList = (food: Food) => {
    // Start with empty quantity (0) for new foods to allow user input
    const isGramUnit = food.serving_unit === 'g' || food.serving_unit === 'ml';

    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.id === food.id);
      if (existing) {
        // If already exists, increment by 100g or 1 unit
        const increment = isGramUnit ? 100 : 1;
        const newDisplayQty = existing.displayQuantity + increment;
        const newQuantity = isGramUnit 
          ? newDisplayQty 
          : newDisplayQty * (food.default_serving_size || 100);
        return prev.map((f) =>
          f.id === food.id ? { ...f, displayQuantity: newDisplayQty, quantity: newQuantity } : f
        );
      }
      // New food starts with 0 quantity - user must set it
      return [...prev, { ...food, displayQuantity: 0, quantity: 0 }];
    });
    setSearchQuery("");
    clearFoods();
    setAiSuggestions([]);
    setShowAISuggestions(false);
  };

  // Add AI suggestion as food - always add, show warning if conflict
  const handleAddAISuggestion = async (suggestion: AISuggestion) => {
    const conflict = checkFoodConflicts(suggestion.name);
    const hasLocalConflict = !!conflict;

    try {
      const normalizedName = suggestion.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

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
        const multiplier = 100 / suggestion.portion_grams;
        const servingSuggestion = suggestServingByName(suggestion.name);
        
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
            serving_unit: servingSuggestion.servingUnit,
            default_serving_size: suggestion.portion_grams || servingSuggestion.defaultServingSize,
          })
          .select()
          .single();

        if (error) throw error;
        food = {
          ...newFood,
          serving_unit: newFood.serving_unit || 'g',
          default_serving_size: newFood.default_serving_size || suggestion.portion_grams,
        } as Food;
        toast.success(`${suggestion.name} adicionado ao banco!`);
      }

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

  const incrementQuantity = (foodId: string, amount: number) => {
    setSelectedFoods((prev) =>
      prev.map((f) => {
        if (f.id === foodId) {
          const isGramUnit = f.serving_unit === 'g' || f.serving_unit === 'ml';
          const newDisplayQty = f.displayQuantity + (isGramUnit ? amount : Math.round(amount / (f.default_serving_size || 100)));
          const actualGrams = isGramUnit ? newDisplayQty : newDisplayQty * (f.default_serving_size || 100);
          return { ...f, displayQuantity: Math.max(0, newDisplayQty), quantity: Math.max(0, actualGrams) };
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

  const getUnitLabel = (unit: string, quantity: number) => {
    if (unit === 'fatia') {
      return quantity === 1 ? 'fatia' : 'fatias';
    }
    if (unit === 'un') {
      return 'un';
    }
    return unit;
  };

  // Get foods with zero quantity for inline alert
  const foodsWithZeroQuantity = selectedFoods.filter(f => f.displayQuantity <= 0);
  const hasZeroQuantityFoods = foodsWithZeroQuantity.length > 0;

  const handleContinue = () => {
    if (selectedFoods.length === 0) {
      toast.error("Adicione pelo menos um alimento");
      return;
    }
    
    // Check if any food has zero quantity - don't proceed if so
    if (hasZeroQuantityFoods) {
      return; // The inline alert is already showing
    }
    
    setStep('meal-type');
  };

  const handleSelectMealType = (mealType: string) => {
    setSelectedMealType(mealType);
    setStep('time');
  };

  const handleSave = async () => {
    if (!selectedMealType) {
      toast.error("Selecione o tipo de refeição");
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Parse time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const consumedAt = new Date();
      consumedAt.setHours(hours, minutes, 0, 0);

      // Create consumption items
      const items = selectedFoods.map((food) => {
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

      // Create meal consumption record with new fields
      const { data: consumption, error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: null, // Free-form, not linked to plan
          followed_plan: false,
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fat: totals.fat,
          consumed_at: consumedAt.toISOString(),
          source_type: 'manual', // New field!
          custom_meal_name: customMealName || mealLabels[selectedMealType] || selectedMealType,
          meal_time: selectedTime + ':00', // New field! Format: HH:MM:SS
        })
        .select()
        .single();

      if (consumptionError) throw consumptionError;

      // Insert consumption items
      if (items.length > 0) {
        const itemsToInsert = items.map((item) => ({
          meal_consumption_id: consumption.id,
          food_id: item.food_id,
          food_name: item.food_name,
          quantity_grams: item.quantity_grams,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        }));

        const { error: itemsError } = await supabase
          .from("consumption_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast.success("Refeição registrada com sucesso! 🎉");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving consumption:", error);
      toast.error("Erro ao registrar refeição");
    } finally {
      setIsSaving(false);
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[95vh] max-h-[95vh] flex flex-col p-0">
          <SheetHeader className="px-4 pb-2 pt-4 flex-shrink-0 border-b">
            <SheetTitle className="text-base flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              {step === 'foods' && "O que você comeu?"}
              {step === 'meal-type' && "Qual refeição?"}
              {step === 'time' && "Que horas foi?"}
            </SheetTitle>
          </SheetHeader>

          {/* Step 1: Select Foods */}
          {step === 'foods' && (
            <>
              {/* Search input */}
              <div className="px-4 py-3 flex-shrink-0 relative z-20">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar alimento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Search results dropdown */}
                {(isLoading || foods.length > 0 || showAISuggestions) && (
                  <div className="absolute left-4 right-4 top-full mt-1 bg-background rounded-lg border shadow-lg z-50 max-h-60 overflow-y-auto">
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
                            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-md transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium">{food.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {food.calories_per_100g} kcal/100g
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : showAISuggestions && (
                      <div className="p-2 space-y-2">
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
                          aiSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAddAISuggestion(suggestion)}
                              className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-md transition-colors text-left"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Plus className="w-4 h-4 text-primary" />
                                  <span className="text-sm font-medium">{suggestion.name}</span>
                                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", getConfidenceBadge(suggestion.confidence))}>
                                    {suggestion.confidence}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground ml-6">
                                  {suggestion.portion_description} • {suggestion.calories} kcal
                                </p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              Não encontrado? Adicione manualmente
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowManualModal(true)}
                              className="gap-2"
                            >
                              <PenLine className="w-4 h-4" />
                              Criar alimento
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Selected foods list */}
              <ScrollArea className="flex-1 px-4">
                {selectedFoods.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      Busque e adicione os alimentos que você consumiu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {selectedFoods.map((food) => {
                      const macros = calculateMacros(food);
                      const isGramUnit = food.serving_unit === 'g' || food.serving_unit === 'ml';
                      const incrementButtons = isGramUnit 
                        ? [50, 100, 150, 200] 
                        : [1, 2, 3, 4];
                      
                      return (
                        <div
                          key={food.id}
                          className="p-3 rounded-lg border bg-card space-y-3"
                        >
                          {/* Header with name and remove button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{food.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {macros.calories} kcal • P: {macros.protein}g • C: {macros.carbs}g • G: {macros.fat}g
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 -mr-1 -mt-1"
                              onClick={() => removeFood(food.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          {/* Quantity input with increment buttons */}
                          <div className="flex items-center gap-2">
                            <div className="relative flex-shrink-0">
                              <Input
                                type="number"
                                value={food.displayQuantity || ''}
                                onChange={(e) => updateDisplayQuantity(food.id, e.target.value)}
                                placeholder="0"
                                className="w-20 h-9 text-center text-sm pr-7"
                                min="0"
                                step={isGramUnit ? 10 : 1}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                                {getUnitLabel(food.serving_unit || 'g', food.displayQuantity)}
                              </span>
                            </div>
                            
                            {/* Increment buttons */}
                            <div className="flex items-center gap-1 flex-1 overflow-x-auto">
                              {incrementButtons.map((amount) => (
                                <Button
                                  key={amount}
                                  variant="outline"
                                  size="sm"
                                  className="h-9 px-3 text-xs whitespace-nowrap flex-shrink-0"
                                  onClick={() => incrementQuantity(food.id, isGramUnit ? amount : amount * (food.default_serving_size || 100))}
                                >
                                  +{amount}{isGramUnit ? 'g' : ''}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Add more button */}
                    <button
                      onClick={() => searchInputRef.current?.focus()}
                      className="w-full py-3 border-2 border-dashed border-muted-foreground/30 rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar alimento
                    </button>
                  </div>
                )}
              </ScrollArea>

              {/* Footer with totals and continue button */}
              {selectedFoods.length > 0 && (
                <div className="p-4 border-t bg-card flex-shrink-0 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Total</span>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Flame className="w-4 h-4 text-orange-500" />
                        {totals.calories} kcal
                      </span>
                      <span>P: {totals.protein}g</span>
                      <span>C: {totals.carbs}g</span>
                      <span>G: {totals.fat}g</span>
                    </div>
                  </div>
                  
                  {/* Inline alert for foods with zero quantity */}
                  {hasZeroQuantityFoods && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          Defina a quantidade de:
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          {foodsWithZeroQuantity.map(f => f.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <Button 
                    className="w-full gradient-primary" 
                    onClick={handleContinue}
                    disabled={hasZeroQuantityFoods}
                  >
                    Continuar
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Step 2: Select Meal Type */}
          {step === 'meal-type' && (
            <div className="flex-1 flex flex-col">
              <div className="p-4 flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  Selecione o tipo de refeição:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {mealOrder.map((mealType) => (
                    <Button
                      key={mealType}
                      variant="outline"
                      className="h-auto py-4 flex flex-col gap-1"
                      onClick={() => handleSelectMealType(mealType)}
                    >
                      <span className="font-medium">{mealLabels[mealType] || mealType}</span>
                    </Button>
                  ))}
                </div>
                
                {/* Custom meal name option */}
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    Ou dê um nome personalizado:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Lanche da tarde, Pós-treino..."
                      value={customMealName}
                      onChange={(e) => setCustomMealName(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!customMealName.trim()}
                      onClick={() => {
                        setSelectedMealType('extra');
                        setStep('time');
                      }}
                    >
                      OK
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t">
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setStep('foods')}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Select Time */}
          {step === 'time' && (
            <div className="flex-1 flex flex-col">
              <div className="p-4 flex-1">
                <p className="text-sm text-muted-foreground mb-4">
                  A que horas você fez essa refeição?
                </p>
                
                <div className="flex items-center justify-center gap-4 py-8">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                  <Input
                    type="time"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-32 text-center text-lg"
                  />
                </div>

                {/* Summary */}
                <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Resumo:</p>
                  <p className="text-sm text-muted-foreground">
                    {customMealName || mealLabels[selectedMealType || ''] || selectedMealType} às {selectedTime}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFoods.length} {selectedFoods.length === 1 ? 'alimento' : 'alimentos'} • {totals.calories} kcal
                  </p>
                </div>
              </div>
              
              <div className="p-4 border-t space-y-2">
                <Button 
                  className="w-full gradient-primary" 
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Salvar Refeição
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => setStep('meal-type')}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>


      {/* Manual Food Modal */}
      <ManualFoodModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        onFoodCreated={handleManualFoodCreated}
        initialName={searchQuery}
      />
    </>
  );
}
