import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import { FavoriteButton } from "./FavoriteButton";
import { 
  type PendingMealData, 
  type MealStatus,
  MEAL_LABELS,
  getMealStatus,
  getMinutesOverdue
} from "@/hooks/usePendingMeals";
import { useMealConsumption } from "@/hooks/useMealConsumption";
import { supabase } from "@/integrations/supabase/client";
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
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isFavorite, setIsFavorite] = useState(meal.is_favorite || false);
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

  // Toggle favorite
  const handleToggleFavorite = async () => {
    setIsTogglingFavorite(true);
    try {
      const newValue = !isFavorite;
      const { error } = await supabase
        .from("meal_plan_items")
        .update({ is_favorite: newValue })
        .eq("id", meal.id);
      
      if (error) throw error;
      
      setIsFavorite(newValue);
      toast.success(newValue ? "Adicionado aos favoritos" : "Removido dos favoritos");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favorito");
    } finally {
      setIsTogglingFavorite(false);
    }
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
        <div className="flex items-center gap-2">
          <button
            onClick={handleViewRecipe}
            disabled={isMarking || isSkipping}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            <Eye className="w-4 h-4 text-primary stroke-[1.5]" />
            Receita
          </button>

          <span className="text-muted-foreground/50">|</span>

          <button
            onClick={handleTrocarClick}
            disabled={isMarking || isSkipping}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 text-primary stroke-[1.5]" />
            Trocar
          </button>

          <span className="text-muted-foreground/50">|</span>

          <button
            onClick={handleFizClick}
            disabled={isMarking || isSkipping}
            className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            {isMarking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 stroke-[1.5]" />
            )}
            Feita
          </button>

          <span className="text-muted-foreground/50">|</span>

          <button
            onClick={handleSkip}
            disabled={isMarking || isSkipping}
            className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            {isSkipping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SkipForward className="w-4 h-4 stroke-[1.5]" />
            )}
            Não fiz
          </button>

          {/* Botão favoritar alinhado à direita */}
          <FavoriteButton
            isFavorite={isFavorite}
            isLoading={isTogglingFavorite}
            onClick={handleToggleFavorite}
            className="ml-auto"
          />
        </div>

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

        {/* Ações - linha única com textos curtos */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleViewRecipe}
            disabled={isMarking || isSkipping}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            <Eye className="w-4 h-4 text-primary stroke-[1.5]" />
            Receita
          </button>

          <button
            onClick={handleTrocarClick}
            disabled={isMarking || isSkipping}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 text-primary stroke-[1.5]" />
            Trocar
          </button>

          <button
            onClick={handleFizClick}
            disabled={isMarking || isSkipping}
            className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            {isMarking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4 stroke-[1.5]" />
            )}
            Feita
          </button>

          <button
            onClick={handleSkip}
            disabled={isMarking || isSkipping}
            className="text-sm text-muted-foreground hover:text-destructive flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            {isSkipping ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SkipForward className="w-4 h-4 stroke-[1.5]" />
            )}
            Não fiz
          </button>

          {/* Botão favoritar alinhado à direita */}
          <FavoriteButton
            isFavorite={isFavorite}
            isLoading={isTogglingFavorite}
            onClick={handleToggleFavorite}
            className="ml-auto"
          />
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
