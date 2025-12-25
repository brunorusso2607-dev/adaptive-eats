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
  getMinutesOverdue
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
const STATUS_STYLES: Record<string, React.CSSProperties> = {
  on_time: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgba(34, 197, 94, 1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
  alert: { backgroundColor: '#FFFFFF', color: 'rgba(217, 119, 6, 1)', borderColor: 'rgba(251, 191, 36, 0.5)' },
  late: { backgroundColor: '#FFFFFF', color: 'rgba(239, 68, 68, 1)', borderColor: 'rgba(239, 68, 68, 0.5)' },
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
  
  // Determina se pode trocar - apenas refeições do dia atual (on_time ou delayed, mas não critical/passadas)
  const canSwap = mealStatus === "on_time" || mealStatus === "delayed";

  // Get fixed colors
  const styleKey = statusToStyleKey[mealStatus];
  const statusStyles = STATUS_STYLES[styleKey] || STATUS_STYLES.on_time;
  
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
          onRefetch={onRefetch}
          onStreakRefresh={onStreakRefresh}
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
                  mealStatus === "critical" || mealStatus === "delayed"
                    ? "bg-muted" 
                    : "gradient-primary"
                )}
              >
                {mealStatus === "critical" || mealStatus === "delayed" ? (
                  <UtensilsCrossed className="w-6 h-6 text-muted-foreground" />
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
        onRefetch={onRefetch}
        onStreakRefresh={onStreakRefresh}
      />
    </>
  );
}
