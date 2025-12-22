import { useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Flame, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import HealthMilestonesSheet from "./HealthMilestonesSheet";
import type { AchievementKey } from "@/hooks/useGamification";

type HealthProgressStripProps = {
  level: number;
  totalXp: number;
  xpInLevel: number;
  xpForNextLevel: number;
  levelProgress: number;
  currentStreak: number;
  unlockedAchievements: AchievementKey[];
  newAchievements?: AchievementKey[];
  weeklyAdherence: number;
  mealsCompletedThisWeek: number;
  mealsPlannedThisWeek: number;
  totalMealsCompleted: number;
  longestStreak: number;
  isLoading?: boolean;
};

export default function HealthProgressStrip({
  level,
  totalXp,
  xpInLevel,
  xpForNextLevel,
  levelProgress,
  currentStreak,
  unlockedAchievements,
  newAchievements = [],
  weeklyAdherence,
  mealsCompletedThisWeek,
  mealsPlannedThisWeek,
  totalMealsCompleted,
  longestStreak,
  isLoading = false,
}: HealthProgressStripProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-14 bg-muted/30 rounded-xl animate-pulse" />
    );
  }

  return (
    <>
      <button
        onClick={() => setIsSheetOpen(true)}
        className={cn(
          "w-full px-3 py-2.5 rounded-xl",
          "bg-[hsl(var(--surface-subtle))] border border-border/30",
          "hover:border-border/60 transition-all",
          "flex items-center gap-3",
          "group cursor-pointer"
        )}
      >
        {/* Level Badge - Premium gold accent */}
        <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg gradient-xp shadow-[var(--shadow-glow-xp)]">
          <span className="text-sm font-bold text-white drop-shadow-sm">{level}</span>
        </div>

        {/* XP Progress - Compact */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Nível {level}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {xpInLevel}/{xpForNextLevel}
            </span>
          </div>
          <Progress 
            value={levelProgress} 
            variant="xp"
            className="h-1.5 bg-muted/40 rounded-full" 
          />
        </div>

        {/* Streak - Always visible, compact */}
        <div className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 tabular-nums">
            {currentStreak}
          </span>
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
      </button>

      <HealthMilestonesSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        level={level}
        totalXp={totalXp}
        xpInLevel={xpInLevel}
        xpForNextLevel={xpForNextLevel}
        levelProgress={levelProgress}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        weeklyAdherence={weeklyAdherence}
        mealsCompletedThisWeek={mealsCompletedThisWeek}
        mealsPlannedThisWeek={mealsPlannedThisWeek}
        totalMealsCompleted={totalMealsCompleted}
        unlockedAchievements={unlockedAchievements}
        newAchievements={newAchievements}
      />
    </>
  );
}
