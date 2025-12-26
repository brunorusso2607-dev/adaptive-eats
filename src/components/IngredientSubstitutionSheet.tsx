import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ArrowRight, Flame, Beef, Wheat, Loader2, TrendingUp, TrendingDown, Minus, Check, CheckCircle, Sparkles, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIngredientSubstitution, IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { useIngredientConflictCheck } from "@/hooks/useIngredientConflictCheck";
import { useSafeIngredientSuggestions } from "@/hooks/useSafeIngredientSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface IngredientSubstitutionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalIngredient: OriginalIngredient | null;
  onSubstitute: (
    newIngredient: IngredientResult, 
    originalItem: string, 
    originalNutrition: IngredientResult | null
  ) => void;
}

function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function MacroDiffBadge({ value, unit, label }: { value: number; unit: string; label: string }) {
  if (value === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground text-xs">
        <Minus className="w-3 h-3" />
        <span>{label}</span>
      </div>
    );
  }

  const isPositive = value > 0;
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isPositive ? "text-red-500" : "text-green-500"
    )}>
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span>{isPositive ? "+" : ""}{value}{unit} {label}</span>
    </div>
  );
}

export default function IngredientSubstitutionSheet({
  open,
  onOpenChange,
  originalIngredient,
  onSubstitute,
}: IngredientSubstitutionSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debouncedQuery = useDebounceValue(searchQuery, 300);
  
  const { results, isLoading, searchIngredient, calculateMacrosDiff, clearResults } = useIngredientSubstitution();

  // Fetch user profile for conflict checking
  const { data: profile } = useQuery({
    queryKey: ["profile-for-conflicts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from("profiles")
        .select("intolerances, dietary_preference")
        .eq("id", user.id)
        .single();
      
      return data;
    },
  });

  const { checkConflict } = useIngredientConflictCheck(profile);
  const { 
    getSuggestions, 
    getUserRestrictionLabels, 
    fetchAISuggestions, 
    isLoadingAISuggestions 
  } = useSafeIngredientSuggestions(profile);

  // Safe suggestions based on original ingredient + user restrictions
  const [safeSuggestions, setSafeSuggestions] = useState<string[]>([]);
  const [isAIFallback, setIsAIFallback] = useState(false);
  
  // Original ingredient data for comparison
  const [originalData, setOriginalData] = useState<IngredientResult | null>(null);

  // Reset state and fetch suggestions when dialog opens
  useEffect(() => {
    if (open) {
      // Reset all state first
      setSearchQuery("");
      setSelectedIngredient(null);
      setOriginalData(null);
      setSafeSuggestions([]);
      setIsAIFallback(false);
      clearResults();
      
      // Then fetch original data if ingredient exists
      if (originalIngredient) {
        searchIngredient(originalIngredient.item).then((results) => {
          if (results.length > 0) {
            setOriginalData(results[0]);
          }
        });
        
        // Get suggestions based on original ingredient + user restrictions
        const staticSuggestions = getSuggestions(originalIngredient.item);
        
        if (staticSuggestions.length > 0) {
          // Found static suggestions
          setSafeSuggestions(staticSuggestions);
          setIsAIFallback(false);
        } else {
          // No static suggestions, use AI fallback
          setIsAIFallback(true);
          fetchAISuggestions(originalIngredient.item).then((aiSuggestions) => {
            setSafeSuggestions(aiSuggestions);
          });
        }
      }
    } else {
      // Clean up when closing
      setSearchQuery("");
      setSelectedIngredient(null);
      setOriginalData(null);
      setSafeSuggestions([]);
      setIsAIFallback(false);
      clearResults();
    }
  }, [open, originalIngredient?.item, getSuggestions, fetchAISuggestions]);

  // Clear selection when search query changes
  useEffect(() => {
    // Clear selection when query is too short (user deleted text)
    if (searchQuery.length < 2) {
      setSelectedIngredient(null);
    }
  }, [searchQuery]);

  // Execute search when query is long enough
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      // Clear selection when searching for something new
      setSelectedIngredient(null);
      searchIngredient(debouncedQuery, originalIngredient?.item);
    }
  }, [debouncedQuery, searchIngredient, originalIngredient]);

  const handleSelect = (ingredient: IngredientResult) => {
    setSelectedIngredient(ingredient);
  };

  const handleConfirmSubstitution = async () => {
    if (!originalIngredient || !selectedIngredient) return;
    
    setIsSaving(true);
    try {
      await onSubstitute(selectedIngredient, originalIngredient.item, originalData);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (!originalIngredient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto h-[85vh] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle>Substituir Ingrediente</DialogTitle>
          <DialogDescription asChild>
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary">{originalIngredient.quantity} {originalIngredient.unit}</Badge>
              <span className="font-medium">{originalIngredient.item}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">novo ingrediente</span>
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Safe Suggestions based on original ingredient */}
        {(safeSuggestions.length > 0 || isLoadingAISuggestions) && searchQuery.length < 2 && (
          <div className="px-6 pb-4 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Substitutos para {originalIngredient?.item}
              </span>
              {isAIFallback && !isLoadingAISuggestions && (
                <Badge variant="outline" className="text-xs h-5">
                  <Sparkles className="w-3 h-3 mr-1" />
                  IA
                </Badge>
              )}
            </div>
            {getUserRestrictionLabels().length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                Filtrado para suas restrições: {getUserRestrictionLabels().join(", ")}
              </p>
            )}
            {isLoadingAISuggestions ? (
              <div className="flex items-center gap-2 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Buscando sugestões inteligentes...</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {safeSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="h-8 border-green-200 bg-green-50 hover:bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-950 dark:hover:bg-green-900 dark:text-green-300"
                    onClick={() => setSearchQuery(suggestion)}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="relative px-6 pb-4 shrink-0">
          <Search className="absolute left-9 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente substituto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Results - with proper scroll */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full px-6">
          <div className="space-y-2 pb-6">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
              </div>
            )}

            {!isLoading && searchQuery.length >= 2 && results.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">Nenhum ingrediente encontrado</p>
              </div>
            )}

            {!isLoading && searchQuery.length >= 2 && results.map((ingredient) => {
              const diff = calculateMacrosDiff(originalData, ingredient);
              const isSelected = selectedIngredient?.id === ingredient.id;
              const conflict = checkConflict(ingredient.name);
              
              return (
                <Card 
                  key={ingredient.id} 
                  className={cn(
                    "cursor-pointer transition-all",
                    isSelected 
                      ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                      : conflict
                        ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10"
                        : "hover:border-primary/50"
                  )}
                  onClick={() => handleSelect(ingredient)}
                >
                  <CardContent className="p-3">
                    {/* Conflict Alert - Compacto */}
                    {conflict && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1.5 rounded mb-2">
                        Contém {conflict.restrictionLabel?.toLowerCase()}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm flex items-center gap-1.5">
                        {ingredient.name}
                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                      </h4>
                      <Badge 
                        variant={isSelected ? "default" : "secondary"} 
                        className="shrink-0 text-xs h-6"
                      >
                        {isSelected ? "✓" : "Selecionar"}
                      </Badge>
                    </div>

                    {/* Macros - Layout compacto */}
                    <div className="grid grid-cols-4 gap-1 text-center">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-orange-500">
                          <Flame className="w-3 h-3" />
                          <span className="font-semibold text-xs">{ingredient.calories_per_100g}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">kcal</span>
                        {diff.calories !== 0 && (
                          <span className={cn("text-[10px] font-medium", diff.calories > 0 ? "text-red-500" : "text-green-500")}>
                            {diff.calories > 0 ? "+" : ""}{diff.calories}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-red-500">
                          <Beef className="w-3 h-3" />
                          <span className="font-semibold text-xs">{ingredient.protein_per_100g}g</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">prot</span>
                        {diff.protein !== 0 && (
                          <span className={cn("text-[10px] font-medium", diff.protein > 0 ? "text-red-500" : "text-green-500")}>
                            {diff.protein > 0 ? "+" : ""}{diff.protein}g
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          <Wheat className="w-3 h-3" />
                          <span className="font-semibold text-xs">{ingredient.carbs_per_100g}g</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">carb</span>
                        {diff.carbs !== 0 && (
                          <span className={cn("text-[10px] font-medium", diff.carbs > 0 ? "text-red-500" : "text-green-500")}>
                            {diff.carbs > 0 ? "+" : ""}{diff.carbs}g
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-0.5 text-yellow-500">
                          <span className="text-[10px]">🧈</span>
                          <span className="font-semibold text-xs">{ingredient.fat_per_100g}g</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">gord</span>
                        {diff.fat !== 0 && (
                          <span className={cn("text-[10px] font-medium", diff.fat > 0 ? "text-red-500" : "text-green-500")}>
                            {diff.fat > 0 ? "+" : ""}{diff.fat}g
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {!isLoading && searchQuery.length < 2 && (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Digite pelo menos 2 caracteres</p>
              </div>
            )}
          </div>
          </ScrollArea>
        </div>

        {/* Confirm Button - Fixed at bottom */}
        {selectedIngredient && (
          <div className="p-6 pt-4 border-t shrink-0 bg-background">
            {/* Warning if selected ingredient has conflict - Design sutil */}
            {checkConflict(selectedIngredient.name) && (
              <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md mb-3">
                Contém {checkConflict(selectedIngredient.name)?.restrictionLabel?.toLowerCase()} - tem certeza que deseja continuar?
              </p>
            )}
            
            <div className="flex items-center gap-3 mb-3 text-sm">
              <span className="text-muted-foreground">Substituindo:</span>
              <Badge variant="outline">{originalIngredient.item}</Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
              <Badge variant="default">
                {selectedIngredient.name}
              </Badge>
            </div>
            <Button 
              onClick={handleConfirmSubstitution} 
              className="w-full"
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
                  Confirmar Substituição
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
