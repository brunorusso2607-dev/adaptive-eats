import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getMealTimeRangesSync, 
  getMealLabelsSync, 
  getMealOrderSync,
  formatMealTime 
} from "@/lib/mealTimeConfig";

type Ingredient = { item: string; quantity: string; unit: string };

export type MealStatus = "on_time" | "delayed" | "critical" | "completed" | "upcoming";

export type NextMealData = {
  id: string;
  meal_plan_id: string;
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
  completed_at: string | null;
};

// Re-exportar para compatibilidade
export const MEAL_TIME_RANGES = getMealTimeRangesSync();
export const MEAL_LABELS = getMealLabelsSync();

// Ordem das refeições - usar do banco, com fallback para 'lanche' se existir
const MEAL_ORDER = getMealOrderSync();

// Mapear lanche <-> lanche_tarde para compatibilidade
function normalizeMealType(mealType: string): string {
  if (mealType === "lanche") return "lanche_tarde";
  if (mealType === "lanche_tarde") return "lanche_tarde";
  return mealType;
}

function getCurrentMealType(): string {
  const hour = new Date().getHours();
  const timeRanges = getMealTimeRangesSync();
  const mealOrder = getMealOrderSync();
  
  for (const mealType of mealOrder) {
    const range = timeRanges[mealType];
    if (range && hour >= range.start && hour < range.end) {
      return mealType;
    }
  }
  
  // Verificar ceia (refeição noturna que pode cruzar meia-noite)
  const ceiaRange = timeRanges["ceia"];
  if (ceiaRange && (hour >= ceiaRange.start || hour < 6)) {
    return "ceia";
  }
  
  return mealOrder[0] || "cafe_manha";
}

// Ordem canônica para ordenar refeições do dia (apenas tipos canônicos)
const CANONICAL_MEAL_ORDER = ["cafe_manha", "almoco", "lanche_tarde", "jantar", "ceia"];

// Função para encontrar o índice canônico de um meal_type
function getCanonicalIndex(mealType: string): number {
  const normalized = normalizeMealType(mealType);
  return CANONICAL_MEAL_ORDER.indexOf(normalized);
}

function getMealStatus(mealType: string, completedAt: string | null): MealStatus {
  if (completedAt) return "completed";
  
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMealTimeRangesSync();
  const range = timeRanges[mealType];
  if (!range) return "on_time";
  
  const startTimeInMinutes = range.start * 60;
  const endTimeInMinutes = range.end * 60;
  const delayedThreshold = endTimeInMinutes + 30;
  const criticalThreshold = endTimeInMinutes + 60;
  
  if (currentTimeInMinutes < startTimeInMinutes) {
    return "upcoming";
  }
  
  if (currentTimeInMinutes >= criticalThreshold) {
    return "critical";
  } else if (currentTimeInMinutes >= delayedThreshold) {
    return "delayed";
  } else if (currentTimeInMinutes >= endTimeInMinutes) {
    return "delayed";
  }
  
  return "on_time";
}

function getMinutesOverdue(mealType: string): number {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMealTimeRangesSync();
  const range = timeRanges[mealType];
  if (!range) return 0;
  
  const endTimeInMinutes = range.end * 60;
  
  if (currentTimeInMinutes > endTimeInMinutes) {
    return currentTimeInMinutes - endTimeInMinutes;
  }
  
  return 0;
}

export function getMinutesUntilStart(mealType: string): number {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMealTimeRangesSync();
  const range = timeRanges[mealType];
  if (!range) return 0;
  
  const startTimeInMinutes = range.start * 60;
  
  if (currentTimeInMinutes < startTimeInMinutes) {
    return startTimeInMinutes - currentTimeInMinutes;
  }
  
  return 0;
}

