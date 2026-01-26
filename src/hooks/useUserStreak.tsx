import { useGamification } from "./useGamification";
import { format, subDays } from "date-fns";

type StreakData = {
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number;
  mealsCompletedThisWeek: number;
  mealsPlannedThisWeek: number;
  lastActivityDate: string | null;
  isLoading: boolean;
};

/**
 * Hook refatorado para usar dados do useGamification
 * Evita duplicação de queries e mantém consistência de dados
 */
export function useUserStreak() {
  const gamification = useGamification();

  // Derive lastActivityDate from gamification data
  // If there's a current streak, last activity is today or yesterday
  const lastActivityDate = gamification.currentStreak > 0
    ? format(
        gamification.currentStreak > 0 ? new Date() : subDays(new Date(), 1),
        "yyyy-MM-dd"
      )
    : null;

  const streakData: StreakData = {
    currentStreak: gamification.currentStreak,
    longestStreak: gamification.longestStreak,
    weeklyAdherence: gamification.weeklyAdherence,
    mealsCompletedThisWeek: gamification.mealsCompletedThisWeek,
    mealsPlannedThisWeek: gamification.mealsPlannedThisWeek,
    lastActivityDate,
    isLoading: gamification.isLoading,
  };

  const refreshStreak = () => {
    gamification.refresh();
  };

  return { ...streakData, refreshStreak };
}
