import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Heart,
  Sparkles,
  UtensilsCrossed,
  Plus,
  X,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { useMonthWeeks } from "@/hooks/useMonthWeeks";
import { useUserIntolerances } from "@/hooks/useUserIntolerances";
import WeekDaySelector, { getAvailableDaysInPlan } from "./WeekDaySelector";

type MealSlot = {
  id: string;
  name: string;
  source: "favorite" | "simple" | "empty";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: any;
  instructions: any;
};

type DayPlan = {
  breakfast: MealSlot | null;
  lunch: MealSlot | null;
  snack: MealSlot | null;
  dinner: MealSlot | null;
  supper: MealSlot | null;
};

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
};

type CustomMealPlanBuilderProps = {
  onClose: () => void;
  onPlanGenerated: () => void;
};

const MEAL_SLOTS = [
  { key: "breakfast" as const, label: "Café da Manhã", icon: "☕", mealType: "cafe_manha" },
  { key: "lunch" as const, label: "Almoço", icon: "🍽️", mealType: "almoco" },
  { key: "snack" as const, label: "Lanche da Tarde", icon: "🍎", mealType: "lanche_tarde" },
  { key: "dinner" as const, label: "Jantar", icon: "🌙", mealType: "jantar" },
  { key: "supper" as const, label: "Ceia", icon: "🍵", mealType: "ceia" }
];

// Mapeamento de slot para meal_type do banco
const SLOT_TO_MEAL_TYPE: Record<keyof DayPlan, string> = {
  breakfast: "cafe_manha",
  lunch: "almoco",
  snack: "lanche_tarde",
  dinner: "jantar",
  supper: "ceia"
};

