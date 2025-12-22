import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Flame, Target, TrendingUp, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { HEALTH_MILESTONES, type AchievementKey } from "@/hooks/useGamification";

type HealthMilestonesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  unlockedAchievements: AchievementKey[];
  newAchievements?: AchievementKey[];
};

export default function HealthMilestonesSheet({
  open,
  onOpenChange,
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
  unlockedAchievements,
  newAchievements = [],
}: HealthMilestonesSheetProps) {
  const allMilestones = Object.values(HEALTH_MILESTONES);
  const unlockedCount = unlockedAchievements.length;
  const totalCount = allMilestones.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg font-semibold text-foreground">
            Seu Progresso
          </SheetTitle>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100%-4rem)] pb-8 space-y-6">
          {/* Level & XP Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-foreground">{level}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nível {level}</p>
                  <p className="text-xs text-muted-foreground">{totalXp} XP total</p>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Próximo nível</span>
                <span>{xpInLevel}/{xpForNextLevel} XP</span>
              </div>
              <Progress value={levelProgress} variant="xp" className="h-2.5 bg-muted/50" />
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Streak */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
              <p className="text-lg font-semibold text-foreground">{currentStreak}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sequência</p>
            </div>

            {/* Weekly Adherence */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">{weeklyAdherence}%</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Aderência</p>
            </div>

            {/* Total Meals */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground">{totalMealsCompleted}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Refeições</p>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="flex justify-between text-sm px-1">
            <div className="text-muted-foreground">
              <span>Maior sequência: </span>
              <span className="font-medium text-foreground">{longestStreak} dias</span>
            </div>
            <div className="text-muted-foreground">
              <span>Esta semana: </span>
              <span className="font-medium text-foreground">{mealsCompletedThisWeek}/{mealsPlannedThisWeek}</span>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Milestones Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Marcos de Saúde</h3>
              <span className="text-xs text-muted-foreground">
                {unlockedCount}/{totalCount}
              </span>
            </div>

            <div className="space-y-2">
              {allMilestones.map((milestone) => {
                const isUnlocked = unlockedAchievements.includes(milestone.key as AchievementKey);
                const isNew = newAchievements.includes(milestone.key as AchievementKey);

                return (
                  <div
                    key={milestone.key}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      isUnlocked
                        ? isNew
                          ? "bg-primary/5 border-primary/30"
                          : "bg-muted/20 border-border/30"
                        : "bg-muted/10 border-border/20 opacity-50"
                    )}
                  >
                    {/* Status Icon */}
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        isUnlocked
                          ? "bg-emerald-500/10 text-emerald-600"
                          : "bg-muted/50 text-muted-foreground"
                      )}
                    >
                      {isUnlocked ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium truncate",
                            isUnlocked ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {milestone.name}
                        </p>
                        {isNew && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-primary text-primary-foreground rounded">
                            NOVO
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {milestone.description}
                      </p>
                    </div>

                    {/* XP Badge */}
                    <div
                      className={cn(
                        "text-xs font-medium flex-shrink-0",
                        isUnlocked ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      +{milestone.xp} XP
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
