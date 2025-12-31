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
    effectiveTimeRanges,
    MEAL_LABELS,
    getMealStatusForMeal,
    getMinutesOverdueForMeal,
    isMealTimeStartedForMeal,
  } = usePendingMeals();

  // Separar: refeição atual (branca) vs atrasadas (cinza claro)
  // Lógica: se está dentro da janela de tempo = "atual", se passou da janela = "atrasada"
  const { nextMeal, overdueMeals, currentMealStatus } = useMemo(() => {
    if (pendingMeals.length === 0) {
      return { nextMeal: null, overdueMeals: [], currentMealStatus: null };
    }

    // Calcular status para todas as refeições
    const mealsWithStatus = pendingMeals.map(meal => ({
      ...meal,
      status: getMealStatusForMeal(meal.meal_type, meal.actual_date, meal.completed_at),
    }));

    // Próxima refeição = a primeira que está "on_time" (dentro da janela de tempo)
    // Se não há nenhuma on_time, pegar a primeira da lista (que é ordenada por proximidade no hook)
    const onTimeMeal = mealsWithStatus.find(meal => meal.status === "on_time");
    
    // Se não encontrou on_time, a próxima refeição é a primeira da lista
    // O hook já retorna a refeição mais próxima na primeira posição
    const nextMealCandidate = onTimeMeal || mealsWithStatus[0];
    
    // Determina se a próxima refeição está "atual" (dentro da janela) ou é futura
    const isCurrentMeal = nextMealCandidate?.status === "on_time";
    
    // Atrasadas = delayed ou critical (excluindo a próxima refeição selecionada)
    const delayed = mealsWithStatus.filter(meal => 
      (meal.status === "delayed" || meal.status === "critical") && meal.id !== nextMealCandidate?.id
    );

    return {
      nextMeal: nextMealCandidate,
      overdueMeals: delayed,
      currentMealStatus: isCurrentMeal ? "current" : "upcoming",
    };
  }, [pendingMeals, getMealStatusForMeal]);

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
  const mealTimeRange = nextMeal ? effectiveTimeRanges[nextMeal.meal_type] : null;
  const mealTimeText = mealTimeRange 
    ? `${formatMealTime(mealTimeRange.start)}`
    : "";
  const showButtons = nextMeal ? isMealTimeStartedForMeal(nextMeal.meal_type, nextMeal.actual_date) : false;

  return (
    <div className="space-y-3">
      {/* Card Unificado - Próxima Refeição + Refeições Pendentes */}
      {nextMeal && (
        <Card className={cn(
          "glass-card overflow-hidden",
          // Refeição atual (dentro da janela) = card branco; Futura = card verde
          currentMealStatus === "current" 
            ? "border-primary/30 bg-background" 
            : "border-emerald-500/30 bg-emerald-500/5"
        )}>
          <CardContent className="p-0">
            {/* Área clicável da próxima refeição */}
            <div 
              className={cn(
                "p-4 cursor-pointer transition-colors active:scale-[0.99]",
                currentMealStatus === "current" ? "hover:bg-muted/30" : "hover:bg-emerald-500/10"
              )}
              onClick={() => setIsRecipeSheetOpen(true)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <UtensilsCrossed className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "w-2 h-2 rounded-full",
                        currentMealStatus === "current" ? "bg-primary animate-pulse" : "bg-emerald-500 animate-pulse"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        currentMealStatus === "current" ? "text-primary" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {currentMealStatus === "current" ? "Refeição Atual" : "Próxima Refeição"}
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
                  <div className={cn(
                    "border-t px-4 py-3 cursor-pointer transition-colors",
                    currentMealStatus === "current" 
                      ? "border-border hover:bg-muted/30" 
                      : "border-emerald-500/20 hover:bg-emerald-500/5"
                  )}>
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
