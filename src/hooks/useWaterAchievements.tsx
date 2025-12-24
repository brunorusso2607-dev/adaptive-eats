import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import confetti from "canvas-confetti";
import { useToast } from "./use-toast";

// Water achievements
export const WATER_ACHIEVEMENTS = {
  first_glass: {
    key: "first_glass",
    name: "Primeira Gota",
    description: "Registrou seu primeiro copo de água",
    icon: "💧",
    xp: 25,
  },
  first_liter: {
    key: "first_liter",
    name: "Primeiro Litro",
    description: "Bebeu 1 litro em um único dia",
    icon: "🥛",
    xp: 50,
  },
  daily_goal: {
    key: "daily_goal",
    name: "Meta Diária",
    description: "Atingiu sua meta de água pela primeira vez",
    icon: "🎯",
    xp: 75,
  },
  hydration_streak_3: {
    key: "hydration_streak_3",
    name: "3 Dias Hidratado",
    description: "Atingiu a meta por 3 dias seguidos",
    icon: "🔥",
    xp: 100,
  },
  hydration_streak_7: {
    key: "hydration_streak_7",
    name: "Semana Hidratada",
    description: "7 dias consecutivos na meta",
    icon: "⭐",
    xp: 200,
  },
  hydration_streak_14: {
    key: "hydration_streak_14",
    name: "Duas Semanas",
    description: "14 dias consecutivos na meta",
    icon: "🏆",
    xp: 400,
  },
  hydration_streak_30: {
    key: "hydration_streak_30",
    name: "Mês Hidratado",
    description: "30 dias consecutivos na meta",
    icon: "👑",
    xp: 1000,
  },
  weekly_10l: {
    key: "weekly_10l",
    name: "10L na Semana",
    description: "Bebeu 10 litros em uma semana",
    icon: "💪",
    xp: 150,
  },
  weekly_15l: {
    key: "weekly_15l",
    name: "15L na Semana",
    description: "Bebeu 15 litros em uma semana",
    icon: "🌊",
    xp: 250,
  },
  early_bird: {
    key: "early_bird",
    name: "Madrugador",
    description: "Bebeu água antes das 7h da manhã",
    icon: "🌅",
    xp: 50,
  },
  night_owl: {
    key: "night_owl",
    name: "Noturno",
    description: "Bebeu água após as 22h",
    icon: "🌙",
    xp: 50,
  },
  consistency_king: {
    key: "consistency_king",
    name: "Rei da Consistência",
    description: "Bebeu água pelo menos 8 vezes em um dia",
    icon: "👑",
    xp: 100,
  },
  hydration_master: {
    key: "hydration_master",
    name: "Mestre da Hidratação",
    description: "Atingiu 150% da meta diária",
    icon: "🏅",
    xp: 150,
  },
} as const;

export type WaterAchievementKey = keyof typeof WATER_ACHIEVEMENTS;

export interface WaterAchievementData {
  unlockedAchievements: WaterAchievementKey[];
  newAchievements: WaterAchievementKey[];
  totalXp: number;
  hydrationStreak: number;
  isLoading: boolean;
}

