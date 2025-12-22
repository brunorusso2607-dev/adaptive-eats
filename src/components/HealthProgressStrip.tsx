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
          "w-full px-4 py-3 rounded-xl",
          "bg-card/80 backdrop-blur-sm border border-border/50",
          "hover:bg-card hover:border-border/80 transition-all",
          "flex items-center gap-4",
          "group cursor-pointer"
        )}
      >
        {/* Level Badge */}
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-muted/50 border border-border/30">
          <span className="text-sm font-semibold text-foreground">{level}</span>
        </div>

        {/* XP Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Nível {level}
            </span>
            <span className="text-xs text-muted-foreground">
              {xpInLevel}/{xpForNextLevel} XP
            </span>
          </div>
          <Progress 
            value={levelProgress} 
            className="h-1.5 bg-muted/50" 
          />
        </div>

        {/* Streak */}
        {currentStreak > 0 && (
          <div className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 border border-border/30">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-foreground">{currentStreak}</span>
          </div>
        )}

        {/* Arrow indicator */}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
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
