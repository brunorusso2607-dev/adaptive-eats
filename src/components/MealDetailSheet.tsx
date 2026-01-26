import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Beef, Wheat, Users, CheckCircle, RefreshCw, Check, Loader2, X } from "lucide-react";
import LegalDisclaimer from "./LegalDisclaimer";
import type { NextMealData } from "@/hooks/useNextMeal";
import IngredientSearchSheet from "@/components/IngredientSearchSheet";
import RecipeRenameDialog from "@/components/RecipeRenameDialog";
import MealConfirmDialog from "@/components/MealConfirmDialog";
import { DietaryCompatibilityBadge } from "@/components/DietaryCompatibilityBadge";
import { useDietaryCompatibility } from "@/hooks/useDietaryCompatibility";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { useMealIngredientUpdate } from "@/hooks/useMealIngredientUpdate";
import { useMealConsumption } from "@/hooks/useMealConsumption";
import { useMealDetails } from "@/hooks/useMealDetails";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

console.log('[MealDetailSheet] MODULE LOADED - v2');

interface MealDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meal: NextMealData | null;
  canSwap?: boolean; // Se pode mostrar botão "Trocar"
  isFutureMeal?: boolean; // Se é uma refeição futura (esconde botões Feita/Não fiz)
  isPastMeal?: boolean; // Se é uma refeição passada (desabilita substituição de ingredientes)
  onRefetch?: () => void;
  onStreakRefresh?: () => void;
  userDietaryPreference?: string | null;
}

