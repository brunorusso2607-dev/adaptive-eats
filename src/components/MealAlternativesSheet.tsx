import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame, Beef, Wheat, Droplets, Clock, Check, RefreshCw, Salad, Pizza } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useIngredientCalories } from "@/hooks/useIngredientCalories";

type Ingredient = { item: string; quantity: string; unit: string };

type MealAlternative = {
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
  is_safe?: boolean;
  is_flexible?: boolean; // Flag para identificar comfort foods
};

type MealPlanItem = {
  id: string;
  day_of_week: number;
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
  is_favorite: boolean;
  week_number?: number;
};

type MealAlternativesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: MealPlanItem | null;
  mealType: string;
  mealLabel: string;
  onMealUpdated?: (updatedMeal: MealPlanItem) => void;
};

export default function MealAlternativesSheet({
  open,
  onOpenChange,
  meal,
  mealType,
  mealLabel,
  onMealUpdated,
}: MealAlternativesSheetProps) {
  const [alternatives, setAlternatives] = useState<MealAlternative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState<number | null>(null);
  const [isDietaFlexivel, setIsDietaFlexivel] = useState(false);
  
  const { calculateIngredientCalories, isLoaded: isNutritionLoaded } = useIngredientCalories();
  
  // Helper to get calories for a single ingredient
  const getIngredientCalories = (item: string, quantity: string): number | null => {
    if (!isNutritionLoaded) return null;
    const result = calculateIngredientCalories([{ item, quantity }]);
    return result[0]?.matched ? result[0].calories : null;
  };

  // Auto-load alternatives when sheet opens
  useEffect(() => {
    if (open && meal && mealType) {
      loadAlternatives();
    } else if (!open) {
      // Reset state when sheet closes
      setAlternatives([]);
      setIsLoading(false);
      setIsDietaFlexivel(false);
    }
  }, [open, meal?.id, mealType]);

  // Load alternatives using the new regenerate-meal-alternatives function
  // This uses the SAME format as generate-ai-meal-plan for consistency
  const loadAlternatives = async () => {
    if (!meal || !mealType) return;
    
    setIsLoading(true);
    setAlternatives([]);
    
    try {
      // Use regenerate-ai-meal-alternatives which generates
      // simple meal alternatives in the same format as generate-ai-meal-plan
      const response = await supabase.functions.invoke("regenerate-ai-meal-alternatives", {
        body: {
          mealType,
          currentCalories: meal.recipe_calories,
          optionsCount: 5,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao buscar alternativas");
      }

      if (response.data?.success && response.data?.alternatives) {
        setAlternatives(response.data.alternatives);
        setIsDietaFlexivel(response.data.isDietaFlexivel || false);
      } else {
        throw new Error(response.data?.error || "Nenhuma alternativa encontrada");
      }
    } catch (error) {
      console.error("Error loading alternatives:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao buscar alternativas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Apply selected alternative
  const applyAlternative = async (alternative: MealAlternative, index: number) => {
    if (!meal) return;
    
    setIsApplying(index);
    
    try {
      // Update meal_plan_items directly
      const { error } = await supabase
        .from("meal_plan_items")
        .update({
          recipe_name: alternative.recipe_name,
          recipe_calories: alternative.recipe_calories,
          recipe_protein: alternative.recipe_protein,
          recipe_carbs: alternative.recipe_carbs,
          recipe_fat: alternative.recipe_fat,
          recipe_prep_time: alternative.recipe_prep_time,
          recipe_ingredients: alternative.recipe_ingredients,
          recipe_instructions: alternative.recipe_instructions || [],
        })
        .eq("id", meal.id);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: "Refeição substituída!",
        description: `Nova refeição: ${alternative.recipe_name}`,
      });

      // Notify parent of update
      if (onMealUpdated) {
        onMealUpdated({
          ...meal,
          recipe_name: alternative.recipe_name,
          recipe_calories: alternative.recipe_calories,
          recipe_protein: alternative.recipe_protein,
          recipe_carbs: alternative.recipe_carbs,
          recipe_fat: alternative.recipe_fat,
          recipe_prep_time: alternative.recipe_prep_time,
          recipe_ingredients: alternative.recipe_ingredients,
          recipe_instructions: alternative.recipe_instructions || [],
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error applying alternative:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao aplicar alteração",
        variant: "destructive",
      });
    } finally {
      setIsApplying(null);
    }
  };

  // Separar alternativas em saudáveis e flexíveis
  const healthyAlternatives = alternatives.filter(alt => !alt.is_flexible);
  const flexibleAlternatives = alternatives.filter(alt => alt.is_flexible);

  // Renderizar um card de alternativa
  const renderAlternativeCard = (alt: MealAlternative, index: number, isFlexible: boolean) => (
    <Card 
      key={`${isFlexible ? 'flex' : 'healthy'}-${index}`}
      className={cn(
        "border transition-all cursor-pointer hover:border-primary/50",
        isApplying === index && "border-primary bg-primary/5",
        isFlexible && "border-orange-200 bg-orange-50/30 dark:border-orange-900/50 dark:bg-orange-950/20"
      )}
      onClick={() => !isApplying && applyAlternative(alt, index)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm line-clamp-2">
                {alt.recipe_name}
              </h3>
              {isFlexible && (
                <Badge variant="outline" className="shrink-0 text-[10px] bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">
                  <Pizza className="w-3 h-3 mr-1" />
                  Flexível
                </Badge>
              )}
            </div>
            
            {/* Macros */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" />
                {alt.recipe_calories} kcal
              </span>
              <span className="flex items-center gap-1">
                <Beef className="w-3 h-3 text-red-500" />
                {alt.recipe_protein}g
              </span>
              <span className="flex items-center gap-1">
                <Wheat className="w-3 h-3 text-amber-500" />
                {alt.recipe_carbs}g
              </span>
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" />
                {alt.recipe_fat}g
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {alt.recipe_prep_time} min
              </span>
            </div>
            
            {/* Ingredients preview with individual calories */}
            <div className="mt-2 flex flex-wrap gap-1">
              {alt.recipe_ingredients.slice(0, 4).map((ing, i) => {
                const calories = getIngredientCalories(ing.item, ing.quantity);
                const shortName = ing.item.split(" ").slice(0, 2).join(" ");
                return (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="text-[10px] px-1.5 py-0.5"
                  >
                    {shortName}
                    {calories !== null && (
                      <span className="ml-1 text-orange-600 dark:text-orange-400 font-medium">
                        {calories}kcal
                      </span>
                    )}
                  </Badge>
                );
              })}
              {alt.recipe_ingredients.length > 4 && (
                <Badge 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0"
                >
                  +{alt.recipe_ingredients.length - 4}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Apply button */}
          <Button
            size="sm"
            variant={isApplying === index ? "default" : "outline"}
            className="shrink-0"
            disabled={isApplying !== null}
            onClick={(e) => {
              e.stopPropagation();
              applyAlternative(alt, index);
            }}
          >
            {isApplying === index ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="font-display text-lg text-left">
            Substituir {mealLabel}
          </SheetTitle>
          <p className="text-sm text-muted-foreground text-left">
            {meal?.recipe_name && (
              <>Atual: <span className="font-medium text-foreground">{meal.recipe_name}</span></>
            )}
          </p>
        </SheetHeader>

        <div className="py-4 space-y-4 overflow-y-auto max-h-[calc(85vh-140px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Buscando alternativas...</p>
            </div>
          ) : alternatives.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="text-sm text-muted-foreground">Nenhuma alternativa disponível</p>
              <Button variant="outline" onClick={loadAlternatives}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
            </div>
          ) : isDietaFlexivel && flexibleAlternatives.length > 0 ? (
            // ============= LAYOUT DIETA FLEXÍVEL: 2 SEÇÕES =============
            <>
              {/* Seção Opções Saudáveis */}
              {healthyAlternatives.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Salad className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Opções Saudáveis ({healthyAlternatives.length})
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {healthyAlternatives.map((alt, index) => 
                      renderAlternativeCard(alt, index, false)
                    )}
                  </div>
                </div>
              )}

              {/* Seção Opções Flexíveis (Comfort Foods) */}
              {flexibleAlternatives.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Pizza className="w-4 h-4 text-orange-500" />
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Opções Flexíveis ({flexibleAlternatives.length})
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Comfort foods que cabem nos seus macros 🍔
                  </p>
                  
                  <div className="space-y-3">
                    {flexibleAlternatives.map((alt, index) => 
                      renderAlternativeCard(alt, healthyAlternatives.length + index, true)
                    )}
                  </div>
                </div>
              )}
              
              {/* Refresh button */}
              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-muted-foreground"
                  onClick={loadAlternatives}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                  Carregar mais opções
                </Button>
              </div>
            </>
          ) : (
            // ============= LAYOUT PADRÃO: LISTA ÚNICA =============
            <>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {alternatives.length} opções disponíveis
              </p>
              
              <div className="space-y-3">
                {alternatives.map((alt, index) => 
                  renderAlternativeCard(alt, index, false)
                )}
              </div>
              
              {/* Refresh button */}
              <div className="pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-muted-foreground"
                  onClick={loadAlternatives}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                  Carregar mais opções
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}