export function useWaterAchievements() {
  const { toast } = useToast();
  const [data, setData] = useState<WaterAchievementData>({
    unlockedAchievements: [],
    newAchievements: [],
    totalXp: 0,
    hydrationStreak: 0,
    isLoading: true,
  });

  const checkAchievements = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setData(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Fetch existing water achievements
      const { data: existingAchievements } = await supabase
        .from("user_achievements")
        .select("achievement_key")
        .eq("user_id", user.id)
        .like("achievement_key", "water_%");

      const unlockedKeys = (existingAchievements || [])
        .map(a => a.achievement_key.replace("water_", "") as WaterAchievementKey)
        .filter(k => k in WATER_ACHIEVEMENTS);

      // Fetch water settings for goal
      const { data: settingsData } = await supabase
        .from("water_settings")
        .select("daily_goal_ml")
        .eq("user_id", user.id)
        .maybeSingle();

      const dailyGoal = settingsData?.daily_goal_ml || 2000;

      // Fetch last 30 days of consumption
      const thirtyDaysAgo = subDays(new Date(), 30);
      const { data: consumptions } = await supabase
        .from("water_consumption")
        .select("amount_ml, consumed_at")
        .eq("user_id", user.id)
        .gte("consumed_at", thirtyDaysAgo.toISOString())
        .order("consumed_at", { ascending: true });

      if (!consumptions || consumptions.length === 0) {
        setData({
          unlockedAchievements: unlockedKeys,
          newAchievements: [],
          totalXp: unlockedKeys.reduce((sum, k) => sum + (WATER_ACHIEVEMENTS[k]?.xp || 0), 0),
          hydrationStreak: 0,
          isLoading: false,
        });
        return;
      }

      // Calculate daily totals
      const dailyTotals = new Map<string, { total: number; entries: number }>();
      consumptions.forEach(c => {
        const dateKey = format(new Date(c.consumed_at), "yyyy-MM-dd");
        const existing = dailyTotals.get(dateKey) || { total: 0, entries: 0 };
        dailyTotals.set(dateKey, {
          total: existing.total + c.amount_ml,
          entries: existing.entries + 1,
        });
      });

      // Calculate streak of days meeting goal
      let hydrationStreak = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const dateKey = format(subDays(today, i), "yyyy-MM-dd");
        const dayData = dailyTotals.get(dateKey);
        if (dayData && dayData.total >= dailyGoal) {
          hydrationStreak++;
        } else if (i > 0) {
          break;
        }
      }

      // Calculate weekly total
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      let weeklyTotal = 0;
      consumptions.forEach(c => {
        const date = new Date(c.consumed_at);
        if (date >= weekStart && date <= weekEnd) {
          weeklyTotal += c.amount_ml;
        }
      });

      // Check for specific achievements
      const newAchievements: WaterAchievementKey[] = [];
      const todayKey = format(today, "yyyy-MM-dd");
      const todayData = dailyTotals.get(todayKey);

      // Check early bird (before 7am)
      const hasEarlyBird = consumptions.some(c => {
        const hour = new Date(c.consumed_at).getHours();
        return hour < 7;
      });

      // Check night owl (after 10pm)
      const hasNightOwl = consumptions.some(c => {
        const hour = new Date(c.consumed_at).getHours();
        return hour >= 22;
      });

      // Check if any day had 8+ entries
      const hasConsistencyKing = Array.from(dailyTotals.values()).some(d => d.entries >= 8);

      // Check if any day exceeded 150% of goal
      const hasHydrationMaster = Array.from(dailyTotals.values()).some(d => d.total >= dailyGoal * 1.5);

      // Check if any day reached 1L
      const hasFirstLiter = Array.from(dailyTotals.values()).some(d => d.total >= 1000);

      // Check if any day met goal
      const hasDailyGoal = Array.from(dailyTotals.values()).some(d => d.total >= dailyGoal);

      const achievementsToCheck: { key: WaterAchievementKey; condition: boolean }[] = [
        { key: "first_glass", condition: consumptions.length >= 1 },
        { key: "first_liter", condition: hasFirstLiter },
        { key: "daily_goal", condition: hasDailyGoal },
        { key: "hydration_streak_3", condition: hydrationStreak >= 3 },
        { key: "hydration_streak_7", condition: hydrationStreak >= 7 },
        { key: "hydration_streak_14", condition: hydrationStreak >= 14 },
        { key: "hydration_streak_30", condition: hydrationStreak >= 30 },
        { key: "weekly_10l", condition: weeklyTotal >= 10000 },
        { key: "weekly_15l", condition: weeklyTotal >= 15000 },
        { key: "early_bird", condition: hasEarlyBird },
        { key: "night_owl", condition: hasNightOwl },
        { key: "consistency_king", condition: hasConsistencyKing },
        { key: "hydration_master", condition: hasHydrationMaster },
      ];

      // Unlock new achievements
      for (const { key, condition } of achievementsToCheck) {
        if (condition && !unlockedKeys.includes(key)) {
          newAchievements.push(key);
          
          await supabase.from("user_achievements").insert({
            user_id: user.id,
            achievement_key: `water_${key}`,
          });
        }
      }

      // Show celebration for new achievements
      if (newAchievements.length > 0) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#3b82f6", "#60a5fa", "#93c5fd"],
        });

        newAchievements.forEach(key => {
          const achievement = WATER_ACHIEVEMENTS[key];
          toast({
            title: `${achievement.icon} ${achievement.name}`,
            description: achievement.description,
          });
        });
      }

      const allUnlocked = [...unlockedKeys, ...newAchievements];
      const totalXp = allUnlocked.reduce((sum, k) => sum + (WATER_ACHIEVEMENTS[k]?.xp || 0), 0);

      setData({
        unlockedAchievements: allUnlocked,
        newAchievements,
        totalXp,
        hydrationStreak,
        isLoading: false,
      });

    } catch (error) {
      console.error("Error checking water achievements:", error);
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast]);

  useEffect(() => {
    checkAchievements();
  }, [checkAchievements]);

  return { ...data, refresh: checkAchievements };
}
