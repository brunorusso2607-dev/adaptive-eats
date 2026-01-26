import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Check, 
  SkipForward, 
  Clock, 
  Flame, 
  Eye,
  AlertTriangle,
  UtensilsCrossed,
  Loader2,
  Timer,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { useNextMeal, getMealLabels, getMinutesUntilStartWithCustomTimes, type MealStatus, type NextMealData } from "@/hooks/useNextMeal";
import { useMealConsumption } from "@/hooks/useMealConsumption";
import { useDietaryCompatibility } from "@/hooks/useDietaryCompatibility";
import { usePlanMealTimes } from "@/hooks/usePlanMealTimes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MealConfirmDialog from "./MealConfirmDialog";
import MealDetailSheet from "./MealDetailSheet";
import MealSubstanceBadges from "./MealSubstanceBadges";
import { DietaryCompatibilityBadge } from "./DietaryCompatibilityBadge";

interface NextMealCardProps {
  userProfile?: {
    intolerances?: string[] | null;
    dietary_preference?: string | null;
    excluded_ingredients?: string[] | null;
  } | null;
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
  upcoming: "on_time",
};

export default function NextMealCard({ userProfile }: NextMealCardProps) {
  const navigate = useNavigate();
  const {
    nextMeal,
    isLoading,
    hasMealPlan,
    mealStatus,
    minutesOverdue,
    customMealTimes,
    skipMeal,
    refetch,
  } = useNextMeal();

  // Dietary compatibility
  const { getCompatibility, hasProfile } = useDietaryCompatibility(userProfile?.dietary_preference);

  // Busca horários personalizados do plano ativo
  const { getTimeRanges, getMealTime, hasCustomTimes } = usePlanMealTimes({ 
    planId: nextMeal?.meal_plan_id 
  });
  
  // Monta os ranges de horário usando dados do hook
  const timeRanges = useMemo(() => getTimeRanges(), [getTimeRanges]);

  const [isMarking, setIsMarking] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isFavorite, setIsFavorite] = useState(nextMeal?.is_favorite || false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [minutesUntilStart, setMinutesUntilStart] = useState(0);

  // Sync isFavorite when nextMeal changes
  useEffect(() => {
    if (nextMeal) {
      setIsFavorite(nextMeal.is_favorite || false);
    }
  }, [nextMeal?.id, nextMeal?.is_favorite]);

  // Atualiza contador a cada segundo quando status é "upcoming"
  useEffect(() => {
    if (mealStatus !== "upcoming" || !nextMeal) return;
    
    const updateCountdown = () => {
      setMinutesUntilStart(getMinutesUntilStartWithCustomTimes(nextMeal.meal_type, customMealTimes));
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [mealStatus, nextMeal, customMealTimes]);

  const { saveConsumption } = useMealConsumption();

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

  // User wants to register different foods - close dialog and let them use manual registration
  const handleConfirmDifferent = () => {
    setShowConfirmDialog(false);
    toast.info("Use o módulo 'Registrar refeição' para adicionar o que você comeu");
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

  // Toggle favorite
  const handleToggleFavorite = async () => {
    if (!nextMeal) return;
    setIsTogglingFavorite(true);
    try {
      const newValue = !isFavorite;
      const { error } = await supabase
        .from("meal_plan_items")
        .update({ is_favorite: newValue })
        .eq("id", nextMeal.id);
      
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

  // Loading state
  if (isLoading) {
    return (
      <Card className="rounded-xl shadow-sm border animate-pulse">
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
      <Card 
        className="glass-card border-border cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
        onClick={() => navigate("/dashboard?tab=plano")}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Nenhum plano de refeições ativo
                </p>
                <p className="text-xs text-primary flex items-center gap-1">
                  Crie seu primeiro plano alimentar
                  <ChevronRight className="w-3 h-3" />
                </p>
              </div>
            </div>
          </div>
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

  const styleKey = statusToStyleKey[mealStatus];
  const statusStyles = STATUS_STYLES[styleKey] || STATUS_STYLES.on_time;
  
  const labels = getMealLabels();
  const mealLabel = labels[nextMeal.meal_type] || nextMeal.meal_type;
  const timeRange = timeRanges[nextMeal.meal_type];
  const formattedTime = getMealTime(nextMeal.meal_type);

  // Verificar se é uma refeição futura (status "upcoming")
  const isFutureMeal = mealStatus === "upcoming";

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-300 rounded-xl shadow-sm cursor-pointer hover:shadow-md active:scale-[0.99]",
        mealStatus === "critical" && "animate-pulse"
      )}
      style={{
        backgroundColor: statusStyles.backgroundColor || 'hsl(var(--card))',
        borderColor: statusStyles.borderColor || 'hsl(var(--border))',
        borderWidth: '1px',
        borderStyle: 'solid',
      }}
      onClick={handleViewRecipe}
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
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {formattedTime}
                  {hasCustomTimes && (
                    <span className="text-[8px] text-primary/60">•</span>
                  )}
                </span>
              </div>
              <h3 className="font-display font-semibold text-foreground">
                {nextMeal.recipe_name}
              </h3>
              {/* Preview dos ingredientes no formato nutricionista */}
              {nextMeal.recipe_ingredients && Array.isArray(nextMeal.recipe_ingredients) && nextMeal.recipe_ingredients.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {(nextMeal.recipe_ingredients as Array<{item?: string; quantity?: string}>).slice(0, 3).map((ing, idx) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-primary/60">•</span>
                      <span>{ing.item}</span>
                    </div>
                  ))}
                  {nextMeal.recipe_ingredients.length > 3 && (
                    <span className="text-primary/60 text-[10px]">+{nextMeal.recipe_ingredients.length - 3} mais</span>
                  )}
                </div>
              )}
              <MealSubstanceBadges 
                ingredients={nextMeal.recipe_ingredients} 
                userProfile={userProfile}
              />
              {/* Dietary Compatibility Badge */}
              {hasProfile && (() => {
                const compat = getCompatibility(nextMeal.recipe_name);
                if (compat.compatibility !== 'unknown') {
                  return (
                    <div className="mt-1">
                      <DietaryCompatibilityBadge 
                        compatibility={compat.compatibility}
                        notes={compat.notes}
                        showLabel={true}
                      />
                    </div>
                  );
                }
                return null;
              })()}
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
                    backgroundColor: statusStyles.backgroundColor,
                    color: statusStyles.color,
                  }}
                >
                  Pendente há {minutesOverdue}min
                </span>
              )}
              {mealStatus === "delayed" && (
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mt-1"
                  style={{
                    backgroundColor: statusStyles.backgroundColor,
                    color: statusStyles.color,
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

        {/* Ações - linha única com textos curtos e divisores */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewRecipe();
            }}
            disabled={isMarking || isSkipping}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors py-1 disabled:opacity-50"
          >
            <Eye className="w-4 h-4 text-primary stroke-[1.5]" />
            Ver detalhes
          </button>


          {/* Só mostra Feita e Não fiz se NÃO for refeição futura */}
          {!isFutureMeal && (
            <>
              <span className="text-black dark:text-white opacity-50">•</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleFizClick();
                }}
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

              <span className="text-black dark:text-white opacity-50">•</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
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
            </>
          )}

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
        mealName={nextMeal.recipe_name}
        onConfirmAsPlanned={handleConfirmAsPlanned}
        onConfirmDifferent={handleConfirmDifferent}
      />


      <MealDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        meal={nextMeal}
        isFutureMeal={isFutureMeal}
        onRefetch={refetch}
        userDietaryPreference={userProfile?.dietary_preference}
      />
    </Card>
  );
}
