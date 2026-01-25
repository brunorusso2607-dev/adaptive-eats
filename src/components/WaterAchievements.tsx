import { Droplets, Trophy, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { WATER_ACHIEVEMENTS, WaterAchievementKey, useWaterAchievements } from "@/hooks/useWaterAchievements";
import { cn } from "@/lib/utils";

interface WaterAchievementsProps {
  compact?: boolean;
}

export function WaterAchievements({ compact = false }: WaterAchievementsProps) {
  const { unlockedAchievements, totalXp, hydrationStreak, isLoading } = useWaterAchievements();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const allAchievements = Object.values(WATER_ACHIEVEMENTS);
  const unlockedCount = unlockedAchievements.length;
  const totalCount = allAchievements.length;
  const progress = (unlockedCount / totalCount) * 100;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-blue-500/10 rounded-lg">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{unlockedCount}/{totalCount}</span>
            <span className="text-xs text-muted-foreground">conquistas</span>
          </div>
          <Progress value={progress} className="h-1.5 mt-1" />
        </div>
        {hydrationStreak > 0 && (
          <div className="text-center shrink-0">
            <span className="text-lg font-bold text-blue-600">{hydrationStreak}</span>
            <p className="text-xs text-muted-foreground">dias</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-blue-500" />
            Conquistas de Hidratação
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {unlockedCount}/{totalCount}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalXp}</p>
            <p className="text-xs text-muted-foreground">XP de água</p>
          </div>
          <div className="bg-orange-500/10 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{hydrationStreak}</p>
            <p className="text-xs text-muted-foreground">Dias na meta</p>
          </div>
        </div>

        {/* Achievement Grid */}
        <div className="grid grid-cols-3 gap-2">
          {allAchievements.map((achievement) => {
            const isUnlocked = unlockedAchievements.includes(achievement.key as WaterAchievementKey);
            
            return (
              <div
                key={achievement.key}
                className={cn(
                  "relative flex flex-col items-center p-3 rounded-lg border-2 transition-all",
                  isUnlocked
                    ? "border-blue-500/50 bg-blue-500/10"
                    : "border-muted bg-muted/30 opacity-60"
                )}
              >
                <span className="text-2xl mb-1">
                  {isUnlocked ? achievement.icon : "🔒"}
                </span>
                <p className={cn(
                  "text-xs font-medium text-center leading-tight",
                  isUnlocked ? "text-foreground" : "text-muted-foreground"
                )}>
                  {achievement.name}
                </p>
                {isUnlocked && (
                  <span className="text-[10px] text-blue-600 mt-0.5">
                    +{achievement.xp} XP
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Achievement Details */}
        <div className="space-y-2 pt-2 border-t">
          <h4 className="text-sm font-medium text-muted-foreground">Próximas conquistas</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {allAchievements
              .filter(a => !unlockedAchievements.includes(a.key as WaterAchievementKey))
              .slice(0, 3)
              .map((achievement) => (
                <div
                  key={achievement.key}
                  className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg"
                >
                  <span className="text-xl opacity-50">{achievement.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {achievement.description}
                    </p>
                  </div>
                  <span className="text-xs text-blue-600 shrink-0">
                    +{achievement.xp} XP
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