export default function CustomMealPlanBuilder({ onClose, onPlanGenerated }: CustomMealPlanBuilderProps) {
  const [planName, setPlanName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [simpleMeals, setSimpleMeals] = useState<SimpleMeal[]>([]);
  const [dayPlan, setDayPlan] = useState<DayPlan>({
    breakfast: null,
    lunch: null,
    snack: null,
    dinner: null,
    supper: null
  });
  const [activeSlot, setActiveSlot] = useState<keyof DayPlan | null>(null);
  const [activeTab, setActiveTab] = useState("simple");

  // Week/Day selection
  const today = new Date();
  const { weeks, currentWeek, monthName, year } = useMonthWeeks(today);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { favorites, isLoading: isLoadingFavorites } = useUnifiedFavorites();
  const { checkMealConflict, hasIntolerances } = useUserIntolerances();

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
    const fetchSimpleMeals = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("simple_meals")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        setSimpleMeals(data || []);
      } catch (error) {
        console.error("Error fetching simple meals:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimpleMeals();
  }, []);

  const totalMacros = useMemo(() => {
    let calories = 0, protein = 0, carbs = 0, fat = 0;
    Object.values(dayPlan).forEach(meal => {
      if (meal) {
        calories += meal.calories;
        protein += meal.protein;
        carbs += meal.carbs;
        fat += meal.fat;
      }
    });
    return { calories, protein, carbs, fat };
  }, [dayPlan]);

  const filledSlots = Object.values(dayPlan).filter(Boolean).length;
  const emptySlots = 5 - filledSlots;

  const handleSelectMeal = (meal: any, source: "favorite" | "simple") => {
    if (!activeSlot) return;

    const mealSlot: MealSlot = {
      id: meal.id,
      name: meal.name,
      source,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      prep_time: meal.prep_time,
      ingredients: meal.ingredients || [],
      instructions: meal.instructions || []
    };

    setDayPlan(prev => ({ ...prev, [activeSlot]: mealSlot }));
    setActiveSlot(null);
  };

  const handleRemoveMeal = (slot: keyof DayPlan) => {
    setDayPlan(prev => ({ ...prev, [slot]: null }));
  };

  const handleFillWithAI = async () => {
    if (emptySlots === 0) {
      toast.info("Todas as refeições já estão preenchidas");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        body: {
          planName: planName.trim() || defaultPlanName,
          startDate: format(new Date(), "yyyy-MM-dd"),
          daysCount: 1,
          fillSlots: Object.entries(dayPlan)
            .filter(([_, meal]) => !meal)
            .map(([slot]) => slot)
        }
      });

      if (error) throw error;

      if (data?.meals) {
        setDayPlan(prev => {
          const updated = { ...prev };
          Object.entries(data.meals).forEach(([slot, meal]: [string, any]) => {
            if (!updated[slot as keyof DayPlan]) {
              updated[slot as keyof DayPlan] = {
                id: crypto.randomUUID(),
                name: meal.recipe_name,
                source: "empty" as const,
                calories: meal.recipe_calories,
                protein: meal.recipe_protein,
                carbs: meal.recipe_carbs,
                fat: meal.recipe_fat,
                prep_time: meal.recipe_prep_time,
                ingredients: meal.recipe_ingredients,
                instructions: meal.recipe_instructions
              };
            }
          });
          return updated;
        });
        toast.success("Refeições geradas pela IA!");
      }
    } catch (error) {
      console.error("Error filling with AI:", error);
      toast.error("Erro ao gerar refeições com IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreatePlan = async () => {
    if (filledSlots === 0) {
      toast.error("Adicione pelo menos uma refeição");
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
          MEAL_SLOTS.forEach(({ key }) => {
            const meal = dayPlan[key];
            if (meal) {
              items.push({
                meal_plan_id: mealPlan.id,
                day_of_week: day.dayOfWeek,
                week_number: weekNumber,
                meal_type: key,
                recipe_name: meal.name,
                recipe_calories: meal.calories,
                recipe_protein: meal.protein,
                recipe_carbs: meal.carbs,
                recipe_fat: meal.fat,
                recipe_prep_time: meal.prep_time,
                recipe_ingredients: meal.ingredients,
                recipe_instructions: meal.instructions
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
      console.error("Error creating plan:", error);
      toast.error("Erro ao criar plano");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || isLoadingFavorites) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Meal selection view
  if (activeSlot) {
    const slotLabel = MEAL_SLOTS.find(s => s.key === activeSlot)?.label;
    
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveSlot(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">Escolher {slotLabel}</h2>
            <p className="text-sm text-muted-foreground">Selecione uma opção abaixo</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="w-4 h-4" />
              Favoritos
            </TabsTrigger>
            <TabsTrigger value="simple" className="gap-2">
              <UtensilsCrossed className="w-4 h-4" />
              Catálogo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="mt-4">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-2 pr-4">
                {favorites.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum favorito encontrado</p>
                    <p className="text-xs">Favorite receitas para usá-las aqui</p>
                  </div>
                ) : (
                  favorites.map((fav) => {
                    const conflict = checkMealConflict(fav.name, Array.isArray(fav.ingredients) ? fav.ingredients : undefined);
                    return (
                      <Card
                        key={fav.id}
                        className={cn(
                          "glass-card cursor-pointer hover:bg-muted/50 transition-colors",
                          conflict.hasConflict && "border-destructive/50 bg-destructive/5"
                        )}
                        onClick={() => handleSelectMeal(fav, "favorite")}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{fav.name}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{fav.calories} kcal</span>
                                <span>•</span>
                                <span>{fav.prep_time} min</span>
                              </div>
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
                            <Plus className="w-5 h-5 text-primary shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="simple" className="mt-4">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-2 pr-4">
                {(() => {
                  const filteredMeals = activeSlot 
                    ? simpleMeals.filter(meal => meal.meal_type === SLOT_TO_MEAL_TYPE[activeSlot])
                    : simpleMeals;
                  
                  if (filteredMeals.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma refeição disponível</p>
                        <p className="text-xs">Não há opções cadastradas para este horário</p>
                      </div>
                    );
                  }
                  
                  return filteredMeals.map((meal) => {
                    const conflict = checkMealConflict(meal.name, Array.isArray(meal.ingredients) ? meal.ingredients : undefined);
                    return (
                      <Card
                        key={meal.id}
                        className={cn(
                          "glass-card cursor-pointer hover:bg-muted/50 transition-colors",
                          conflict.hasConflict && "border-destructive/50 bg-destructive/5"
                        )}
                        onClick={() => handleSelectMeal(meal, "simple")}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{meal.name}</p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{meal.calories} kcal</span>
                                <span>•</span>
                                <span>{meal.prep_time} min</span>
                              </div>
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
                            <Plus className="w-5 h-5 text-primary shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
                })()}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Main builder view
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose} disabled={isGenerating}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Montar Meu Plano</h2>
          <p className="text-sm text-muted-foreground">Monte seu dia ideal de refeições</p>
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
            <Badge variant="secondary">{filledSlots}/5 refeições</Badge>
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

      {/* Meal Slots */}
      <div className="space-y-3">
        {MEAL_SLOTS.map(({ key, label, icon }) => {
          const meal = dayPlan[key];
          
          return (
            <Card 
              key={key} 
              className={cn(
                "glass-card transition-all",
                meal ? "border-primary/30" : "border-dashed"
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                    meal ? "gradient-primary" : "bg-muted"
                  )}>
                    {meal ? <CheckCircle2 className="w-5 h-5 text-primary-foreground" /> : icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    {meal ? (
                      <p className="text-xs text-primary truncate">{meal.name}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Não definido</p>
                    )}
                  </div>

                  {meal ? (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="shrink-0 h-8 w-8"
                      onClick={() => handleRemoveMeal(key)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="shrink-0"
                      onClick={() => setActiveSlot(key)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Fill with AI Button */}
      {emptySlots > 0 && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleFillWithAI}
          disabled={isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Completar com IA ({emptySlots} {emptySlots === 1 ? "refeição" : "refeições"})
        </Button>
      )}

      {/* Create Plan Button */}
      <Button
        className="w-full gradient-primary border-0 py-6"
        onClick={handleCreatePlan}
        disabled={isGenerating || filledSlots === 0}
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
