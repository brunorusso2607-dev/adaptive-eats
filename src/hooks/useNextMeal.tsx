import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getMealTimeRangesSync, 
  getMealLabelsSync, 
  getMealOrderSync,
  formatMealTime,
  MealTimeRanges
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
  recipe_ingredients?: Ingredient[]; // Now optional - loaded on demand
  recipe_instructions?: string[]; // Now optional - loaded on demand
  is_favorite: boolean;
  completed_at: string | null;
};

type CustomMealTimes = Record<string, string>; // { "breakfast": "07:00" }

// Re-exportar funções para compatibilidade - SEMPRE usar as funções sync para valores atualizados
export function getMealLabels() {
  return getMealLabelsSync();
}

export function getMealTimeRanges() {
  return getMealTimeRangesSync();
}

// Converter horário customizado para range
function parseCustomTimeToRange(
  customTime: string, 
  globalRange: { start: number; end: number }
): { start: number; end: number } {
  const [hours] = customTime.split(":").map(Number);
  const duration = globalRange.end - globalRange.start;
  return {
    start: hours,
    end: hours + duration
  };
}

// Mesclar horários globais com customizados
function getMergedTimeRanges(customTimes: CustomMealTimes | null): MealTimeRanges {
  const globalRanges = getMealTimeRangesSync();
  
  if (!customTimes || Object.keys(customTimes).length === 0) {
    return globalRanges;
  }

  const merged: MealTimeRanges = { ...globalRanges };
  
  for (const [mealType, customTime] of Object.entries(customTimes)) {
    if (globalRanges[mealType]) {
      merged[mealType] = parseCustomTimeToRange(customTime, globalRanges[mealType]);
    }
  }

  return merged;
}

function getCurrentMealType(customTimes?: CustomMealTimes | null): string {
  const hour = new Date().getHours();
  const timeRanges = getMergedTimeRanges(customTimes || null);
  const mealOrder = getMealOrderSync();
  
  for (const mealType of mealOrder) {
    const range = timeRanges[mealType];
    if (range && hour >= range.start && hour < range.end) {
      return mealType;
    }
  }
  
  // Verificar supper (refeição noturna que pode cruzar meia-noite)
  const supperRange = timeRanges["supper"];
  if (supperRange && (hour >= supperRange.start || hour < 6)) {
    return "supper";
  }
  
  return mealOrder[0] || "breakfast";
}

// Standard meal order for sorting
const MEAL_SORT_PRIORITY: Record<string, number> = {
  "breakfast": 0,
  "lunch": 1,
  "afternoon_snack": 2,
  "dinner": 3,
  "supper": 4,
};

function getMealSortIndex(mealType: string): number {
  const index = MEAL_SORT_PRIORITY[mealType];
  if (index !== undefined) return index;
  console.warn("[getMealSortIndex] Tipo desconhecido:", mealType);
  return 999;
}

// Constante: tolerância em minutos para considerar refeição atrasada (1 hora)
const MEAL_DELAY_TOLERANCE_MINUTES = 60;

// Versão que aceita custom times opcionais
// Nova lógica: 1 hora após start_hour = atrasado
export function getMealStatusWithCustomTimes(
  mealType: string, 
  completedAt: string | null,
  customTimes?: CustomMealTimes | null
): MealStatus {
  if (completedAt) return "completed";
  
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMergedTimeRanges(customTimes || null);
  const range = timeRanges[mealType];
  
  if (!range) {
    console.warn("[getMealStatus] Range não encontrado para:", mealType);
    return "on_time";
  }
  
  const startTimeInMinutes = range.start * 60;
  // Atrasado = 1 hora após o início
  const delayedThreshold = startTimeInMinutes + MEAL_DELAY_TOLERANCE_MINUTES;
  // Crítico = 1.5 horas após o início  
  const criticalThreshold = startTimeInMinutes + MEAL_DELAY_TOLERANCE_MINUTES + 30;
  
  // Se ainda não começou, está upcoming
  if (currentTimeInMinutes < startTimeInMinutes) {
    return "upcoming";
  }
  
  // Se passou 1.5h do início, está crítico
  if (currentTimeInMinutes >= criticalThreshold) {
    return "critical";
  }
  
  // Se passou 1h do início, está atrasado
  if (currentTimeInMinutes >= delayedThreshold) {
    return "delayed";
  }
  
  // Ainda dentro do período normal (até 1h após início)
  return "on_time";
}

