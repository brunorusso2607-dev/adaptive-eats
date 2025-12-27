import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, UtensilsCrossed, Cookie, Moon, Soup, Flame, Beef, Wheat, X, RefreshCw, Zap, Sparkles, Loader2, Settings2, Lock, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { FavoriteButton } from "./FavoriteButton";
import { DietaryCompatibilityBadge } from "./DietaryCompatibilityBadge";
import { DietaryCompatibilitySummary } from "./DietaryCompatibilitySummary";
import { useDynamicDietaryCompatibility } from "@/hooks/useDynamicDietaryCompatibility";
import { useReplaceIncompatibleMeals } from "@/hooks/useReplaceIncompatibleMeals";
import { usePlanMealTimes } from "@/hooks/usePlanMealTimes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useMonthWeeks, formatWeekRange, type WeekInfo, type DayInfo } from "@/hooks/useMonthWeeks";
import IngredientTagInput from "@/components/IngredientTagInput";

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
};

type MealPlanCalendarProps = {
  mealPlan: MealPlan;
  onClose: () => void;
  onSelectMeal: (meal: MealPlanItem) => void;
  onToggleFavorite: (mealId: string) => void;
  onMealUpdated?: (updatedMeal: MealPlanItem) => void;
  onEditPlan?: () => void;
  userProfile?: UserProfile | null;
};

const DAY_NAMES_SHORT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DAY_NAMES_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

// Standard meal types - internal keys used across the system
const MEAL_TYPES_ORDERED = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"] as const;

