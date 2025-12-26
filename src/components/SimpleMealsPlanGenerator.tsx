import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  ChevronUp,
  Flame,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useDietaryCompatibility } from "@/hooks/useDietaryCompatibility";
import { useUserIntolerances } from "@/hooks/useUserIntolerances";
import { useMonthWeeks } from "@/hooks/useMonthWeeks";
import { 
  useUserProfileContext, 
  sortMealsByGoal
} from "@/hooks/useUserProfileContext";
import { getRecipeStyleBadge } from "@/lib/recipeStyleUtils";
import WeekDaySelector, { getAvailableDaysInPlan } from "./WeekDaySelector";
import RecipeRatingStars from "./RecipeRatingStars";

type SimpleMeal = {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: any;
  description: string | null;
  rating: number | null;
  rating_count: number | null;
  source_name: string | null;
};

type SelectedMeals = {
  breakfast: SimpleMeal | null;
  lunch: SimpleMeal | null;
  snack: SimpleMeal | null;
  dinner: SimpleMeal | null;
};

type SimpleMealsPlanGeneratorProps = {
  onClose: () => void;
  onPlanGenerated: () => void;
};

const MEAL_TYPE_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  jantar: "Jantar",
  ceia: "Ceia"
};

const MEAL_TYPE_MAP: Record<string, keyof SelectedMeals> = {
  cafe_manha: "breakfast",
  almoco: "lunch",
  lanche: "snack",
  jantar: "dinner"
};

const MEAL_TYPE_ORDER = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];