// Versão retrocompatível
function getMealStatus(mealType: string, completedAt: string | null): MealStatus {
  return getMealStatusWithCustomTimes(mealType, completedAt, null);
}

export function getMinutesOverdueWithCustomTimes(
  mealType: string,
  customTimes?: CustomMealTimes | null
): number {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMergedTimeRanges(customTimes || null);
  const range = timeRanges[mealType];
  if (!range) return 0;
  
  const startTimeInMinutes = range.start * 60;
  // Atraso começa 1 hora após o início
  const delayedThreshold = startTimeInMinutes + MEAL_DELAY_TOLERANCE_MINUTES;
  
  if (currentTimeInMinutes > delayedThreshold) {
    return currentTimeInMinutes - delayedThreshold;
  }
  
  return 0;
}

function getMinutesOverdue(mealType: string): number {
  return getMinutesOverdueWithCustomTimes(mealType, null);
}

export function getMinutesUntilStartWithCustomTimes(
  mealType: string,
  customTimes?: CustomMealTimes | null
): number {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMergedTimeRanges(customTimes || null);
  const range = timeRanges[mealType];
  if (!range) return 0;
  
  const startTimeInMinutes = range.start * 60;
  
  if (currentTimeInMinutes < startTimeInMinutes) {
    return startTimeInMinutes - currentTimeInMinutes;
  }
  
  return 0;
}

export function getMinutesUntilStart(mealType: string): number {
  return getMinutesUntilStartWithCustomTimes(mealType, null);
}

