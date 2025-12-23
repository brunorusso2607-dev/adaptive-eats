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
      <div className="h-12 bg-muted/30 rounded-xl animate-pulse" />
    );
  }

  return (
    <>
      <button
        onClick={() => setIsSheetOpen(true)}
        className={cn(
          "w-full px-3 py-2 rounded-xl",
          "bg-card border border-border",
          "hover:bg-accent/50 transition-all duration-200",
          "flex items-center gap-3",
          "group cursor-pointer"
        )}
      >
        {/* Level Badge - Minimal gold accent */}
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 border border-gold/20">
          <span className="text-xs font-semibold text-gold">{level}</span>
        </div>

        {/* XP Progress - Clean */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">
              Nível {level}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {xpInLevel}/{xpForNextLevel} XP
            </span>
          </div>
          <Progress 
            value={levelProgress} 
            variant="xp"
            pill
            className="bg-border" 
          />
        </div>

        {/* Streak - Semi-bold text with fire icon */}
        <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1">
          <Flame className="w-4 h-4 text-orange-500 stroke-[1.5]" />
          <span className="text-xs font-semibold text-foreground tabular-nums">
            {currentStreak} {currentStreak === 1 ? 'dia' : 'dias'}
          </span>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
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
