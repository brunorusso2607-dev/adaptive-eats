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

// Re-exportar funções para compatibilidade - SEMPRE usar as funções sync para valores atualizados
export function getMealLabels() {
  return getMealLabelsSync();
}

export function getMealTimeRanges() {
  return getMealTimeRangesSync();
}

// Mapear tipos antigos para o novo padrão
function normalizeMealType(mealType: string): string {
  // "lanche" antigo -> "lanche_tarde" novo
  if (mealType === "lanche") return "lanche_tarde";
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

// Índices fixos para ordenação - usa lanche_tarde como padrão
const MEAL_SORT_PRIORITY: Record<string, number> = {
  "cafe_manha": 0,
  "almoco": 1,
  "lanche_tarde": 2,
  "jantar": 3,
  "ceia": 4,
};

function getMealSortIndex(mealType: string): number {
  const index = MEAL_SORT_PRIORITY[mealType];
  if (index !== undefined) return index;
  console.warn("[getMealSortIndex] Tipo desconhecido:", mealType);
  return 999;
}

function getMealStatus(mealType: string, completedAt: string | null): MealStatus {
  if (completedAt) return "completed";
  
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMealTimeRangesSync();
  // Normalizar lanche -> lanche_tarde para buscar o range correto
  const normalizedType = mealType === "lanche" ? "lanche_tarde" : mealType;
  const range = timeRanges[normalizedType] || timeRanges[mealType];
  
  if (!range) {
    console.warn("[getMealStatus] Range não encontrado para:", mealType, "normalizado:", normalizedType);
    return "on_time";
  }
  
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
  const normalizedType = mealType === "lanche" ? "lanche_tarde" : mealType;
  const range = timeRanges[normalizedType] || timeRanges[mealType];
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
  const normalizedType = mealType === "lanche" ? "lanche_tarde" : mealType;
  const range = timeRanges[normalizedType] || timeRanges[mealType];
  if (!range) return 0;
  
  const startTimeInMinutes = range.start * 60;
  
  if (currentTimeInMinutes < startTimeInMinutes) {
    return startTimeInMinutes - currentTimeInMinutes;
  }
  
  return 0;
}

export function useNextMeal() {
  console.log("🔄 [useNextMeal] Hook v5 - nomenclatura corrigida");
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
      // Usar data local para cálculos
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      console.log("[useNextMeal] Hora local:", now.toLocaleString('pt-BR'), "| UTC:", now.toISOString());
      
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
      
      const diffTime = today.getTime() - planStartDate.getTime();
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Calcular qual semana e dia do plano
      const weekNumber = Math.floor(daysSinceStart / 7) + 1;
      const dayOfWeek = daysSinceStart % 7;
      
      // Se hoje é antes do início do plano, não há refeição
      if (daysSinceStart < 0) {
        console.log("[useNextMeal] Plano ainda não começou, daysSinceStart:", daysSinceStart);
        setNextMeal(null);
        setIsLoading(false);
        return;
      }
      
      console.log("[useNextMeal] today:", today.toLocaleDateString('pt-BR'), "planStart:", planStartDate.toLocaleDateString('pt-BR'), "daysSinceStart:", daysSinceStart, "dayOfWeek:", dayOfWeek, "weekNumber:", weekNumber, "planId:", activePlanId);
      
      // Buscar refeições sem ordenação do SQL - ordenamos no JavaScript
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

      // Log detalhado para debug
      console.log("[useNextMeal] Refeições do banco:", meals.map(m => ({
        type: m.meal_type,
        sortIndex: getMealSortIndex(m.meal_type),
        completed: !!m.completed_at,
        name: m.recipe_name?.substring(0, 20)
      })));

      // Ordenar as refeições: cafe_manha=0, almoco=1, lanche=2, jantar=3, ceia=4
      const sortedMeals = [...meals].sort((a, b) => {
        const indexA = getMealSortIndex(a.meal_type);
        const indexB = getMealSortIndex(b.meal_type);
        return indexA - indexB;
      });
      
      console.log("[useNextMeal] Refeições ordenadas:", sortedMeals.map(m => 
        `${m.meal_type}(idx=${getMealSortIndex(m.meal_type)}, done=${!!m.completed_at})`
      ).join(" → "));

      // Pegar a primeira refeição não completada do dia
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