export function useNextMeal() {
  console.log("🔄 [useNextMeal] Hook v7 - hierarquia Plano > Perfil > Global");
  const [nextMeal, setNextMeal] = useState<NextMealData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [customMealTimes, setCustomMealTimes] = useState<CustomMealTimes | null>(null);

  const fetchNextMeal = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Buscar plano ativo E perfil do usuário em paralelo
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log("[useNextMeal] Hora local:", now.toLocaleString('pt-BR'), "| UTC:", now.toISOString());
      
      const [plansResult, profileResult] = await Promise.all([
        supabase
          .from("meal_plans")
          .select("id, start_date, custom_meal_times, unlocks_at")
          .eq("user_id", session.user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1),
        supabase
          .from("profiles")
          .select("default_meal_times")
          .eq("id", session.user.id)
          .single()
      ]);

      if (plansResult.error) throw plansResult.error;

      const plans = plansResult.data;
      const profileDefaultTimes = profileResult.data?.default_meal_times as CustomMealTimes | null;

      if (!plans || plans.length === 0) {
        setHasMealPlan(false);
        setNextMeal(null);
        setCustomMealTimes(profileDefaultTimes); // Usar perfil mesmo sem plano
        setIsLoading(false);
        return;
      }

      // Check if the plan is scheduled (locked until future date)
      const plan = plans[0];
      if (plan.unlocks_at) {
        const unlocksAt = new Date(plan.unlocks_at);
        if (unlocksAt > now) {
          console.log("[useNextMeal] Plano agendado, unlocks_at:", plan.unlocks_at);
          setHasMealPlan(true); // Has a plan but it's scheduled
          setNextMeal(null);
          setCustomMealTimes(profileDefaultTimes);
          setIsLoading(false);
          return;
        }
      }

      setHasMealPlan(true);
      const activePlanId = plan.id;
      
      // HIERARQUIA: Plano > Perfil > Global
      // 1. Se o plano tem custom_meal_times, usar
      // 2. Senão, se o perfil tem default_meal_times, usar
      // 3. Senão, getMergedTimeRanges usará o global
      const planCustomTimes = plan.custom_meal_times as CustomMealTimes | null;
      const effectiveMealTimes = planCustomTimes && Object.keys(planCustomTimes).length > 0
        ? planCustomTimes
        : profileDefaultTimes;
      
      setCustomMealTimes(effectiveMealTimes);
      
      console.log("[useNextMeal] Hierarquia de horários - Plano:", planCustomTimes, "| Perfil:", profileDefaultTimes, "| Efetivo:", effectiveMealTimes);

      // Calcular day_of_week baseado na data de início do plano
      const [year, month, day] = plan.start_date.split('-').map(Number);
      const planStartDate = new Date(year, month - 1, day);
      
      const diffTime = today.getTime() - planStartDate.getTime();
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      const weekNumber = Math.floor(daysSinceStart / 7) + 1;
      const dayOfWeek = daysSinceStart % 7;
      
      if (daysSinceStart < 0) {
        console.log("[useNextMeal] Plano ainda não começou, daysSinceStart:", daysSinceStart);
        setNextMeal(null);
        setIsLoading(false);
        return;
      }
      
      console.log("[useNextMeal] today:", today.toLocaleDateString('pt-BR'), "planStart:", planStartDate.toLocaleDateString('pt-BR'), "daysSinceStart:", daysSinceStart, "dayOfWeek:", dayOfWeek, "weekNumber:", weekNumber, "planId:", activePlanId);
      
      const { data: meals, error: mealsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", activePlanId)
        .eq("day_of_week", dayOfWeek)
        .eq("week_number", weekNumber);

      if (mealsError) throw mealsError;

      console.log("[useNextMeal] meals for day", dayOfWeek, ":", meals?.length, meals?.map(m => ({ type: m.meal_type, completed: m.completed_at })));

      if (!meals || meals.length === 0) {
        setNextMeal(null);
        setIsLoading(false);
        return;
      }

      console.log("[useNextMeal] Refeições do banco:", meals.map(m => ({
        type: m.meal_type,
        sortIndex: getMealSortIndex(m.meal_type),
        completed: !!m.completed_at,
        name: m.recipe_name?.substring(0, 20)
      })));

      const sortedMeals = [...meals].sort((a, b) => {
        const indexA = getMealSortIndex(a.meal_type);
        const indexB = getMealSortIndex(b.meal_type);
        return indexA - indexB;
      });
      
      console.log("[useNextMeal] Refeições ordenadas:", sortedMeals.map(m => 
        `${m.meal_type}(idx=${getMealSortIndex(m.meal_type)}, done=${!!m.completed_at})`
      ).join(" → "));

      const nextMealItem = sortedMeals.find(meal => !meal.completed_at);
      
      if (nextMealItem) {
        console.log("[useNextMeal] ✅ Próxima refeição selecionada:", nextMealItem.meal_type, "-", nextMealItem.recipe_name?.substring(0, 30));
        setNextMeal({
          ...nextMealItem,
          recipe_ingredients: nextMealItem.recipe_ingredients as Ingredient[],
          recipe_instructions: nextMealItem.recipe_instructions as string[],
        });
      } else {
        console.log("[useNextMeal] Todas as refeições do dia foram completadas");
        setNextMeal(null);
      }
    } catch (error) {
      console.error("Error fetching next meal:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNextMeal();
    
    const interval = setInterval(fetchNextMeal, 60000);
    return () => clearInterval(interval);
  }, [fetchNextMeal]);

  // Calcular status usando custom times
  const mealStatus = useMemo<MealStatus>(() => {
    if (!nextMeal) return "on_time";
    const status = getMealStatusWithCustomTimes(nextMeal.meal_type, nextMeal.completed_at, customMealTimes);
    console.log("[useNextMeal] mealStatus calculado:", status, "para meal_type:", nextMeal.meal_type, "customTimes:", !!customMealTimes);
    return status;
  }, [nextMeal, customMealTimes]);

  // Calcular minutos de atraso usando custom times
  const minutesOverdue = useMemo(() => {
    if (!nextMeal || mealStatus === "on_time" || mealStatus === "completed" || mealStatus === "upcoming") return 0;
    return getMinutesOverdueWithCustomTimes(nextMeal.meal_type, customMealTimes);
  }, [nextMeal, mealStatus, customMealTimes]);

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
    customMealTimes,
    markAsComplete,
    skipMeal,
    regenerateMeal,
    refetch: fetchNextMeal,
  };
}
