import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, UtensilsCrossed, Cookie, Moon, Soup, Flame, Beef, Wheat, X, RefreshCw, Settings2, Lock, CalendarClock, TrendingDown, Activity, TrendingUp, Ban, Leaf, Fish, Utensils, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { DietaryCompatibilityBadge } from "./DietaryCompatibilityBadge";
import { DietaryCompatibilityPanel } from "./DietaryCompatibilityPanel";
import { useDynamicDietaryCompatibility } from "@/hooks/useDynamicDietaryCompatibility";
import { usePlanMealTimes } from "@/hooks/usePlanMealTimes";
import { useNutritionalStrategies } from "@/hooks/useNutritionalStrategies";
import { useSafetyLabels } from "@/hooks/useSafetyLabels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMonthWeeks, formatWeekRange, type WeekInfo, type DayInfo } from "@/hooks/useMonthWeeks";
import { useQueryClient } from "@tanstack/react-query";
import MealAlternativesSheet from "./MealAlternativesSheet";

type Ingredient = { item: string; quantity: string; unit: string };

type MealPlanItem = {
  id: string;
  day_of_week: number;
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
  is_favorite: boolean;
  week_number?: number;
  from_pool?: boolean; // Indica se a refeição veio do pool
};

type MealPlan = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  unlocks_at?: string | null;
  items: MealPlanItem[];
};

type UserProfile = {
  intolerances?: string[] | null;
  dietary_preference?: string | null;
  strategy_id?: string | null;
  excluded_ingredients?: string[] | null;
};

type MealPlanCalendarProps = {
  mealPlan: MealPlan;
  onClose: () => void;
  onSelectMeal: (meal: MealPlanItem) => void;
  onToggleFavorite: (mealId: string) => void;
  onMealUpdated?: (updatedMeal: MealPlanItem) => void;
  onEditPlan?: () => void;
  userProfile?: UserProfile | null;
  // Props elevados para preservar estado entre navegações
  externalSelectedWeek?: number | null;
  externalSelectedDayIndex?: number | null;
  onSelectedWeekChange?: (week: number) => void;
  onSelectedDayIndexChange?: (dayIndex: number) => void;
};

const DAY_NAMES_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DAY_NAMES_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// Standard meal types - internal keys used across the system
const STANDARD_MEAL_TYPES = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "supper"] as const;

