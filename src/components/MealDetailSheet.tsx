import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Beef, Wheat, Users, CheckCircle, RefreshCw, Check, SkipForward, Loader2, X } from "lucide-react";
import type { NextMealData } from "@/hooks/useNextMeal";
import IngredientSubstitutionSheet from "@/components/IngredientSubstitutionSheet";
import RecipeRenameDialog from "@/components/RecipeRenameDialog";
import MealConfirmDialog from "@/components/MealConfirmDialog";
import FoodSearchDrawer from "@/components/FoodSearchDrawer";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { useMealIngredientUpdate } from "@/hooks/useMealIngredientUpdate";
import { useMealConsumption } from "@/hooks/useMealConsumption";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface MealDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: NextMealData | null;
  canSwap?: boolean; // Se pode mostrar botão "Trocar"
  isFutureMeal?: boolean; // Se é uma refeição futura (esconde botões Feita/Não fiz)
  onRefetch?: () => void;
  onStreakRefresh?: () => void;
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

export default function MealDetailSheet({ 
  open, 
  onOpenChange, 
  meal, 
  canSwap = true,
  isFutureMeal = false,
  onRefetch,
  onStreakRefresh 
}: MealDetailSheetProps) {
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<OriginalIngredient | null>(null);
  const [localIngredients, setLocalIngredients] = useState<Ingredient[]>([]);
  const [localMacros, setLocalMacros] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [localRecipeName, setLocalRecipeName] = useState("");
  
  // State for rename dialog
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [lastSubstitution, setLastSubstitution] = useState<{
    originalIngredient: string;
    newIngredient: string;
  } | null>(null);

  // State for action dialogs
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFoodDrawer, setShowFoodDrawer] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  
  const { updateIngredients, calculateMacrosDiff } = useMealIngredientUpdate();
  const { saveConsumption } = useMealConsumption();
  const queryClient = useQueryClient();

  // Parse ingredients from meal
  const rawIngredients = (meal?.recipe_ingredients || []) as unknown as RawIngredient[];
  const parsedIngredients: Ingredient[] = rawIngredients
    .filter((i) => i && (typeof i.item === 'string' || typeof i.name === 'string'))
    .map((i) => ({ 
      item: i.item || i.name || '', 
      quantity: i.quantity || '',
      unit: i.unit || ''
    }));

  // Reset local state when meal changes
  useEffect(() => {
    if (meal) {
      setLocalIngredients([]);
      setLocalMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      setLocalRecipeName("");
      setLastSubstitution(null);
    }
  }, [meal?.id]);

  // Animate footer when sheet opens
  useEffect(() => {
    if (open) {
      setFooterVisible(false);
      const timer = setTimeout(() => setFooterVisible(true), 200);
      return () => clearTimeout(timer);
    } else {
      setFooterVisible(false);
    }
  }, [open]);

  if (!meal) return null;
  
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
      queryClient.invalidateQueries({ queryKey: ["meal-plan-items"] });
      queryClient.invalidateQueries({ queryKey: ["next-meal"] });
      queryClient.invalidateQueries({ queryKey: ["pending-meals"] });
      
      setLastSubstitution({
        originalIngredient: originalItem,
        newIngredient: newIngredient.name,
      });
      
      setTimeout(() => {
        setRenameDialogOpen(true);
      }, 300);
    }
  };

  const handleRenameRecipe = async (newName: string) => {
    const { error } = await supabase
      .from("meal_plan_items")
      .update({ recipe_name: newName })
      .eq("id", meal.id);

    if (error) {
      toast.error("Erro ao renomear receita");
      throw error;
    }

    setLocalRecipeName(newName);
    toast.success("Nome da receita atualizado!");
    
    queryClient.invalidateQueries({ queryKey: ["meal-plan-items"] });
    queryClient.invalidateQueries({ queryKey: ["next-meal"] });
    queryClient.invalidateQueries({ queryKey: ["pending-meals"] });
  };

  // Ações do sticky footer
  const handleConfirmAsPlanned = async () => {
    setShowConfirmDialog(false);
    setIsMarking(true);

    const result = await saveConsumption({
      mealPlanItemId: meal.id,
      followedPlan: true,
      items: [],
      totalCalories: meal.recipe_calories,
      totalProtein: meal.recipe_protein,
      totalCarbs: meal.recipe_carbs,
      totalFat: meal.recipe_fat,
    });

    setIsMarking(false);

    if (result.success) {
      toast.success("Refeição marcada como feita! 🎉");
      onOpenChange(false); // Fechar o sheet
      onRefetch?.();
      onStreakRefresh?.();
    } else {
      toast.error("Erro ao marcar refeição");
    }
  };

  const handleConfirmDifferent = () => {
    setShowConfirmDialog(false);
    setShowFoodDrawer(true);
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    
    const { error } = await supabase
      .from("meal_plan_items")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", meal.id);

    setIsSkipping(false);

    if (!error) {
      toast.info("Refeição pulada");
      onOpenChange(false);
      onRefetch?.();
    } else {
      toast.error("Erro ao pular refeição");
    }
  };

  const handleFoodDrawerSuccess = () => {
    onOpenChange(false);
    onRefetch?.();
    onStreakRefresh?.();
  };

  const handleTrocarClick = () => {
    setShowFoodDrawer(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          {/* Scrollable content */}
          <ScrollArea className="flex-1">
            <div className="p-6 pb-24 space-y-6">
              {/* Header */}
              <div>
                <Badge className="mb-2 bg-primary text-primary-foreground">
                  {MEAL_LABELS[meal.meal_type] || meal.meal_type}
                </Badge>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {localRecipeName || meal.recipe_name}
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

          {/* Sticky Footer - Sempre visível com animação */}
          <div 
            className={cn(
              "sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm p-4 safe-area-footer transition-all duration-300 ease-out",
              footerVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-5"
            )}
          >
            <div className="flex items-center gap-3">
              {/* Trocar - só se canSwap */}
              {canSwap && (
                <button
                  onClick={handleTrocarClick}
                  disabled={isMarking || isSkipping}
                  className={cn(
                    "flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors disabled:opacity-50",
                    isFutureMeal ? "flex-1" : "flex-1"
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  Trocar
                </button>
              )}

              {/* Feita - esconde se for refeição futura */}
              {!isFutureMeal && (
                <button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={isMarking || isSkipping}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {isMarking ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Feita
                </button>
              )}

              {/* Não fiz - esconde se for refeição futura */}
              {!isFutureMeal && (
                <button
                  onClick={handleSkip}
                  disabled={isMarking || isSkipping}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground font-medium transition-colors disabled:opacity-50"
                >
                  {isSkipping ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  Não fiz
                </button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Ingredient Substitution Sheet */}
      <IngredientSubstitutionSheet
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        originalIngredient={selectedIngredient}
        onSubstitute={handleSubstitute}
      />

      {/* Recipe Rename Dialog */}
      {lastSubstitution && (
        <RecipeRenameDialog
          open={renameDialogOpen}
          onOpenChange={setRenameDialogOpen}
          currentName={localRecipeName || meal.recipe_name}
          originalIngredient={lastSubstitution.originalIngredient}
          newIngredient={lastSubstitution.newIngredient}
          onConfirm={handleRenameRecipe}
        />
      )}

      {/* Confirm Dialog */}
      <MealConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        mealName={meal.recipe_name}
        onConfirmAsPlanned={handleConfirmAsPlanned}
        onConfirmDifferent={handleConfirmDifferent}
      />

      {/* Food Search Drawer */}
      <FoodSearchDrawer
        open={showFoodDrawer}
        onOpenChange={setShowFoodDrawer}
        mealPlanItemId={meal.id}
        mealType={meal.meal_type}
        onSuccess={handleFoodDrawerSuccess}
      />
    </>
  );
}
