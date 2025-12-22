import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Flame, Target, Trophy, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type GamificationCardProps = {
  level: number;
  totalXp: number;
  xpInLevel: number;
  xpForNextLevel: number;
  levelProgress: number;
  currentStreak: number;
  longestStreak: number;
  weeklyAdherence: number;
  mealsCompletedThisWeek: number;
  mealsPlannedThisWeek: number;
  totalMealsCompleted: number;
  isLoading?: boolean;
};

export default function GamificationCard({
  level,
  totalXp,
  xpInLevel,
  xpForNextLevel,
  levelProgress,
  currentStreak,
  longestStreak,
  weeklyAdherence,
  mealsCompletedThisWeek,
  mealsPlannedThisWeek,
  totalMealsCompleted,
  isLoading,
}: GamificationCardProps) {
  if (isLoading) {
    return (
      <Card className="glass-card border-border/50 overflow-hidden animate-pulse">
        <CardContent className="p-4 space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="flex gap-2">
            <div className="h-10 bg-muted rounded flex-1" />
            <div className="h-10 bg-muted rounded flex-1" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se não há dados ainda
  if (totalMealsCompleted === 0 && currentStreak === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header com Nível e XP */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <span className="text-lg font-bold text-white">{level}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Star className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground">Nível {level}</h3>
              <p className="text-xs text-muted-foreground">{totalXp.toLocaleString()} XP total</p>
            </div>
          </div>
          
          {longestStreak > 0 && longestStreak > currentStreak && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Recorde: {longestStreak}d
              </span>
            </div>
          )}
        </div>

        {/* Barra de Progresso do Nível */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso para Nível {level + 1}</span>
            <span>{xpInLevel}/{xpForNextLevel} XP</span>
          </div>
          <Progress value={levelProgress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Streak Atual */}
          {currentStreak > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
              <Flame className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-sm font-bold text-orange-700 dark:text-orange-300">
                  {currentStreak} {currentStreak === 1 ? "dia" : "dias"}
                </p>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70">seguidos 🔥</p>
              </div>
            </div>
          )}

          {/* Aderência Semanal */}
          {mealsPlannedThisWeek > 0 && (
            <div className={cn(
              "flex items-center gap-2 p-2.5 rounded-xl",
              weeklyAdherence >= 80
                ? "bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30"
                : weeklyAdherence >= 50
                  ? "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30"
                  : "bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30"
            )}>
              <Target className={cn(
                "w-5 h-5",
                weeklyAdherence >= 80
                  ? "text-emerald-500"
                  : weeklyAdherence >= 50
                    ? "text-amber-500"
                    : "text-red-500"
              )} />
              <div>
                <p className={cn(
                  "text-sm font-bold",
                  weeklyAdherence >= 80
                    ? "text-emerald-700 dark:text-emerald-300"
                    : weeklyAdherence >= 50
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-red-700 dark:text-red-300"
                )}>
                  {weeklyAdherence}%
                </p>
                <p className={cn(
                  "text-xs",
                  weeklyAdherence >= 80
                    ? "text-emerald-600/70 dark:text-emerald-400/70"
                    : weeklyAdherence >= 50
                      ? "text-amber-600/70 dark:text-amber-400/70"
                      : "text-red-600/70 dark:text-red-400/70"
                )}>
                  {mealsCompletedThisWeek}/{mealsPlannedThisWeek} refeições
                </p>
              </div>
            </div>
          )}

          {/* Total de Refeições - Mostra se não tem streak nem aderência */}
          {currentStreak === 0 && mealsPlannedThisWeek === 0 && totalMealsCompleted > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 col-span-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {totalMealsCompleted} refeições
                </p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">completadas no total</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
