import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Award, Lock } from "lucide-react";
import { ACHIEVEMENTS, type AchievementKey } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";

type AchievementBadgesProps = {
  unlockedAchievements: AchievementKey[];
  newAchievements?: AchievementKey[];
};

export default function AchievementBadges({ 
  unlockedAchievements, 
  newAchievements = [] 
}: AchievementBadgesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const allAchievements = Object.values(ACHIEVEMENTS);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 px-2 gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Award className="w-5 h-5 text-amber-500" />
          {unlockedAchievements.length > 0 && (
            <span className="text-xs font-medium">
              {unlockedAchievements.length}/{allAchievements.length}
            </span>
          )}
          {newAchievements.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Suas Conquistas
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6 overflow-auto max-h-[calc(70vh-100px)]">
          {/* Desbloqueadas */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Desbloqueadas ({unlockedAchievements.length}/{allAchievements.length})
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {allAchievements.map((achievement) => {
                const isUnlocked = unlockedAchievements.includes(achievement.key as AchievementKey);
                const isNew = newAchievements.includes(achievement.key as AchievementKey);
                
                return (
                  <div
                    key={achievement.key}
                    className={cn(
                      "p-3 rounded-xl border transition-all",
                      isUnlocked
                        ? isNew
                          ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400/50"
                          : "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-muted/30 border-border/50 opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "text-2xl flex-shrink-0",
                        !isUnlocked && "grayscale opacity-50"
                      )}>
                        {isUnlocked ? achievement.icon : <Lock className="w-6 h-6 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isUnlocked ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {achievement.name}
                          </p>
                          {isNew && (
                            <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0">
                              NOVO
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {achievement.description}
                        </p>
                        <p className={cn(
                          "text-xs font-medium mt-1",
                          isUnlocked ? "text-primary" : "text-muted-foreground"
                        )}>
                          +{achievement.xp} XP
                        </p>
                      </div>
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
