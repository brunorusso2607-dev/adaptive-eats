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
  // Now using DATE-based matching instead of day_of_week
  const getRecipeStats = () => {
    // Parse original plan date range
    const originalStart = new Date(plan.start_date);
    const originalEnd = new Date(plan.end_date);
    
    // Get unique meal types from original plan
    const allMealTypes = [...new Set(plan.items.map(item => item.meal_type))];
    const mealsPerDay = allMealTypes.length || 5;
    
    // Build a map of date -> recipes from original plan
    const recipesByDate = new Map<string, MealPlanItem[]>();
    plan.items.forEach(item => {
      // Calculate the actual date from day_of_week and week_number
      const dayOffset = (item.week_number - 1) * 7 + item.day_of_week;
      const itemDate = new Date(originalStart);
      itemDate.setDate(originalStart.getDate() + dayOffset);
      const dateKey = itemDate.toISOString().split('T')[0];
      
      if (!recipesByDate.has(dateKey)) {
        recipesByDate.set(dateKey, []);
      }
      recipesByDate.get(dateKey)!.push(item);
    });
    
    // Calculate offset between original start and new start (in days)
    const daysDiff = Math.floor((nextMonthDates.start.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // For each day in the new month, check if there's a corresponding date in the original plan
    let totalRecipesToCopy = 0;
    let totalRecipesToGenerate = 0;
    let daysWithTemplate = 0;
    let daysWithoutTemplate = 0;
    
    for (let day = 1; day <= totalDaysNextMonth; day++) {
      // Calculate the corresponding date in the original plan (if it exists)
      const newDate = new Date(nextMonthDates.start.getFullYear(), nextMonthDates.start.getMonth(), day);
      
      // Find matching date in original plan by calculating the equivalent day
      // We use the day of the month as a simple mapping
      const originalDay = day;
      const originalDate = new Date(originalStart.getFullYear(), originalStart.getMonth(), originalDay);
      const originalDateKey = originalDate.toISOString().split('T')[0];
      
      const recipesForThisDate = recipesByDate.get(originalDateKey);
      
      if (recipesForThisDate && recipesForThisDate.length > 0) {
        totalRecipesToCopy += recipesForThisDate.length;
        daysWithTemplate++;
      } else {
        // No recipes for this day - need AI generation
        totalRecipesToGenerate += mealsPerDay;
        daysWithoutTemplate++;
      }
    }
    
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

      // Parse original plan dates
      const originalStart = new Date(plan.start_date);
      
      // Build a map of date -> recipes from original plan
      const recipesByDate = new Map<string, MealPlanItem[]>();
      plan.items.forEach(item => {
        // Calculate the actual date from day_of_week and week_number
        const dayOffset = (item.week_number - 1) * 7 + item.day_of_week;
        const itemDate = new Date(originalStart);
        itemDate.setDate(originalStart.getDate() + dayOffset);
        const dateKey = itemDate.toISOString().split('T')[0];
        
        if (!recipesByDate.has(dateKey)) {
          recipesByDate.set(dateKey, []);
        }
        recipesByDate.get(dateKey)!.push(item);
      });

      console.log("[DuplicatePlan] Original plan recipes by date:", 
        Array.from(recipesByDate.keys()).length, "unique dates");

      // Map items to new plan - using DATE-based matching
      const newItems: any[] = [];
      const daysNeedingGeneration: number[] = []; // Day numbers that need AI generation

      // Get unique meal types from original plan
      const allMealTypes = [...new Set(plan.items.map(item => item.meal_type))];
      console.log("[DuplicatePlan] All meal types from original plan:", allMealTypes);

      for (let day = 1; day <= totalDaysNextMonth; day++) {
        const newDate = new Date(nextMonthDates.start.getFullYear(), nextMonthDates.start.getMonth(), day);
        const newDayOfWeek = newDate.getDay();
        const newWeekNumber = Math.ceil(day / 7);
        
        // Find matching date in original plan by day of month
        // This copies day 1 -> day 1, day 15 -> day 15, etc.
        const originalDay = day;
        const originalDate = new Date(originalStart.getFullYear(), originalStart.getMonth(), originalDay);
        const originalDateKey = originalDate.toISOString().split('T')[0];
        
        const recipesForThisDate = recipesByDate.get(originalDateKey);
        
        if (recipesForThisDate && recipesForThisDate.length > 0) {
          // Copy all recipes from this date
          recipesForThisDate.forEach(originalItem => {
            newItems.push({
              meal_plan_id: newPlan.id,
              day_of_week: newDayOfWeek,
              week_number: newWeekNumber,
              meal_type: originalItem.meal_type,
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
          });
          
          console.log(`[DuplicatePlan] Day ${day}: Copied ${recipesForThisDate.length} recipes from ${originalDateKey}`);
        } else {
          // Mark this day as needing AI generation
          daysNeedingGeneration.push(day);
          console.log(`[DuplicatePlan] Day ${day}: No template, will generate via AI`);
        }
      }

      console.log("[DuplicatePlan] Total copied items:", newItems.length);
      console.log("[DuplicatePlan] Days needing AI generation:", daysNeedingGeneration.length);

      // Insert copied items
      if (newItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("meal_plan_items")
          .insert(newItems);

        if (itemsError) throw itemsError;
      }

      setProgress(30);

      // Now generate missing meals using the edge function
      if (daysNeedingGeneration.length > 0) {
        setStage("generating");

        console.log("[DuplicatePlan] Days needing generation:", daysNeedingGeneration);

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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error("Você precisa estar logado para duplicar planos");
            }

            const { data, error } = await supabase.functions.invoke("generate-ai-meal-plan", {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
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
              // Check if meals were created despite connection error
              const { data: mealItems } = await supabase
                .from("meal_plan_items")
                .select("id")
                .eq("meal_plan_id", newPlan.id)
                .gte("created_at", new Date(Date.now() - 60000).toISOString())
                .limit(1);
              
              if (mealItems && mealItems.length > 0) {
                console.log("[DuplicatePlan] Meals were created despite connection error");
                generatedCount += batch.length;
              }
            } else if (data?.error) {
              console.error("[DuplicatePlan] API error:", data.error);
            } else {
              generatedCount += batch.length;
            }
          } catch (err) {
            console.error("[DuplicatePlan] Exception generating batch:", err);
            // Check if meals were created despite exception
            const { data: mealItems } = await supabase
              .from("meal_plan_items")
              .select("id")
              .eq("meal_plan_id", newPlan.id)
              .gte("created_at", new Date(Date.now() - 60000).toISOString())
              .limit(1);
            
            if (mealItems && mealItems.length > 0) {
              console.log("[DuplicatePlan] Meals were created despite exception");
              generatedCount += batch.length;
            }
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
