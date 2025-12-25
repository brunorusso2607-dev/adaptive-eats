import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Coffee, Utensils, Sandwich, Moon, Cookie, Check, X } from "lucide-react";
import { usePendingMeals, getMealStatus, MEAL_TIME_RANGES } from "@/hooks/usePendingMeals";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

interface MealOfDay {
  type: string;
  status: "completed" | "skipped" | "current" | "pending";
  name?: string;
}

const MEAL_ICONS: Record<string, React.ElementType> = {
  cafe_manha: Coffee,
  almoco: Utensils,
  lanche: Sandwich,
  jantar: Moon,
  ceia: Cookie,
};

const MEAL_EMOJIS: Record<string, string> = {
  cafe_manha: "☕",
  almoco: "🍽️",
  lanche: "🥪",
  jantar: "🌙",
  ceia: "🌑",
};

export function DailyMealProgress() {
  const { pendingMeals, hasMealPlan, isLoading } = usePendingMeals();
  const [completedToday, setCompletedToday] = useState<string[]>([]);

  // Buscar refeições completadas hoje
  useEffect(() => {
    const fetchCompletedToday = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // Buscar itens do plano completados hoje
      const { data: mealPlanData } = await supabase
        .from("meal_plan_items")
        .select("meal_type, completed_at, meal_plans!inner(user_id, is_active)")
        .eq("meal_plans.user_id", user.id)
        .eq("meal_plans.is_active", true)
        .not("completed_at", "is", null)
        .gte("completed_at", startOfDay)
        .lt("completed_at", endOfDay);

      if (mealPlanData) {
        setCompletedToday(mealPlanData.map(m => m.meal_type));
      }
    };

    fetchCompletedToday();
  }, [pendingMeals]);

  // Ordenar tipos de refeição pelo horário
  const orderedMealTypes = useMemo(() => {
    return Object.entries(MEAL_TIME_RANGES)
      .sort(([, a], [, b]) => a.start - b.start)
      .map(([type]) => type);
  }, []);

  // Determinar status de cada refeição do dia
  const mealsOfDay = useMemo((): MealOfDay[] => {
    if (!hasMealPlan) return [];

    const now = new Date();
    const currentHour = now.getHours();

    return orderedMealTypes.map(mealType => {
      const range = MEAL_TIME_RANGES[mealType];
      if (!range) return { type: mealType, status: "pending" as const };

      // Verificar se foi completada hoje
      if (completedToday.includes(mealType)) {
        return { type: mealType, status: "completed" as const };
      }

      // Verificar se está pendente (atrasada)
      const pendingMeal = pendingMeals.find(m => m.meal_type === mealType);
      if (pendingMeal) {
        const status = getMealStatus(mealType, pendingMeal.actual_date, pendingMeal.completed_at);
        if (status === "on_time") {
          // Verificar se é a atual (horário atual está dentro do range)
          if (currentHour >= range.start && currentHour < range.end) {
            return { type: mealType, status: "current" as const, name: pendingMeal.recipe_name };
          }
          return { type: mealType, status: "pending" as const };
        }
        // Se está atrasada mas não completada, marcar como pending ainda
        return { type: mealType, status: "current" as const, name: pendingMeal.recipe_name };
      }

      // Se o horário já passou e não está em pending, foi pulada
      if (currentHour >= range.end) {
        return { type: mealType, status: "skipped" as const };
      }

      return { type: mealType, status: "pending" as const };
    });
  }, [orderedMealTypes, completedToday, pendingMeals, hasMealPlan]);

  if (isLoading || !hasMealPlan || mealsOfDay.length === 0) {
    return null;
  }

  const completedCount = mealsOfDay.filter(m => m.status === "completed").length;
  const totalCount = mealsOfDay.length;

  return (
    <div className="flex items-center justify-between px-1 py-2">
      {/* Indicadores de refeição */}
      <div className="flex items-center gap-1.5">
        {mealsOfDay.map((meal) => {
          const emoji = MEAL_EMOJIS[meal.type] || "🍽️";
          
          return (
            <div
              key={meal.type}
              className={cn(
                "flex items-center gap-0.5 text-sm",
                meal.status === "completed" && "text-emerald-600 dark:text-emerald-400",
                meal.status === "skipped" && "text-muted-foreground/50 line-through",
                meal.status === "current" && "text-primary font-medium",
                meal.status === "pending" && "text-muted-foreground"
              )}
              title={meal.name || meal.type}
            >
              <span className="text-xs">{emoji}</span>
              {meal.status === "completed" && (
                <Check className="w-3 h-3" />
              )}
              {meal.status === "skipped" && (
                <X className="w-3 h-3" />
              )}
              {meal.status === "current" && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              )}
              {meal.status === "pending" && (
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              )}
            </div>
          );
        })}
      </div>

      {/* Contador compacto */}
      <span className="text-xs text-muted-foreground">
        {completedCount}/{totalCount}
      </span>
    </div>
  );
}
