import { Card, CardContent } from "@/components/ui/card";
import { UtensilsCrossed, ChevronDown, Flame, ChevronRight, Check } from "lucide-react";
import { usePendingMeals, formatMealTime } from "@/hooks/usePendingMeals";
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
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { useUserTimezone } from "@/hooks/useUserTimezone";

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
  const { timezone } = useUserTimezone();
  const {
    pendingMeals,
    isLoading,
    hasMealPlan,
    isPlanExpired,
    expiredPlanEndDate,
    skipMeal,
    refetch,
    effectiveTimeRanges,
    MEAL_LABELS,
    getMealStatusForMeal,
    getMinutesOverdueForMeal,
    isMealTimeStartedForMeal,
  } = usePendingMeals();

  // Calcular nomes dos meses dinamicamente com timezone do usuário
  const { expiredMonthName, currentMonthName } = useMemo(() => {
    // Usar timezone do usuário para obter o mês atual corretamente
    const nowInTimezone = toZonedTime(new Date(), timezone);
    const currentMonth = format(nowInTimezone, "MMMM", { locale: ptBR });
    
    if (expiredPlanEndDate) {
      // A data do plano é uma string YYYY-MM-DD, criar Date e converter para timezone
      const expiredDate = toZonedTime(new Date(expiredPlanEndDate + "T12:00:00Z"), timezone);
      const expiredMonth = format(expiredDate, "MMMM", { locale: ptBR });
      return { expiredMonthName: expiredMonth, currentMonthName: currentMonth };
    }
    
    return { expiredMonthName: null, currentMonthName: currentMonth };
  }, [expiredPlanEndDate, timezone]);

  // Separar: próxima refeição (verde) vs atrasadas (amarela/vermelha)
  // Se o plano expirou, não há "próxima refeição" - todas são atrasadas
  const { nextMeal, overdueMeals } = useMemo(() => {
    if (pendingMeals.length === 0) {
      return { nextMeal: null, overdueMeals: [] };
    }

    // Calcular status para todas as refeições
    const mealsWithStatus = pendingMeals.map(meal => ({
      ...meal,
      status: getMealStatusForMeal(meal.meal_type, meal.actual_date, meal.completed_at),
    }));

    // Se o plano expirou, todas as refeições são consideradas atrasadas
    // Não há "próxima refeição" porque o plano acabou
    if (isPlanExpired) {
      return {
        nextMeal: null,
        overdueMeals: mealsWithStatus,
      };
    }

    // Próxima refeição = a primeira que está "on_time" (já começou mas ainda no prazo)
    // Se não há nenhuma on_time, pegar a primeira da lista (que é ordenada por proximidade no hook)
    const onTimeMeal = mealsWithStatus.find(meal => meal.status === "on_time");
    
    // Se não encontrou on_time, a próxima refeição é a primeira da lista (pode ser futura)
    // O hook já retorna a refeição mais próxima na primeira posição
    const nextMealCandidate = onTimeMeal || mealsWithStatus[0];
    
    // Atrasadas = delayed ou critical (excluindo a próxima refeição selecionada)
    const delayed = mealsWithStatus.filter(meal => 
      (meal.status === "delayed" || meal.status === "critical") && meal.id !== nextMealCandidate?.id
    );

    return {
      nextMeal: nextMealCandidate,
      overdueMeals: delayed,
    };
  }, [pendingMeals, getMealStatusForMeal, isPlanExpired]);

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

  // No meal plan state - convida a criar plano
  if (!hasMealPlan) {
    // Gerar mensagem dinâmica com base no mês usando timezone do usuário
    const nowInTimezone = toZonedTime(new Date(), timezone);
    const dayOfMonth = parseInt(format(nowInTimezone, 'd'));
    const currentMonth = format(nowInTimezone, 'MMMM', { locale: ptBR });
    const capitalizedCurrentMonth = currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1);
    
    // Verificar se estamos no início do mês (primeiros 7 dias)
    const previousMonthDate = new Date(nowInTimezone.getFullYear(), nowInTimezone.getMonth() - 1, 1);
    const previousMonth = format(previousMonthDate, 'MMMM', { locale: ptBR });
    const capitalizedPreviousMonth = previousMonth.charAt(0).toUpperCase() + previousMonth.slice(1);
    
    const isStartOfMonth = dayOfMonth <= 7;
    
    const titleMessage = isStartOfMonth 
      ? `${capitalizedPreviousMonth} acabou`
      : "Você não tem um plano ativo";
      
    const subtitleMessage = isStartOfMonth
      ? `Não esqueça de criar seu plano de ${capitalizedCurrentMonth}`
      : `Crie seu plano alimentar de ${capitalizedCurrentMonth}`;

    return (
      <Card className="glass-card border-primary/30 bg-primary/5 overflow-hidden">
        <CardContent className="p-0">
          <div 
            className="p-4 cursor-pointer hover:bg-primary/10 transition-colors active:scale-[0.99]"
            onClick={() => onNavigateToMealPlan?.()}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {titleMessage}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitleMessage}
                </p>
              </div>
              <div className="flex items-center gap-1 text-primary shrink-0">
                <span className="text-sm font-medium">Criar Plano</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
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
  const mealTimeRange = nextMeal ? effectiveTimeRanges[nextMeal.meal_type] : null;
  const mealTimeText = mealTimeRange 
    ? `${formatMealTime(mealTimeRange.start)}`
    : "";
  const showButtons = nextMeal ? isMealTimeStartedForMeal(nextMeal.meal_type, nextMeal.actual_date) : false;

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
                    const status = getMealStatusForMeal(meal.meal_type, meal.actual_date, meal.completed_at);
                    const minutesOverdue = getMinutesOverdueForMeal(meal.meal_type, meal.actual_date);
                    
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

      {/* Plano expirou - card unificado com header + collapsible de pendentes */}
      {isPlanExpired && !nextMeal && (
        <Card className="glass-card border-primary/30 bg-primary/5 overflow-hidden">
          <CardContent className="p-0">
            {/* Header - Criar Plano */}
            <div 
              className="p-4 cursor-pointer hover:bg-primary/10 transition-colors active:scale-[0.99]"
              onClick={() => onNavigateToMealPlan?.()}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">
                    {expiredMonthName ? `${expiredMonthName} acabou` : "Seu plano expirou"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                    Não esqueça de criar seu plano de {currentMonthName}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-primary shrink-0">
                  <span className="text-sm font-medium">Criar Plano</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Collapsible de Refeições Pendentes */}
            {overdueMeals.length > 0 && (
              <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                  <div className="border-t border-primary/20 px-4 py-3 cursor-pointer hover:bg-primary/5 transition-colors">
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
                    const status = getMealStatusForMeal(meal.meal_type, meal.actual_date, meal.completed_at);
                    const minutesOverdue = getMinutesOverdueForMeal(meal.meal_type, meal.actual_date);
                    
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
