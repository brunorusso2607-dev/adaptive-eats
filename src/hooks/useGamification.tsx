import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, subDays, parseISO, differenceInDays } from "date-fns";
import confetti from "canvas-confetti";
import { WATER_ACHIEVEMENTS, WaterAchievementKey } from "./useWaterAchievements";

// Health milestones - professional naming, no emojis
export const HEALTH_MILESTONES = {
  first_meal: {
    key: "first_meal",
    name: "Primeiro Passo",
    description: "Registrou sua primeira refeição",
    xp: 50,
  },
  streak_3: {
    key: "streak_3",
    name: "3 Dias Consistente",
    description: "Manteve a rotina por 3 dias seguidos",
    xp: 100,
  },
  streak_7: {
    key: "streak_7",
    name: "Semana Completa",
    description: "7 dias de disciplina alimentar",
    xp: 200,
  },
  streak_14: {
    key: "streak_14",
    name: "Duas Semanas",
    description: "14 dias de consistência",
    xp: 400,
  },
  streak_30: {
    key: "streak_30",
    name: "Mês de Foco",
    description: "30 dias de dedicação à sua saúde",
    xp: 1000,
  },
  adherence_80: {
    key: "adherence_80",
    name: "Aderência 80%",
    description: "Alcançou 80% de aderência semanal",
    xp: 150,
  },
  adherence_100: {
    key: "adherence_100",
    name: "Aderência Total",
    description: "100% de aderência na semana",
    xp: 300,
  },
  meals_10: {
    key: "meals_10",
    name: "10 Refeições",
    description: "Completou 10 refeições registradas",
    xp: 100,
  },
  meals_50: {
    key: "meals_50",
    name: "50 Refeições",
    description: "Completou 50 refeições registradas",
    xp: 300,
  },
  meals_100: {
    key: "meals_100",
    name: "100 Refeições",
    description: "Completou 100 refeições registradas",
    xp: 500,
  },
} as const;

// Legacy export for backwards compatibility
export const ACHIEVEMENTS = HEALTH_MILESTONES;

export type AchievementKey = keyof typeof HEALTH_MILESTONES;

// Level calculation based on XP
export function calculateLevel(xp: number): { level: number; xpInLevel: number; xpForNextLevel: number; progress: number } {
  let level = 1;
  let totalXpForLevel = 0;
  
  while (true) {
    const xpForThisLevel = Math.floor(100 * Math.pow(level, 1.5));
    if (totalXpForLevel + xpForThisLevel > xp) {
      const xpInLevel = xp - totalXpForLevel;
      const progress = (xpInLevel / xpForThisLevel) * 100;
      return { level, xpInLevel, xpForNextLevel: xpForThisLevel, progress };
    }
    totalXpForLevel += xpForThisLevel;
    level++;
  }
}

export type GamificationData = {
  totalXp: number;
  mealXp: number;
  waterXp: number;
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
  levelProgress: number;
  longestStreak: number;
  currentStreak: number;
  totalMealsCompleted: number;
  weeklyAdherence: number;
  mealsCompletedThisWeek: number;
  mealsPlannedThisWeek: number;
  unlockedAchievements: AchievementKey[];
  waterAchievements: WaterAchievementKey[];
  newAchievements: AchievementKey[];
  isLoading: boolean;
};

