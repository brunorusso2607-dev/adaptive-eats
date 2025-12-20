import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Coffee, UtensilsCrossed, Cookie, Moon, Soup, Flame, Beef, Wheat, Heart, X, CalendarDays, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
};

const DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const MEAL_CONFIG: Record<string, { icon: typeof Coffee; label: string; color: string }> = {
  cafe_manha: { icon: Coffee, label: "Café da Manhã", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400" },
  almoco: { icon: UtensilsCrossed, label: "Almoço", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" },
  lanche: { icon: Cookie, label: "Lanche", color: "bg-purple-500/20 text-purple-600 dark:text-purple-400" },
  jantar: { icon: Moon, label: "Jantar", color: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
  ceia: { icon: Soup, label: "Ceia", color: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
};

export default function MealPlanCalendar({ mealPlan, onClose, onSelectMeal, onToggleFavorite }: MealPlanCalendarProps) {
  const [selectedDay, setSelectedDay] = useState(0);
  
  // Get unique weeks from the items
  const availableWeeks = useMemo(() => {
    const weeks = [...new Set(mealPlan.items.map(item => item.week_number || 1))].sort((a, b) => a - b);
    return weeks.length > 0 ? weeks : [1];
  }, [mealPlan.items]);

  const [selectedWeek, setSelectedWeek] = useState(availableWeeks[0] || 1);

  // Filter items by selected week
  const weekItems = useMemo(() => {
    return mealPlan.items.filter(item => (item.week_number || 1) === selectedWeek);
  }, [mealPlan.items, selectedWeek]);

  const getDayMeals = (dayIndex: number) => {
    return weekItems.filter(item => item.day_of_week === dayIndex);
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

  const currentDayMeals = getDayMeals(selectedDay);
  const dayTotals = getDayTotals(selectedDay);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground truncate">{mealPlan.name}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {new Date(mealPlan.start_date).toLocaleDateString('pt-BR')} - {new Date(mealPlan.end_date).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation Row - Two Dropdowns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Week Dropdown */}
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
              {availableWeeks.map((week) => (
                <SelectItem key={week} value={week.toString()}>
                  Semana {week}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Day Dropdown */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Dia
          </label>
          <Select
            value={selectedDay.toString()}
            onValueChange={(value) => setSelectedDay(Number(value))}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue placeholder="Dia" />
            </SelectTrigger>
            <SelectContent className="bg-background border">
              {DAY_NAMES.map((day, index) => (
                <SelectItem key={day} value={index.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Day Summary */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 sm:mb-3 uppercase tracking-wide">
            Consumo de {DAY_NAMES[selectedDay]}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 w-8 h-8 sm:w-10 sm:h-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(meal.id);
                          }}
                        >
                          <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5", meal.is_favorite && "fill-red-500 text-red-500")} />
                        </Button>
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
    </div>
  );
}
