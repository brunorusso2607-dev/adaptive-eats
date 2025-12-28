import { useState } from "react";
import { Copy, Lock, Calendar, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type MealPlanItem = {
  id: string;
  day_of_week: number;
  week_number: number;
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: any;
  recipe_instructions: any;
  is_favorite: boolean;
};

type MealPlan = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  items: MealPlanItem[];
};

interface DuplicatePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: MealPlan;
  onPlanDuplicated: () => void;
}

export default function DuplicatePlanDialog({
  open,
  onOpenChange,
  plan,
  onPlanDuplicated,
}: DuplicatePlanDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "copying" | "generating" | "done">("idle");

  // Calculate next month dates
  const getNextMonthDates = () => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const lastDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    
    return {
      start: nextMonth,
      end: lastDayNextMonth,
      unlocks: nextMonth, // Unlocks on the first day of next month
    };
  };

  const nextMonthDates = getNextMonthDates();
  const nextMonthName = nextMonthDates.start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalDaysNextMonth = nextMonthDates.end.getDate();

  // Calculate days until unlock
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilUnlock = Math.ceil((nextMonthDates.start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate EXACT number of recipes that will be copied vs generated
  const getRecipeStats = () => {
    // Step 1: Count how many recipes exist per day_of_week in the original plan
    const recipesPerDayOfWeek = new Map<number, number>();
    const mealTypesPerDayOfWeek = new Map<number, Set<string>>();
    
    plan.items.forEach(item => {
      // Count unique recipes per day_of_week
      const currentCount = recipesPerDayOfWeek.get(item.day_of_week) || 0;
      recipesPerDayOfWeek.set(item.day_of_week, currentCount + 1);
      
      // Track meal types per day
      if (!mealTypesPerDayOfWeek.has(item.day_of_week)) {
        mealTypesPerDayOfWeek.set(item.day_of_week, new Set());
      }
      mealTypesPerDayOfWeek.get(item.day_of_week)!.add(item.meal_type);
    });

    // Get unique meal types from original plan to know how many meals per day we need
    const allMealTypes = new Set(plan.items.map(item => item.meal_type));
    const mealsPerDay = allMealTypes.size || 5; // fallback to 5 if empty

    // Step 2: Count how many times each day_of_week appears in the target month
    const dayOfWeekCounts = new Map<number, number>();
    for (let i = 0; i < 7; i++) {
      dayOfWeekCounts.set(i, 0);
    }
    
    for (let day = 1; day <= totalDaysNextMonth; day++) {
      const date = new Date(nextMonthDates.start.getFullYear(), nextMonthDates.start.getMonth(), day);
      const dayOfWeek = date.getDay();
      dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);
    }

    // Step 3: Calculate exact numbers
    let totalRecipesToCopy = 0;
    let totalRecipesToGenerate = 0;
    let daysWithTemplate = 0;
    let daysWithoutTemplate = 0;

    dayOfWeekCounts.forEach((occurrences, dayOfWeek) => {
      const recipesForThisDay = mealTypesPerDayOfWeek.get(dayOfWeek)?.size || 0;
      
      if (recipesForThisDay > 0) {
        // This day_of_week has recipes in the template
        // Each occurrence in the month will copy these recipes
        totalRecipesToCopy += recipesForThisDay * occurrences;
        daysWithTemplate++;
      } else {
        // This day_of_week has no recipes - need to generate
        // Each occurrence needs all meal types generated
        totalRecipesToGenerate += mealsPerDay * occurrences;
        daysWithoutTemplate++;
      }
    });

    const totalMealsNeeded = totalRecipesToCopy + totalRecipesToGenerate;

    return {
      totalMealsNeeded,
      recipesToCopy: totalRecipesToCopy,
      recipesToGenerate: totalRecipesToGenerate,
      daysWithTemplate,
      daysWithoutTemplate,
      mealsPerDay,
    };
  };

  const stats = getRecipeStats();

  const handleDuplicate = async () => {
    setIsLoading(true);
    setProgress(0);
    setStage("copying");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada");
        return;
      }

      // Create new plan for next month
      const newPlanName = `${nextMonthName.charAt(0).toUpperCase() + nextMonthName.slice(1)}`;
      
      const { data: newPlan, error: planError } = await supabase
        .from("meal_plans")
        .insert({
          user_id: session.user.id,
          name: newPlanName,
          start_date: nextMonthDates.start.toISOString().split('T')[0],
          end_date: nextMonthDates.end.toISOString().split('T')[0],
          is_active: true,
          status: 'active',
          unlocks_at: nextMonthDates.unlocks.toISOString(),
          source_plan_id: plan.id,
        })
        .select()
        .single();

      if (planError) throw planError;

      setProgress(10);

      // Group original items by day_of_week and meal_type
      const itemsByDayAndType = new Map<string, MealPlanItem>();
      plan.items.forEach(item => {
        const key = `${item.day_of_week}-${item.meal_type}`;
        if (!itemsByDayAndType.has(key)) {
          itemsByDayAndType.set(key, item);
        }
      });

      console.log("[DuplicatePlan] Original plan items by day/type:", 
        Array.from(itemsByDayAndType.keys()));

      // Map items to new plan - for each day in the new month
      const newItems: any[] = [];
      const missingDays = new Set<number>(); // Days of week that need AI generation

      // Extract all unique meal_types from the original plan (including custom ones like "refeicao_extra")
      const allMealTypes = [...new Set(plan.items.map(item => item.meal_type))];
      console.log("[DuplicatePlan] All meal types from original plan:", allMealTypes);

      for (let day = 1; day <= totalDaysNextMonth; day++) {
        const date = new Date(nextMonthDates.start.getFullYear(), nextMonthDates.start.getMonth(), day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const weekNumber = Math.ceil(day / 7);

        // Find meals for this day of week in the original plan (using dynamic meal types)
        allMealTypes.forEach(mealType => {
          const key = `${dayOfWeek}-${mealType}`;
          const originalItem = itemsByDayAndType.get(key);
          
          if (originalItem) {
            // Copy the recipe
            newItems.push({
              meal_plan_id: newPlan.id,
              day_of_week: dayOfWeek,
              week_number: weekNumber,
              meal_type: mealType,
              recipe_name: originalItem.recipe_name,
              recipe_calories: originalItem.recipe_calories,
              recipe_protein: originalItem.recipe_protein,
              recipe_carbs: originalItem.recipe_carbs,
              recipe_fat: originalItem.recipe_fat,
              recipe_prep_time: originalItem.recipe_prep_time,
              recipe_ingredients: originalItem.recipe_ingredients,
              recipe_instructions: originalItem.recipe_instructions,
              is_favorite: false,
            });
          } else {
            // Mark this day of week as needing generation
            missingDays.add(dayOfWeek);
          }
        });
      }

      // Remove duplicates (same day_of_week + week_number + meal_type)
      const uniqueItems = newItems.filter((item, index, self) => 
        index === self.findIndex(t => 
          t.day_of_week === item.day_of_week && 
          t.week_number === item.week_number && 
          t.meal_type === item.meal_type
        )
      );

      console.log("[DuplicatePlan] Copied items:", uniqueItems.length);
      console.log("[DuplicatePlan] Missing days of week:", Array.from(missingDays));

      // Insert copied items
      if (uniqueItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("meal_plan_items")
          .insert(uniqueItems);

        if (itemsError) throw itemsError;
      }

      setProgress(30);

      // Now generate missing meals using the edge function
      if (missingDays.size > 0) {
        setStage("generating");
        
        // Calculate how many days need generation
        const daysNeedingGeneration: number[] = [];
        for (let day = 1; day <= totalDaysNextMonth; day++) {
          const date = new Date(nextMonthDates.start.getFullYear(), nextMonthDates.start.getMonth(), day);
          const dayOfWeek = date.getDay();
          if (missingDays.has(dayOfWeek)) {
            daysNeedingGeneration.push(day);
          }
        }

        console.log("[DuplicatePlan] Days needing generation:", daysNeedingGeneration.length);

        // Generate in batches of 7 days
        const batchSize = 7;
        const batches: number[][] = [];
        for (let i = 0; i < daysNeedingGeneration.length; i += batchSize) {
          batches.push(daysNeedingGeneration.slice(i, i + batchSize));
        }

        let generatedCount = 0;
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const batchProgress = 30 + ((batchIndex + 1) / batches.length) * 60;
          setProgress(Math.round(batchProgress));

          // Calculate the start date for this batch
          const batchStartDay = batch[0];
          const batchStartDate = new Date(
            nextMonthDates.start.getFullYear(), 
            nextMonthDates.start.getMonth(), 
            batchStartDay
          );

          console.log(`[DuplicatePlan] Generating batch ${batchIndex + 1}/${batches.length}`, {
            days: batch,
            startDate: batchStartDate.toISOString().split('T')[0]
          });

          try {
            const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
              body: {
                planName: newPlanName,
                startDate: batchStartDate.toISOString().split('T')[0],
                daysCount: batch.length,
                existingPlanId: newPlan.id,
                weekNumber: Math.ceil(batchStartDay / 7),
                skipExistingDays: true, // Don't overwrite copied recipes
              }
            });

            if (error) {
              console.error("[DuplicatePlan] Error generating batch:", error);
            } else if (data?.error) {
              console.error("[DuplicatePlan] API error:", data.error);
            } else {
              generatedCount += batch.length;
            }
          } catch (err) {
            console.error("[DuplicatePlan] Exception generating batch:", err);
          }
        }

        console.log("[DuplicatePlan] Generated meals for days:", generatedCount);
      }

      setProgress(100);
      setStage("done");
      
      toast.success(`Plano duplicado para ${newPlanName}!`);
      onPlanDuplicated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error duplicating plan:", error);
      toast.error("Erro ao duplicar plano");
    } finally {
      setIsLoading(false);
      setStage("idle");
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Duplicar Plano
          </DialogTitle>
          <DialogDescription>
            Copiar "{plan.name}" como base para o próximo mês
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* New plan info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Novo plano:</span>
              <span className="font-medium capitalize">{nextMonthName}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Lock className="w-4 h-4 text-amber-500" />
              <span className="text-muted-foreground">Liberado em:</span>
              <span className="font-medium">
                {daysUntilUnlock > 0 
                  ? `${daysUntilUnlock} dia${daysUntilUnlock > 1 ? 's' : ''}`
                  : 'Hoje'
                }
              </span>
            </div>
          </div>

          {/* Recipe stats */}
          {stats.daysWithoutTemplate > 0 ? (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">Geração inteligente</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>{stats.recipesToCopy}</strong> receitas serão copiadas do plano atual ({stats.daysWithTemplate} dias da semana com template). 
                A IA irá gerar <strong>{stats.recipesToGenerate}</strong> receitas para os {stats.daysWithoutTemplate} dia(s) da semana sem template.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Copy className="w-4 h-4 text-emerald-500" />
                <span className="font-medium text-foreground">Cópia completa</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Todas as <strong>{stats.recipesToCopy}</strong> receitas serão copiadas do plano atual. 
                Não será necessário gerar novas receitas.
              </p>
            </div>
          )}

          {/* Progress */}
          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {stage === "copying" && "Copiando receitas..."}
                {stage === "generating" && "Gerando receitas com IA..."}
                {stage === "done" && "Concluído!"}
              </p>
            </div>
          )}

          {/* Info */}
          <p className="text-sm text-muted-foreground">
            As receitas serão copiadas mantendo a mesma estrutura de dias da semana. 
            O plano ficará bloqueado até o início de {nextMonthName.split(' ')[0]}.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDuplicate} 
            disabled={isLoading}
            className="gradient-primary border-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {stage === "copying" ? "Copiando..." : "Gerando..."}
              </>
            ) : (
              "Duplicar Plano"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