const MEAL_CONFIG: Record<string, { icon: typeof Coffee; label: string; color: string }> = {
  breakfast: { icon: Coffee, label: "Café da Manhã", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  morning_snack: { icon: Cookie, label: "Lanche da Manhã", color: "bg-orange-500/20 text-orange-600 dark:text-orange-400" },
  lunch: { icon: UtensilsCrossed, label: "Almoço", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  afternoon_snack: { icon: Cookie, label: "Lanche da Tarde", color: "bg-purple-500/20 text-purple-600 dark:text-purple-400" },
  dinner: { icon: Moon, label: "Jantar", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  supper: { icon: Soup, label: "Ceia", color: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
};

// Fallback horários padrão (usado apenas se hook não carregar)
const DEFAULT_MEAL_TIME_RANGES: Record<string, { start: number; end: number }> = {
  breakfast: { start: 6, end: 10 },
  morning_snack: { start: 10, end: 12 },
  lunch: { start: 12, end: 14 },
  afternoon_snack: { start: 14, end: 17 },
  dinner: { start: 17, end: 21 },
  supper: { start: 21, end: 24 },
};

export default function MealPlanCalendar({ mealPlan, onClose, onSelectMeal, onToggleFavorite, onMealUpdated, onEditPlan, userProfile, externalSelectedWeek, externalSelectedDayIndex, onSelectedWeekChange, onSelectedDayIndexChange }: MealPlanCalendarProps) {
  const queryClient = useQueryClient();
  const [alternativesSheet, setAlternativesSheet] = useState<{ open: boolean; meal: MealPlanItem | null; mealType: string }>({
    open: false,
    meal: null,
    mealType: "",
  });

  // Check if plan is scheduled (locked until future date)
  const isScheduledPlan = useMemo(() => {
    if (!mealPlan.unlocks_at) return false;
    const unlocksAt = new Date(mealPlan.unlocks_at);
    return unlocksAt > new Date();
  }, [mealPlan.unlocks_at]);

  const daysUntilUnlock = useMemo(() => {
    if (!mealPlan.unlocks_at) return 0;
    const unlocksAt = new Date(mealPlan.unlocks_at);
    const now = new Date();
    return Math.ceil((unlocksAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [mealPlan.unlocks_at]);

  // Fetch nutritional strategies to display in profile banner
  const { data: strategies } = useNutritionalStrategies();
  
  // Get current strategy label from user profile
  const currentStrategy = useMemo(() => {
    if (!userProfile?.strategy_id || !strategies) return null;
    return strategies.find(s => s.id === userProfile.strategy_id);
  }, [userProfile?.strategy_id, strategies]);

  // Hook para labels do banco de dados
  const { getIntoleranceLabel, getDietaryLabel } = useSafetyLabels();
  
  // Profile summary for banner - only show if we have meaningful data
  const profileSummary = useMemo(() => {
    const items: { icon: typeof TrendingDown; label: string; key: string }[] = [];
    
    // Strategy
    if (currentStrategy) {
      const strategyIcon = currentStrategy.key === 'lose_weight' || currentStrategy.key === 'weight_loss' || currentStrategy.key === 'cutting' 
        ? TrendingDown 
        : currentStrategy.key === 'gain_weight' || currentStrategy.key === 'weight_gain'
          ? TrendingUp 
          : Activity;
      items.push({ icon: strategyIcon, label: currentStrategy.label, key: 'strategy' });
    }
    
    // Intolerances (show first 2 max, excluding "nenhuma")
    const validIntolerances = (userProfile?.intolerances || []).filter(i => i && i !== 'nenhuma');
    if (validIntolerances.length > 0) {
      const displayIntolerances = validIntolerances
        .slice(0, 2)
        .map(i => getIntoleranceLabel(i))
        .join(', ');
      const extraCount = validIntolerances.length > 2 ? ` +${validIntolerances.length - 2}` : '';
      items.push({ icon: Ban, label: `Sem ${displayIntolerances}${extraCount}`, key: 'intolerances' });
    }
    
    // Dietary preference
    if (userProfile?.dietary_preference && userProfile.dietary_preference !== 'comum') {
      const dietIcon = userProfile.dietary_preference === 'vegana' || userProfile.dietary_preference === 'vegetariana' 
        ? Leaf 
        : userProfile.dietary_preference === 'pescetariana' 
          ? Fish 
          : Utensils;
      items.push({ icon: dietIcon, label: getDietaryLabel(userProfile.dietary_preference), key: 'diet' });
    }
    
    return items;
  }, [currentStrategy, userProfile, getIntoleranceLabel, getDietaryLabel]);

  // Busca horários personalizados do plano
  const { getTimeRanges, getMealTime, hasCustomTimes, getMealOrder, getLabels, settings: mealTimeSettings, isLoading: isLoadingMealTimes } = usePlanMealTimes({ planId: mealPlan.id });
  
  // Monta os ranges de horário usando dados do hook ou fallback
  const MEAL_TIME_RANGES = useMemo(() => {
    const ranges = getTimeRanges();
    if (Object.keys(ranges).length === 0) return DEFAULT_MEAL_TIME_RANGES;
    return ranges;
  }, [getTimeRanges]);

  // Lista de tipos de refeição que existem no plano, ordenados
  const orderedMealTypes = useMemo(() => {
    // Extrair apenas os meal_types que existem no plano
    const planMealTypes = new Set(mealPlan.items.map(item => item.meal_type));
    
    // Usar a ordem global, mas filtrar apenas os que existem no plano
    const order = getMealOrder();
    const orderedList = order.length > 0 ? order : [...STANDARD_MEAL_TYPES];
    
    return orderedList.filter(mealType => planMealTypes.has(mealType));
  }, [getMealOrder, mealPlan.items]);

  // Labels dinâmicas para refeições (inclui extras)
  const mealLabels = useMemo(() => {
    const labels = getLabels();
    return labels;
  }, [getLabels]);

  // Config dinâmica para refeições
  const getDynamicMealConfig = useCallback((mealType: string) => {
    if (MEAL_CONFIG[mealType]) {
      return MEAL_CONFIG[mealType];
    }
    // Fallback para refeições não configuradas
    const label = mealLabels[mealType] || mealType;
    return { icon: Cookie, label, color: "bg-primary/20 text-primary" };
  }, [mealLabels]);

  // Verifica se uma refeição já passou do horário no dia atual
  const isMealPastTime = useCallback((mealType: string, selectedDay: DayInfo | undefined): boolean => {
    if (!selectedDay) return false;
    
    // Se o dia inteiro já passou, todas as refeições passaram
    if (selectedDay.isPast) return true;
    
    // Se não é hoje, não passou ainda
    if (!selectedDay.isToday) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const range = MEAL_TIME_RANGES[mealType];
    
    if (!range) return false;
    
    // A refeição passou se a hora atual é maior que o fim do horário
    return currentHour >= range.end;
  }, [MEAL_TIME_RANGES]);

  // Verifica se uma refeição está ativa (dentro do horário) no momento atual
  const isMealActive = useCallback((mealType: string, selectedDay: DayInfo | undefined): boolean => {
    if (!selectedDay) return false;
    
    // Só pode estar ativa se é hoje
    if (!selectedDay.isToday) return false;
    
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const range = MEAL_TIME_RANGES[mealType];
    
    if (!range) return false;
    
    // A refeição está ativa se a hora atual está dentro do range
    return currentHour >= range.start && currentHour < range.end;
  }, [MEAL_TIME_RANGES]);

  // Dietary compatibility hook - para badges individuais
  const { getMealCompatibility, hasProfile } = useDynamicDietaryCompatibility();

  // Use the plan's start date for weeks calculation (not current date)
  // This ensures scheduled/future plans show their correct month structure
  const planStartDate = useMemo(() => {
    const [year, month, day] = mealPlan.start_date.split('-').map(Number);
    return new Date(year, month - 1, day);
  }, [mealPlan.start_date]);
  
  const { weeks, totalWeeks, currentWeek, todayWeek, todayDayIndex, monthName, year } = useMonthWeeks(planStartDate);

  // Estado interno - inicializa com externo se disponível
  const hasExternalState = externalSelectedWeek !== null && externalSelectedDayIndex !== null;
  
  const [internalSelectedWeek, setInternalSelectedWeek] = useState(() => 
    hasExternalState ? externalSelectedWeek : currentWeek
  );
  const [internalSelectedDayIndex, setInternalSelectedDayIndex] = useState(() => 
    hasExternalState ? externalSelectedDayIndex : todayDayIndex
  );
  
  // Rastreia se o componente já foi inicializado com estado preservado
  const wasInitializedWithExternalRef = useRef(hasExternalState);
  
  // Sempre usar estado interno
  const selectedWeek = internalSelectedWeek;
  const selectedDayIndex = internalSelectedDayIndex;
  
  // Setter que atualiza interno E notifica o parent
  const setSelectedWeek = useCallback((week: number) => {
    setInternalSelectedWeek(week);
    onSelectedWeekChange?.(week);
  }, [onSelectedWeekChange]);
  
  const setSelectedDayIndex = useCallback((dayIndex: number) => {
    setInternalSelectedDayIndex(dayIndex);
    onSelectedDayIndexChange?.(dayIndex);
  }, [onSelectedDayIndexChange]);
  
  // CRÍTICO: Notificar o parent do estado inicial ao montar
  // Isso garante que quando o usuário seleciona uma refeição, o parent já tem os valores corretos
  const hasNotifiedParentRef = useRef(false);
  useEffect(() => {
    if (!hasNotifiedParentRef.current) {
      hasNotifiedParentRef.current = true;
      // Notificar o parent com os valores atuais (iniciais)
      onSelectedWeekChange?.(internalSelectedWeek);
      onSelectedDayIndexChange?.(internalSelectedDayIndex);
    }
  }, []);

  // Get the currently selected week data
  const currentWeekData = useMemo(() => {
    return weeks[selectedWeek - 1] || weeks[0];
  }, [weeks, selectedWeek]);

  // Get the visible days (only days in the current month AND >= plan start date)
  const visibleDays = useMemo(() => {
    if (!currentWeekData) return [];
    
    return currentWeekData.days.filter(d => {
      if (!d.isInMonth) return false;
      
      // Filter out days before plan start date
      const dayDate = new Date(d.date);
      dayDate.setHours(0, 0, 0, 0);
      const planStart = new Date(planStartDate);
      planStart.setHours(0, 0, 0, 0);
      
      return dayDate >= planStart;
    });
  }, [currentWeekData, planStartDate]);

  // Calculate week date range for display
  const weekRangeText = useMemo(() => {
    if (!currentWeekData) return "";
    return formatWeekRange(currentWeekData, planStartDate);
  }, [currentWeekData, planStartDate]);

  // Auto-select dia apenas quando mudamos de semana MANUALMENTE (não na inicialização)
  // Este useEffect só roda quando internalSelectedWeek muda APÓS a montagem inicial
  const isFirstMount = useRef(true);
  
  // Função auxiliar para verificar se um dia tem refeições
  const dayHasMeals = useCallback((dayInfo: DayInfo) => {
    if (!dayInfo || !dayInfo.isInMonth) return false;
    
    const [startYear, startMonth, startDay] = mealPlan.start_date.split('-').map(Number);
    const planStartDate = new Date(startYear, startMonth - 1, startDay);
    planStartDate.setHours(0, 0, 0, 0);
    
    const dayDate = new Date(dayInfo.date);
    dayDate.setHours(0, 0, 0, 0);
    
    if (dayDate < planStartDate) return false;
    
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceStart = Math.round((dayDate.getTime() - planStartDate.getTime()) / msPerDay);
    const planWeekNumber = Math.floor(daysSinceStart / 7) + 1;
    const planDayOfWeek = daysSinceStart % 7;
    
    const meals = mealPlan.items.filter(item => 
      (item.week_number || 1) === planWeekNumber && 
      item.day_of_week === planDayOfWeek
    );
    
    return meals.length > 0;
  }, [mealPlan.start_date, mealPlan.items]);
  
  useEffect(() => {
    // Na primeira montagem, não fazer nada - usar o estado inicial
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    // Se foi inicializado com estado externo preservado, não auto-selecionar
    if (wasInitializedWithExternalRef.current) return;
    
    // Apenas auto-seleciona quando a semana muda manualmente
    if (visibleDays.length > 0 && currentWeekData) {
      // ✅ PRIORIDADE 1: Primeiro dia COM REFEIÇÕES disponíveis
      const firstDayWithMeals = currentWeekData.days.findIndex(d => d.isInMonth && dayHasMeals(d));
      if (firstDayWithMeals >= 0) {
        setSelectedDayIndex(firstDayWithMeals);
        return;
      }
      
      // PRIORIDADE 2: Dia de hoje (se estiver na semana)
      const todayInWeek = currentWeekData.days.findIndex(d => d.isToday);
      if (todayInWeek >= 0) {
        setSelectedDayIndex(todayInWeek);
        return;
      }
      
      // PRIORIDADE 3: Primeiro dia não-passado do mês
      const firstNonPastInMonth = currentWeekData.days.findIndex(d => d.isInMonth && !d.isPast);
      if (firstNonPastInMonth >= 0) {
        setSelectedDayIndex(firstNonPastInMonth);
        return;
      }
      
      // PRIORIDADE 4: Primeiro dia do mês (fallback)
      const firstInMonth = currentWeekData.days.findIndex(d => d.isInMonth);
      if (firstInMonth >= 0) {
        setSelectedDayIndex(firstInMonth);
      }
    }
  }, [internalSelectedWeek, dayHasMeals]);

  // Get the selected day info
  const selectedDay = currentWeekData?.days[selectedDayIndex];

  // Get meals for a specific day
  const getDayMeals = (dayInfo: DayInfo) => {
    if (!dayInfo || !dayInfo.isInMonth) return [];

    // Parse plan start date safely (avoid timezone issues by using local date parts)
    const [startYear, startMonth, startDay] = mealPlan.start_date.split('-').map(Number);
    const planStartDate = new Date(startYear, startMonth - 1, startDay);
    planStartDate.setHours(0, 0, 0, 0);
    
    const dayDate = new Date(dayInfo.date);
    dayDate.setHours(0, 0, 0, 0);

    // Check if day is before plan start
    if (dayDate < planStartDate) return [];

    // Calculate days since start using milliseconds to avoid timezone issues
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysSinceStart = Math.round((dayDate.getTime() - planStartDate.getTime()) / msPerDay);

    // Calculate which plan week and day this corresponds to
    const planWeekNumber = Math.floor(daysSinceStart / 7) + 1;
    const planDayOfWeek = daysSinceStart % 7;

    return mealPlan.items.filter(item => 
      (item.week_number || 1) === planWeekNumber && 
      item.day_of_week === planDayOfWeek
    );
  };

  const getDayTotals = (dayInfo: DayInfo) => {
    const meals = getDayMeals(dayInfo);
    return {
      calories: meals.reduce((sum, m) => sum + m.recipe_calories, 0),
      protein: meals.reduce((sum, m) => sum + m.recipe_protein, 0),
      carbs: meals.reduce((sum, m) => sum + m.recipe_carbs, 0),
      fat: meals.reduce((sum, m) => sum + m.recipe_fat, 0),
    };
  };

  const currentDayMeals = selectedDay ? getDayMeals(selectedDay) : [];
  const dayTotals = selectedDay ? getDayTotals(selectedDay) : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const openAlternativesSheet = (meal: MealPlanItem, mealType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlternativesSheet({ open: true, meal, mealType });
  };

  const handleMealUpdated = (updatedMeal: MealPlanItem) => {
    // Invalidar caches do React Query para atualizar outros componentes
    queryClient.invalidateQueries({ queryKey: ["meal-plan-items"] });
    queryClient.invalidateQueries({ queryKey: ["next-meal"] });
    queryClient.invalidateQueries({ queryKey: ["pending-meals"] });
    
    if (onMealUpdated) {
      onMealUpdated(updatedMeal);
    }
  };

  const getDayStatus = (dayInfo: DayInfo): 'pending' | 'partial' | 'complete' => {
    return 'pending';
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with dynamic month/year */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground capitalize">
            {monthName} De {year}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {weekRangeText}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {onEditPlan && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onEditPlan}
              className="shrink-0"
              title="Editar plano"
            >
              <Settings2 className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Profile Personalization Banner */}
      {profileSummary.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2 border border-border/50">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium text-foreground/70">Personalizado:</span>
          {profileSummary.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <span key={item.key} className="inline-flex items-center gap-1">
                <IconComponent className="w-3 h-3" />
                <span>{item.label}</span>
                {index < profileSummary.length - 1 && <span className="text-border">•</span>}
              </span>
            );
          })}
        </div>
      )}

      {/* Scheduled Plan Banner */}
      {isScheduledPlan && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                Plano Agendado
              </p>
              <p className="text-xs text-muted-foreground">
                Disponível em {daysUntilUnlock} dia{daysUntilUnlock !== 1 ? 's' : ''}. Edite as receitas antes de liberar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dietary Compatibility Panel - ISOLADO (busca dados diretamente do banco) */}
      <DietaryCompatibilityPanel mealPlanId={mealPlan.id} />

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Semana
        </label>
        <Select
          value={selectedWeek.toString()}
          onValueChange={(value) => {
            const weekNum = Number(value);
            const week = weeks[weekNum - 1];
            if (week && !week.isPast) {
              setSelectedWeek(weekNum);
            }
          }}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Semana" />
          </SelectTrigger>
          <SelectContent className="bg-background border">
            {weeks.map((week) => (
              <SelectItem 
                key={week.weekNumber} 
                value={week.weekNumber.toString()}
                disabled={week.isPast}
                className={cn(week.isPast && "opacity-50 text-muted-foreground")}
              >
                Semana {week.weekNumber} {week.isPast && "(passada)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mini Calendar - Only days in current month for this week */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Dia
        </label>
        <div className="flex gap-1 flex-wrap">
          {currentWeekData?.days
            .map((day, originalIndex) => ({ day, originalIndex }))
            .filter(({ day }) => day.isInMonth && day.date >= planStartDate)
            .map(({ day, originalIndex }) => {
              const dayNumber = day.dayOfMonth;
              const dayName = DAY_NAMES_SHORT[day.dayOfWeek];
              const isSelected = selectedDayIndex === originalIndex;
              const status = getDayStatus(day);
              const hasMeals = getDayMeals(day).length > 0;
              const isToday = day.isToday;
              const isPastDay = day.isPast;

              return (
                <button
                  key={`${day.date.toISOString()}`}
                  onClick={() => !isPastDay && setSelectedDayIndex(originalIndex)}
                  disabled={isPastDay}
                  className={cn(
                    "relative flex flex-col items-center py-2 px-3 sm:p-3 rounded-xl transition-all border min-w-[60px]",
                    isPastDay 
                      ? "bg-muted/50 text-muted-foreground border-muted cursor-not-allowed opacity-60"
                      : isSelected 
                        ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                        : "bg-background hover:bg-muted border-border hover:border-primary/50",
                    isToday && !isSelected && !isPastDay && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-[0_0_12px_rgba(var(--primary),0.4)]"
                  )}
                >
                  {/* Today Badge */}
                  {isToday && !isPastDay && (
                    <span className={cn(
                      "absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider",
                      isSelected 
                        ? "bg-primary-foreground text-primary" 
                        : "bg-primary text-primary-foreground"
                    )}>
                      Hoje
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] sm:text-xs font-medium",
                    isPastDay ? "text-muted-foreground" : isSelected ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {dayName}
                  </span>
                  <span className={cn(
                    "text-sm sm:text-lg font-bold",
                    isPastDay ? "text-muted-foreground" : isSelected ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {dayNumber}
                  </span>
                  {/* Status indicator */}
                  <div className={cn(
                    "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mt-0.5 sm:mt-1",
                    !hasMeals && "bg-muted-foreground/30",
                    hasMeals && isPastDay && "bg-muted-foreground/30",
                    hasMeals && !isPastDay && status === 'pending' && "bg-muted-foreground/50",
                    hasMeals && !isPastDay && status === 'partial' && "bg-yellow-500",
                    hasMeals && !isPastDay && status === 'complete' && "bg-green-500",
                  )} />
                </button>
              );
            })}
        </div>
      </div>

      {/* Day Summary */}
      {selectedDay && (
        <Card className="glass-card border-primary/20">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wide">
              Consumo de {DAY_NAMES_FULL[selectedDay.dayOfWeek]}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 shrink-0" />
                <span className="font-semibold text-sm sm:text-base">{dayTotals.calories}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">kcal</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Beef className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                <span className="font-semibold text-sm sm:text-base">{dayTotals.protein.toFixed(0)}g</span>
                <span className="text-xs sm:text-sm text-muted-foreground">prot</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Wheat className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
                <span className="font-semibold text-sm sm:text-base">{dayTotals.carbs.toFixed(0)}g</span>
                <span className="text-xs sm:text-sm text-muted-foreground">carbs</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] sm:text-xs">🧈</span>
                </div>
                <span className="font-semibold text-sm sm:text-base">{dayTotals.fat.toFixed(0)}g</span>
                <span className="text-xs sm:text-sm text-muted-foreground">gord</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meals List */}
      <div className="space-y-3 sm:space-y-4">
      {orderedMealTypes.map((mealType) => {
          const meal = currentDayMeals.find(m => m.meal_type === mealType);
          const config = getDynamicMealConfig(mealType);
          const Icon = config.icon;
          const isPastMeal = isMealPastTime(mealType, selectedDay);
          const isActiveMeal = isMealActive(mealType, selectedDay);

          return (
            <Card 
              key={mealType} 
              className={cn(
                "glass-card transition-all",
                isPastMeal 
                  ? "opacity-50 cursor-not-allowed border-muted bg-muted/20" 
                  : "hover:border-primary/30 cursor-pointer group",
                meal && !isPastMeal ? "border-border" : "border-dashed border-muted-foreground/30",
                // Highlight active meal
                isActiveMeal && meal && "ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-[0_0_16px_rgba(var(--primary),0.3)]"
              )}
              onClick={() => !isPastMeal && meal && onSelectMeal(meal)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={cn(
                    "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0", 
                    isPastMeal ? "bg-muted text-muted-foreground" : config.color
                  )}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  
                  {meal ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            {config.label}
                            <span className="normal-case font-normal text-muted-foreground/70">
                              {getMealTime(mealType)}
                            </span>
                            {hasCustomTimes && (
                              <span className="text-[8px] text-primary/60">•</span>
                            )}
                            {isActiveMeal && (
                              <Badge className="text-[8px] sm:text-[10px] px-1.5 py-0 bg-primary text-primary-foreground uppercase animate-pulse">
                                Agora
                              </Badge>
                            )}
                            {isPastMeal && (
                              <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-muted-foreground/30 uppercase">
                                Passou
                              </Badge>
                            )}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={cn(
                              "font-display font-semibold text-sm sm:text-base line-clamp-2",
                              isPastMeal 
                                ? "text-muted-foreground" 
                                : "text-foreground group-hover:text-primary transition-colors"
                            )}>
                              {meal.recipe_name}
                            </h3>
                            {meal.from_pool && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 uppercase font-bold">
                                POOL
                              </Badge>
                            )}
                            {!meal.from_pool && meal.recipe_ingredients && meal.recipe_ingredients.length >= 3 && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 uppercase font-bold">
                                DIRETO
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!isPastMeal && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              title="Ver detalhes da refeição"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectMeal(meal);
                              }}
                              className="p-1 transition-colors"
                            >
                              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-primary transition-colors stroke-[1.5]" />
                            </button>
                            <FavoriteButton
                              isFavorite={meal.is_favorite}
                              onClick={() => onToggleFavorite(meal.id)}
                              size="lg"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Flame className={cn("w-3 h-3 sm:w-4 sm:h-4", isPastMeal ? "text-muted-foreground" : "text-orange-500")} />
                          {meal.recipe_calories} kcal
                        </span>
                        <span className="flex items-center gap-1">
                          <Beef className={cn("w-3 h-3 sm:w-4 sm:h-4", isPastMeal ? "text-muted-foreground" : "text-red-500")} />
                          {meal.recipe_protein}g
                        </span>
                        <span>{meal.recipe_prep_time} min</span>
                        
                        {/* Dietary Compatibility Badge - ANÁLISE DINÂMICA */}
                        {hasProfile && !isPastMeal && (() => {
                          const compatibility = getMealCompatibility(meal.recipe_ingredients);
                          return (
                            <DietaryCompatibilityBadge 
                              compatibility={compatibility}
                              notes={null}
                              showLabel={true}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            {config.label}
                            <span className="normal-case font-normal text-muted-foreground/70">
                              {getMealTime(mealType)}
                            </span>
                            {hasCustomTimes && (
                              <span className="text-[8px] text-primary/60">•</span>
                            )}
                            {isActiveMeal && (
                              <Badge className="text-[8px] sm:text-[10px] px-1.5 py-0 bg-primary text-primary-foreground uppercase animate-pulse">
                                Agora
                              </Badge>
                            )}
                            {isPastMeal && (
                              <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-muted-foreground/30 uppercase">
                                Passou
                              </Badge>
                            )}
                      </p>
                      <p className="text-sm text-muted-foreground italic">Nenhuma receita definida</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Meal Alternatives Sheet */}
      <MealAlternativesSheet
        open={alternativesSheet.open}
        onOpenChange={(open) => setAlternativesSheet({ ...alternativesSheet, open })}
        meal={alternativesSheet.meal}
        mealType={alternativesSheet.mealType}
        mealLabel={MEAL_CONFIG[alternativesSheet.mealType]?.label || "Refeição"}
        onMealUpdated={handleMealUpdated}
      />
    </div>
  );
}
