import { useState, useEffect, useCallback, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Flame, Loader2, PenLine, UtensilsCrossed, AlertTriangle, Database, Globe, Link2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLookupIngredient } from "@/hooks/useLookupIngredient";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import MealRegistrationFlow, { MealData, ConsumptionItem } from "./MealRegistrationFlow";

interface FreeFormMealLoggerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Local interface matching the lookup-ingredient response
interface LookupFood {
  id: string;
  name: string;
  name_normalized: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sodium_per_100g: number;
  category: string | null;
  source: string;
  is_verified: boolean;
  default_serving_size: number;
  serving_unit: string;
}

interface SelectedFood extends LookupFood {
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

// Source badge component
const SourceBadge = ({ source }: { source: string }) => {
  const config = {
    local: { icon: Database, label: "Local", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
    alias: { icon: Link2, label: "Alias", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
    usda: { icon: Globe, label: "USDA", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  }[source] || { icon: Database, label: source, className: "bg-muted text-muted-foreground" };

  const Icon = config.icon;
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
      config.className
    )}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
};

export default function FreeFormMealLogger({
  open,
  onOpenChange,
  onSuccess,
}: FreeFormMealLoggerProps) {
  // Ref for search input focus
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  
  const [userProfile, setUserProfile] = useState<{ intolerances: string[] | null; dietary_preference: string | null } | null>(null);
  // Track foods with conflicts for informative display
  const [foodsWithConflicts, setFoodsWithConflicts] = useState<string[]>([]);
  
  // AI suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  
  // Manual food modal state
  const [showManualModal, setShowManualModal] = useState(false);
  
  // Registration flow state
  const [showRegistrationFlow, setShowRegistrationFlow] = useState(false);

  // Use the unified lookup hook (Local + Aliases + USDA)
  const { lookup, reset, results, source, isLoading, searchPlaceholder } = useLookupIngredient();
  const { checkFood, checkConflict } = useIntoleranceWarning();

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

  // Debounced search using lookup-ingredient
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        lookup(searchQuery, 10);
      } else {
        reset();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, lookup, reset]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedFoods([]);
      setFoodsWithConflicts([]);
      reset();
      setAiSuggestions([]);
      setShowAISuggestions(false);
      setShowRegistrationFlow(false);
    }
  }, [open, reset]);

  // Fetch AI suggestions only when lookup returns no results
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

  // Only fetch AI suggestions if lookup returns no results
  useEffect(() => {
    if (!isLoading && searchQuery.length >= 2 && results.length === 0 && source === 'none') {
      const timer = setTimeout(() => {
        fetchAISuggestions(searchQuery);
      }, 600);
      return () => clearTimeout(timer);
    } else if (searchQuery.length < 2 || results.length > 0) {
      setShowAISuggestions(false);
      setAiSuggestions([]);
    }
  }, [results, isLoading, searchQuery, source, fetchAISuggestions]);

  // Check for intolerance conflicts - agora com tipo e mensagem correta
  const checkFoodConflicts = useCallback((foodName: string) => {
    const ingredientConflict = checkConflict(foodName);
    if (ingredientConflict) {
      return ingredientConflict;
    }
    
    const intoleranceResult = checkFood(foodName);
    if (intoleranceResult.hasConflict && intoleranceResult.conflictDetails.length > 0) {
      const firstConflict = intoleranceResult.conflictDetails[0];
      return {
        ingredient: foodName,
        restriction: intoleranceResult.conflicts[0],
        restrictionLabel: firstConflict.label,
        type: firstConflict.type,
        message: firstConflict.message,
      };
    }
    
    return null;
  }, [checkConflict, checkFood]);

  // Handle adding food - always add, just show warning if conflict
  const handleAddFood = useCallback(async (food: LookupFood) => {
    const localConflict = checkFoodConflicts(food.name);
    
    if (localConflict) {
      addFoodToList(food);
      setFoodsWithConflicts(prev => [...new Set([...prev, food.name])]);
      toast.warning(
        `${food.name}: ${localConflict.message || `Contém ${localConflict.restrictionLabel}`}`,
        { duration: 4000 }
      );
      return;
    }

    addFoodToList(food);
  }, [checkFoodConflicts]);

  const addFoodToList = (food: LookupFood) => {
    const isGramUnit = food.serving_unit === 'g' || food.serving_unit === 'ml';

    setSelectedFoods((prev) => {
      const existing = prev.find((f) => f.id === food.id);
      if (existing) {
        const increment = isGramUnit ? 100 : 1;
        const newDisplayQty = existing.displayQuantity + increment;
        const newQuantity = isGramUnit 
          ? newDisplayQty 
          : newDisplayQty * (food.default_serving_size || 100);
        return prev.map((f) =>
          f.id === food.id ? { ...f, displayQuantity: newDisplayQty, quantity: newQuantity } : f
        );
      }
      return [...prev, { ...food, displayQuantity: 0, quantity: 0 }];
    });
    setSearchQuery("");
    reset();
    setAiSuggestions([]);
    setShowAISuggestions(false);
  };

  // Add AI suggestion as food
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

      let food: LookupFood;

      if (existing) {
        food = {
          ...existing,
          serving_unit: existing.serving_unit || 'g',
          default_serving_size: existing.default_serving_size || 100,
          fiber_per_100g: existing.fiber_per_100g || 0,
          sodium_per_100g: existing.sodium_per_100g || 0,
          source: 'local',
          is_verified: existing.is_verified || false,
        } as LookupFood;
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
          fiber_per_100g: 0,
          sodium_per_100g: 0,
          source: 'ai_suggestion',
          is_verified: false,
        } as LookupFood;
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
      reset();
      setAiSuggestions([]);
      setShowAISuggestions(false);

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
    const fullFood: LookupFood = {
      ...food,
      name_normalized: food.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
      fiber_per_100g: 0,
      sodium_per_100g: 0,
      category: null,
      serving_unit: 'g',
      default_serving_size: 100,
      source: 'manual',
      is_verified: false,
    };
    addFoodToList(fullFood);
  };

  const updateDisplayQuantity = (foodId: string, newValue: string) => {
    const numValue = newValue === '' ? 0 : parseFloat(newValue) || 0;
    setSelectedFoods((prev) =>
      prev.map((f) => {
        if (f.id === foodId) {
          const actualGrams = f.serving_unit === 'g' || f.serving_unit === 'ml' 
            ? numValue 
            : numValue * (f.default_serving_size || 100);
          return { ...f, displayQuantity: numValue, quantity: actualGrams };
        }
        return f;
      })
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
      })
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
    
    if (hasZeroQuantityFoods) {
      return;
    }
    
    // Open the registration flow
    setShowRegistrationFlow(true);
  };

  const handleRegistrationSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  const handleRegistrationBack = () => {
    setShowRegistrationFlow(false);
  };

  // Prepare data for MealRegistrationFlow
  const mealData: MealData = {
    name: selectedFoods.length === 1 
      ? selectedFoods[0].name 
      : `${selectedFoods.length} alimentos`,
    calories: totals.calories,
    protein: totals.protein,
    carbs: totals.carbs,
    fat: totals.fat,
  };

  const consumptionItems: ConsumptionItem[] = selectedFoods.map((food) => {
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

  return (
    <>
      <Sheet open={open && !showRegistrationFlow} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] max-h-[85vh] flex flex-col p-0">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          
          <SheetHeader className="px-4 pb-3 flex-shrink-0 border-b">
            <SheetTitle className="text-base flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              O que você comeu?
            </SheetTitle>
          </SheetHeader>

          {/* Search input */}
          <div className="px-4 py-3 flex-shrink-0 relative z-20">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder={searchPlaceholder.placeholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              <p className="text-xs text-muted-foreground mt-1.5 ml-1">
                {searchPlaceholder.hint}
              </p>
            </div>
            
            {/* Search results dropdown */}
            {searchQuery.length >= 2 && (isLoading || results.length > 0 || showAISuggestions) && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-background rounded-lg border shadow-lg z-50 max-h-72 overflow-y-auto">
                {isLoading && results.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                    Buscando...
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {/* Source indicator when results found */}
                    {results.length > 0 && source && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-1">
                        <span>Fonte:</span>
                        <SourceBadge source={source} />
                        <span className="text-muted-foreground/60">({results.length} resultado{results.length > 1 ? 's' : ''})</span>
                      </div>
                    )}

                    {/* Database results */}
                    {results.map((food) => {
                      const conflict = checkFoodConflicts(food.name);
                      return (
                        <button
                          key={food.id}
                          onClick={() => handleAddFood(food)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 hover:bg-muted rounded-md transition-colors text-left",
                            conflict && "border-l-2 border-amber-500"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="text-sm font-medium truncate">{food.name}</span>
                              {food.is_verified && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 ml-6 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Flame className="w-3 h-3 text-orange-500" />
                                {food.calories_per_100g} kcal/100g
                              </span>
                              <SourceBadge source={food.source} />
                            </div>
                            {conflict && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mt-1 ml-6">
                                <AlertTriangle className="w-3 h-3" />
                                Contém {conflict.restrictionLabel.replace('intolerante a ', '')}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}

                    {/* AI suggestions - only show when lookup returns nothing */}
                    {showAISuggestions && searchQuery.length >= 2 && results.length === 0 && (
                      <>
                        {isLoadingAI ? (
                          <div className="p-4 text-center text-muted-foreground text-sm border-t mt-2 pt-4">
                            <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                            <span className="flex items-center justify-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Buscando com IA...
                            </span>
                          </div>
                        ) : aiSuggestions.length > 0 ? (
                          <div className="border-t mt-2 pt-3">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1 px-1">
                              <Sparkles className="w-3 h-3" />
                              Sugestões da IA
                            </p>
                            {aiSuggestions.map((suggestion, idx) => {
                              const conflict = checkFoodConflicts(suggestion.name);
                              return (
                                <button
                                  key={`ai-${idx}`}
                                  onClick={() => handleAddAISuggestion(suggestion)}
                                  className={cn(
                                    "w-full p-3 hover:bg-muted rounded-md transition-colors text-left",
                                    conflict && "border-l-2 border-amber-500"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                                    <span className="text-sm font-medium">{suggestion.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6 mt-1">
                                    <span>{suggestion.portion_description}</span>
                                    <span className="flex items-center gap-1">
                                      <Flame className="w-3 h-3 text-orange-500" />
                                      {suggestion.calories}kcal
                                    </span>
                                  </div>
                                  {conflict && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mt-1 ml-6">
                                      <AlertTriangle className="w-3 h-3" />
                                      Contém {conflict.restrictionLabel.replace('intolerante a ', '')}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    )}

                    {/* Manual add option */}
                    {results.length === 0 && !isLoadingAI && aiSuggestions.length === 0 && (
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
                <p className="text-xs text-muted-foreground mt-1">
                  Busca local + USDA + IA
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
        </SheetContent>
      </Sheet>

      {/* Registration Flow - shared component */}
      <MealRegistrationFlow
        open={showRegistrationFlow}
        onOpenChange={setShowRegistrationFlow}
        mealData={mealData}
        items={consumptionItems}
        sourceType="manual"
        onSuccess={handleRegistrationSuccess}
        onBack={handleRegistrationBack}
      />

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
