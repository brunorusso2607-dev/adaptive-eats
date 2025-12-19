import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Heart, Flame, Beef, Wheat, Users, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Ingredient = { item: string; quantity: string; unit: string };

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
};

type MealRecipeDetailProps = {
  meal: MealPlanItem;
  onBack: () => void;
  onToggleFavorite: () => void;
};

const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar"
};

export default function MealRecipeDetail({ meal, onBack, onToggleFavorite }: MealRecipeDetailProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="mt-1">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <Badge variant="secondary" className="mb-2">
              {MEAL_LABELS[meal.meal_type] || meal.meal_type}
            </Badge>
            <h2 className="font-display text-2xl font-bold text-foreground">
              {meal.recipe_name}
            </h2>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFavorite}
        >
          <Heart className={cn("w-6 h-6", meal.is_favorite && "fill-red-500 text-red-500")} />
        </Button>
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
              <p className="text-lg font-bold">{meal.recipe_calories}</p>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-1">
                <Beef className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-lg font-bold">{meal.recipe_protein}g</p>
              <p className="text-xs text-muted-foreground">Proteína</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-1">
                <Wheat className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-lg font-bold">{meal.recipe_carbs}g</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-1">
                <span className="text-lg">🧈</span>
              </div>
              <p className="text-lg font-bold">{meal.recipe_fat}g</p>
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
          </h3>
          <ul className="space-y-2">
            {meal.recipe_ingredients.map((ingredient, index) => (
              <li key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <span>
                  <strong>{ingredient.quantity} {ingredient.unit}</strong> {ingredient.item}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            👨‍🍳 Modo de Preparo
          </h3>
          <ol className="space-y-4">
            {meal.recipe_instructions.map((instruction, index) => (
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
    </div>
  );
}
