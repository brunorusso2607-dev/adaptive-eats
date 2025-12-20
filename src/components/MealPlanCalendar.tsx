import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Coffee, UtensilsCrossed, Cookie, Moon, Soup, Flame, Beef, Wheat, Heart, X, CalendarDays, ChevronDown, RefreshCw, Zap, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
  items: MealPlanItem[];
};

type MealPlanCalendarProps = {
  mealPlan: MealPlan;
  onClose: () => void;
  onSelectMeal: (meal: MealPlanItem) => void;
  onToggleFavorite: (mealId: string) => void;
  onMealUpdated?: (updatedMeal: MealPlanItem) => void;
};

// Fixed order: Monday to Sunday (display positions 0-6)
const DAY_NAMES_FIXED = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DAY_NAMES_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const MEAL_CONFIG: Record<string, { icon: typeof Coffee; label: string; color: string }> = {
  cafe_manha: { icon: Coffee, label: "Café da Manhã", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  almoco: { icon: UtensilsCrossed, label: "Almoço", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  lanche: { icon: Cookie, label: "Lanche", color: "bg-purple-500/20 text-purple-600 dark:text-purple-400" },
  jantar: { icon: Moon, label: "Jantar", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  ceia: { icon: Soup, label: "Ceia", color: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
};

export default function MealPlanCalendar({ mealPlan, onClose, onSelectMeal, onToggleFavorite, onMealUpdated }: MealPlanCalendarProps) {
  const [selectedDay, setSelectedDay] = useState(0);
  const [regenerateDialog, setRegenerateDialog] = useState<{ open: boolean; meal: MealPlanItem | null; mealType: string }>({
    open: false,
    meal: null,
    mealType: "",
  });
  const [ingredients, setIngredients] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // Get unique weeks from the items
  const availableWeeks = useMemo(() => {
    const weeks = [...new Set(mealPlan.items.map(item => item.week_number || 1))].sort((a, b) => a - b);
    return weeks.length > 0 ? weeks : [1];
  }, [mealPlan.items]);

  // Check if a week is entirely in the past
  const isWeekInPast = (weekNumber: number) => {
    const [year, month, day] = mealPlan.start_date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    
    // Calculate the last day of this week
    const weekStartOffset = (weekNumber - 1) * 7;
    const weekEndDate = new Date(startDate);
    weekEndDate.setDate(startDate.getDate() + weekStartOffset + 6); // Last day of the week
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return weekEndDate < today;
  };

  // Find the first non-past week
  const firstActiveWeek = useMemo(() => {
    for (const week of availableWeeks) {
      if (!isWeekInPast(week)) {
        return week;
      }
    }
    return availableWeeks[availableWeeks.length - 1] || 1;
  }, [availableWeeks, mealPlan.start_date]);

  const [selectedWeek, setSelectedWeek] = useState(firstActiveWeek);

  // Calculate dates for Mon-Sun of the selected display week
  const getWeekDates = useMemo(() => {
    // Parse start_date as local date (not UTC)
    const [year, month, day] = mealPlan.start_date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day);
    
    // Get the day of week of the start date (0 = Sunday, 1 = Monday, ... 6 = Saturday)
    const startDayOfWeek = startDate.getDay();
    
    // Calculate how many days back to Monday
    // Sunday (0) -> go back 6 days to Monday
    // Monday (1) -> go back 0 days
    // Tuesday (2) -> go back 1 day, etc.
    const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    
    // Get the Monday of the first week
    const firstMonday = new Date(startDate);
    firstMonday.setDate(startDate.getDate() - daysToMonday);
    
    // Add weeks based on selectedWeek
    const weekStartDate = new Date(firstMonday);
    weekStartDate.setDate(firstMonday.getDate() + (selectedWeek - 1) * 7);
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(weekStartDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [mealPlan.start_date, selectedWeek]);

  // Check if a display day is before the plan start date (using date-only comparison)
  const isDayBeforeStart = (displayDayIndex: number) => {
    const date = getWeekDates[displayDayIndex];
    // Parse start_date as local date (not UTC)
    const [year, month, day] = mealPlan.start_date.split('-').map(Number);
    const startDateLocal = new Date(year, month - 1, day);
    
    // Compare dates only (no time component)
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startOnly = new Date(startDateLocal.getFullYear(), startDateLocal.getMonth(), startDateLocal.getDate());
    
    return dateOnly.getTime() < startOnly.getTime();
  };

  // Get meals for a specific display day index (0 = Monday, 6 = Sunday)
  const getDayMeals = (displayDayIndex: number) => {
    if (isDayBeforeStart(displayDayIndex)) {
      return []; // No meals before plan start
    }
    
    const date = new Date(getWeekDates[displayDayIndex]);
    date.setHours(0, 0, 0, 0);
    const startDate = new Date(mealPlan.start_date);
    startDate.setHours(0, 0, 0, 0);
    
    // Calculate days since plan start
    const diffTime = date.getTime() - startDate.getTime();
    const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate which plan week and day this corresponds to
    const planWeekNumber = Math.floor(daysSinceStart / 7) + 1;
    const planDayOfWeek = daysSinceStart % 7;
    
    // Filter items matching this plan week and day
    return mealPlan.items.filter(item => 
      (item.week_number || 1) === planWeekNumber && 
      item.day_of_week === planDayOfWeek
    );
  };

  const getDayTotals = (dayIndex: number) => {
    const meals = getDayMeals(dayIndex);
    return {
      calories: meals.reduce((sum, m) => sum + m.recipe_calories, 0),
      protein: meals.reduce((sum, m) => sum + m.recipe_protein, 0),
      carbs: meals.reduce((sum, m) => sum + m.recipe_carbs, 0),
      fat: meals.reduce((sum, m) => sum + m.recipe_fat, 0),
    };
  };

  // Calculate the first valid (non-disabled) day index
  const firstValidDayIndex = useMemo(() => {
    for (let i = 0; i < 7; i++) {
      if (!isDayBeforeStart(i)) {
        return i;
      }
    }
    return 0;
  }, [getWeekDates, mealPlan.start_date]);

  // Auto-select first valid day when week changes or on mount
  useEffect(() => {
    setSelectedDay(firstValidDayIndex);
  }, [selectedWeek, firstValidDayIndex]);

  const currentDayMeals = getDayMeals(selectedDay);
  const dayTotals = getDayTotals(selectedDay);

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
          ingredients: mode === "with_ingredients" ? ingredients : null,
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
        setIngredients("");
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

  // formatWeekRange and getMonthYear use getWeekDates defined earlier

  const formatWeekRange = useMemo(() => {
    const startDate = getWeekDates[0];
    const endDate = getWeekDates[6];
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }, [getWeekDates]);

  const getMonthYear = useMemo(() => {
    const middleDate = getWeekDates[3]; // Use middle of week for month display
    return middleDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [getWeekDates]);

  // Check if a day has all meals executed (placeholder for future implementation)
  const getDayStatus = (dayIndex: number): 'pending' | 'partial' | 'complete' => {
    // TODO: Implement actual execution check when meal_executions table is created
    // For now, return 'pending' for all days
    return 'pending';
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with dynamic dates */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground capitalize">{getMonthYear}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {formatWeekRange}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Week Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Semana
        </label>
        <Select
          value={selectedWeek.toString()}
          onValueChange={(value) => {
            setSelectedWeek(Number(value));
            setSelectedDay(0);
          }}
        >
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Semana" />
          </SelectTrigger>
          <SelectContent className="bg-background border">
            {availableWeeks.map((week) => {
              const isPast = isWeekInPast(week);
              return (
                <SelectItem 
                  key={week} 
                  value={week.toString()}
                  disabled={isPast}
                  className={cn(isPast && "opacity-50")}
                >
                  Semana {week} {isPast && "(passada)"}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Mini Calendar - Horizontal Days */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Dia
        </label>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {DAY_NAMES_FIXED.map((dayName, index) => {
            const date = getWeekDates[index];
            const dayNumber = date.getDate();
            const isSelected = selectedDay === index;
            const status = getDayStatus(index);
            const hasMeals = getDayMeals(index).length > 0;
            const isDisabled = isDayBeforeStart(index);
            
            return (
              <button
                key={`${dayName}-${index}`}
                onClick={() => !isDisabled && setSelectedDay(index)}
                disabled={isDisabled}
                className={cn(
                  "flex flex-col items-center p-2 sm:p-3 rounded-xl transition-all border",
                  isDisabled && "opacity-40 cursor-not-allowed bg-muted/50 border-muted",
                  !isDisabled && isSelected 
                    ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105" 
                    : !isDisabled && "bg-background hover:bg-muted border-border hover:border-primary/50",
                )}
              >
                <span className={cn(
                  "text-[10px] sm:text-xs font-medium",
                  isDisabled ? "text-muted-foreground/50" : isSelected ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {dayName}
                </span>
                <span className={cn(
                  "text-base sm:text-lg font-bold",
                  isDisabled ? "text-muted-foreground/50" : isSelected ? "text-primary-foreground" : "text-foreground"
                )}>
                  {dayNumber}
                </span>
                {/* Status indicator */}
                <div className={cn(
                  "w-2 h-2 rounded-full mt-1",
                  isDisabled && "bg-muted-foreground/20",
                  !isDisabled && !hasMeals && "bg-muted-foreground/30",
                  !isDisabled && hasMeals && status === 'pending' && "bg-muted-foreground/50",
                  !isDisabled && hasMeals && status === 'partial' && "bg-yellow-500",
                  !isDisabled && hasMeals && status === 'complete' && "bg-green-500",
                )} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Summary */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wide">
            Consumo de {DAY_NAMES_FULL[selectedDay]}
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

      {/* Meals List */}
      <div className="space-y-3 sm:space-y-4">
        {["cafe_manha", "almoco", "lanche", "jantar", "ceia"].map((mealType) => {
          const meal = currentDayMeals.find(m => m.meal_type === mealType);
          const config = MEAL_CONFIG[mealType];
          const Icon = config.icon;

          return (
            <Card 
              key={mealType} 
              className={cn(
                "glass-card hover:border-primary/30 transition-all cursor-pointer group",
                meal ? "border-border" : "border-dashed border-muted-foreground/30"
              )}
              onClick={() => meal && onSelectMeal(meal)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0", config.color)}>
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  
                  {meal ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {config.label}
                          </p>
                          <h3 className="font-display font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {meal.recipe_name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 sm:w-10 sm:h-10"
                            title="Gerar nova receita"
                            onClick={(e) => openRegenerateDialog(meal, mealType, e)}
                          >
                            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-primary transition-colors" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 sm:w-10 sm:h-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(meal.id);
                            }}
                          >
                            <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5", meal.is_favorite && "fill-red-500 text-red-500")} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 sm:gap-4 mt-1.5 sm:mt-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                          {meal.recipe_calories} kcal
                        </span>
                        <span className="flex items-center gap-1">
                          <Beef className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                          {meal.recipe_protein}g
                        </span>
                        <span>{meal.recipe_prep_time} min</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {config.label}
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
        if (!open) setIngredients("");
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
            
            {/* Input de ingredientes */}
            <div className="flex gap-2">
              <input 
                type="text" 
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="Ex: frango, batata, cebola..."
                className="flex-1 px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isRegenerating}
                onKeyDown={(e) => e.key === "Enter" && ingredients.trim() && handleRegenerate("with_ingredients")}
              />
              <Button 
                className="gradient-primary border-0 px-6"
                onClick={() => handleRegenerate("with_ingredients")}
                disabled={isRegenerating || !ingredients.trim()}
              >
                {isRegenerating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
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
