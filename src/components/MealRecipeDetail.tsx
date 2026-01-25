import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Heart, Flame, Beef, Wheat, Users, CheckCircle, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Loader2 } from "lucide-react";
import LegalDisclaimer from "./LegalDisclaimer";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import IngredientSearchSheet from "@/components/IngredientSearchSheet";
import { IngredientSubstituteDropdown } from "@/components/IngredientSubstituteDropdown";
import { IngredientResult, OriginalIngredient } from "@/hooks/useIngredientSubstitution";
import { useMealIngredientUpdate } from "@/hooks/useMealIngredientUpdate";
import { useMealDetails } from "@/hooks/useMealDetails";
import { toast } from "sonner";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FodmapSeasoningAlert } from "@/components/FodmapSeasoningAlert";
import { useIngredientCalories } from "@/hooks/useIngredientCalories";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";

type Ingredient = { 
  id?: string; // ID do canonical_ingredients (para refeições do pool)
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
  from_pool?: boolean; // Indica se a refeição veio do pool
};

type MealRecipeDetailProps = {
  meal: MealPlanItem;
  onBack: () => void;
  onToggleFavorite: () => void;
  onMealUpdated?: (updatedMeal: MealPlanItem) => void;
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  morning_snack: "Lanche da Manhã",
  lunch: "Almoço",
  afternoon_snack: "Lanche da Tarde",
  dinner: "Jantar",
  supper: "Ceia"
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

export default function MealRecipeDetail({ meal, onBack, onToggleFavorite, onMealUpdated }: MealRecipeDetailProps) {
  console.log('[MealRecipeDetail] Component rendered with meal:', meal.id, meal.recipe_name);
  
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<OriginalIngredient | null>(null);
  const [localMacros, setLocalMacros] = useState({
    calories: meal.recipe_calories,
    protein: meal.recipe_protein,
    carbs: meal.recipe_carbs,
    fat: meal.recipe_fat,
  });
  const queryClient = useQueryClient();
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const { updateIngredients, calculateMacrosDiff } = useMealIngredientUpdate();
  const { checkFood, hasAnyRestriction, isLoading: isLoadingRestrictions } = useIntoleranceWarning();
  const { calculateIngredientCalories } = useIngredientCalories();
  
  // Estados para ingredientes
  // localIngredients: após substituição local (prioridade)
  // loadedIngredients: carregados do banco (dados frescos)
  const [localIngredients, setLocalIngredients] = useState<Ingredient[]>([]);
  const [loadedIngredients, setLoadedIngredients] = useState<Ingredient[]>(meal.recipe_ingredients || []);
  const [loadedInstructions, setLoadedInstructions] = useState<string[]>(meal.recipe_instructions || []);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Buscar ingredientes FRESCOS do banco quando meal.id muda
  useEffect(() => {
    let isMounted = true;
    
    const loadIngredients = async () => {
      setIsLoadingDetails(true);
      
      const { data, error } = await supabase
        .from("meal_plan_items")
        .select("recipe_ingredients, recipe_instructions")
        .eq("id", meal.id)
        .single();
      
      if (!isMounted) return;
      
      if (!error && data) {
        const freshIngredients = (data.recipe_ingredients || []) as Ingredient[];
        setLoadedIngredients(freshIngredients);
        setLoadedInstructions((data.recipe_instructions || []) as string[]);
      }
      setIsLoadingDetails(false);
    };
    
    loadIngredients();
    
    return () => { isMounted = false; };
  }, [meal.id]);

  // Buscar perfil do usuário para restrições
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('intolerances, dietary_preference, excluded_ingredients')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setUserProfile(profile);
        }
      }
    };
    fetchUserProfile();
  }, []);

  // PRIORIDADE: localIngredients (após substituição) > loadedIngredients (do banco)
  const ingredients = localIngredients.length > 0 ? localIngredients : loadedIngredients;
  const instructions = loadedInstructions;

  // Calculate individual calories for each ingredient (async)
  const [ingredientCalories, setIngredientCalories] = useState<Map<string, { calories: number; protein: number; carbs: number; fat: number; source: string }>>(new Map());
  
  useEffect(() => {
    if (ingredients.length === 0) return;
    
    const loadCalories = async () => {
      const results = await calculateIngredientCalories(ingredients);
      const map = new Map<string, { calories: number; protein: number; carbs: number; fat: number; source: string }>();
      results.forEach(r => {
        if (r.matched && r.calories > 0) {
          map.set(r.item.toLowerCase().trim(), { 
            calories: r.calories, 
            protein: r.protein || 0,
            carbs: r.carbs || 0,
            fat: r.fat || 0,
            source: r.source 
          });
        }
      });
      setIngredientCalories(map);
      
      // Recalculate total macros from real database values
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      
      ingredients.forEach(ing => {
        const key = ing.item.toLowerCase().trim();
        const data = map.get(key);
        if (data) {
          totalCalories += data.calories;
          totalProtein += data.protein;
          totalCarbs += data.carbs;
          totalFat += data.fat;
        }
      });
      
      // Only update if we found real data
      if (totalCalories > 0) {
        setLocalMacros({
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat
        });
      }
    };
    
    loadCalories();
  }, [ingredients, calculateIngredientCalories]);

  // Check which ingredients have conflicts
  const ingredientConflicts = useMemo(() => {
    if (!hasAnyRestriction || isLoadingRestrictions) return new Map<string, { message: string; label: string }>();
    
    const conflicts = new Map<string, { message: string; label: string }>();
    ingredients.forEach(ingredient => {
      const key = ingredient.item.toLowerCase().trim();
      if (!conflicts.has(key)) {
        const warning = checkFood(ingredient.item);
        if (warning.hasConflict && warning.conflictDetails.length > 0) {
          conflicts.set(key, {
            message: warning.conflictDetails[0].message,
            label: warning.conflictDetails[0].label
          });
        }
      }
    });
    return conflicts;
  }, [ingredients, checkFood, hasAnyRestriction, isLoadingRestrictions]);

  const hasConflicts = ingredientConflicts.size > 0;

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
    console.log('[MealRecipeDetail] handleSubstitute called:', {
      originalItem,
      newIngredientName: newIngredient.name,
    });
    
    // Usar ingredients (que já tem a prioridade correta: local > loaded)
    const currentIngredients = ingredients;
    
    // Normalizar para comparação case-insensitive
    const originalItemLower = originalItem.toLowerCase().trim();
    
    const originalIng = currentIngredients.find(ing => {
      const ingItemLower = ing.item.toLowerCase().trim();
      return ingItemLower === originalItemLower ||
             ingItemLower.includes(originalItemLower) ||
             originalItemLower.includes(ingItemLower);
    });
    
    console.log('[MealRecipeDetail] Found original ingredient:', originalIng?.item);
    
    // Criar array atualizado
    const updatedIngredients: typeof currentIngredients = [];
    let foundMatch = false;
    
    for (const ing of currentIngredients) {
      const ingItemLower = ing.item.toLowerCase().trim();
      const isMatch = ingItemLower === originalItemLower ||
                      ingItemLower.includes(originalItemLower) ||
                      originalItemLower.includes(ingItemLower);
      if (isMatch && !foundMatch) {
        console.log('[MealRecipeDetail] Replacing:', ing.item, '->', newIngredient.name);
        updatedIngredients.push({ ...ing, item: newIngredient.name });
        foundMatch = true;
      } else {
        updatedIngredients.push({ ...ing });
      }
    }
    
    console.log('[MealRecipeDetail] Updated ingredients:', updatedIngredients.map(i => i.item));
    
    // IMPORTANTE: Atualizar estado local ANTES do await (mesmo padrão do MealDetailSheet)
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
      recipe_calories: newMacros.calories,
      recipe_protein: newMacros.protein,
      recipe_carbs: newMacros.carbs,
      recipe_fat: newMacros.fat,
    });
    
    if (success) {
      toast.success(`${originalItem} substituído por ${newIngredient.name}`);
      
      // Invalidar outras queries
      queryClient.invalidateQueries({ queryKey: ["meal-plan-items"] });
      queryClient.invalidateQueries({ queryKey: ["next-meal"] });
      queryClient.invalidateQueries({ queryKey: ["pending-meals"] });
      
      // Atualizar o meal no componente pai
      if (onMealUpdated) {
        const updatedMeal: MealPlanItem = {
          ...meal,
          recipe_ingredients: updatedIngredients,
          recipe_calories: newMacros.calories,
          recipe_protein: newMacros.protein,
          recipe_carbs: newMacros.carbs,
          recipe_fat: newMacros.fat,
        };
        onMealUpdated(updatedMeal);
      }
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

      {/* Alerta de temperos FODMAP */}
      <FodmapSeasoningAlert />

      {/* Ingredientes - Estilo Nutricionista */}
      <Card className={cn("glass-card", hasConflicts && "border-amber-500/50")}>
        <CardContent className="p-4">
          {/* Alert banner if there are conflicts */}
          {hasConflicts && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  {ingredientConflicts.size} {ingredientConflicts.size === 1 ? 'ingrediente pode conflitar' : 'ingredientes podem conflitar'} com suas restrições
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Considere substituir os itens marcados em amarelo
                </p>
              </div>
            </div>
          )}
          
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            🍽️ Alimentos
            <span className="text-xs text-muted-foreground font-normal ml-auto">
              Toque para substituir
            </span>
          </h3>
          {/* Loading state for lazy-loaded ingredients */}
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mr-2" />
              <span className="text-sm text-muted-foreground">Carregando ingredientes...</span>
            </div>
          ) : (
          <ul className="space-y-1" key={ingredients.map(i => i.item).join('|')}>
            <TooltipProvider>
              {ingredients.map((ingredient, index) => {
                const uniqueKey = `${ingredient.item}-${index}`;
                // ✅ PRIORIDADE 1: Usar portion_label do backend (porção humanizada)
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
                  quantityDisplay = cleanQuantity 
                    ? `(${cleanQuantity}${unit})` 
                    : "";
                }
                
                const itemKey = ingredient.item.toLowerCase().trim();
                const conflict = ingredientConflicts.get(itemKey);
                
                // Get individual calories for this ingredient
                const calData = ingredientCalories.get(itemKey);
                
                return (
                  <li 
                    key={uniqueKey} 
                    className={cn(
                      "flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-1 transition-colors cursor-pointer group",
                      conflict && "bg-amber-500/10 border border-amber-500/30 rounded-lg px-2"
                    )}
                    onClick={() => handleOpenSubstitution(ingredient)}
                  >
                    {/* Bullet point or warning */}
                    {conflict ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{conflict.message}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-primary mt-0.5">•</span>
                    )}
                    
                    {/* Formato com gramas, calorias e fonte: "1 pote de iogurte (150ml) — 165 kcal (TACO)" */}
                    <span className={cn(
                      "flex-1",
                      conflict ? "text-amber-600 dark:text-amber-400 font-medium" : "text-foreground"
                    )}>
                      {portionLabel ? (
                        // ✅ Usar portion_label completo do backend
                        <span>{portionLabel}</span>
                      ) : (
                        // Fallback: nome + quantidade
                        <>
                          {ingredient.item}
                          {quantityDisplay && <span className="text-muted-foreground"> {quantityDisplay}</span>}
                        </>
                      )}
                      {calData && calData.calories > 0 && (
                        <span className="text-muted-foreground"> — <span className="text-orange-500 font-medium">{calData.calories} kcal</span>{calData.source && <span className="text-xs ml-1">({calData.source})</span>}</span>
                      )}
                    </span>
                    
                    <RefreshCw className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </li>
                );
              })}
            </TooltipProvider>
          </ul>
          )}
          
          {/* Badge de segurança ou alerta */}
          <div className="mt-4 pt-3 border-t border-border/50">
            {hasConflicts ? (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Alguns ingredientes conflitam com suas restrições</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>Seguro para suas restrições</span>
              </div>
            )}
          </div>

          {/* Dicas de Preparo - Estilo Fridge Scanner */}
          {loadedInstructions && loadedInstructions.length > 0 && loadedInstructions[0] !== "" && (
            <QuickTips instructions={loadedInstructions} />
          )}

          {/* Legal Disclaimer */}
          <LegalDisclaimer className="mt-4 pt-3 border-t border-border/50" />
        </CardContent>
      </Card>

      {/* Ingredient Search Sheet - busca de alimentos no banco local */}
      <IngredientSearchSheet
        open={substitutionOpen}
        onOpenChange={setSubstitutionOpen}
        originalIngredient={selectedIngredient}
        mealType={meal.meal_type}
        onSubstitute={handleSubstitute}
      />

    </div>
  );
}
