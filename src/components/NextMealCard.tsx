import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  RefreshCw, 
  SkipForward, 
  Clock, 
  Flame, 
  ChevronRight,
  AlertTriangle,
  UtensilsCrossed,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNextMeal, MEAL_LABELS, type MealStatus, type NextMealData } from "@/hooks/useNextMeal";
import { toast } from "sonner";

interface NextMealCardProps {
  onViewRecipe?: (meal: NextMealData) => void;
}

const statusStyles: Record<MealStatus, { border: string; bg: string; pulse: boolean }> = {
  on_time: { 
    border: "border-border", 
    bg: "bg-card", 
    pulse: false 
  },
  delayed: { 
    border: "border-yellow-500/50", 
    bg: "bg-yellow-500/5", 
    pulse: false 
  },
  critical: { 
    border: "border-destructive/50", 
    bg: "bg-destructive/5", 
    pulse: true 
  },
  completed: { 
    border: "border-emerald-500/50", 
    bg: "bg-emerald-500/5", 
    pulse: false 
  },
};

export default function NextMealCard({ onViewRecipe }: NextMealCardProps) {
  const {
    nextMeal,
    isLoading,
    hasMealPlan,
    mealStatus,
    minutesOverdue,
    isRegenerating,
    markAsComplete,
    skipMeal,
    regenerateMeal,
  } = useNextMeal();

  const [isMarking, setIsMarking] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  const handleMarkComplete = async () => {
    setIsMarking(true);
    const success = await markAsComplete();
    setIsMarking(false);
    if (success) {
      toast.success("Refeição marcada como feita! 🎉");
    } else {
      toast.error("Erro ao marcar refeição");
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    const success = await skipMeal();
    setIsSkipping(false);
    if (success) {
      toast.info("Refeição pulada");
    } else {
      toast.error("Erro ao pular refeição");
    }
  };

  const handleRegenerate = async () => {
    const success = await regenerateMeal();
    if (success) {
      toast.success("Refeição substituída com sucesso!");
    } else {
      toast.error("Erro ao substituir refeição");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="glass-card animate-pulse">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-5 bg-muted rounded w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No meal plan state
  if (!hasMealPlan) {
    return null;
  }

  // All meals completed for today
  if (!nextMeal) {
    return (
      <Card className="glass-card border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                Parabéns! 🎉
              </p>
              <p className="text-xs text-muted-foreground">
                Todas as refeições do dia foram concluídas
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const styles = statusStyles[mealStatus];
  const mealLabel = MEAL_LABELS[nextMeal.meal_type] || nextMeal.meal_type;

  return (
    <Card 
      className={cn(
        "glass-card overflow-hidden transition-all duration-300",
        styles.border,
        styles.bg,
        styles.pulse && "animate-pulse"
      )}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header com status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div 
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                mealStatus === "critical" 
                  ? "bg-destructive/20" 
                  : mealStatus === "delayed"
                    ? "bg-yellow-500/20"
                    : "gradient-primary"
              )}
            >
              {mealStatus === "critical" ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : mealStatus === "delayed" ? (
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              ) : (
                <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-muted-foreground">
                  {mealLabel}
                </span>
                {mealStatus === "critical" && (
                  <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">
                    Pendente há {minutesOverdue}min
                  </span>
                )}
                {mealStatus === "delayed" && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                    Atrasado
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-foreground truncate">
                {nextMeal.recipe_name}
              </h3>
            </div>
          </div>

          {/* Calorias */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-medium">{nextMeal.recipe_calories}</span>
            <span className="text-xs">kcal</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 gradient-primary border-0 text-xs h-9"
            onClick={handleMarkComplete}
            disabled={isMarking || isSkipping || isRegenerating}
          >
            {isMarking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Fiz
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9"
            onClick={handleRegenerate}
            disabled={isMarking || isSkipping || isRegenerating}
          >
            {isRegenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Trocar
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-9 text-muted-foreground"
            onClick={handleSkip}
            disabled={isMarking || isSkipping || isRegenerating}
          >
            {isSkipping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <SkipForward className="w-4 h-4 mr-1.5" />
                Pular
              </>
            )}
          </Button>

          {onViewRecipe && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs h-9 px-2"
              onClick={() => onViewRecipe(nextMeal)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
