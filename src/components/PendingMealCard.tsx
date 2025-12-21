import { useState } from "react";
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
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  type PendingMealData, 
  type MealStatus,
  MEAL_LABELS,
  getMealStatus,
  getMinutesOverdue
} from "@/hooks/usePendingMeals";
import { useMealConsumption } from "@/hooks/useMealConsumption";
import { toast } from "sonner";
import MealConfirmDialog from "./MealConfirmDialog";
import FoodSearchDrawer from "./FoodSearchDrawer";
import MealDetailSheet from "./MealDetailSheet";

interface PendingMealCardProps {
  meal: PendingMealData;
  dayLabel?: string;
  onMarkComplete: (mealId: string) => Promise<boolean>;
  onSkip: (mealId: string) => Promise<boolean>;
  onRefetch: () => void;
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

const DAY_LABELS: Record<number, string> = {
  0: "Dom",
  1: "Seg",
  2: "Ter",
  3: "Qua",
  4: "Qui",
  5: "Sex",
  6: "Sáb",
};

export default function PendingMealCard({ 
  meal, 
  onMarkComplete, 
  onSkip,
  onRefetch 
}: PendingMealCardProps) {
  const [isMarking, setIsMarking] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFoodDrawer, setShowFoodDrawer] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const { saveConsumption } = useMealConsumption();

  const mealStatus = getMealStatus(meal.meal_type, meal.actual_date, meal.completed_at);
  const minutesOverdue = getMinutesOverdue(meal.meal_type, meal.actual_date);
  const mealLabel = MEAL_LABELS[meal.meal_type] || meal.meal_type;
  
  // Get day abbreviation and formatted date (day/month)
  const dayAbbrev = DAY_LABELS[meal.day_of_week];
  const formattedDate = meal.actual_date 
    ? `${meal.actual_date.getDate().toString().padStart(2, '0')}/${(meal.actual_date.getMonth() + 1).toString().padStart(2, '0')}`
    : null;
  const dayLabel = DAY_LABELS[meal.day_of_week];

  const handleFizClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmAsPlanned = async () => {
    setShowConfirmDialog(false);
    setIsMarking(true);

    const result = await saveConsumption({
      mealPlanItemId: meal.id,
      followedPlan: true,
      items: [],
      totalCalories: meal.recipe_calories,
      totalProtein: meal.recipe_protein,
      totalCarbs: meal.recipe_carbs,
      totalFat: meal.recipe_fat,
    });

    setIsMarking(false);

    if (result.success) {
      toast.success("Refeição marcada como feita! 🎉");
      onRefetch();
    } else {
      toast.error("Erro ao marcar refeição");
    }
  };

  const handleConfirmDifferent = () => {
    setShowConfirmDialog(false);
    setShowFoodDrawer(true);
  };

  const handleTrocarClick = () => {
    setShowFoodDrawer(true);
  };

  const handleFoodDrawerSuccess = () => {
    onRefetch();
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    const success = await onSkip(meal.id);
    setIsSkipping(false);
    if (success) {
      toast.info("Refeição pulada");
    } else {
      toast.error("Erro ao pular refeição");
    }
  };

  const handleViewRecipe = () => {
    setShowDetailSheet(true);
  };

  const styles = statusStyles[mealStatus];

  // Format overdue time
  const formatOverdue = (minutes: number) => {
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      return `${days}d atrás`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours}h atrás`;
    }
    return `${minutes}min atrás`;
  };

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
                <span className="text-[10px] font-medium bg-muted px-1.5 py-0.5 rounded">
                  {dayAbbrev} {formattedDate}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {mealLabel}
                </span>
                {mealStatus === "critical" && minutesOverdue > 0 && (
                  <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full">
                    {formatOverdue(minutesOverdue)}
                  </span>
                )}
                {mealStatus === "delayed" && (
                  <span className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                    Atrasado
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-foreground truncate">
                {meal.recipe_name}
              </h3>
            </div>
          </div>

          {/* Calorias */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="font-medium">{meal.recipe_calories}</span>
            <span className="text-xs">kcal</span>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-9"
            onClick={handleViewRecipe}
            disabled={isMarking || isSkipping}
          >
            <Eye className="w-4 h-4 mr-1.5" />
            Ver
          </Button>

          <Button
            size="sm"
            className="flex-1 gradient-primary border-0 text-xs h-9"
            onClick={handleFizClick}
            disabled={isMarking || isSkipping}
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
            onClick={handleTrocarClick}
            disabled={isMarking || isSkipping}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Trocar
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-9 text-muted-foreground"
            onClick={handleSkip}
            disabled={isMarking || isSkipping}
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
        </div>
      </CardContent>

      {/* Dialogs and Sheets */}
      <MealConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        mealName={meal.recipe_name}
        onConfirmAsPlanned={handleConfirmAsPlanned}
        onConfirmDifferent={handleConfirmDifferent}
      />

      <FoodSearchDrawer
        open={showFoodDrawer}
        onOpenChange={setShowFoodDrawer}
        mealPlanItemId={meal.id}
        mealType={meal.meal_type}
        onSuccess={handleFoodDrawerSuccess}
      />

      <MealDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        meal={meal}
      />
    </Card>
  );
}
