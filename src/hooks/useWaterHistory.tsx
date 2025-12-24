import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DailyWaterData {
  date: string;
  dateLabel: string;
  dayOfWeek: string;
  total_ml: number;
  goal_ml: number;
  percentage: number;
  entries: number;
}

export interface WaterHistoryStats {
  averageDaily: number;
  bestDay: DailyWaterData | null;
  totalDays: number;
  daysOnGoal: number;
  currentStreak: number;
}

export function useWaterHistory(days: number = 7) {
  const [history, setHistory] = useState<DailyWaterData[]>([]);
  const [stats, setStats] = useState<WaterHistoryStats>({
    averageDaily: 0,
    bestDay: null,
    totalDays: 0,
    daysOnGoal: 0,
    currentStreak: 0,
  });
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user's water goal
      const { data: settingsData } = await supabase
        .from("water_settings")
        .select("daily_goal_ml")
        .eq("user_id", user.id)
        .maybeSingle();

      const goalMl = settingsData?.daily_goal_ml || 2000;
      setDailyGoal(goalMl);

      // Calculate date range
      const endDate = endOfDay(new Date());
      const startDate = startOfDay(subDays(new Date(), days - 1));

      // Fetch consumption data
      const { data, error } = await supabase
        .from("water_consumption")
        .select("amount_ml, consumed_at")
        .eq("user_id", user.id)
        .gte("consumed_at", startDate.toISOString())
        .lte("consumed_at", endDate.toISOString())
        .order("consumed_at", { ascending: true });

      if (error) throw error;

      // Create array of all days in range
      const allDays = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Group by day
      const dailyData: DailyWaterData[] = allDays.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        
        const dayEntries = (data || []).filter((entry) => {
          const entryDate = new Date(entry.consumed_at);
          return entryDate >= dayStart && entryDate <= dayEnd;
        });

        const total_ml = dayEntries.reduce((sum, entry) => sum + entry.amount_ml, 0);
        
        return {
          date: format(day, "yyyy-MM-dd"),
          dateLabel: format(day, "dd/MM", { locale: ptBR }),
          dayOfWeek: format(day, "EEE", { locale: ptBR }),
          total_ml,
          goal_ml: goalMl,
          percentage: Math.round((total_ml / goalMl) * 100),
          entries: dayEntries.length,
        };
      });

      setHistory(dailyData);

      // Calculate stats
      const daysWithData = dailyData.filter((d) => d.total_ml > 0);
      const averageDaily = daysWithData.length > 0 
        ? Math.round(daysWithData.reduce((sum, d) => sum + d.total_ml, 0) / daysWithData.length)
        : 0;
      
      const bestDay = dailyData.reduce((best, current) => 
        current.total_ml > (best?.total_ml || 0) ? current : best
      , dailyData[0] || null);

      const daysOnGoal = dailyData.filter((d) => d.percentage >= 100).length;

      // Calculate current streak
      let currentStreak = 0;
      const reversedDays = [...dailyData].reverse();
      for (const day of reversedDays) {
        if (day.percentage >= 100) {
          currentStreak++;
        } else if (day.total_ml > 0) {
          break;
        }
      }

      setStats({
        averageDaily,
        bestDay,
        totalDays: daysWithData.length,
        daysOnGoal,
        currentStreak,
      });

    } catch (error) {
      console.error("Error fetching water history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, stats, dailyGoal, isLoading, refetch: fetchHistory };
}
