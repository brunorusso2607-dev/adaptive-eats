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
  const { getSuggestions, getUserRestrictionLabels } = useSafeIngredientSuggestions(profile);

  // Safe suggestions based on user restrictions
  const [safeSuggestions, setSafeSuggestions] = useState<string[]>([]);
  
  // Original ingredient data for comparison
  const [originalData, setOriginalData] = useState<IngredientResult | null>(null);

  // Reset state immediately when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset all state first
      setSearchQuery("");
      setSelectedIngredient(null);
      setOriginalData(null);
      setSafeSuggestions([]);
      clearResults();
      
      // Then fetch original data if ingredient exists
      if (originalIngredient) {
        searchIngredient(originalIngredient.item).then((results) => {
          if (results.length > 0) {
            setOriginalData(results[0]);
          }
        });
      }
      
      // Get safe suggestions based on user restrictions (independent of ingredient)
      const suggestions = getSuggestions();
      setSafeSuggestions(suggestions);
    } else {
      // Clean up when closing
      setSearchQuery("");
      setSelectedIngredient(null);
      setOriginalData(null);
      setSafeSuggestions([]);
      clearResults();
    }
  }, [open, originalIngredient?.item, getSuggestions]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
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
      <DialogContent className="max-w-md mx-auto max-h-[85vh] flex flex-col p-0 gap-0">
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

        {/* Safe Suggestions */}
        {safeSuggestions.length > 0 && searchQuery.length < 2 && (
          <div className="px-6 pb-4 shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                Sugestões seguras para você
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Baseado nas suas restrições: {getUserRestrictionLabels().join(", ")}
            </p>
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

        {/* Results */}
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-3 pb-6">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Buscando...</span>
              </div>
            )}

            {!isLoading && searchQuery.length >= 2 && results.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum ingrediente encontrado</p>
                <p className="text-sm">Tente outro termo de busca</p>
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
                  <CardContent className="p-4">
                    {/* Conflict Alert - Design sutil */}
                    {conflict && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md mb-3">
                        Contém {conflict.restrictionLabel?.toLowerCase()}
                      </p>
                    )}

                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {ingredient.name}
                          {isSelected && <CheckCircle className="w-4 h-4 text-primary" />}
                        </h4>
                        {ingredient.category && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {ingredient.category}
                          </Badge>
                        )}
                      </div>
                      <Badge 
                        variant={isSelected ? "default" : "secondary"} 
                        className="shrink-0"
                      >
                        {isSelected ? "Selecionado" : "Selecionar"}
                      </Badge>
                    </div>

                    {/* Macros comparison */}
                    <div className="grid grid-cols-4 gap-2 text-center border-t pt-3">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-orange-500">
                          <Flame className="w-3 h-3" />
                          <span className="font-semibold text-sm">{ingredient.calories_per_100g}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">kcal</p>
                        <MacroDiffBadge value={diff.calories} unit="" label="kcal" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-red-500">
                          <Beef className="w-3 h-3" />
                          <span className="font-semibold text-sm">{ingredient.protein_per_100g}g</span>
                        </div>
                        <p className="text-xs text-muted-foreground">prot</p>
                        <MacroDiffBadge value={diff.protein} unit="g" label="" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-amber-500">
                          <Wheat className="w-3 h-3" />
                          <span className="font-semibold text-sm">{ingredient.carbs_per_100g}g</span>
                        </div>
                        <p className="text-xs text-muted-foreground">carb</p>
                        <MacroDiffBadge value={diff.carbs} unit="g" label="" />
                      </div>
                      <div>
                        <div className="flex items-center justify-center gap-1 text-yellow-500">
                          <span className="text-xs">🧈</span>
                          <span className="font-semibold text-sm">{ingredient.fat_per_100g}g</span>
                        </div>
                        <p className="text-xs text-muted-foreground">gord</p>
                        <MacroDiffBadge value={diff.fat} unit="g" label="" />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Valores por 100g
                    </p>
                  </CardContent>
                </Card>
              );
            })}

            {!isLoading && searchQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Digite pelo menos 2 caracteres</p>
                <p className="text-sm">para buscar ingredientes</p>
              </div>
            )}
          </div>
        </ScrollArea>

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
