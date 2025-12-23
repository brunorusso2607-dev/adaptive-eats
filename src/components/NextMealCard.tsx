import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Check, 
  RefreshCw, 
  SkipForward, 
  Clock, 
  Flame, 
  Eye,
  AlertTriangle,
  UtensilsCrossed,
  Loader2,
  Timer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNextMeal, MEAL_LABELS, MEAL_TIME_RANGES, getMinutesUntilStart, type MealStatus, type NextMealData } from "@/hooks/useNextMeal";
import { useMealConsumption } from "@/hooks/useMealConsumption";
import { useMealStatusColors } from "@/hooks/useMealStatusColors";
import { toast } from "sonner";
import MealConfirmDialog from "./MealConfirmDialog";
import FoodSearchDrawer from "./FoodSearchDrawer";
import MealDetailSheet from "./MealDetailSheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NextMealCardProps {}

// Map internal status to database status keys
const statusToDbKey: Record<MealStatus, string> = {
  on_time: "on_time",
  delayed: "alert",
  critical: "late",
  completed: "on_time",
  upcoming: "on_time",
};

export default function NextMealCard(_props: NextMealCardProps) {
  const {
    nextMeal,
    isLoading,
    hasMealPlan,
    mealStatus,
    minutesOverdue,
    skipMeal,
    refetch,
  } = useNextMeal();

  const [isMarking, setIsMarking] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFoodDrawer, setShowFoodDrawer] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [minutesUntilStart, setMinutesUntilStart] = useState(0);

  // Atualiza contador a cada segundo quando status é "upcoming"
  useEffect(() => {
    if (mealStatus !== "upcoming" || !nextMeal) return;
    
    const updateCountdown = () => {
      setMinutesUntilStart(getMinutesUntilStart(nextMeal.meal_type));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [mealStatus, nextMeal]);

  const { saveConsumption } = useMealConsumption();
  const { getStyleByStatus } = useMealStatusColors();

  // Opens confirmation dialog
  const handleFizClick = () => {
    setShowConfirmDialog(true);
  };

  // User confirmed they followed the plan exactly
  const handleConfirmAsPlanned = async () => {
    if (!nextMeal) return;
    
    setShowConfirmDialog(false);
    setIsMarking(true);

    // Save consumption with plan macros
    const result = await saveConsumption({
      mealPlanItemId: nextMeal.id,
      followedPlan: true,
      items: [],
      totalCalories: nextMeal.recipe_calories,
      totalProtein: nextMeal.recipe_protein,
      totalCarbs: nextMeal.recipe_carbs,
      totalFat: nextMeal.recipe_fat,
    });

    setIsMarking(false);

    if (result.success) {
      toast.success("Refeição marcada como feita! 🎉");
    } else {
      toast.error("Erro ao marcar refeição");
    }
  };

  // User wants to register different foods
  const handleConfirmDifferent = () => {
    setShowConfirmDialog(false);
    setShowFoodDrawer(true);
  };

  // Trocar button opens food drawer directly
  const handleTrocarClick = () => {
    setShowFoodDrawer(true);
  };

  // When food drawer saves successfully
  const handleFoodDrawerSuccess = () => {
    // Refetch to show the next meal
    refetch();
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

  // View recipe details
  const handleViewRecipe = () => {
    setShowDetailSheet(true);
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

  // No meal plan state - show message for debugging (can be removed later)
  if (!hasMealPlan) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground text-center">
            Nenhum plano de refeições ativo
          </p>
        </CardContent>
      </Card>
    );
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

  const dbStatusKey = statusToDbKey[mealStatus];
  const dynamicStyles = getStyleByStatus(dbStatusKey);
  const mealLabel = MEAL_LABELS[nextMeal.meal_type] || nextMeal.meal_type;

  return (
    <Card 
      className={cn(
        "glass-card overflow-hidden transition-all duration-300",
        mealStatus === "critical" && "animate-pulse"
      )}
      style={{
        backgroundColor: dynamicStyles.backgroundColor,
        borderColor: dynamicStyles.borderColor,
        borderWidth: dynamicStyles.borderColor ? '1px' : undefined,
        borderStyle: dynamicStyles.borderColor ? 'solid' : undefined,
      }}
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
                    : mealStatus === "upcoming"
                      ? "bg-blue-500/20"
                      : "gradient-primary"
              )}
            >
              {mealStatus === "critical" ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : mealStatus === "delayed" ? (
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              ) : mealStatus === "upcoming" ? (
                <Timer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Próxima Refeição
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {mealLabel}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {MEAL_TIME_RANGES[nextMeal.meal_type] 
                    ? `${MEAL_TIME_RANGES[nextMeal.meal_type].start}:00 às ${MEAL_TIME_RANGES[nextMeal.meal_type].end}:00`
                    : ""
                  }
                </span>
              </div>
              <h3 className="font-display font-semibold text-foreground truncate">
                {nextMeal.recipe_name}
              </h3>
              {mealStatus === "upcoming" && minutesUntilStart > 0 && (
                <span className="text-[10px] bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                  <Timer className="w-3 h-3" />
                  {minutesUntilStart >= 60 
                    ? `${Math.floor(minutesUntilStart / 60)}h ${minutesUntilStart % 60}min`
                    : `${minutesUntilStart}min`
                  } para liberar
                </span>
              )}
              {mealStatus === "critical" && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-1"
                  style={{
                    backgroundColor: dynamicStyles.backgroundColor,
                    color: dynamicStyles.color,
                  }}
                >
                  Pendente há {minutesOverdue}min
                </span>
              )}
              {mealStatus === "delayed" && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-1"
                  style={{
                    backgroundColor: dynamicStyles.backgroundColor,
                    color: dynamicStyles.color,
                  }}
                >
                  Atrasado
                </span>
              )}
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
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  onClick={handleViewRecipe}
                  disabled={isMarking || isSkipping}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Ver receita</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  onClick={handleTrocarClick}
                  disabled={isMarking || isSkipping}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Trocar refeição</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-9 w-9 bg-emerald-500 hover:bg-emerald-600 border-0"
                  onClick={handleFizClick}
                  disabled={isMarking || isSkipping}
                >
                  {isMarking ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Marcar como feita</p>
              </TooltipContent>
            </Tooltip>

            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 h-9 flex items-center disabled:opacity-50"
              onClick={handleSkip}
              disabled={isMarking || isSkipping}
            >
              {isSkipping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Pular"
              )}
            </button>
          </div>
        </TooltipProvider>
      </CardContent>

      {/* Dialogs and Sheets */}
      <MealConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        mealName={nextMeal.recipe_name}
        onConfirmAsPlanned={handleConfirmAsPlanned}
        onConfirmDifferent={handleConfirmDifferent}
      />

      <FoodSearchDrawer
        open={showFoodDrawer}
        onOpenChange={setShowFoodDrawer}
        mealPlanItemId={nextMeal.id}
        mealType={nextMeal.meal_type}
        onSuccess={handleFoodDrawerSuccess}
      />

      <MealDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        meal={nextMeal}
      />
    </Card>
  );
}