const MEAL_CONFIG: Record<string, { icon: typeof Coffee; label: string; color: string }> = {
  cafe_manha: { icon: Coffee, label: "Café da Manhã", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  almoco: { icon: UtensilsCrossed, label: "Almoço", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  lanche: { icon: Cookie, label: "Lanche", color: "bg-purple-500/20 text-purple-600 dark:text-purple-400" },
  jantar: { icon: Moon, label: "Jantar", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  ceia: { icon: Soup, label: "Ceia", color: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
};

// Fallback horários padrão (usado apenas se hook não carregar)
const DEFAULT_MEAL_TIME_RANGES: Record<string, { start: number; end: number }> = {
  cafe_manha: { start: 6, end: 10 },
  almoco: { start: 10, end: 14 },
  lanche: { start: 14, end: 17 },
  jantar: { start: 17, end: 21 },
  ceia: { start: 21, end: 24 },
};

export default function MealPlanCalendar({ mealPlan, onClose, onSelectMeal, onToggleFavorite, onMealUpdated, onEditPlan, userProfile }: MealPlanCalendarProps) {
  const [regenerateDialog, setRegenerateDialog] = useState<{ open: boolean; meal: MealPlanItem | null; mealType: string }>({
    open: false,
    meal: null,
    mealType: "",
  });
  const [ingredientTags, setIngredientTags] = useState<string[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

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

  // Busca horários personalizados do plano
  const { getTimeRanges, getMealTime, hasCustomTimes, isLoading: isLoadingMealTimes } = usePlanMealTimes({ planId: mealPlan.id });
  
  // Monta os ranges de horário usando dados do hook ou fallback
  const MEAL_TIME_RANGES = useMemo(() => {
    const ranges = getTimeRanges();
    if (Object.keys(ranges).length === 0) return DEFAULT_MEAL_TIME_RANGES;
    return ranges;
  }, [getTimeRanges]);

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

  // Dietary compatibility hook - ANÁLISE DINÂMICA baseada em ingredientes
  const { getMealCompatibility, hasRestrictions, isLoading: isLoadingCompatibility, hasProfile } = useDynamicDietaryCompatibility();

  // Replace incompatible meals hook
  const { replaceIncompatibleMeals, isReplacing, progress: replaceProgress } = useReplaceIncompatibleMeals();

  // Calculate compatibility counts and incompatible meals list - USANDO ANÁLISE DINÂMICA DOS INGREDIENTES
  const { compatibilityCounts, incompatibleMeals } = useMemo(() => {
    const counts = { good: 0, moderate: 0, incompatible: 0, unknown: 0, total: 0 };
    const incompatible: MealPlanItem[] = [];
    
    if (!hasRestrictions || !mealPlan.items) return { compatibilityCounts: counts, incompatibleMeals: incompatible };
    
    mealPlan.items.forEach(meal => {
      // ANÁLISE DINÂMICA: verifica os ingredientes da receita contra as restrições do usuário
      const compatibility = getMealCompatibility(meal.recipe_ingredients);
      counts.total++;
      if (compatibility === 'good') counts.good++;
      else if (compatibility === 'moderate') counts.moderate++;
      else if (compatibility === 'incompatible') {
        counts.incompatible++;
        incompatible.push(meal);
      }
      else counts.unknown++;
    });
    
    return { compatibilityCounts: counts, incompatibleMeals: incompatible };
  }, [mealPlan.items, getMealCompatibility, hasRestrictions]);

  // Handle replace incompatible meals
  const handleReplaceIncompatible = useCallback(() => {
    if (incompatibleMeals.length === 0) return;
    replaceIncompatibleMeals(incompatibleMeals, onMealUpdated);
  }, [incompatibleMeals, replaceIncompatibleMeals, onMealUpdated]);

  // Use the current month for dynamic weeks calculation
  const currentDate = new Date();
  const { weeks, totalWeeks, currentWeek, todayWeek, todayDayIndex, monthName, year } = useMonthWeeks(currentDate);

  // Initialize selected week to current week
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayDayIndex);

  // Get the currently selected week data
  const currentWeekData = useMemo(() => {
    return weeks[selectedWeek - 1] || weeks[0];
  }, [weeks, selectedWeek]);

  // Get the visible days (only days in the current month)
  const visibleDays = useMemo(() => {
    return currentWeekData?.days.filter(d => d.isInMonth) || [];
  }, [currentWeekData]);

  // Calculate week date range for display
  const weekRangeText = useMemo(() => {
    if (!currentWeekData) return "";
    return formatWeekRange(currentWeekData, currentDate);
  }, [currentWeekData, currentDate]);

  // Auto-select first visible non-past day when week changes (only on week change, not day click)
  useEffect(() => {
    if (visibleDays.length > 0) {
      // When week changes, select today if it's in this week, otherwise first non-past visible day
      const todayInWeek = currentWeekData.days.findIndex(d => d.isToday);
      if (todayInWeek >= 0) {
        setSelectedDayIndex(todayInWeek);
      } else {
        // Select first non-past day in month for this week
        const firstNonPastInMonth = currentWeekData.days.findIndex(d => d.isInMonth && !d.isPast);
        if (firstNonPastInMonth >= 0) {
          setSelectedDayIndex(firstNonPastInMonth);
        } else {
          // Fallback to first day in month (even if past) - for past weeks that user somehow got to
          const firstInMonth = currentWeekData.days.findIndex(d => d.isInMonth);
          if (firstInMonth >= 0) {
            setSelectedDayIndex(firstInMonth);
          }
        }
      }
    }
  }, [selectedWeek]); // Only trigger on week change

  // Get the selected day info
  const selectedDay = currentWeekData?.days[selectedDayIndex];

  // Get meals for a specific day
  const getDayMeals = (dayInfo: DayInfo) => {
    if (!dayInfo || !dayInfo.isInMonth) return [];

    // Calculate the day_of_week based on days since plan start
    const planStartDate = new Date(mealPlan.start_date);
    planStartDate.setHours(0, 0, 0, 0);
    
    const dayDate = new Date(dayInfo.date);
    dayDate.setHours(0, 0, 0, 0);

    // Check if day is before plan start
    if (dayDate < planStartDate) return [];

    const diffTime = dayDate.getTime() - planStartDate.getTime();
    const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));

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

  const handleRegenerate = async (mode: "automatic" | "with_ingredients") => {
    if (!regenerateDialog.meal) return;

    setIsRegenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Não autenticado");
      }

      const response = await supabase.functions.invoke("regenerate-meal", {
        body: {
          mealItemId: regenerateDialog.meal.id,
          mealType: regenerateDialog.mealType,
          ingredients: mode === "with_ingredients" ? ingredientTags.join(", ") : null,
          mode,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao regenerar receita");
      }

      if (response.data?.success && response.data?.meal) {
        toast({
          title: "Receita atualizada!",
          description: `Nova receita: ${response.data.meal.recipe_name}`,
        });

        if (onMealUpdated) {
          onMealUpdated(response.data.meal);
        }

        setRegenerateDialog({ open: false, meal: null, mealType: "" });
        setIngredientTags([]);
      } else {
        throw new Error(response.data?.error || "Erro desconhecido");
      }
    } catch (error) {
      console.error("Error regenerating meal:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao regenerar receita",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const openRegenerateDialog = (meal: MealPlanItem, mealType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRegenerateDialog({ open: true, meal, mealType });
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

      {/* Dietary Compatibility Summary */}
      <DietaryCompatibilitySummary 
        counts={compatibilityCounts}
        isLoading={isLoadingCompatibility}
        hasProfile={hasProfile}
        onReplaceIncompatible={handleReplaceIncompatible}
        isReplacing={isReplacing}
        replaceProgress={replaceProgress}
      />

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
        <div className="grid grid-cols-7 gap-1">
          {currentWeekData?.days.map((day, index) => {
            // If day is not in month, render empty placeholder to maintain grid
            if (!day.isInMonth) {
              return <div key={`empty-${index}`} className="min-h-[60px]" />;
            }

            const dayNumber = day.dayOfMonth;
            const dayName = DAY_NAMES_SHORT[day.dayOfWeek];
            const isSelected = selectedDayIndex === index;
            const status = getDayStatus(day);
            const hasMeals = getDayMeals(day).length > 0;
            const isToday = day.isToday;

            const isPastDay = day.isPast;

            return (
              <button
                key={`${day.date.toISOString()}`}
                onClick={() => !isPastDay && setSelectedDayIndex(index)}
                disabled={isPastDay}
                className={cn(
                  "flex flex-col items-center py-2 px-1 sm:p-3 rounded-xl transition-all border",
                  isPastDay 
                    ? "bg-muted/50 text-muted-foreground border-muted cursor-not-allowed opacity-60"
                    : isSelected 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                      : "bg-background hover:bg-muted border-border hover:border-primary/50",
                  isToday && !isSelected && !isPastDay && "ring-2 ring-primary/50"
                )}
              >
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
        {MEAL_TYPES_ORDERED.map((mealType) => {
          const meal = currentDayMeals.find(m => m.meal_type === mealType);
          const config = MEAL_CONFIG[mealType];
          const Icon = config.icon;
          const isPastMeal = isMealPastTime(mealType, selectedDay);

          return (
            <Card 
              key={mealType} 
              className={cn(
                "glass-card transition-all",
                isPastMeal 
                  ? "opacity-50 cursor-not-allowed border-muted bg-muted/20" 
                  : "hover:border-primary/30 cursor-pointer group",
                meal && !isPastMeal ? "border-border" : "border-dashed border-muted-foreground/30"
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
                            {isPastMeal && (
                              <Badge variant="outline" className="text-[8px] sm:text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-muted-foreground/30 uppercase">
                                Passou
                              </Badge>
                            )}
                          </p>
                          <h3 className={cn(
                            "font-display font-semibold text-sm sm:text-base line-clamp-2",
                            isPastMeal 
                              ? "text-muted-foreground" 
                              : "text-foreground group-hover:text-primary transition-colors"
                          )}>
                            {meal.recipe_name}
                          </h3>
                        </div>
                        {!isPastMeal && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              title="Gerar nova receita"
                              onClick={(e) => openRegenerateDialog(meal, mealType, e)}
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

      {/* Regenerate Dialog */}
      <Dialog open={regenerateDialog.open} onOpenChange={(open) => {
        setRegenerateDialog({ open, meal: regenerateDialog.meal, mealType: regenerateDialog.mealType });
        if (!open) setIngredientTags([]);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              Nova receita para {MEAL_CONFIG[regenerateDialog.mealType]?.label || ""}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Opção automática */}
            <Button
              variant="outline"
              className="w-full gradient-accent border-0 text-accent-foreground hover:opacity-90 h-12"
              onClick={() => handleRegenerate("automatic")}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Zap className="w-5 h-5 mr-2" />
              )}
              Surpreenda-me!
            </Button>
            
            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou digite ingredientes</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            
            {/* Input de ingredientes com sugestões dinâmicas */}
            <div className="space-y-3">
              <IngredientTagInput
                value={ingredientTags}
                onChange={setIngredientTags}
                placeholder="Digite um ingrediente..."
                disabled={isRegenerating}
                onSubmit={() => ingredientTags.length > 0 && handleRegenerate("with_ingredients")}
                userProfile={userProfile}
              />
              
              <Button 
                className="w-full gradient-primary border-0"
                onClick={() => handleRegenerate("with_ingredients")}
                disabled={isRegenerating || ingredientTags.length === 0}
              >
                {isRegenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                Gerar com ingredientes
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              A nova receita substituirá a atual: {regenerateDialog.meal?.recipe_name}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
