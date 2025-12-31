import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calculateDailyHealthScore } from "@/lib/healthScoreUtils";

export interface DailyScore {
  date: string;
  dateLabel: string;
  score: number;
  wellMeals: number;
  totalMeals: number;
  symptoms: number;
}

export function useHealthScoreHistory(days: number = 7) {
  const [history, setHistory] = useState<DailyScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      const today = startOfDay(new Date());
      const startDate = subDays(today, days - 1);

      // Fetch all meals in the period
      const { data: meals } = await supabase
        .from("meal_consumption")
        .select("consumed_at, feedback_status")
        .eq("user_id", user.id)
        .gte("consumed_at", startDate.toISOString())
        .order("consumed_at", { ascending: true });

      // Fetch all symptom logs in the period
      const { data: symptoms } = await supabase
        .from("symptom_logs")
        .select("logged_at")
        .eq("user_id", user.id)
        .gte("logged_at", startDate.toISOString());

      // Group by day
      const dailyData: Record<string, { wellMeals: number; totalMeals: number; symptoms: number }> = {};

      // Initialize all days
      for (let i = 0; i < days; i++) {
        const date = subDays(today, days - 1 - i);
        const dateKey = format(date, "yyyy-MM-dd");
        dailyData[dateKey] = { wellMeals: 0, totalMeals: 0, symptoms: 0 };
      }

      // Count meals by day
      for (const meal of meals || []) {
        const dateKey = format(new Date(meal.consumed_at), "yyyy-MM-dd");
        if (dailyData[dateKey]) {
          dailyData[dateKey].totalMeals++;
          if (meal.feedback_status === "well" || meal.feedback_status === "auto_well") {
            dailyData[dateKey].wellMeals++;
          }
        }
      }

      // Count symptoms by day
      for (const symptom of symptoms || []) {
        const dateKey = format(new Date(symptom.logged_at), "yyyy-MM-dd");
        if (dailyData[dateKey]) {
          dailyData[dateKey].symptoms++;
        }
      }

      // Calculate scores using shared utility
      const historyData: DailyScore[] = Object.entries(dailyData).map(([dateKey, data]) => {
        const date = new Date(dateKey);
        const score = calculateDailyHealthScore({
          wellMeals: data.wellMeals,
          totalMeals: data.totalMeals,
          symptoms: data.symptoms,
        });

        return {
          date: dateKey,
          dateLabel: format(date, "EEE", { locale: ptBR }),
          score,
          wellMeals: data.wellMeals,
          totalMeals: data.totalMeals,
          symptoms: data.symptoms,
        };
      });

      setHistory(historyData);
    } catch (error) {
      console.error("Error fetching health score history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Calculate trend
  const trend = history.length >= 2 
    ? history[history.length - 1].score - history[0].score 
    : 0;

  return {
    history,
    trend,
    isLoading,
    refetch: fetchHistory,
  };
}
