import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Utensils } from "lucide-react";
import type { NextMealData } from "@/hooks/useNextMeal";

interface MealDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: NextMealData | null;
}

interface Ingredient {
  name: string;
  quantity: string;
  unit?: string;
}

type RawIngredient = {
  name?: string;
  quantity?: string;
  unit?: string;
  [key: string]: unknown;
};

export default function MealDetailSheet({
  open,
  onOpenChange,
  meal,
}: MealDetailSheetProps) {
  if (!meal) return null;

  const rawIngredients = (meal.recipe_ingredients || []) as unknown as RawIngredient[];
  const ingredients: Ingredient[] = rawIngredients
    .filter((i) => i && typeof i.name === 'string')
    .map((i) => ({ name: i.name || '', quantity: i.quantity || '' }));
  const instructions = (meal.recipe_instructions || []) as unknown as string[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left">{meal.recipe_name}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-100px)] pr-4">
          <div className="space-y-6">
            {/* Macros summary */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{meal.recipe_calories}</p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-blue-500">{meal.recipe_protein}</p>
                <p className="text-xs text-muted-foreground">Proteína</p>
              </div>
              <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-amber-500">{meal.recipe_carbs}</p>
                <p className="text-xs text-muted-foreground">Carbos</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-red-500">{meal.recipe_fat}</p>
                <p className="text-xs text-muted-foreground">Gordura</p>
              </div>
            </div>

            {/* Prep time */}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Tempo de preparo: {meal.recipe_prep_time} min</span>
            </div>

            {/* Ingredients */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Ingredientes
              </h3>
              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <span className="text-sm">{ingredient.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {ingredient.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {instructions.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Modo de Preparo</h3>
                <ol className="space-y-3">
                  {instructions.map((instruction, index) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm text-muted-foreground leading-relaxed">
                        {instruction}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
