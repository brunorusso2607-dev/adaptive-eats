import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Heart, Flame, Beef, Wheat, Users, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import IngredientSubstitutionSheet from "@/components/IngredientSubstitutionSheet";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { useMealIngredientUpdate } from "@/hooks/useMealIngredientUpdate";
import { toast } from "sonner";

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
  jantar: "Jantar",
  ceia: "Ceia"
};

export default function MealRecipeDetail({ meal, onBack, onToggleFavorite }: MealRecipeDetailProps) {
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<OriginalIngredient | null>(null);
  const [localIngredients, setLocalIngredients] = useState<Ingredient[]>(meal.recipe_ingredients);
  const [localMacros, setLocalMacros] = useState({
    calories: meal.recipe_calories,
    protein: meal.recipe_protein,
    carbs: meal.recipe_carbs,
    fat: meal.recipe_fat,
  });
  const { updateIngredients, calculateMacrosDiff } = useMealIngredientUpdate();

  const handleOpenSubstitution = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSubstitutionOpen(true);
  };

  const handleSubstitute = async (
    newIngredient: IngredientResult, 
    originalItem: string,
    originalNutrition: IngredientResult | null
  ) => {
    const originalIng = localIngredients.find(ing => ing.item === originalItem);
    
    const updatedIngredients = localIngredients.map((ing) =>
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
      recipe_calories: newMacros.calories,
      recipe_protein: newMacros.protein,
      recipe_carbs: newMacros.carbs,
      recipe_fat: newMacros.fat,
    });
    
    if (success) {
      toast.success(`${originalItem} substituído por ${newIngredient.name}`);
    }
  };

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
              <p className="text-lg font-bold">{Math.round(localMacros.calories)}</p>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-1">
                <Beef className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-lg font-bold">{Math.round(localMacros.protein * 10) / 10}g</p>
              <p className="text-xs text-muted-foreground">Proteína</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center mb-1">
                <Wheat className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-lg font-bold">{Math.round(localMacros.carbs * 10) / 10}g</p>
              <p className="text-xs text-muted-foreground">Carbs</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center mb-1">
                <span className="text-lg">🧈</span>
              </div>
              <p className="text-lg font-bold">{Math.round(localMacros.fat * 10) / 10}g</p>
              <p className="text-xs text-muted-foreground">Gordura</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredientes - Estilo Nutricionista */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            🍽️ Alimentos
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              Toque para substituir
            </span>
          </h3>
          <ul className="space-y-1">
            {localIngredients.map((ingredient, index) => (
              <li 
                key={index} 
                className="flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-1 transition-colors cursor-pointer group"
                onClick={() => handleOpenSubstitution(ingredient)}
              >
                {/* Bullet point */}
                <span className="text-primary mt-0.5">•</span>
                
                {/* Formato nutricionista: "1 fatia de pão integral" */}
                <span className="flex-1 text-foreground">
                  {ingredient.quantity}{ingredient.quantity && ' de '}{ingredient.item}
                </span>
                
                <RefreshCw className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </li>
            ))}
          </ul>
          
          {/* Badge de segurança */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Seguro para suas restrições</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ingredient Substitution Sheet */}
      <IngredientSubstitutionSheet
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        originalIngredient={selectedIngredient}
        onSubstitute={handleSubstitute}
      />

      {/* Instructions - só mostra se houver instruções */}
      {meal.recipe_instructions && meal.recipe_instructions.length > 0 && meal.recipe_instructions[0] !== "" && (
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
      )}
    </div>
  );
}
