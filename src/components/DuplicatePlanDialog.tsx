import { useState } from "react";
import { Copy, Lock, Calendar } from "lucide-react";
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

  // Calculate days until unlock
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntilUnlock = Math.ceil((nextMonthDates.start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const handleDuplicate = async () => {
    setIsLoading(true);
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
          status: 'scheduled',
          unlocks_at: nextMonthDates.unlocks.toISOString(),
          source_plan_id: plan.id,
        })
        .select()
        .single();

      if (planError) throw planError;

      // Calculate total days in next month
      const totalDaysNextMonth = nextMonthDates.end.getDate();
      
      // Map original items to new plan
      // We'll copy items proportionally based on day_of_week
      const newItems: any[] = [];
      
      // Group original items by day_of_week and meal_type
      const itemsByDayAndType = new Map<string, MealPlanItem>();
      plan.items.forEach(item => {
        const key = `${item.day_of_week}-${item.meal_type}`;
        itemsByDayAndType.set(key, item);
      });

      // For each day in the new month, find corresponding meals
      for (let day = 1; day <= totalDaysNextMonth; day++) {
        const date = new Date(nextMonthDates.start.getFullYear(), nextMonthDates.start.getMonth(), day);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
        const weekNumber = Math.ceil(day / 7);

        // Find meals for this day of week in the original plan
        const mealTypes = ['cafe_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'];
        
        mealTypes.forEach(mealType => {
          // Try to find a matching meal from the original plan
          const key = `${dayOfWeek}-${mealType}`;
          const originalItem = itemsByDayAndType.get(key);
          
          if (originalItem) {
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
              is_favorite: false, // Reset favorites for new plan
            });
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

      if (uniqueItems.length > 0) {
        const { error: itemsError } = await supabase
          .from("meal_plan_items")
          .insert(uniqueItems);

        if (itemsError) throw itemsError;
      }

      toast.success(`Plano duplicado para ${newPlanName}!`);
      onPlanDuplicated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error duplicating plan:", error);
      toast.error("Erro ao duplicar plano");
    } finally {
      setIsLoading(false);
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

          {/* Info */}
          <p className="text-sm text-muted-foreground">
            As receitas serão copiadas mantendo a mesma estrutura de dias da semana. 
            O plano ficará bloqueado até o início de {nextMonthName.split(' ')[0]}.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDuplicate} 
            disabled={isLoading}
            className="gradient-primary border-0"
          >
            {isLoading ? "Duplicando..." : "Duplicar Plano"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
