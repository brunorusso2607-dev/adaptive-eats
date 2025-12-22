import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Award, ChevronRight, Lock } from "lucide-react";
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
  
  // Mostrar apenas as últimas 3 conquistas desbloqueadas na preview
  const recentUnlocked = unlockedAchievements.slice(-3).reverse();

  if (unlockedAchievements.length === 0) {
    return null;
  }

  return (
    <Card className="glass-card border-border/50 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-sm text-foreground">Conquistas</h3>
          </div>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                Ver todas
                <ChevronRight className="w-3 h-3 ml-1" />
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
        </div>

        {/* Preview das conquistas recentes */}
        <div className="flex gap-2 flex-wrap">
          {recentUnlocked.map((key) => {
            const achievement = ACHIEVEMENTS[key];
            const isNew = newAchievements.includes(key);
            
            return (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm",
                  isNew
                    ? "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 ring-2 ring-amber-400/50"
                    : "bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30"
                )}
              >
                <span className="text-base">{achievement.icon}</span>
                <span className={cn(
                  "font-medium text-xs",
                  isNew ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"
                )}>
                  {achievement.name}
                </span>
                {isNew && (
                  <Badge className="bg-amber-500 text-white text-[10px] px-1 py-0 h-4">
                    NOVO
                  </Badge>
                )}
              </div>
            );
          })}
          
          {unlockedAchievements.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              +{unlockedAchievements.length - 3} mais
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
