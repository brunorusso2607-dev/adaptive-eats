import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, subDays, parseISO, differenceInDays } from "date-fns";
import confetti from "canvas-confetti";

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
  newAchievements: AchievementKey[];
  isLoading: boolean;
};

export function useGamification() {
  const [data, setData] = useState<GamificationData>({
    totalXp: 0,
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
      ] = await Promise.all([
        supabase
          .from("meal_consumption")
          .select("consumed_at, followed_plan")
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
      ]);

      const consumptions = consumptionsResult.data || [];
      const mealPlanItems = (mealPlanItemsResult.data || []).filter(
        (item: any) => item.meal_plans?.user_id === userId && item.meal_plans?.is_active
      );
      const gamification = gamificationResult.data;
      const achievements = (achievementsResult.data || []).map((a: any) => a.achievement_key);

      let currentStreak = 0;
      let longestStreak = gamification?.longest_streak || 0;
      const totalMealsCompleted = consumptions.length;

      if (consumptions.length > 0) {
        const consumptionsByDate = new Map<string, boolean>();
        consumptions.forEach(c => {
          const dateKey = format(parseISO(c.consumed_at), "yyyy-MM-dd");
          consumptionsByDate.set(dateKey, true);
        });

        const todayKey = format(today, "yyyy-MM-dd");
        const yesterdayKey = format(subDays(today, 1), "yyyy-MM-dd");
        const streakActive = consumptionsByDate.has(todayKey) || consumptionsByDate.has(yesterdayKey);

        if (streakActive) {
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

        const sortedDates = Array.from(consumptionsByDate.keys()).sort();
        let tempStreak = 0;
        let prevDate: Date | null = null;
        
        sortedDates.forEach(dateStr => {
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

      const mealsPlannedThisWeek = mealPlanItems.length;
      const mealsCompletedThisWeek = mealPlanItems.filter((item: any) => item.completed_at !== null).length;
      const weeklyAdherence = mealsPlannedThisWeek > 0
        ? Math.round((mealsCompletedThisWeek / mealsPlannedThisWeek) * 100)
        : 0;

      const { newAchievements, xpGained } = await checkAndUnlockAchievements(
        userId,
        currentStreak,
        longestStreak,
        totalMealsCompleted,
        weeklyAdherence,
        achievements
      );

      const baseXp = totalMealsCompleted * 10;
      const achievementXp = [...achievements, ...newAchievements].reduce((sum, key) => {
        const achievement = HEALTH_MILESTONES[key as AchievementKey];
        return sum + (achievement?.xp || 0);
      }, 0);
      const totalXp = baseXp + achievementXp;

      const currentData = gamification || { total_xp: 0, longest_streak: 0, total_meals_completed: 0 };
      if (
        totalXp !== currentData.total_xp ||
        longestStreak !== currentData.longest_streak ||
        totalMealsCompleted !== currentData.total_meals_completed
      ) {
        await supabase.from("user_gamification").upsert({
          user_id: userId,
          total_xp: totalXp,
          current_level: calculateLevel(totalXp).level,
          longest_streak: longestStreak,
          total_meals_completed: totalMealsCompleted,
          updated_at: new Date().toISOString(),
        });
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
        unlockedAchievements: [...achievements, ...newAchievements] as AchievementKey[],
        newAchievements,
        isLoading: false,
      });

    } catch (error) {
      console.error("Error loading gamification data:", error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [checkAndUnlockAchievements]);

  useEffect(() => {
    loadGamificationData();
  }, [loadGamificationData]);

  const refresh = useCallback(() => {
    setData(prev => ({ ...prev, isLoading: true }));
    loadGamificationData();
  }, [loadGamificationData]);

  return { ...data, refresh };
}
