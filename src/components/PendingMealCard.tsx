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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PendingMealCardProps {
  meal: PendingMealData;
  dayLabel?: string;
  onMarkComplete: (mealId: string) => Promise<boolean>;
  onSkip: (mealId: string) => Promise<boolean>;
  onRefetch: () => void;
  onStreakRefresh?: () => void;
  compact?: boolean;
  status?: MealStatus;
  minutesOverdue?: number;
}

// Status colors (fixed)
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  on_time: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgba(34, 197, 94, 1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  alert: { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'rgba(217, 119, 6, 1)', borderColor: 'rgba(251, 191, 36, 0.3)' },
  late: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgba(239, 68, 68, 1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
};

// Map internal status to style keys
const statusToStyleKey: Record<MealStatus, string> = {
  on_time: "on_time",
  delayed: "alert",
  critical: "late",
  completed: "on_time",
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
  onRefetch,
  onStreakRefresh,
  compact = false,
  status: externalStatus,
  minutesOverdue: externalMinutesOverdue
}: PendingMealCardProps) {
  const [isMarking, setIsMarking] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showFoodDrawer, setShowFoodDrawer] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const { saveConsumption } = useMealConsumption();

  // Use external status/minutes if provided, otherwise calculate
  const mealStatus = externalStatus || getMealStatus(meal.meal_type, meal.actual_date, meal.completed_at);
  const minutesOverdueValue = externalMinutesOverdue ?? getMinutesOverdue(meal.meal_type, meal.actual_date);
  const mealLabel = MEAL_LABELS[meal.meal_type] || meal.meal_type;
  
  // Get fixed colors
  const styleKey = statusToStyleKey[mealStatus];
  const statusStyles = STATUS_STYLES[styleKey] || STATUS_STYLES.on_time;
  
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
      onStreakRefresh?.();
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
    onStreakRefresh?.();
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

  // Modo compact: apenas as ações (para uso dentro de outro card)
  if (compact) {
    return (
      <>
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
      </>
    );
  }

  return (
    <Card 
      className="overflow-hidden transition-all duration-300 rounded-xl shadow-sm"
      style={{
        backgroundColor: statusStyles.backgroundColor || 'hsl(var(--card))',
        borderColor: statusStyles.borderColor || 'hsl(var(--border))',
        borderWidth: '1px',
        borderStyle: 'solid',
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
                {mealStatus === "critical" && minutesOverdueValue > 0 && (
                  <span 
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: statusStyles.backgroundColor,
                      color: statusStyles.color,
                    }}
                  >
                    {formatOverdue(minutesOverdueValue)}
                  </span>
                )}
                {mealStatus === "delayed" && (
                  <span 
                    className="text-[10px] px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: statusStyles.backgroundColor,
                      color: statusStyles.color,
                    }}
                  >
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
                  className="h-9 w-9 gradient-primary border-0 shadow-glow"
                  onClick={handleFizClick}
                  disabled={isMarking || isSkipping}
                >
                  {isMarking ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                  ) : (
                    <Check className="w-4 h-4 text-primary-foreground" />
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
