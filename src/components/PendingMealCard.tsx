import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  Flame, 
  UtensilsCrossed,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  type PendingMealData, 
  type MealStatus,
  MEAL_LABELS,
  getMealStatus,
  getMinutesOverdue,
  isMealActiveNow
} from "@/hooks/usePendingMeals";
import MealDetailSheet from "./MealDetailSheet";
import MealSubstanceBadges from "./MealSubstanceBadges";

interface PendingMealCardProps {
  meal: PendingMealData;
  dayLabel?: string;
  onRefetch: () => void;
  onStreakRefresh?: () => void;
  compact?: boolean;
  status?: MealStatus;
  minutesOverdue?: number;
  userProfile?: {
    intolerances?: string[] | null;
    dietary_preference?: string | null;
    excluded_ingredients?: string[] | null;
  } | null;
}

// Status colors (fixed)
// - "active" = refeição dentro da janela de tempo (AGORA) = card branco
// - "overdue" = refeição fora da janela (atrasada) = card cinza claro
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  active: { backgroundColor: '#FFFFFF', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary) / 0.3)' },
  overdue: { backgroundColor: 'hsl(var(--muted) / 0.5)', color: 'rgba(239, 68, 68, 1)', borderColor: 'hsl(var(--border))' },
  on_time: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgba(34, 197, 94, 1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
};

// Map internal status to style keys
const statusToStyleKey: Record<MealStatus, string> = {
  on_time: "on_time",
  delayed: "overdue",
  critical: "overdue",
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
  onRefetch,
  onStreakRefresh,
  compact = false,
  status: externalStatus,
  minutesOverdue: externalMinutesOverdue,
  userProfile
}: PendingMealCardProps) {
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  // Use external status/minutes if provided, otherwise calculate
  const mealStatus = externalStatus || getMealStatus(meal.meal_type, meal.actual_date, meal.completed_at);
  const minutesOverdueValue = externalMinutesOverdue ?? getMinutesOverdue(meal.meal_type, meal.actual_date);
  const mealLabel = MEAL_LABELS[meal.meal_type] || meal.meal_type;
  
  // Verifica se a refeição está ATIVA agora (dentro da janela de tempo)
  // Esta é a mesma lógica usada no MealPlanCalendar para mostrar "AGORA"
  const isActiveNow = isMealActiveNow(meal.meal_type, meal.actual_date);
  
  // Determina se pode trocar - apenas refeições do dia atual (on_time ou delayed, mas não critical/passadas)
  const canSwap = mealStatus === "on_time" || mealStatus === "delayed";
  
  // Refeição passada = apenas de dias anteriores (não do dia atual)
  // Permite substituição para refeições atrasadas do mesmo dia
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mealDate = meal.actual_date ? new Date(meal.actual_date) : null;
  if (mealDate) mealDate.setHours(0, 0, 0, 0);
  const isPastMeal = mealDate ? mealDate < today : false;

  // Get fixed colors - usa "active" se está dentro da janela, senão usa o mapeamento padrão
  const styleKey = isActiveNow ? "active" : statusToStyleKey[mealStatus];
  const statusStyles = STATUS_STYLES[styleKey] || STATUS_STYLES.overdue;
  
  // Get day abbreviation and formatted date (day/month)
  const dayAbbrev = DAY_LABELS[meal.day_of_week];
  const formattedDate = meal.actual_date 
    ? `${meal.actual_date.getDate().toString().padStart(2, '0')}/${(meal.actual_date.getMonth() + 1).toString().padStart(2, '0')}`
    : null;

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

  const handleCardClick = () => {
    setShowDetailSheet(true);
  };

  // Modo compact: apenas abre o sheet (usado dentro do NextMealCard)
  if (compact) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleCardClick}
          className="w-full text-left text-sm text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors py-1"
        >
          Ver receita
          <ChevronRight className="w-4 h-4" />
        </button>

        <MealDetailSheet
          open={showDetailSheet}
          onOpenChange={setShowDetailSheet}
          meal={meal}
          canSwap={canSwap}
          isPastMeal={isPastMeal}
          onRefetch={onRefetch}
          onStreakRefresh={onStreakRefresh}
          userDietaryPreference={userProfile?.dietary_preference}
        />
      </div>
    );
  }

  return (
    <>
      <Card 
        className="overflow-hidden transition-all duration-300 rounded-xl shadow-sm cursor-pointer hover:shadow-md active:scale-[0.99]"
        style={{
          backgroundColor: statusStyles.backgroundColor || 'hsl(var(--card))',
          borderColor: statusStyles.borderColor || 'hsl(var(--border))',
          borderWidth: '1px',
          borderStyle: 'solid',
        }}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          {/* Header com status */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div 
                className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  isActiveNow
                    ? "gradient-primary"
                    : "bg-muted"
                )}
              >
                {isActiveNow ? (
                  <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
                ) : (
                  <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
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
                  {/* Tag "Agora" para refeições dentro da janela de tempo */}
                  {isActiveNow && (
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium"
                    >
                      Agora
                    </span>
                  )}
                  {/* Tag com tempo atrás para refeições atrasadas (fora da janela) */}
                  {!isActiveNow && (mealStatus === "critical" || mealStatus === "delayed") && minutesOverdueValue > 0 && (
                    <span 
                      className="text-[10px] px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: 'rgba(239, 68, 68, 1)',
                      }}
                    >
                      {formatOverdue(minutesOverdueValue)}
                    </span>
                  )}
                </div>
                <h3 className="font-display font-semibold text-foreground truncate">
                  {meal.recipe_name}
                </h3>
                <MealSubstanceBadges 
                  ingredients={meal.recipe_ingredients} 
                  userProfile={userProfile}
                />
              </div>
            </div>

            {/* Calorias + Chevron */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-medium">{meal.recipe_calories}</span>
                <span className="text-xs">kcal</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <MealDetailSheet
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        meal={meal}
        canSwap={canSwap}
        isPastMeal={isPastMeal}
        onRefetch={onRefetch}
        onStreakRefresh={onStreakRefresh}
        userDietaryPreference={userProfile?.dietary_preference}
      />
    </>
  );
}
