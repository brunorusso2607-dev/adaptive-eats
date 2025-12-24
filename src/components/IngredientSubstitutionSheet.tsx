import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Flame, Beef, Wheat, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIngredientSubstitution, IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";

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
  const debouncedQuery = useDebounceValue(searchQuery, 300);
  
  const { results, isLoading, searchIngredient, calculateMacrosDiff, clearResults } = useIngredientSubstitution();

  // Original ingredient data for comparison
  const [originalData, setOriginalData] = useState<IngredientResult | null>(null);

  useEffect(() => {
    if (open && originalIngredient) {
      // Search for original ingredient to get its macro data
      searchIngredient(originalIngredient.item).then((results) => {
        if (results.length > 0) {
          setOriginalData(results[0]);
        }
      });
      setSearchQuery("");
    } else {
      clearResults();
      setOriginalData(null);
    }
  }, [open, originalIngredient, searchIngredient, clearResults]);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchIngredient(debouncedQuery, originalIngredient?.item);
    }
  }, [debouncedQuery, searchIngredient, originalIngredient]);

  const handleSelect = (ingredient: IngredientResult) => {
    if (originalIngredient) {
      onSubstitute(ingredient, originalIngredient.item, originalData);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">Substituir Ingrediente</SheetTitle>
          <SheetDescription className="text-left">
            {originalIngredient && (
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{originalIngredient.quantity} {originalIngredient.unit}</Badge>
                <span className="font-medium">{originalIngredient.item}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">novo ingrediente</span>
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar ingrediente substituto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="space-y-3 overflow-y-auto max-h-[calc(85vh-200px)] pb-4">
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

          {!isLoading && results.map((ingredient) => {
            const diff = calculateMacrosDiff(originalData, ingredient);
            
            return (
              <Card 
                key={ingredient.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleSelect(ingredient)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{ingredient.name}</h4>
                      {ingredient.category && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {ingredient.category}
                        </Badge>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" className="shrink-0">
                      Selecionar
                    </Button>
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
      </SheetContent>
    </Sheet>
  );
}