export function useGamification() {
  const [data, setData] = useState<GamificationData>({
    totalXp: 0,
    mealXp: 0,
    waterXp: 0,
    level: 1,
    xpInLevel: 0,
    xpForNextLevel: 100,
    levelProgress: 0,
    longestStreak: 0,
    currentStreak: 0,
    totalMealsCompleted: 0,
    weeklyAdherence: 0,
    mealsCompletedThisWeek: 0,
    mealsPlannedThisWeek: 0,
    unlockedAchievements: [],
    waterAchievements: [],
    newAchievements: [],
    isLoading: true,
  });

  const checkAndUnlockAchievements = useCallback(async (
    userId: string,
    currentStreak: number,
    longestStreak: number,
    totalMeals: number,
    weeklyAdherence: number,
    existingAchievements: string[]
  ): Promise<{ newAchievements: AchievementKey[], xpGained: number }> => {
    const newAchievements: AchievementKey[] = [];
    let xpGained = 0;

    const achievementsToCheck: { key: AchievementKey; condition: boolean }[] = [
      { key: "first_meal", condition: totalMeals >= 1 },
      { key: "streak_3", condition: currentStreak >= 3 || longestStreak >= 3 },
      { key: "streak_7", condition: currentStreak >= 7 || longestStreak >= 7 },
      { key: "streak_14", condition: currentStreak >= 14 || longestStreak >= 14 },
      { key: "streak_30", condition: currentStreak >= 30 || longestStreak >= 30 },
      { key: "adherence_80", condition: weeklyAdherence >= 80 },
      { key: "adherence_100", condition: weeklyAdherence >= 100 },
      { key: "meals_10", condition: totalMeals >= 10 },
      { key: "meals_50", condition: totalMeals >= 50 },
      { key: "meals_100", condition: totalMeals >= 100 },
    ];

    for (const { key, condition } of achievementsToCheck) {
      if (condition && !existingAchievements.includes(key)) {
        newAchievements.push(key);
        xpGained += HEALTH_MILESTONES[key].xp;

        await supabase.from("user_achievements").insert({
          user_id: userId,
          achievement_key: key,
        });
      }
    }

    return { newAchievements, xpGained };
  }, []);

  const loadGamificationData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const userId = session.user.id;
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      const [
        consumptionsResult,
        mealPlanItemsResult,
        gamificationResult,
        achievementsResult,
        profileResult,
      ] = await Promise.all([
        supabase
          .from("meal_consumption")
          .select("consumed_at, followed_plan, source_type")
          .eq("user_id", userId)
          .order("consumed_at", { ascending: false }),
        supabase
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
          .lte("created_at", weekEnd.toISOString()),
        supabase
          .from("user_gamification")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_achievements")
          .select("achievement_key")
          .eq("user_id", userId),
        supabase
          .from("profiles")
          .select("enabled_meals")
          .eq("id", userId)
          .single(),
      ]);

      const consumptions = consumptionsResult.data || [];
      const mealPlanItems = (mealPlanItemsResult.data || []).filter(
        (item: any) => item.meal_plans?.user_id === userId && item.meal_plans?.is_active
      );
      const gamification = gamificationResult.data;
      const achievements = (achievementsResult.data || []).map((a: any) => a.achievement_key);
      const enabledMealsCount = profileResult.data?.enabled_meals?.length || 5;

      // Filter consumptions: exclude auto_skipped for XP calculation, but include for streak
      const validConsumptions = consumptions.filter(
        (c: any) => c.source_type !== "auto_skipped"
      );
      
      let currentStreak = 0;
      let longestStreak = gamification?.longest_streak || 0;
      const totalMealsCompleted = validConsumptions.length; // Only count real meals for XP

      if (consumptions.length > 0) {
        // Group ALL consumptions (including auto_skipped) by date for streak calculation
        const consumptionsByDate = new Map<string, { completed: number; skipped: number }>();
        
        consumptions.forEach((c: any) => {
          const dateKey = format(parseISO(c.consumed_at), "yyyy-MM-dd");
          const existing = consumptionsByDate.get(dateKey) || { completed: 0, skipped: 0 };
          
          if (c.source_type === "auto_skipped") {
            existing.skipped++;
          } else {
            existing.completed++;
          }
          
          consumptionsByDate.set(dateKey, existing);
        });

        // NEW STREAK LOGIC: Streak maintains if ≥50% of enabled meals were completed
        const todayKey = format(today, "yyyy-MM-dd");
        const yesterdayKey = format(subDays(today, 1), "yyyy-MM-dd");
        
        // Check if streak is active (today or yesterday had valid activity)
        const todayData = consumptionsByDate.get(todayKey);
        const yesterdayData = consumptionsByDate.get(yesterdayKey);
        
        const isDayValid = (data: { completed: number; skipped: number } | undefined): boolean => {
          if (!data) return false;
          const total = data.completed + data.skipped;
          if (total === 0) return false;
          // Streak maintains if completed ≥50% of meals that day
          return data.completed / total >= 0.5;
        };
        
        const isTodayValid = isDayValid(todayData);
        const isYesterdayValid = isDayValid(yesterdayData);
        const streakActive = isTodayValid || isYesterdayValid;

        if (streakActive) {
          let checkDate = isTodayValid ? today : subDays(today, 1);
          while (true) {
            const dateKey = format(checkDate, "yyyy-MM-dd");
            const dayData = consumptionsByDate.get(dateKey);
            
            if (isDayValid(dayData)) {
              currentStreak++;
              checkDate = subDays(checkDate, 1);
            } else {
              break;
            }
          }
        }

        // Calculate longest streak with new logic
        const sortedDates = Array.from(consumptionsByDate.keys()).sort();
        let tempStreak = 0;
        let prevDate: Date | null = null;
        
        sortedDates.forEach(dateStr => {
          const currentDate = parseISO(dateStr);
          const dayData = consumptionsByDate.get(dateStr);
          
          if (!isDayValid(dayData)) {
            // Invalid day breaks streak
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 0;
            prevDate = null;
            return;
          }
          
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

      // Weekly adherence calculation: include auto_skipped as "not completed" for accurate %
      // mealsPlannedThisWeek = all items in the week
      // mealsCompletedThisWeek = items with completed_at AND NOT auto_skipped
      const mealsPlannedThisWeek = mealPlanItems.length;
      
      // Get meal IDs that were completed this week
      const completedItemIds = mealPlanItems
        .filter((item: any) => item.completed_at !== null)
        .map((item: any) => item.id);
      
      // Check which of these were auto_skipped (should not count as completed for adherence)
      let mealsCompletedThisWeek = completedItemIds.length;
      
      if (completedItemIds.length > 0) {
        // Count auto_skipped meals in this week's consumption
        const autoSkippedCount = consumptions.filter((c: any) => {
          if (c.source_type !== "auto_skipped") return false;
          const consumedDate = parseISO(c.consumed_at);
          return consumedDate >= weekStart && consumedDate <= weekEnd;
        }).length;
        
        // Subtract auto_skipped from completed count
        mealsCompletedThisWeek = Math.max(0, completedItemIds.length - autoSkippedCount);
      }
      
      const weeklyAdherence = mealsPlannedThisWeek > 0
        ? Math.round((mealsCompletedThisWeek / mealsPlannedThisWeek) * 100)
        : 0;

      const { newAchievements, xpGained } = await checkAndUnlockAchievements(
        userId,
        currentStreak,
        longestStreak,
        totalMealsCompleted,
        weeklyAdherence,
        achievements.filter((a: string) => !a.startsWith("water_"))
      );

      // Fetch water achievements for XP calculation
      const waterAchievementKeys = achievements
        .filter((a: string) => a.startsWith("water_"))
        .map((a: string) => a.replace("water_", "") as WaterAchievementKey);

      const waterXp = waterAchievementKeys.reduce((sum: number, key: WaterAchievementKey) => {
        return sum + (WATER_ACHIEVEMENTS[key]?.xp || 0);
      }, 0);

      const baseXp = totalMealsCompleted * 10;
      const mealAchievementXp = [...achievements.filter((a: string) => !a.startsWith("water_")), ...newAchievements].reduce((sum, key) => {
        const achievement = HEALTH_MILESTONES[key as AchievementKey];
        return sum + (achievement?.xp || 0);
      }, 0);
      const mealXp = baseXp + mealAchievementXp;
      const totalXp = mealXp + waterXp;

      const currentData = gamification || { total_xp: 0, longest_streak: 0, total_meals_completed: 0 };
      if (
        totalXp !== currentData.total_xp ||
        longestStreak !== currentData.longest_streak ||
        totalMealsCompleted !== currentData.total_meals_completed
      ) {
        await supabase.from("user_gamification").upsert(
          {
            user_id: userId,
            total_xp: totalXp,
            current_level: calculateLevel(totalXp).level,
            longest_streak: longestStreak,
            total_meals_completed: totalMealsCompleted,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      }

      if (newAchievements.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      const levelInfo = calculateLevel(totalXp);

      setData({
        totalXp,
        mealXp,
        waterXp,
        level: levelInfo.level,
        xpInLevel: levelInfo.xpInLevel,
        xpForNextLevel: levelInfo.xpForNextLevel,
        levelProgress: levelInfo.progress,
        longestStreak,
        currentStreak,
        totalMealsCompleted,
        weeklyAdherence,
        mealsCompletedThisWeek,
        mealsPlannedThisWeek,
        unlockedAchievements: [...achievements.filter((a: string) => !a.startsWith("water_")), ...newAchievements] as AchievementKey[],
        waterAchievements: waterAchievementKeys,
        newAchievements,
        isLoading: false,
      });

    } catch (error) {
      console.error("Error loading gamification data:", error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkAndUnlockAchievements]);

  // Defer initial load to avoid blocking first render
  useEffect(() => {
    const timer = setTimeout(() => {
      loadGamificationData();
    }, 1000); // 1s delay for initial load
    return () => clearTimeout(timer);
  }, [loadGamificationData]);

  const refresh = useCallback(() => {
    setData(prev => ({ ...prev, isLoading: true }));
    loadGamificationData();
  }, [loadGamificationData]);

  return { ...data, refresh };
}
