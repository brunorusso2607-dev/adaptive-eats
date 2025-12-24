import { useState } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Beef, Wheat, Users, CheckCircle, RefreshCw } from "lucide-react";
import type { NextMealData } from "@/hooks/useNextMeal";
import IngredientSubstitutionSheet from "@/components/IngredientSubstitutionSheet";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { useMealIngredientUpdate } from "@/hooks/useMealIngredientUpdate";
import { toast } from "sonner";

interface MealDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: NextMealData | null;
}

interface Ingredient {
  item: string;
  quantity: string;
  unit?: string;
}

type RawIngredient = {
  item?: string;
  name?: string;
  quantity?: string;
  unit?: string;
  [key: string]: unknown;
};

const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia"
};

export default function MealDetailSheet({ open, onOpenChange, meal }: MealDetailSheetProps) {
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<OriginalIngredient | null>(null);
  const [localIngredients, setLocalIngredients] = useState<Ingredient[]>([]);
  const [localMacros, setLocalMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const { updateIngredients, calculateMacrosDiff } = useMealIngredientUpdate();

  if (!meal) return null;

  const rawIngredients = (meal.recipe_ingredients || []) as unknown as RawIngredient[];
  const parsedIngredients: Ingredient[] = rawIngredients
    .filter((i) => i && (typeof i.item === 'string' || typeof i.name === 'string'))
    .map((i) => ({ 
      item: i.item || i.name || '', 
      quantity: i.quantity || '',
      unit: i.unit || ''
    }));
  
  // Use local state if modified, otherwise use parsed
  const ingredients = localIngredients.length > 0 ? localIngredients : parsedIngredients;
  const instructions = (meal.recipe_instructions || []) as unknown as string[];

  // Current macros (original + any adjustments)
  const currentMacros = {
    calories: meal.recipe_calories + localMacros.calories,
    protein: meal.recipe_protein + localMacros.protein,
    carbs: meal.recipe_carbs + localMacros.carbs,
    fat: meal.recipe_fat + localMacros.fat,
  };

  const handleOpenSubstitution = (ingredient: Ingredient, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIngredient({
      item: ingredient.item,
      quantity: ingredient.quantity,
      unit: ingredient.unit || ''
    });
    setSubstitutionOpen(true);
  };

  const handleSubstitute = async (
    newIngredient: IngredientResult, 
    originalItem: string,
    originalNutrition: IngredientResult | null
  ) => {
    const currentIngredients = localIngredients.length > 0 ? localIngredients : parsedIngredients;
    const originalIng = currentIngredients.find(ing => ing.item === originalItem);
    
    const updatedIngredients = currentIngredients.map((ing) =>
      ing.item === originalItem
        ? { ...ing, item: newIngredient.name }
        : ing
    );
    setLocalIngredients(updatedIngredients);
    
    // Calculate macros difference
    const macrosDiff = calculateMacrosDiff(
      originalNutrition,
      newIngredient,
      originalIng?.quantity || "100",
      originalIng?.unit || "g"
    );

    // Update local macros state
    const newMacros = {
      calories: localMacros.calories + (macrosDiff.recipe_calories || 0),
      protein: localMacros.protein + (macrosDiff.recipe_protein || 0),
      carbs: localMacros.carbs + (macrosDiff.recipe_carbs || 0),
      fat: localMacros.fat + (macrosDiff.recipe_fat || 0),
    };
    setLocalMacros(newMacros);

    // Persist to database with updated macros
    const { success } = await updateIngredients(meal.id, updatedIngredients, {
      recipe_calories: meal.recipe_calories + newMacros.calories,
      recipe_protein: meal.recipe_protein + newMacros.protein,
      recipe_carbs: meal.recipe_carbs + newMacros.carbs,
      recipe_fat: meal.recipe_fat + newMacros.fat,
    });
    
    if (success) {
      toast.success(`${originalItem} substituído por ${newIngredient.name}`);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[80vh] p-0">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div>
                <Badge className="mb-2 bg-primary text-primary-foreground">
                  {MEAL_LABELS[meal.meal_type] || meal.meal_type}
                </Badge>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {meal.recipe_name}
                </h2>
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{meal.recipe_prep_time} min</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>2 porções</span>
                </div>
              </div>

              {/* Nutrition Card */}
              <Card className="glass-card border-primary/20 overflow-hidden">
                <div className="gradient-primary px-4 py-2">
                  <h3 className="font-semibold text-primary-foreground text-sm">Informações Nutricionais (por porção)</h3>
                </div>
                <CardContent className="p-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center mb-1">
                        <Flame className="w-5 h-5 text-orange-500" />
                      </div>
                      <p className="text-lg font-bold">{Math.round(currentMacros.calories)}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-1">
                        <Beef className="w-5 h-5 text-red-500" />
                      </div>
                      <p className="text-lg font-bold">{Math.round(currentMacros.protein * 10) / 10}g</p>
                      <p className="text-xs text-muted-foreground">Proteína</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-1">
                        <Wheat className="w-5 h-5 text-amber-500" />
                      </div>
                      <p className="text-lg font-bold">{Math.round(currentMacros.carbs * 10) / 10}g</p>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-1">
                        <span className="text-lg">🧈</span>
                      </div>
                      <p className="text-lg font-bold">{Math.round(currentMacros.fat * 10) / 10}g</p>
                      <p className="text-xs text-muted-foreground">Gordura</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ingredients */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    🥗 Ingredientes
                    <span className="text-xs text-muted-foreground font-normal ml-auto">
                      Toque em <RefreshCw className="w-3 h-3 inline" /> para substituir
                    </span>
                  </h3>
                  <ul className="space-y-2">
                    {ingredients.map((ingredient, index) => (
                      <li 
                        key={index} 
                        className="flex items-center gap-3 p-2 rounded-lg"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-4 h-4 text-primary" />
                        </div>
                        <span className="flex-1">
                          <strong>{ingredient.quantity} {ingredient.unit}</strong> {ingredient.item}
                        </span>
                        <button
                          onClick={(e) => handleOpenSubstitution(ingredient, e)}
                          className="w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors active:scale-95"
                          aria-label={`Substituir ${ingredient.item}`}
                        >
                          <RefreshCw className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Instructions */}
              {instructions.length > 0 && (
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      👨‍🍳 Modo de Preparo
                    </h3>
                    <ol className="space-y-4">
                      {instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-4">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shrink-0 text-primary-foreground font-bold text-sm">
                            {index + 1}
                          </div>
                          <p className="flex-1 pt-1">{instruction}</p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Ingredient Substitution Sheet - FORA do Sheet principal para evitar conflito de animação */}
      <IngredientSubstitutionSheet
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        originalIngredient={selectedIngredient}
        onSubstitute={handleSubstitute}
      />
    </>
  );
}
