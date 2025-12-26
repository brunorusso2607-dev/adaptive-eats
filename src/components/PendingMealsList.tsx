import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed, ChevronDown, Flame, ChevronRight, Check } from "lucide-react";
import { usePendingMeals, getMealStatus, getMinutesOverdue, MEAL_LABELS, MEAL_TIME_RANGES, formatMealTime, isMealTimeStarted } from "@/hooks/usePendingMeals";
import PendingMealCard from "./PendingMealCard";
import MealDetailSheet from "./MealDetailSheet";
import MealSubstanceBadges from "./MealSubstanceBadges";
import { useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";


interface PendingMealsListProps {
  onStreakRefresh?: () => void;
  onNavigateToMealPlan?: () => void;
  userProfile?: {
    intolerances?: string[] | null;
    dietary_preference?: string | null;
    excluded_ingredients?: string[] | null;
  } | null;
}

export default function PendingMealsList({ onStreakRefresh, onNavigateToMealPlan, userProfile }: PendingMealsListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRecipeSheetOpen, setIsRecipeSheetOpen] = useState(false);
  const {
    pendingMeals,
    isLoading,
    hasMealPlan,
    skipMeal,
    refetch,
  } = usePendingMeals();

  // Separar: próxima refeição (verde) vs atrasadas (amarela/vermelha)
  const { nextMeal, overdueMeals } = useMemo(() => {
    if (pendingMeals.length === 0) {
      return { nextMeal: null, overdueMeals: [] };
    }

    // Encontrar a primeira refeição que ainda está "on_time" ou a próxima a começar
    // As refeições estão ordenadas por data decrescente, então precisamos inverter para encontrar a próxima
    const mealsWithStatus = pendingMeals.map(meal => ({
      ...meal,
      status: getMealStatus(meal.meal_type, meal.actual_date, meal.completed_at),
    }));

    // Encontrar a refeição que está on_time (será a próxima)
    const onTimeMeal = mealsWithStatus.find(meal => meal.status === "on_time");
    
    // Todas as outras são atrasadas (delayed ou critical)
    const delayed = mealsWithStatus.filter(meal => 
      meal.status === "delayed" || meal.status === "critical"
    );

    return {
      nextMeal: onTimeMeal || null,
      overdueMeals: delayed,
    };
  }, [pendingMeals]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
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
    const handleNavigate = () => {
      if (onNavigateToMealPlan) {
        onNavigateToMealPlan();
      }
    };

    return (
      <Card 
        className="glass-card border-border cursor-pointer hover:bg-muted/50 transition-colors active:scale-[0.98]"
        onClick={handleNavigate}
        role="button"
        tabIndex={0}
      >
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Nenhum plano de refeições ativo
          </p>
          <p className="text-xs text-primary mt-1 flex items-center justify-center gap-1">
            Crie seu primeiro plano alimentar
            <ChevronRight className="w-3 h-3" />
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

  const mealLabel = nextMeal ? (MEAL_LABELS[nextMeal.meal_type] || nextMeal.meal_type) : "";
  const mealTimeRange = nextMeal ? MEAL_TIME_RANGES[nextMeal.meal_type] : null;
  const mealTimeText = mealTimeRange 
    ? `${formatMealTime(mealTimeRange.start)} às ${formatMealTime(mealTimeRange.end)}`
    : "";
  const showButtons = nextMeal ? isMealTimeStarted(nextMeal.meal_type, nextMeal.actual_date) : false;

  return (
    <div className="space-y-3">
      {/* Card Unificado - Próxima Refeição + Refeições Pendentes */}
      {nextMeal && (
        <Card className="glass-card border-emerald-500/30 bg-emerald-500/5 overflow-hidden">
          <CardContent className="p-0">
            {/* Área clicável da próxima refeição */}
            <div 
              className="p-4 cursor-pointer hover:bg-emerald-500/10 transition-colors active:scale-[0.99]"
              onClick={() => setIsRecipeSheetOpen(true)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Próxima Refeição
                      </span>
                      <span className="text-xs text-muted-foreground">
                        • {mealLabel} • {mealTimeText}
                      </span>
                    </div>
                    <h3 className="font-display font-semibold text-foreground truncate">
                      {nextMeal.recipe_name}
                    </h3>
                    <MealSubstanceBadges 
                      ingredients={nextMeal.recipe_ingredients} 
                      userProfile={userProfile}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">{nextMeal.recipe_calories}</span>
                    <span className="text-xs">kcal</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            {/* Dropdown de Refeições Pendentes - dentro do mesmo card */}
            {overdueMeals.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <div className="border-t border-emerald-500/20 px-4 py-3 cursor-pointer hover:bg-emerald-500/5 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Refeições pendentes
                        <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                          {overdueMeals.length}
                        </span>
                      </span>
                      <ChevronDown 
                        className={cn(
                          "w-4 h-4 text-muted-foreground transition-transform duration-200",
                          isOpen && "rotate-180"
                        )} 
                      />
                    </div>
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent className="px-4 pb-4 space-y-2">
                  {overdueMeals.map((meal) => {
                    const status = getMealStatus(meal.meal_type, meal.actual_date, meal.completed_at);
                    const minutesOverdue = getMinutesOverdue(meal.meal_type, meal.actual_date);
                    
                    return (
                      <PendingMealCard
                        key={meal.id}
                        meal={meal}
                        onRefetch={refetch}
                        onStreakRefresh={onStreakRefresh}
                        status={status}
                        minutesOverdue={minutesOverdue}
                        userProfile={userProfile}
                      />
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Se não tem próxima refeição mas tem atrasadas */}
      {!nextMeal && overdueMeals.length > 0 && (
        <Card className="glass-card border-border">
          <CardContent className="p-0">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <UtensilsCrossed className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Refeições pendentes
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {overdueMeals.length} {overdueMeals.length === 1 ? 'refeição' : 'refeições'} para registrar
                        </p>
                      </div>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "w-4 h-4 text-muted-foreground transition-transform duration-200",
                        isOpen && "rotate-180"
                      )} 
                    />
                  </div>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="px-4 pb-4 space-y-2">
                {overdueMeals.map((meal) => {
                  const status = getMealStatus(meal.meal_type, meal.actual_date, meal.completed_at);
                  const minutesOverdue = getMinutesOverdue(meal.meal_type, meal.actual_date);
                  
                  return (
                    <PendingMealCard
                      key={meal.id}
                      meal={meal}
                      onRefetch={refetch}
                      onStreakRefresh={onStreakRefresh}
                      status={status}
                      minutesOverdue={minutesOverdue}
                      userProfile={userProfile}
                    />
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Sheet de detalhes da receita */}
      <MealDetailSheet
        open={isRecipeSheetOpen}
        onOpenChange={setIsRecipeSheetOpen}
        meal={nextMeal}
        isFutureMeal={!showButtons}
        userDietaryPreference={userProfile?.dietary_preference}
      />
    </div>
  );
}