export function useNextMeal() {
  const [nextMeal, setNextMeal] = useState<NextMealData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const fetchNextMeal = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Buscar plano ativo
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("id, start_date")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (plansError) throw plansError;

      if (!plans || plans.length === 0) {
        setHasMealPlan(false);
        setNextMeal(null);
        setIsLoading(false);
        return;
      }

      setHasMealPlan(true);
      const activePlan = plans[0];
      const activePlanId = activePlan.id;

      // Calcular day_of_week baseado na data de início do plano
      // O banco usa day_of_week como dias desde o início do plano: 0=primeiro dia, 1=segundo dia, etc.
      // Parsing correta da data para evitar problemas de timezone
      const [year, month, day] = activePlan.start_date.split('-').map(Number);
      const planStartDate = new Date(year, month - 1, day); // month é 0-indexed
      planStartDate.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - planStartDate.getTime();
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Calcular qual semana e dia do plano
      const weekNumber = Math.floor(daysSinceStart / 7) + 1;
      const dayOfWeek = daysSinceStart % 7;
      
      // Se hoje é antes do início do plano, não há refeição
      if (daysSinceStart < 0) {
        setNextMeal(null);
        setIsLoading(false);
        return;
      }
      
      console.log("[useNextMeal] today:", today.toISOString(), "planStart:", planStartDate.toISOString(), "daysSinceStart:", daysSinceStart, "dayOfWeek:", dayOfWeek, "weekNumber:", weekNumber, "planId:", activePlanId);
      
      const { data: meals, error: mealsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", activePlanId)
        .eq("day_of_week", dayOfWeek)
        .eq("week_number", weekNumber)
        .order("meal_type", { ascending: true });

      if (mealsError) throw mealsError;

      console.log("[useNextMeal] meals for day", dayOfWeek, ":", meals?.length, meals?.map(m => ({ type: m.meal_type, completed: m.completed_at })));

      if (!meals || meals.length === 0) {
        setNextMeal(null);
        setIsLoading(false);
        return;
      }

      // DEBUG: Log das refeições antes da ordenação
      console.log("[useNextMeal] ANTES ordenação - meals:", meals.map(m => ({ 
        type: m.meal_type, 
        name: m.recipe_name.substring(0, 25)
      })));

      // Ordenar as refeições do dia pela ordem canônica (usando normalização)
      // cafe_manha=0, almoco=1, lanche/lanche_tarde=2, jantar=3, ceia=4
      const sortedMeals = [...meals].sort((a, b) => {
        const indexA = getCanonicalIndex(a.meal_type);
        const indexB = getCanonicalIndex(b.meal_type);
        console.log(`[useNextMeal] Comparando: ${a.meal_type}(${indexA}) vs ${b.meal_type}(${indexB})`);
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      
      console.log("[useNextMeal] DEPOIS ordenação - sortedMeals:", sortedMeals.map(m => ({ 
        type: m.meal_type, 
        idx: getCanonicalIndex(m.meal_type), 
        completed: !!m.completed_at,
        name: m.recipe_name.substring(0, 25)
      })));

      // Pegar a primeira refeição não completada do dia (na ordem correta)
      let nextMealData: NextMealData | null = null;
      
      for (const meal of sortedMeals) {
        if (!meal.completed_at) {
          console.log("[useNextMeal] Selecionado como próxima refeição:", meal.meal_type, meal.recipe_name.substring(0, 25));
          nextMealData = {
            ...meal,
            recipe_ingredients: meal.recipe_ingredients as Ingredient[],
            recipe_instructions: meal.recipe_instructions as string[],
          };
          break;
        }
      }

      setNextMeal(nextMealData);
    } catch (error) {
      console.error("Error fetching next meal:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextMeal();
    
    // Atualizar a cada minuto para checar status
    const interval = setInterval(fetchNextMeal, 60000);
    return () => clearInterval(interval);
  }, [fetchNextMeal]);

  const mealStatus = useMemo<MealStatus>(() => {
    if (!nextMeal) return "on_time";
    return getMealStatus(nextMeal.meal_type, nextMeal.completed_at);
  }, [nextMeal]);

  const minutesOverdue = useMemo(() => {
    if (!nextMeal || mealStatus === "on_time" || mealStatus === "completed") return 0;
    return getMinutesOverdue(nextMeal.meal_type);
  }, [nextMeal, mealStatus]);

  const markAsComplete = useCallback(async () => {
    if (!nextMeal) return false;
    
    try {
      const { error } = await supabase
        .from("meal_plan_items")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", nextMeal.id);

      if (error) throw error;
      
      await fetchNextMeal();
      return true;
    } catch (error) {
      console.error("Error marking meal as complete:", error);
      return false;
    }
  }, [nextMeal, fetchNextMeal]);

  const skipMeal = useCallback(async () => {
    if (!nextMeal) return false;
    
    // Marcar como completada (pulada) sem registrar horário real
    // Usar um timestamp especial para indicar que foi pulada
    try {
      const { error } = await supabase
        .from("meal_plan_items")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", nextMeal.id);

      if (error) throw error;
      
      await fetchNextMeal();
      return true;
    } catch (error) {
      console.error("Error skipping meal:", error);
      return false;
    }
  }, [nextMeal, fetchNextMeal]);

  const regenerateMeal = useCallback(async () => {
    if (!nextMeal) return false;
    
    setIsRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("regenerate-meal", {
        body: { mealItemId: nextMeal.id },
      });

      if (error) throw error;
      
      await fetchNextMeal();
      return true;
    } catch (error) {
      console.error("Error regenerating meal:", error);
      return false;
    } finally {
      setIsRegenerating(false);
    }
  }, [nextMeal, fetchNextMeal]);

  return {
    nextMeal,
    isLoading,
    hasMealPlan,
    mealStatus,
    minutesOverdue,
    isRegenerating,
    markAsComplete,
    skipMeal,
    regenerateMeal,
    refetch: fetchNextMeal,
  };
}