export default function SimpleMealsPlanGenerator({ onClose, onPlanGenerated }: SimpleMealsPlanGeneratorProps) {
  const [planName, setPlanName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [simpleMeals, setSimpleMeals] = useState<SimpleMeal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<SelectedMeals>({
    breakfast: null,
    lunch: null,
    snack: null,
    dinner: null
  });
  const [expandedType, setExpandedType] = useState<string | null>("cafe_manha");
  
  // Week/Day selection
  const today = new Date();
  const { weeks, currentWeek, monthName, year } = useMonthWeeks(today);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // NOVO: Hook centralizado de perfil
  const { 
    dietary_preference,
    recipeStyle,
    mealCalorieRanges,
    goal,
    goalIntensity,
    country,
    isLoading: isLoadingProfile
  } = useUserProfileContext();

  const { getCompatibility, isLoading: isLoadingCompatibility } = useDietaryCompatibility(
    dietary_preference
  );
  const { checkMealConflict } = useUserIntolerances();

  // Calculate available days from selected week onwards
  const { totalDays, weekDays } = useMemo(() => {
    return getAvailableDaysInPlan(weeks, selectedWeek);
  }, [weeks, selectedWeek]);

  // Default plan name based on month
  const defaultPlanName = useMemo(() => {
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${capitalizedMonth} ${year}`;
  }, [monthName, year]);

  // Initialize selected day to first available day in selected week
  useEffect(() => {
    const currentWeekData = weeks.find(w => w.weekNumber === selectedWeek);
    if (currentWeekData) {
      const firstAvailableDay = currentWeekData.days.findIndex(
        d => d.isInMonth && (!d.isPast || d.isToday)
      );
      if (firstAvailableDay !== -1) {
        setSelectedDay(firstAvailableDay);
      }
    }
  }, [selectedWeek, weeks]);

  useEffect(() => {
    const fetchData = async () => {
      if (isLoadingProfile) return;
      
      setIsLoading(true);
      try {
        let query = supabase
          .from("simple_meals")
          .select("*")
          .eq("is_active", true);
        
        // Filtrar por país do usuário
        if (country) {
          query = query.eq("country_code", country);
        }
        
        const { data: meals, error } = await query.order("sort_order", { ascending: true });

        if (error) throw error;
        setSimpleMeals(meals || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Erro ao carregar refeições");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [country, isLoadingProfile]);

  const mealsByType = useMemo(() => {
    const grouped: Record<string, SimpleMeal[]> = {};
    simpleMeals.forEach(meal => {
      if (!grouped[meal.meal_type]) {
        grouped[meal.meal_type] = [];
      }
      grouped[meal.meal_type].push(meal);
    });
    
    // Ordenar cada grupo baseado no objetivo do usuário e compatibilidade
    Object.keys(grouped).forEach(mealType => {
      const targetCalories = mealCalorieRanges[mealType as keyof typeof mealCalorieRanges]?.max || 400;
      
      // Primeiro ordena por objetivo (fitness = menor caloria, high_calorie = maior)
      let sortedMeals = sortMealsByGoal(grouped[mealType], recipeStyle, targetCalories);
      
      // Depois ordena por compatibilidade (sem conflito primeiro)
      sortedMeals.sort((a, b) => {
        const conflictA = checkMealConflict(a.name, Array.isArray(a.ingredients) ? a.ingredients : undefined);
        const conflictB = checkMealConflict(b.name, Array.isArray(b.ingredients) ? b.ingredients : undefined);
        
        if (!conflictA.hasConflict && conflictB.hasConflict) return -1;
        if (conflictA.hasConflict && !conflictB.hasConflict) return 1;
        return 0;
      });
      
      grouped[mealType] = sortedMeals;
    });
    
    return grouped;
  }, [simpleMeals, checkMealConflict, recipeStyle, mealCalorieRanges]);

  const sortedMealTypes = useMemo(() => {
    return MEAL_TYPE_ORDER.filter(type => mealsByType[type]?.length > 0);
  }, [mealsByType]);

  const totalMacros = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    Object.values(selectedMeals).forEach(meal => {
      if (meal) {
        calories += meal.calories;
        protein += meal.protein;
        carbs += meal.carbs;
        fat += meal.fat;
      }
    });
    return { calories, protein, carbs, fat };
  }, [selectedMeals]);

  const selectedCount = Object.values(selectedMeals).filter(Boolean).length;

  const handleSelectMeal = (mealType: string, meal: SimpleMeal) => {
    const key = MEAL_TYPE_MAP[mealType];
    if (key) {
      setSelectedMeals(prev => ({
        ...prev,
        [key]: prev[key]?.id === meal.id ? null : meal
      }));
    }
  };

  const handleGenerate = async () => {
    if (selectedCount === 0) {
      toast.error("Selecione pelo menos uma refeição");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const finalPlanName = planName.trim() || defaultPlanName;
      
      // Calculate start and end dates based on selected week
      const startWeekData = weeks.find(w => w.weekNumber === selectedWeek);
      const lastWeekData = weeks[weeks.length - 1];
      
      if (!startWeekData || !lastWeekData) throw new Error("Semana inválida");

      // Find first available day in start week
      const firstAvailableDay = startWeekData.days.find(d => d.isInMonth && (!d.isPast || d.isToday));
      const lastDayOfMonth = lastWeekData.days.filter(d => d.isInMonth).pop();

      if (!firstAvailableDay || !lastDayOfMonth) throw new Error("Datas inválidas");

      const startDate = firstAvailableDay.date;
      const endDate = lastDayOfMonth.date;

      // Create meal plan
      const { data: mealPlan, error: planError } = await supabase
        .from("meal_plans")
        .insert({
          user_id: session.user.id,
          name: finalPlanName,
          start_date: format(startDate, "yyyy-MM-dd"),
          end_date: format(endDate, "yyyy-MM-dd"),
          is_active: true,
          status: "active"
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create meal plan items for each available day
      const items: any[] = [];
      weekDays.forEach(({ weekNumber, days }) => {
        days.forEach((day) => {
          Object.entries(selectedMeals).forEach(([type, meal]) => {
            if (meal) {
              items.push({
                meal_plan_id: mealPlan.id,
                day_of_week: day.dayOfWeek,
                week_number: weekNumber,
                meal_type: type,
                recipe_name: meal.name,
                recipe_calories: meal.calories,
                recipe_protein: meal.protein,
                recipe_carbs: meal.carbs,
                recipe_fat: meal.fat,
                recipe_prep_time: meal.prep_time,
                recipe_ingredients: meal.ingredients || [],
                recipe_instructions: []
              });
            }
          });
        });
      });

      const { error: itemsError } = await supabase
        .from("meal_plan_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success("Plano criado com sucesso!");
      onPlanGenerated();
    } catch (error) {
      console.error("Error generating plan:", error);
      toast.error("Erro ao criar plano");
    } finally {
      setIsGenerating(false);
    }
  };

  const getCompatibilityBadge = (mealName: string) => {
    const compat = getCompatibility(mealName);
    if (compat.compatibility === "good") {
      return <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Compatível</Badge>;
    }
    if (compat.compatibility === "moderate") {
      return <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Moderado</Badge>;
    }
    if (compat.compatibility === "incompatible") {
      return <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">Incompatível</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={isGenerating}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Refeições Simples</h2>
          <p className="text-sm text-muted-foreground">Escolha uma refeição para cada momento do dia</p>
        </div>
      </div>

      {/* Plan Name */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <Label htmlFor="planName" className="text-sm">Nome do Plano</Label>
          <Input
            id="planName"
            placeholder={defaultPlanName}
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            disabled={isGenerating}
            className="mt-1"
          />
        </CardContent>
      </Card>

      {/* Week/Day Selector */}
      <WeekDaySelector
        referenceDate={today}
        selectedWeek={selectedWeek}
        selectedDay={selectedDay}
        onWeekChange={setSelectedWeek}
        onDayChange={setSelectedDay}
        showDaySelector={true}
      />

      {/* Macros Preview */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Macros Diários</span>
            <Badge variant="secondary">{selectedCount}/4 refeições</Badge>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-primary">{totalMacros.calories}</div>
              <div className="text-[10px] text-muted-foreground">kcal</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-500">{totalMacros.protein}g</div>
              <div className="text-[10px] text-muted-foreground">proteína</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-500">{totalMacros.carbs}g</div>
              <div className="text-[10px] text-muted-foreground">carbos</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-500">{totalMacros.fat}g</div>
              <div className="text-[10px] text-muted-foreground">gordura</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meal Selection */}
      <ScrollArea className="h-[calc(100vh-520px)]">
        <div className="space-y-3 pr-4">
          {sortedMealTypes.map((mealType) => {
            const meals = mealsByType[mealType];
            const selectedKey = MEAL_TYPE_MAP[mealType];
            const selectedMeal = selectedKey ? selectedMeals[selectedKey] : null;
            const isExpanded = expandedType === mealType;

            return (
              <Card key={mealType} className="glass-card overflow-hidden">
                <div 
                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedType(isExpanded ? null : mealType)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      selectedMeal ? "gradient-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {selectedMeal ? <CheckCircle2 className="w-5 h-5" /> : <Flame className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{MEAL_TYPE_LABELS[mealType]}</h4>
                      {selectedMeal ? (
                        <p className="text-xs text-primary">{selectedMeal.name}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Toque para escolher</p>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-2 space-y-2 bg-muted/30">
                    {meals.map((meal) => {
                      const isSelected = selectedMeal?.id === meal.id;
                      const conflict = checkMealConflict(meal.name, Array.isArray(meal.ingredients) ? meal.ingredients : undefined);
                      const styleBadge = getRecipeStyleBadge(meal.calories, recipeStyle);
                      const StyleIcon = styleBadge.config?.icon;
                      
                      return (
                        <div
                          key={meal.id}
                          className={cn(
                            "p-3 rounded-lg cursor-pointer transition-all",
                            isSelected 
                              ? "bg-primary/10 border border-primary/50" 
                              : conflict.hasConflict
                                ? "bg-destructive/5 border border-destructive/30 hover:bg-destructive/10"
                                : "bg-background hover:bg-muted border border-transparent"
                          )}
                          onClick={() => handleSelectMeal(mealType, meal)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{meal.name}</span>
                                {styleBadge.config && StyleIcon && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "text-[10px] px-1.5 py-0 gap-1",
                                      styleBadge.config.className,
                                      styleBadge.isRecommended && "ring-1 ring-primary/50"
                                    )}
                                  >
                                    <StyleIcon className="w-2.5 h-2.5" />
                                    {styleBadge.config.label}
                                    {styleBadge.isRecommended && <Sparkles className="w-2 h-2" />}
                                  </Badge>
                                )}
                                {getCompatibilityBadge(meal.name)}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {meal.calories} kcal
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {meal.prep_time} min
                                </span>
                              </div>
                              {meal.rating && meal.rating > 0 && (
                                <RecipeRatingStars 
                                  rating={meal.rating} 
                                  ratingCount={meal.rating_count}
                                  className="mt-1"
                                />
                              )}
                              {conflict.hasConflict && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />
                                  {conflict.labels.map((label) => (
                                    <Badge 
                                      key={label} 
                                      variant="outline" 
                                      className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30"
                                    >
                                      Contém {label}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Generate Button */}
      <Button
        className="w-full gradient-primary border-0 py-6"
        onClick={handleGenerate}
        disabled={isGenerating || selectedCount === 0}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Criando plano...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Criar Plano ({totalDays} dias)
          </>
        )}
      </Button>
    </div>
  );
}
