import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";

export interface DailyConsumption {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealsCompleted: number;
}

export function useDailyConsumption() {
  const [consumption, setConsumption] = useState<DailyConsumption>({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    mealsCompleted: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDailyConsumption = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      // Buscar todas as refeições consumidas hoje
      const { data, error } = await supabase
        .from("meal_consumption")
        .select("total_calories, total_protein, total_carbs, total_fat")
        .eq("user_id", user.id)
        .gte("consumed_at", dayStart)
        .lte("consumed_at", dayEnd);

      if (error) throw error;

      // Somar todos os valores
      const totals = (data || []).reduce(
        (acc, meal) => ({
          totalCalories: acc.totalCalories + (meal.total_calories || 0),
          totalProtein: acc.totalProtein + (meal.total_protein || 0),
          totalCarbs: acc.totalCarbs + (meal.total_carbs || 0),
          totalFat: acc.totalFat + (meal.total_fat || 0),
          mealsCompleted: acc.mealsCompleted + 1,
        }),
        {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          mealsCompleted: 0,
        }
      );

      setConsumption(totals);
    } catch (error) {
      console.error("Error fetching daily consumption:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyConsumption();

    // Atualizar a cada minuto
    const interval = setInterval(fetchDailyConsumption, 60000);
    return () => clearInterval(interval);
  }, [fetchDailyConsumption]);

  return { consumption, isLoading, refetch: fetchDailyConsumption };
}
