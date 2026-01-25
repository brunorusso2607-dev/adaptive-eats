// v3 - Dynamic meal slots from meal_time_settings with multi-food composition
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
  Search,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUnifiedFavorites } from "@/hooks/useUnifiedFavorites";
import { useMonthWeeks } from "@/hooks/useMonthWeeks";
import { useIntoleranceWarning } from "@/hooks/useIntoleranceWarning";
import { useUserProfileContext } from "@/hooks/useUserProfileContext";
import { useMealTimeSettings } from "@/hooks/useMealTimeSettings";
import { getRecipeStyleBadge } from "@/lib/recipeStyleUtils";
import WeekDaySelector, { getAvailableDaysInPlan } from "./WeekDaySelector";
import MealComposerForPlan from "./MealComposerForPlan";

// Mapeamento de meal_type para ícones
const MEAL_ICONS: Record<string, string> = {
  breakfast: "☕",
  morning_snack: "🥐",
  lunch: "🍽️",
  afternoon_snack: "🍎",
  dinner: "🌙",
  supper: "🍵"
};

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

// DayPlan agora é dinâmico baseado nas configurações de refeições
type DayPlan = Record<string, MealSlot | null>;

type MealSlotConfig = {
  key: string;
  label: string;
  icon: string;
  mealType: string;
};

type CustomMealPlanBuilderProps = {
  onClose: () => void;
  onPlanGenerated: () => void;
};

