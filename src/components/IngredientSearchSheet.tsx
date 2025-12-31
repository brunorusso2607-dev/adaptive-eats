import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, Sparkles, PenLine, AlertTriangle, Flame, Database, Globe, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLookupIngredient } from "@/hooks/useLookupIngredient";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ManualFoodModal from "./ManualFoodModal";
import { suggestServingByName } from "@/lib/servingSuggestion";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";

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

interface IngredientSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalIngredient: OriginalIngredient | null;
  onSubstitute: (
    newIngredient: IngredientResult, 
    originalItem: string, 
    originalNutrition: IngredientResult | null
  ) => void;
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

export default function IngredientSearchSheet({
  open,
  onOpenChange,
  originalIngredient,
  onSubstitute,
}: IngredientSearchSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [isAnalyzingIntolerance, setIsAnalyzingIntolerance] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);

  const { lookup, reset, results, source, isLoading } = useLookupIngredient();
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

  // Reset on close/open
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      reset();
      setAiSuggestions([]);
      setShowAISuggestions(false);
    }
  }, [open, reset]);

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

  const convertFoodToIngredientResult = (food: LookupFood): IngredientResult => {
    return {
      id: food.id,
      name: food.name,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      fiber_per_100g: food.fiber_per_100g,
      category: food.category || undefined,
    };
  };

  const handleSelectFood = useCallback(async (food: LookupFood) => {
    if (!originalIngredient) return;

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

    const ingredientResult = convertFoodToIngredientResult(food);
    onSubstitute(ingredientResult, originalIngredient.item, null);
    onOpenChange(false);
  }, [checkFoodConflicts, hasIntolerances, analyzeWithAI, onSubstitute, originalIngredient, onOpenChange]);

  const handleAddAISuggestion = async (suggestion: AISuggestion) => {
    if (!originalIngredient) return;

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

      const ingredientResult = convertFoodToIngredientResult(food);
      onSubstitute(ingredientResult, originalIngredient.item, null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding AI suggestion:", error);
      toast.error("Erro ao adicionar alimento");
    }
  };

  const handleManualFoodCreated = (food: { id: string; name: string; calories_per_100g: number; protein_per_100g: number; carbs_per_100g: number; fat_per_100g: number }) => {
    if (!originalIngredient) return;

    const ingredientResult: IngredientResult = {
      id: food.id,
      name: food.name,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
    };
    
    onSubstitute(ingredientResult, originalIngredient.item, null);
    onOpenChange(false);
  };

  if (!originalIngredient) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md mx-auto h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Substituir Alimento
            </DialogTitle>
            <DialogDescription asChild>
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-muted-foreground">Substituindo:</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {originalIngredient.quantity}
                </Badge>
                <span className="font-medium">{originalIngredient.item}</span>
              </span>
            </DialogDescription>
          </DialogHeader>

          {/* Search input */}
          <div className="px-6 pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar alimento..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Busque o alimento que você realmente comeu
            </p>
          </div>

          {/* Results */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full px-6">
              <div className="space-y-2 pb-6">
                {/* Loading state */}
                {isLoading && searchQuery.length >= 2 && results.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Buscando alimentos...</p>
                  </div>
                )}

                {/* Initial state */}
                {searchQuery.length < 2 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Search className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Busque e adicione os alimentos que você consumiu</p>
                    <p className="text-xs mt-1">Busca local + USDA + IA</p>
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
                  return (
                    <button
                      key={food.id}
                      onClick={() => handleSelectFood(food)}
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
                    ) : searchQuery.length >= 2 && !isLoading && !isLoadingAI && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">Nenhum alimento encontrado</p>
                        <button
                          onClick={() => setShowManualModal(true)}
                          className="mt-3 inline-flex items-center gap-1 text-primary text-sm hover:underline"
                        >
                          <PenLine className="w-4 h-4" />
                          Adicionar manualmente
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Manual add option at the bottom */}
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
        </DialogContent>
      </Dialog>

      <ManualFoodModal
        open={showManualModal}
        onOpenChange={setShowManualModal}
        onFoodCreated={handleManualFoodCreated}
        initialName={searchQuery}
      />
    </>
  );
}