interface Ingredient {
  item: string;
  quantity: string;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

type RawIngredient = {
  item?: string;
  name?: string;
  quantity?: string;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  [key: string]: unknown;
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  supper: "Ceia"
};

export default function MealDetailSheet({ 
  open, 
  onOpenChange, 
  meal, 
  canSwap = true,
  isFutureMeal = false,
  isPastMeal = false,
  onRefetch,
  onStreakRefresh,
  userDietaryPreference
}: MealDetailSheetProps) {
  // Dietary compatibility
  const { getCompatibility, hasProfile } = useDietaryCompatibility(userDietaryPreference);
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
  const [isMarking, setIsMarking] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  
  // Lazy-load meal details (ingredients/instructions)
  const { fetchMealDetails, invalidateCache, isLoading: isLoadingDetails } = useMealDetails();
  const [loadedIngredients, setLoadedIngredients] = useState<Ingredient[]>([]);
  const [loadedInstructions, setLoadedInstructions] = useState<string[]>([]);
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  
  const { updateIngredients, calculateMacrosDiff } = useMealIngredientUpdate();
  const { saveConsumption } = useMealConsumption();
  const queryClient = useQueryClient();

  // Load details when sheet opens
  useEffect(() => {
    // NÃO recarregar se já temos localIngredients (após substituição)
    if (localIngredients.length > 0) {
      console.log('[MealDetailSheet] Skipping load - using localIngredients');
      return;
    }
    
    if (open && meal?.id && !detailsLoaded) {
      // Se já tem ingredientes no meal (caso venha completo), usar eles
      if (meal.recipe_ingredients && meal.recipe_ingredients.length > 0) {
        const rawIngredients = (meal.recipe_ingredients || []) as unknown as RawIngredient[];
        const parsed = rawIngredients
          .filter((i) => i && (typeof i.item === 'string' || typeof i.name === 'string'))
          .map((i) => ({ 
            item: i.item || i.name || '', 
            quantity: i.quantity || '',
            unit: i.unit || '',
            calories: typeof i.calories === 'number' ? i.calories : undefined,
            protein: typeof i.protein === 'number' ? i.protein : undefined,
            carbs: typeof i.carbs === 'number' ? i.carbs : undefined,
            fat: typeof i.fat === 'number' ? i.fat : undefined,
          }));
        setLoadedIngredients(parsed);
        setLoadedInstructions((meal.recipe_instructions || []) as unknown as string[]);
        setDetailsLoaded(true);
        return;
      }
      
      // Senão, buscar sob demanda
      fetchMealDetails(meal.id).then((details) => {
        if (details) {
          const rawIngredients = (details.recipe_ingredients || []) as unknown as RawIngredient[];
          const parsed = rawIngredients
            .filter((i) => i && (typeof i.item === 'string' || typeof i.name === 'string'))
            .map((i) => ({ 
              item: i.item || i.name || '', 
              quantity: i.quantity || '',
              unit: i.unit || '',
              calories: typeof i.calories === 'number' ? i.calories : undefined,
              protein: typeof i.protein === 'number' ? i.protein : undefined,
              carbs: typeof i.carbs === 'number' ? i.carbs : undefined,
              fat: typeof i.fat === 'number' ? i.fat : undefined,
            }));
          setLoadedIngredients(parsed);
          setLoadedInstructions(details.recipe_instructions || []);
        }
        setDetailsLoaded(true);
      });
    }
  }, [open, meal?.id, detailsLoaded, meal?.recipe_ingredients, fetchMealDetails, localIngredients.length]);

  // Reset local state when meal changes
  useEffect(() => {
    if (meal) {
      setLocalIngredients([]);
      setLocalMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      setLocalRecipeName("");
      setLastSubstitution(null);
      setDetailsLoaded(false);
      setLoadedIngredients([]);
      setLoadedInstructions([]);
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
  
  // Use local state if modified, otherwise use loaded ingredients
  // IMPORTANTE: localIngredients tem prioridade sobre loadedIngredients após substituição
  const ingredients = localIngredients.length > 0 ? localIngredients : loadedIngredients;
  const instructions = loadedInstructions;
  
  // Debug log para verificar estado dos ingredientes
  console.log('[MealDetailSheet] Rendering ingredients:', {
    localCount: localIngredients.length,
    loadedCount: loadedIngredients.length,
    usingLocal: localIngredients.length > 0,
    firstIngredient: ingredients[0]?.item
  });

  // Current macros (original + any adjustments)
  const currentMacros = {
    calories: meal.recipe_calories + localMacros.calories,
    protein: meal.recipe_protein + localMacros.protein,
    carbs: meal.recipe_carbs + localMacros.carbs,
    fat: meal.recipe_fat + localMacros.fat,
  };

  const handleOpenSubstitution = (ingredient: Ingredient, e: React.MouseEvent) => {
    e.stopPropagation();
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
    console.log('[MealDetailSheet] handleSubstitute called:', {
      originalItem,
      newIngredientName: newIngredient.name,
    });
    
    const currentIngredients = localIngredients.length > 0 ? localIngredients : loadedIngredients;
    
    // Normalizar para comparação case-insensitive
    const originalItemLower = originalItem.toLowerCase().trim();
    
    const originalIng = currentIngredients.find(ing => {
      const ingItemLower = ing.item.toLowerCase().trim();
      return ingItemLower === originalItemLower ||
             ingItemLower.includes(originalItemLower) ||
             originalItemLower.includes(ingItemLower);
    });
    
    console.log('[MealDetailSheet] Found original ingredient:', originalIng?.item);
    
    const updatedIngredients: typeof currentIngredients = [];
    let foundMatch = false;
    
    for (const ing of currentIngredients) {
      const ingItemLower = ing.item.toLowerCase().trim();
      const isMatch = ingItemLower === originalItemLower ||
                      ingItemLower.includes(originalItemLower) ||
                      originalItemLower.includes(ingItemLower);
      if (isMatch && !foundMatch) {
        console.log('[MealDetailSheet] Replacing:', ing.item, '->', newIngredient.name);
        updatedIngredients.push({ ...ing, item: newIngredient.name });
        foundMatch = true;
      } else {
        updatedIngredients.push({ ...ing });
      }
    }
    
    console.log('[MealDetailSheet] Updated ingredients:', updatedIngredients.map(i => i.item));
    setLocalIngredients([...updatedIngredients]);
    
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
      
      // Invalidar cache e forçar refetch
      await queryClient.invalidateQueries({ queryKey: ["meal-plan-items"] });
      await queryClient.invalidateQueries({ queryKey: ["next-meal"] });
      await queryClient.invalidateQueries({ queryKey: ["pending-meals"] });
      
      // Invalidar cache de detalhes da refeição
      invalidateCache(meal.id);
      
      // Chamar onRefetch se disponível para atualizar o componente pai
      if (onRefetch) {
        onRefetch();
      }
      
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
    toast.info("Use o módulo 'Registrar refeição' para adicionar o que você comeu");
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
          {/* Scrollable content */}
          <ScrollArea className="flex-1">
            <div className="p-6 pb-24 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge className="bg-primary text-primary-foreground">
                    {MEAL_LABELS[meal.meal_type] || meal.meal_type}
                  </Badge>
                  {isPastMeal && (
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      <Clock className="w-3 h-3 mr-1" />
                      Atrasada
                    </Badge>
                  )}
                  {/* Dietary Compatibility Badge */}
                  {hasProfile && (() => {
                    const compat = getCompatibility(meal.recipe_name);
                    if (compat.compatibility !== 'unknown') {
                      return (
                        <DietaryCompatibilityBadge 
                          compatibility={compat.compatibility}
                          notes={compat.notes}
                          showLabel={true}
                        />
                      );
                    }
                    return null;
                  })()}
                </div>
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

              {/* Alimentos da Refeição - Estilo Nutricionista */}
              <Card className="glass-card">
                <CardContent className="p-4">
                  <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                    🍽️ Alimentos
                    {isPastMeal ? (
                      <span className="text-xs text-muted-foreground/60 font-normal ml-auto flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Somente leitura
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-normal ml-auto">
                        Toque para substituir
                      </span>
                    )}
                  </h3>
                  {/* Loading state for lazy-loaded ingredients */}
                  {!detailsLoaded && isLoadingDetails ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">Carregando ingredientes...</span>
                    </div>
                  ) : ingredients.length === 0 && detailsLoaded ? (
                    <p className="text-sm text-muted-foreground py-4">Nenhum ingrediente disponível</p>
                  ) : (
                  <ul className="space-y-1">
                    {ingredients.map((ingredient, index) => {
                      // ✅ PRIORIDADE 1: Usar portion_label do backend (porção humanizada)
                      // Ex: "1 pote de iogurte (150ml)", "2 ovos cozidos (100g)"
                      const portionLabel = (ingredient as any).portion_label;
                      
                      // FALLBACK: Se não tem portion_label, usar lógica antiga
                      let quantityDisplay = "";
                      if (!portionLabel) {
                        // Limpa valor de quantity (remove "g" ou "ml" se já vier incluído)
                        const cleanQuantity = ingredient.quantity?.toString().replace(/[gml]+$/i, '').trim() || '';
                        
                        // Detectar líquidos pelo nome do ingrediente ou pela unidade passada
                        const itemLower = ingredient.item?.toLowerCase() || '';
                        const isLiquid = ingredient.unit === 'ml' || 
                          /chá|cha|tea|suco|juice|água|agua|water|leite|milk|café|cafe|coffee|iogurte|yogurt/i.test(itemLower);
                        const unit = isLiquid ? 'ml' : 'g';
                        quantityDisplay = cleanQuantity ? `(${cleanQuantity}${unit})` : "";
                      }
                      
                      return (
                        <li 
                          key={index} 
                          className={cn(
                            "flex items-start gap-2 py-1.5 group",
                            isPastMeal && "opacity-70"
                          )}
                        >
                          {/* Bullet point */}
                          <span className="text-primary mt-1.5">•</span>
                          
                          {/* Formato nutricionista: "1 pote de iogurte (150ml)" ou fallback "Iogurte (150ml)" */}
                          <span className="flex-1 text-foreground">
                            {portionLabel ? (
                              // ✅ Usar portion_label completo do backend
                              <span>{portionLabel}</span>
                            ) : (
                              // Fallback: nome + quantidade
                              <>
                                {ingredient.item}
                                {quantityDisplay && (
                                  <span className="text-muted-foreground text-sm ml-1">
                                    {quantityDisplay}
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        
                        {!isPastMeal && (
                          <button
                            onClick={(e) => handleOpenSubstitution(ingredient, e)}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-all active:scale-95"
                            aria-label={`Substituir ${ingredient.item}`}
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        </li>
                      );
                    })}
                  </ul>
                  )}
                  
                  {/* Badge de segurança */}
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Seguro para suas restrições</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dicas de Preparo (opcional) */}
              {instructions.length > 0 && instructions[0] !== "" && (
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
                      💡 Dicas de Preparo
                    </h3>
                    <ul className="space-y-2">
                      {instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-3 items-start">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary text-sm font-medium">
                            {index + 1}
                          </div>
                          <p className="flex-1 text-muted-foreground">{instruction}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Legal Disclaimer */}
              <LegalDisclaimer className="mt-4 pt-3 border-t border-border/50" />
            </div>
          </ScrollArea>

          {/* Sticky Footer - Sempre visível (exceto para refeições já completadas) */}
          <div 
            className={cn(
              "sticky bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur-sm p-4 safe-area-footer transition-all duration-300 ease-out",
              footerVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-5"
            )}
          >
            <div className="flex items-center gap-3">

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

      {/* Ingredient Search Sheet - busca de alimentos como na home */}
      <IngredientSearchSheet
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        originalIngredient={selectedIngredient}
        mealType={meal?.meal_type || 'lunch'}
        onSubstitute={handleSubstitute}
      />

      {/* Recipe Rename Dialog - sempre montado para evitar desmontagem durante digitação */}
      <RecipeRenameDialog
        open={renameDialogOpen && !!lastSubstitution}
        onOpenChange={setRenameDialogOpen}
        currentName={localRecipeName || meal.recipe_name}
        originalIngredient={lastSubstitution?.originalIngredient || ""}
        newIngredient={lastSubstitution?.newIngredient || ""}
        onConfirm={handleRenameRecipe}
      />

      {/* Confirm Dialog */}
      <MealConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        mealName={meal.recipe_name}
        onConfirmAsPlanned={handleConfirmAsPlanned}
        onConfirmDifferent={handleConfirmDifferent}
      />

    </>
  );
}