export default function CustomMealPlanBuilder({ onClose, onPlanGenerated }: CustomMealPlanBuilderProps) {
  const [planName, setPlanName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dayPlan, setDayPlan] = useState<DayPlan>({});
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("search");
  const [enabledMeals, setEnabledMeals] = useState<string[] | null>(null);
  const [isEnabledMealsLoaded, setIsEnabledMealsLoaded] = useState(false);

  // Buscar configurações de refeições dinamicamente
  const { settings: mealTimeSettings, isLoading: isLoadingMealTimes } = useMealTimeSettings();

  // Week/Day selection
  const today = new Date();
  const { weeks, currentWeek, monthName, year } = useMonthWeeks(today);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { favorites, isLoading: isLoadingFavorites } = useUnifiedFavorites();
  const { checkMeal, hasIntolerances } = useIntoleranceWarning();
  const { recipeStyle, isLoading: isLoadingProfile } = useUserProfileContext();

  // Fetch enabled_meals from profile
  useEffect(() => {
    const fetchEnabledMeals = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsEnabledMealsLoaded(true);
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("enabled_meals")
        .eq("id", session.user.id)
        .single();
      
      if (profile?.enabled_meals) {
        setEnabledMeals(profile.enabled_meals);
      }
      setIsEnabledMealsLoaded(true);
    };
    
    fetchEnabledMeals();
  }, []);

  // Converter meal_time_settings para MEAL_SLOTS dinâmico, filtrando por enabled_meals
  const mealSlots = useMemo((): MealSlotConfig[] => {
    if (!mealTimeSettings || mealTimeSettings.length === 0) {
      // Fallback se não tiver configurações
      const defaultSlots = [
        { key: "breakfast", label: "Café da Manhã", icon: "☕", mealType: "breakfast" },
        { key: "morning_snack", label: "Lanche da Manhã", icon: "🥐", mealType: "morning_snack" },
        { key: "lunch", label: "Almoço", icon: "🍽️", mealType: "lunch" },
        { key: "afternoon_snack", label: "Lanche da Tarde", icon: "🍎", mealType: "afternoon_snack" },
        { key: "dinner", label: "Jantar", icon: "🌙", mealType: "dinner" },
        { key: "supper", label: "Ceia", icon: "🍵", mealType: "supper" }
      ];
      
      // Filtrar por enabled_meals se existir
      if (enabledMeals && enabledMeals.length > 0) {
        return defaultSlots.filter(slot => enabledMeals.includes(slot.key));
      }
      return defaultSlots;
    }

    let filteredSettings = mealTimeSettings;
    
    // Filtrar por enabled_meals do perfil se existir
    if (enabledMeals && enabledMeals.length > 0) {
      filteredSettings = mealTimeSettings.filter(setting => 
        enabledMeals.includes(setting.meal_type)
      );
    }

    return filteredSettings
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(setting => ({
        key: setting.meal_type,
        label: setting.label,
        icon: MEAL_ICONS[setting.meal_type] || "🍽️",
        mealType: setting.meal_type
      }));
  }, [mealTimeSettings, enabledMeals]);

  // Inicializar dayPlan quando mealSlots mudar
  useEffect(() => {
    if (mealSlots.length > 0) {
      setDayPlan(prev => {
        const newPlan: DayPlan = {};
        mealSlots.forEach(slot => {
          newPlan[slot.key] = prev[slot.key] || null;
        });
        return newPlan;
      });
    }
  }, [mealSlots]);

  // Calculate available days from selected week onwards
  const { totalDays, weekDays } = useMemo(() => {
    return getAvailableDaysInPlan(weeks, selectedWeek);
  }, [weeks, selectedWeek]);

  // Default plan name based on current month - always use current month
  const defaultPlanName = useMemo(() => {
    const today = new Date();
    const targetMonthName = format(today, "MMMM", { locale: ptBR });
    const capitalizedMonth = targetMonthName.charAt(0).toUpperCase() + targetMonthName.slice(1);
    const targetYear = format(today, "yyyy");
    
    return `${capitalizedMonth} ${targetYear}`;
  }, []);

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

  const totalSlots = mealSlots.length;
  const filledSlots = Object.values(dayPlan).filter(Boolean).length;
  const emptySlots = totalSlots - filledSlots;

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

  const handleRemoveMeal = (slot: string) => {
    setDayPlan(prev => ({ ...prev, [slot]: null }));
  };

  const handleFillWithAI = async () => {
    if (emptySlots === 0) {
      toast.info("Todas as refeições já estão preenchidas");
      return;
    }

    setIsGenerating(true);
    try {
      let aiMeals = null;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Você precisa estar logado para gerar planos");
        }

        const { data, error } = await supabase.functions.invoke("generate-ai-meal-plan", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
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
        aiMeals = data?.meals;
      } catch (edgeFunctionError) {
        console.warn("Edge function error for AI fill:", edgeFunctionError);
        // This is for filling empty slots, if it fails just show error
        throw edgeFunctionError;
      }

      if (aiMeals) {
        setDayPlan(prev => {
          const updated = { ...prev };
          Object.entries(aiMeals).forEach(([slot, meal]: [string, any]) => {
            if (!updated[slot]) {
              updated[slot] = {
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
          mealSlots.forEach(({ key }) => {
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

  if (isLoadingFavorites || isLoadingProfile || isLoadingMealTimes || !isEnabledMealsLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Meal selection view - now with multi-food composition
  if (activeSlot) {
    const slotLabel = mealSlots.find(s => s.key === activeSlot)?.label || "Refeição";
    
    return (
      <MealComposerForPlan
        slotLabel={slotLabel}
        onConfirm={(composedMeal) => {
          const mealSlot: MealSlot = {
            id: composedMeal.id,
            name: composedMeal.name,
            source: "simple",
            calories: composedMeal.calories,
            protein: composedMeal.protein,
            carbs: composedMeal.carbs,
            fat: composedMeal.fat,
            prep_time: composedMeal.prep_time,
            ingredients: composedMeal.ingredients,
            instructions: composedMeal.instructions
          };
          setDayPlan(prev => ({ ...prev, [activeSlot]: mealSlot }));
          setActiveSlot(null);
        }}
        onCancel={() => setActiveSlot(null)}
      />
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
        minDate={today}
      />

      {/* Macros Preview */}
      <Card className="glass-card border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Macros Diários</span>
            <Badge variant="secondary">{filledSlots}/{totalSlots} refeições</Badge>
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
        {mealSlots.map(({ key, label, icon }) => {
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
                    <div className="flex items-center gap-1 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => setActiveSlot(key)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMeal(key)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
            Criar Plano
          </>
        )}
      </Button>
    </div>
  );
}
