import { Card, CardContent } from "@/components/ui/card";
import { Check, UtensilsCrossed, Clock } from "lucide-react";
import { usePendingMeals, getMealStatus } from "@/hooks/usePendingMeals";
import PendingMealCard from "./PendingMealCard";
import { useMemo } from "react";

interface PendingMealsListProps {
  onStreakRefresh?: () => void;
}

export default function PendingMealsList({ onStreakRefresh }: PendingMealsListProps) {
  const {
    pendingMeals,
    isLoading,
    hasMealPlan,
    skipMeal,
    refetch,
  } = usePendingMeals();

  // Separar refeição atual das atrasadas
  const { currentMeal, overdueMeals } = useMemo(() => {
    if (pendingMeals.length === 0) {
      return { currentMeal: null, overdueMeals: [] };
    }

    // A primeira refeição (mais recente/atual) é a "próxima"
    const first = pendingMeals[0];
    const status = getMealStatus(first.meal_type, first.actual_date, first.completed_at);
    
    // Se está on_time, é a atual. O resto são atrasadas.
    if (status === "on_time") {
      return {
        currentMeal: first,
        overdueMeals: pendingMeals.slice(1),
      };
    }
    
    // Se todas estão atrasadas, não há "atual"
    return {
      currentMeal: null,
      overdueMeals: pendingMeals,
    };
  }, [pendingMeals]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="glass-card animate-pulse">
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
        ))}
      </div>
    );
  }

  // No meal plan state
  if (!hasMealPlan) {
    return (
      <Card className="glass-card border-border">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhum plano de refeições ativo
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie um plano para ver suas refeições aqui
          </p>
        </CardContent>
      </Card>
    );
  }

  // All meals completed
  if (pendingMeals.length === 0) {
    return (
      <Card className="glass-card border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Parabéns! 🎉
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Todas as refeições do plano foram concluídas
          </p>
        </CardContent>
      </Card>
    );
  }

  // Handle mark complete through the hook
  const handleMarkComplete = async (mealId: string) => {
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Próxima Refeição */}
      {currentMeal && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Próxima Refeição
          </h3>
          <PendingMealCard
            meal={currentMeal}
            onMarkComplete={handleMarkComplete}
            onSkip={skipMeal}
            onRefetch={refetch}
            onStreakRefresh={onStreakRefresh}
          />
        </div>
      )}

      {/* Refeições Pendentes */}
      {overdueMeals.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Pendentes ({overdueMeals.length})
          </h3>
          <div className="space-y-2">
            {overdueMeals.map((meal) => (
              <PendingMealCard
                key={meal.id}
                meal={meal}
                onMarkComplete={handleMarkComplete}
                onSkip={skipMeal}
                onRefetch={refetch}
                onStreakRefresh={onStreakRefresh}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
