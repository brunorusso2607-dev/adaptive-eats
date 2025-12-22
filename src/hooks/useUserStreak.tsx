import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, subDays, parseISO, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

type StreakData = {
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number;
  mealsCompletedThisWeek: number;
  mealsPlannedThisWeek: number;
  lastActivityDate: string | null;
  isLoading: boolean;
};

export function useUserStreak() {
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    weeklyAdherence: 0,
    mealsCompletedThisWeek: 0,
    mealsPlannedThisWeek: 0,
    lastActivityDate: null,
    isLoading: true,
  });

  useEffect(() => {
    calculateStreak();
  }, []);

  const calculateStreak = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStreakData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const userId = session.user.id;
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      // Get all meal consumption records ordered by date
      const { data: consumptions, error: consumptionError } = await supabase
        .from("meal_consumption")
        .select("consumed_at, followed_plan")
        .eq("user_id", userId)
        .order("consumed_at", { ascending: false });

      if (consumptionError) {
        console.error("Error fetching consumption:", consumptionError);
        setStreakData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Get meal plan items for the current week
      const { data: mealPlanItems, error: planError } = await supabase
        .from("meal_plan_items")
        .select(`
          id,
          completed_at,
          meal_plan_id,
          meal_plans!inner (
            user_id,
            is_active
          )
        `)
        .gte("created_at", weekStart.toISOString())
        .lte("created_at", weekEnd.toISOString());

      // Filter by user and active plans
      const userMealPlanItems = mealPlanItems?.filter(
        (item: any) => item.meal_plans?.user_id === userId && item.meal_plans?.is_active
      ) || [];

      // Calculate streak
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      let lastActivityDate: string | null = null;

      if (consumptions && consumptions.length > 0) {
        // Group consumptions by date
        const consumptionsByDate = new Map<string, boolean>();
        
        consumptions.forEach(c => {
          const dateKey = format(parseISO(c.consumed_at), "yyyy-MM-dd");
          consumptionsByDate.set(dateKey, true);
        });

        // Get the last activity date
        const sortedDates = Array.from(consumptionsByDate.keys()).sort().reverse();
        lastActivityDate = sortedDates[0] || null;

        // Calculate current streak (consecutive days from today or yesterday)
        const todayKey = format(today, "yyyy-MM-dd");
        const yesterdayKey = format(subDays(today, 1), "yyyy-MM-dd");

        // Check if streak is still active (activity today or yesterday)
        const streakActive = consumptionsByDate.has(todayKey) || consumptionsByDate.has(yesterdayKey);

        if (streakActive) {
          // Count consecutive days backwards
          let checkDate = consumptionsByDate.has(todayKey) ? today : subDays(today, 1);
          
          while (true) {
            const dateKey = format(checkDate, "yyyy-MM-dd");
            if (consumptionsByDate.has(dateKey)) {
              currentStreak++;
              checkDate = subDays(checkDate, 1);
            } else {
              break;
            }
          }
        }

        // Calculate longest streak
        let prevDate: Date | null = null;
        sortedDates.reverse().forEach(dateStr => {
          const currentDate = parseISO(dateStr);
          
          if (prevDate === null) {
            tempStreak = 1;
          } else {
            const daysDiff = differenceInDays(currentDate, prevDate);
            if (daysDiff === 1) {
              tempStreak++;
            } else {
              longestStreak = Math.max(longestStreak, tempStreak);
              tempStreak = 1;
            }
          }
          prevDate = currentDate;
        });
        longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
      }

      // Calculate weekly adherence
      const mealsPlannedThisWeek = userMealPlanItems.length;
      const mealsCompletedThisWeek = userMealPlanItems.filter(
        (item: any) => item.completed_at !== null
      ).length;

      const weeklyAdherence = mealsPlannedThisWeek > 0
        ? Math.round((mealsCompletedThisWeek / mealsPlannedThisWeek) * 100)
        : 0;

      console.log("[useUserStreak] Calculated streak data:", {
        currentStreak,
        longestStreak,
        weeklyAdherence,
        mealsCompletedThisWeek,
        mealsPlannedThisWeek,
        lastActivityDate,
      });

      setStreakData({
        currentStreak,
        longestStreak,
        weeklyAdherence,
        mealsCompletedThisWeek,
        mealsPlannedThisWeek,
        lastActivityDate,
        isLoading: false,
      });

    } catch (error) {
      console.error("Error calculating streak:", error);
      setStreakData(prev => ({ ...prev, isLoading: false }));
    }
  };

  const refreshStreak = () => {
    setStreakData(prev => ({ ...prev, isLoading: true }));
    calculateStreak();
  };

  return { ...streakData, refreshStreak };
}
