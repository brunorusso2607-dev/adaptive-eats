import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Coffee, UtensilsCrossed, Cookie, Moon, Soup, Flame, Beef, Wheat, Heart, X, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">{mealPlan.name}</h2>
          <p className="text-sm text-muted-foreground">
            {new Date(mealPlan.start_date).toLocaleDateString('pt-BR')} - {new Date(mealPlan.end_date).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Week Selector - Show only if multiple weeks exist */}
      {availableWeeks.length > 1 && (
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-2 flex-wrap">
            {availableWeeks.map((week) => (
              <Button
                key={week}
                variant={selectedWeek === week ? "default" : "outline"}
                size="sm"
                className={cn(
                  "transition-all",
                  selectedWeek === week && "gradient-primary border-0"
                )}
                onClick={() => {
                  setSelectedWeek(week);
                  setSelectedDay(0);
                }}
              >
                Semana {week}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Day Selector */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
          disabled={selectedDay === 0}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <div className="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {DAY_NAMES.map((day, index) => (
            <Button
              key={day}
              variant={selectedDay === index ? "default" : "outline"}
              className={cn(
                "shrink-0 transition-all",
                selectedDay === index && "gradient-primary border-0"
              )}
              onClick={() => setSelectedDay(index)}
            >
              {day}
            </Button>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedDay(Math.min(6, selectedDay + 1))}
          disabled={selectedDay === 6}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day Summary */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Consumo de {DAY_NAMES[selectedDay]}
          </p>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">{dayTotals.calories}</span>
              <span className="text-sm text-muted-foreground">kcal</span>
            </div>
            <div className="flex items-center gap-2">
              <Beef className="w-5 h-5 text-red-500" />
              <span className="font-semibold">{dayTotals.protein.toFixed(0)}g</span>
              <span className="text-sm text-muted-foreground">proteína</span>
            </div>
            <div className="flex items-center gap-2">
              <Wheat className="w-5 h-5 text-amber-500" />
              <span className="font-semibold">{dayTotals.carbs.toFixed(0)}g</span>
              <span className="text-sm text-muted-foreground">carbs</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <span className="text-xs">🧈</span>
              </div>
              <span className="font-semibold">{dayTotals.fat.toFixed(0)}g</span>
              <span className="text-sm text-muted-foreground">gordura</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meals List */}
      <div className="space-y-4">
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
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", config.color)}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  {meal ? (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            {config.label}
                          </p>
                          <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                            {meal.recipe_name}
                          </h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(meal.id);
                          }}
                        >
                          <Heart className={cn("w-5 h-5", meal.is_favorite && "fill-red-500 text-red-500")} />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          {meal.recipe_calories} kcal
                        </span>
                        <span className="flex items-center gap-1">
                          <Beef className="w-4 h-4 text-red-500" />
                          {meal.recipe_protein}g
                        </span>
                        <span>{meal.recipe_prep_time} min</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {config.label}
                      </p>
                      <p className="text-muted-foreground italic">Nenhuma receita definida</p>
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
