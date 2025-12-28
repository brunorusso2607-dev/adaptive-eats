import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Loader2, Sparkles, PenLine, AlertTriangle, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFoodsSearch, type Food } from "@/hooks/useFoodsSearch";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";

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

export interface SelectedFoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: any;
  instructions: any;
}

interface FoodSearchPanelProps {
  onSelectFood: (food: SelectedFoodItem) => void;
  className?: string;
}

export default function FoodSearchPanel({ onSelectFood, className }: FoodSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [isAnalyzingIntolerance, setIsAnalyzingIntolerance] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const { foods, isLoading, searchFoods, clearFoods } = useFoodsSearch();
  const { checkFood, hasIntolerances, intolerances } = useIntoleranceWarning();

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

  // Fetch AI suggestions
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

  useEffect(() => {
    if (!isLoading && searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        fetchAISuggestions(searchQuery);
      }, 600);
      return () => clearTimeout(timer);
    } else if (searchQuery.length < 2) {
      setShowAISuggestions(false);
      setAiSuggestions([]);
    }
  }, [foods, isLoading, searchQuery, fetchAISuggestions]);

  const analyzeWithAI = useCallback(async (foodName: string) => {
    if (!hasIntolerances || intolerances.length === 0) return null;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-food-intolerances', {
        body: { foodName, userIntolerances: intolerances }
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

  const convertFoodToMealSlot = (food: Food): SelectedFoodItem => {
    // Calculate macros for default serving (use 100g as base for a meal)
    const servingSize = food.default_serving_size || 100;
    const multiplier = servingSize / 100;
    
    return {
      id: food.id,
      name: food.name,
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
      prep_time: 5, // Default prep time for single foods
      ingredients: [{ name: food.name, quantity: `${servingSize}${food.serving_unit || 'g'}` }],
      instructions: ["Preparar conforme preferência"],
    };
  };

  const handleAddFood = useCallback(async (food: Food) => {
    const localConflict = checkFoodConflicts(food.name);
    
    if (localConflict) {
      toast.warning(
        `${food.name} contém ${localConflict.restrictionLabel.replace('intolerante a ', '')}`,
        { duration: 4000 }
      );
    } else if (hasIntolerances) {
      setIsAnalyzingIntolerance(true);
      const aiResult = await analyzeWithAI(food.name);
      setIsAnalyzingIntolerance(false);
      
      if (aiResult?.hasConflicts && aiResult.conflicts.length > 0) {
        const conflictLabels = aiResult.conflicts.map((c: any) => c.intoleranceLabel).join(', ');
        toast.warning(`${food.name} contém ${conflictLabels}`, { duration: 4000 });
      }
    }

    onSelectFood(convertFoodToMealSlot(food));
    setSearchQuery("");
    clearFoods();
    setAiSuggestions([]);
    setShowAISuggestions(false);
  }, [checkFoodConflicts, hasIntolerances, analyzeWithAI, onSelectFood, clearFoods]);

  const handleAddAISuggestion = async (suggestion: AISuggestion) => {
    const conflict = checkFoodConflicts(suggestion.name);

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
        const finalServingSize = suggestion.portion_grams || servingSuggestion.defaultServingSize;
        const finalServingUnit = suggestion.portion_grams && suggestion.portion_grams !== 100 ? 'un' : servingSuggestion.servingUnit;
        
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

      if (conflict) {
        toast.warning(
          `${suggestion.name} contém ${conflict.restrictionLabel.replace('intolerante a ', '')}`,
          { duration: 4000 }
        );
      }

      onSelectFood(convertFoodToMealSlot(food));
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
    onSelectFood(convertFoodToMealSlot(fullFood));
    setSearchQuery("");
    clearFoods();
  };

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar alimento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Results area */}
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-2 pr-4">
            {/* Loading state */}
            {isLoading && searchQuery.length >= 2 && foods.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm">Buscando alimentos...</p>
              </div>
            )}

            {/* Initial state */}
            {searchQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Digite para buscar alimentos</p>
                <p className="text-xs">Busca inteligente com IA</p>
              </div>
            )}

            {/* Database results */}
            {foods.map((food) => {
              const conflict = checkFoodConflicts(food.name);
              return (
                <button
                  key={food.id}
                  onClick={() => handleAddFood(food)}
                  disabled={isAnalyzingIntolerance}
                  className={cn(
                    "w-full flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors text-left",
                    conflict && "border-amber-500/50 bg-amber-500/5"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isAnalyzingIntolerance ? (
                        <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                      ) : (
                        <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate">{food.name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {food.calories_per_100g} kcal/100g
                      </span>
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

            {/* AI suggestions */}
            {showAISuggestions && searchQuery.length >= 2 && (
              <>
                {isLoadingAI ? (
                  <div className="p-4 text-center text-muted-foreground text-sm border-t mt-2 pt-4">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    <span className="flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Buscando mais opções com IA...
                    </span>
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  <div className="border-t mt-2 pt-3">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
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
                            "w-full flex flex-col p-3 bg-card border rounded-lg hover:bg-muted/50 transition-colors text-left mb-2",
                            conflict && "border-amber-500/50 bg-amber-500/5"
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

            {/* No results - manual entry option */}
            {searchQuery.length >= 2 && !isLoading && foods.length === 0 && !isLoadingAI && aiSuggestions.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhum alimento encontrado
                </p>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="flex items-center gap-2 mx-auto text-sm text-primary hover:underline"
                >
                  <PenLine className="w-4 h-4" />
                  Cadastrar "{searchQuery}" manualmente
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Manual food modal */}
      <ManualFoodModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        initialName={searchQuery}
        onFoodCreated={handleManualFoodCreated}
      />
    </>
  );
}
