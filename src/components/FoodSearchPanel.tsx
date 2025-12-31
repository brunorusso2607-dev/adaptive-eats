import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, Sparkles, PenLine, AlertTriangle, Flame, Database, Globe, Link2, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLookupIngredient } from "@/hooks/useLookupIngredient";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";
import { Badge } from "@/components/ui/badge";

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

export default function FoodSearchPanel({ onSelectFood, className }: FoodSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [isAnalyzingIntolerance, setIsAnalyzingIntolerance] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  // Estado para seleção de porção (fluxo em 2 passos)
  const [selectedFood, setSelectedFood] = useState<LookupFood | null>(null);
  const [portionGrams, setPortionGrams] = useState<number>(100);
  const [portionSuggestion, setPortionSuggestion] = useState<string>("");

  const { lookup, reset, results, source, isLoading, searchPlaceholder } = useLookupIngredient();
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

  // Debounced search using lookup-ingredient
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        lookup(searchQuery, 10);
        // Limpar seleção ao buscar novamente
        setSelectedFood(null);
      } else {
        reset();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, lookup, reset]);

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

  const convertFoodToMealSlot = (food: LookupFood, grams: number): SelectedFoodItem => {
    const multiplier = grams / 100;
    
    return {
      id: food.id,
      name: food.name,
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
      prep_time: 5,
      ingredients: [{ name: food.name, quantity: `${grams}${food.serving_unit || 'g'}` }],
      instructions: ["Preparar conforme preferência"],
    };
  };

  // Passo 1: Selecionar alimento e expandir para mostrar porção
  const handleSelectFoodForPortion = useCallback(async (food: LookupFood) => {
    // Se já está selecionado, desmarcar
    if (selectedFood?.id === food.id) {
      setSelectedFood(null);
      return;
    }

    // Verificar conflitos
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

    // Obter sugestão de porção
    const serving = suggestServingByName(food.name);
    const defaultPortion = food.default_serving_size || serving.defaultServingSize;
    
    setSelectedFood(food);
    setPortionGrams(defaultPortion);
    setPortionSuggestion(`${defaultPortion}${food.serving_unit || 'g'} (${serving.description})`);
  }, [selectedFood, checkFoodConflicts, hasIntolerances, analyzeWithAI]);

  // Passo 2: Confirmar adição com a porção definida
  const handleConfirmAddition = useCallback(() => {
    if (!selectedFood) return;

    onSelectFood(convertFoodToMealSlot(selectedFood, portionGrams));
    setSearchQuery("");
    reset();
    setAiSuggestions([]);
    setShowAISuggestions(false);
    setSelectedFood(null);
    setPortionGrams(100);
    setPortionSuggestion("");
  }, [selectedFood, portionGrams, onSelectFood, reset]);

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

      let food: LookupFood;

      if (existing) {
        food = {
          ...existing,
          serving_unit: existing.serving_unit || 'g',
          default_serving_size: existing.default_serving_size || 100,
          fiber_per_100g: existing.fiber_per_100g || 0,
          sodium_per_100g: existing.sodium_per_100g || 0,
        } as LookupFood;
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
          fiber_per_100g: 0,
          sodium_per_100g: 0,
        } as LookupFood;
        toast.success(`${suggestion.name} adicionado ao banco de dados!`);
      }

      if (conflict) {
        toast.warning(
          `${suggestion.name} contém ${conflict.restrictionLabel.replace('intolerante a ', '')}`,
          { duration: 4000 }
        );
      }

      // Usar o mesmo fluxo de seleção com porção
      handleSelectFoodForPortion(food);
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
    
    // Usar o fluxo de seleção com porção também para alimentos manuais
    handleSelectFoodForPortion(fullFood);
  };

  // Calcular macros para a porção selecionada
  const calculateMacrosForPortion = (food: LookupFood, grams: number) => {
    const multiplier = grams / 100;
    return {
      calories: Math.round(food.calories_per_100g * multiplier),
      protein: Math.round(food.protein_per_100g * multiplier * 10) / 10,
      carbs: Math.round(food.carbs_per_100g * multiplier * 10) / 10,
      fat: Math.round(food.fat_per_100g * multiplier * 10) / 10,
    };
  };

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder.placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <p className="text-xs text-muted-foreground mt-1.5 ml-1">
            {searchPlaceholder.hint}
          </p>
        </div>

        {/* Results area */}
        <ScrollArea className="h-[calc(100vh-340px)]">
          <div className="space-y-2 pr-4">
            {/* Loading state */}
            {isLoading && searchQuery.length >= 2 && results.length === 0 && (
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
                <p className="text-xs">Busca local + USDA + IA</p>
              </div>
            )}

            {/* Source indicator when results found */}
            {results.length > 0 && source && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span>Fonte:</span>
                <SourceBadge source={source} />
                <span className="text-muted-foreground/60">({results.length} resultado{results.length > 1 ? 's' : ''})</span>
              </div>
            )}

            {/* Lookup results */}
            {results.map((food) => {
              const conflict = checkFoodConflicts(food.name);
              const isSelected = selectedFood?.id === food.id;
              const macros = isSelected ? calculateMacrosForPortion(food, portionGrams) : null;
              
              return (
                <div
                  key={food.id}
                  className={cn(
                    "w-full bg-card border rounded-lg transition-all overflow-hidden",
                    conflict && "border-amber-500/50 bg-amber-500/5",
                    isSelected && "border-primary ring-1 ring-primary/20"
                  )}
                >
                  {/* Header do card - clicável para expandir */}
                  <button
                    onClick={() => handleSelectFoodForPortion(food)}
                    disabled={isAnalyzingIntolerance}
                    className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isAnalyzingIntolerance ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                        ) : isSelected ? (
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
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
                    <div className="flex-shrink-0 ml-2">
                      {isSelected ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Seção expandida com seleção de porção */}
                  {isSelected && (
                    <div className="px-3 pb-3 border-t bg-muted/30 space-y-3">
                      {/* Sugestão de porção */}
                      {portionSuggestion && (
                        <button
                          onClick={() => {
                            const serving = suggestServingByName(food.name);
                            setPortionGrams(food.default_serving_size || serving.defaultServingSize);
                          }}
                          className="w-full flex items-center justify-between p-2 mt-2 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-muted-foreground">Sugestão:</span>
                            <span className="font-medium text-foreground">{portionSuggestion}</span>
                          </span>
                          <span className="text-xs text-primary font-medium">Aplicar</span>
                        </button>
                      )}

                      {/* Input de porção */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Quantidade</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={portionGrams}
                              onChange={(e) => setPortionGrams(Number(e.target.value) || 0)}
                              className="h-9 text-center"
                              min={1}
                            />
                            <span className="text-sm text-muted-foreground">{food.serving_unit || 'g'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Preview dos macros calculados */}
                      {macros && (
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div className="p-2 rounded-lg bg-background border">
                            <div className="text-xs text-muted-foreground">Calorias</div>
                            <div className="font-semibold text-sm text-orange-500">{macros.calories}</div>
                          </div>
                          <div className="p-2 rounded-lg bg-background border">
                            <div className="text-xs text-muted-foreground">Prot</div>
                            <div className="font-semibold text-sm text-blue-500">{macros.protein}g</div>
                          </div>
                          <div className="p-2 rounded-lg bg-background border">
                            <div className="text-xs text-muted-foreground">Carbs</div>
                            <div className="font-semibold text-sm text-amber-500">{macros.carbs}g</div>
                          </div>
                          <div className="p-2 rounded-lg bg-background border">
                            <div className="text-xs text-muted-foreground">Gord</div>
                            <div className="font-semibold text-sm text-red-500">{macros.fat}g</div>
                          </div>
                        </div>
                      )}

                      {/* Botão de confirmar */}
                      <Button 
                        onClick={handleConfirmAddition}
                        className="w-full"
                        size="sm"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Adicionar Refeição
                      </Button>
                    </div>
                  )}
                </div>
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
            {searchQuery.length >= 2 && !isLoading && results.length === 0 && !isLoadingAI && aiSuggestions.length === 0 && (
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

            {/* Manual add option at the bottom when results exist */}
            {searchQuery.length >= 2 && !isLoading && (results.length > 0 || (!isLoadingAI && aiSuggestions.length > 0)) && (
              <div className="border-t mt-3 pt-3">
                <button
                  onClick={() => setShowManualModal(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 border border-dashed rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  <PenLine className="w-4 h-4" />
                  <span className="text-sm">Não encontrou? Adicionar manualmente</span>
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
