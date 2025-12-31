import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Heart, Flame, Beef, Wheat, Users, CheckCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import IngredientSearchSheet from "@/components/IngredientSearchSheet";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { useMealIngredientUpdate } from "@/hooks/useMealIngredientUpdate";
import { toast } from "sonner";

type Ingredient = { 
  item: string; 
  quantity: string; 
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
};

type MealRecipeDetailProps = {
  meal: MealPlanItem;
  onBack: () => void;
  onToggleFavorite: () => void;
};

const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  lanche_manha: "Lanche da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia"
};

// Componente de Dicas de Preparo colapsável
function QuickTips({ instructions }: { instructions: string[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4 pt-3 border-t border-border/50">
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors w-full">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="font-medium">Ver dicas de preparo</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <ol className="space-y-2">
          {instructions.map((instruction, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 text-xs font-bold">
                {index + 1}
              </span>
              <p className="text-muted-foreground flex-1">{instruction}</p>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}

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
    // Parse grams from quantity string (e.g., "120g" -> 120)
    const gramsMatch = ingredient.quantity?.match(/(\d+)/);
    const grams = gramsMatch ? parseInt(gramsMatch[1]) : 100;
    
    setSelectedIngredient({
      item: ingredient.item,
      quantity: ingredient.quantity,
      unit: ingredient.unit || '',
      calories: ingredient.calories,
      protein: ingredient.protein,
      carbs: ingredient.carbs,
      fat: ingredient.fat,
      grams: grams
    });
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
            {localIngredients.map((ingredient, index) => {
              // Limpa valor de quantity (remove "g" se já vier incluído para evitar "gg")
              const cleanQuantity = ingredient.quantity?.toString().replace(/g$/i, '').trim() || '';
              
              // Formata quantidade em gramas: "1 filé de salmão (150g)"
              const quantityDisplay = cleanQuantity 
                ? `(${cleanQuantity}g)` 
                : "";
              
              return (
                <li 
                  key={index} 
                  className="flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-1 transition-colors cursor-pointer group"
                  onClick={() => handleOpenSubstitution(ingredient)}
                >
                  {/* Bullet point */}
                  <span className="text-primary mt-0.5">•</span>
                  
                  {/* Formato com gramas: "Salmão assado (150g)" */}
                  <span className="flex-1 text-foreground">
                    {ingredient.item} {quantityDisplay && <span className="text-muted-foreground">{quantityDisplay}</span>}
                  </span>
                  
                  <RefreshCw className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </li>
              );
            })}
          </ul>
          
          {/* Badge de segurança */}
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Seguro para suas restrições</span>
            </div>
          </div>

          {/* Dicas de Preparo - Estilo Fridge Scanner */}
          {meal.recipe_instructions && meal.recipe_instructions.length > 0 && meal.recipe_instructions[0] !== "" && (
            <QuickTips instructions={meal.recipe_instructions} />
          )}
        </CardContent>
      </Card>

      {/* Ingredient Search Sheet - busca de alimentos como na home */}
      <IngredientSearchSheet
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        originalIngredient={selectedIngredient}
        onSubstitute={handleSubstitute}
      />

    </div>
  );
}
