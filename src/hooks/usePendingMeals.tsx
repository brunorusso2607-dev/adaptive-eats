import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ingredient = { item: string; quantity: string; unit: string };

export type MealStatus = "on_time" | "delayed" | "critical" | "completed";

export type PendingMealData = {
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

// Mapeamento de horários para cada refeição
const MEAL_TIME_RANGES: Record<string, { start: number; end: number }> = {
  cafe_manha: { start: 6, end: 10 },
  almoco: { start: 10, end: 14 },
  lanche: { start: 14, end: 17 },
  lanche_tarde: { start: 14, end: 17 },
  jantar: { start: 17, end: 21 },
  ceia: { start: 21, end: 24 },
};

// Labels em português
export const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche",
  lanche_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  snack: "Lanche",
  dinner: "Jantar",
  supper: "Ceia",
};

// Ordem das refeições
const MEAL_ORDER = ["cafe_manha", "almoco", "lanche", "lanche_tarde", "jantar", "ceia"];

// Dias da semana em português
const DAY_LABELS: Record<number, string> = {
  0: "Domingo",
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
  6: "Sábado",
};

function getCurrentMealType(): string {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 10) return "cafe_manha";
  if (hour >= 10 && hour < 14) return "almoco";
  if (hour >= 14 && hour < 17) return "lanche";
  if (hour >= 17 && hour < 21) return "jantar";
  if (hour >= 21 || hour < 6) return "ceia";
  
  return "cafe_manha";
}

export function getMealStatus(mealType: string, dayOfWeek: number, completedAt: string | null): MealStatus {
  if (completedAt) return "completed";
  
  const now = new Date();
  const currentDay = now.getDay();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  // Se é de um dia anterior, está atrasado/crítico
  if (dayOfWeek < currentDay) {
    return "critical";
  }
  
  // Se é do dia atual, verificar o horário
  if (dayOfWeek === currentDay) {
    const range = MEAL_TIME_RANGES[mealType];
    if (!range) return "on_time";
    
    const endTimeInMinutes = range.end * 60;
    const delayedThreshold = endTimeInMinutes + 30;
    const criticalThreshold = endTimeInMinutes + 60;
    
    if (currentTimeInMinutes >= criticalThreshold) {
      return "critical";
    } else if (currentTimeInMinutes >= delayedThreshold) {
      return "delayed";
    } else if (currentTimeInMinutes >= endTimeInMinutes) {
      return "delayed";
    }
  }
  
  return "on_time";
}

export function getMinutesOverdue(mealType: string, dayOfWeek: number): number {
  const now = new Date();
  const currentDay = now.getDay();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  // Se é de um dia anterior, calcular minutos desde o fim do horário daquele dia
  if (dayOfWeek < currentDay) {
    const daysDiff = currentDay - dayOfWeek;
    const range = MEAL_TIME_RANGES[mealType];
    if (!range) return daysDiff * 24 * 60;
    
    const endTimeInMinutes = range.end * 60;
    return (daysDiff * 24 * 60) + currentTimeInMinutes - endTimeInMinutes;
  }
  
  // Se é do dia atual
  if (dayOfWeek === currentDay) {
    const range = MEAL_TIME_RANGES[mealType];
    if (!range) return 0;
    
    const endTimeInMinutes = range.end * 60;
    
    if (currentTimeInMinutes > endTimeInMinutes) {
      return currentTimeInMinutes - endTimeInMinutes;
    }
  }
  
  return 0;
}

export function usePendingMeals() {
  const [pendingMeals, setPendingMeals] = useState<PendingMealData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMealPlan, setHasMealPlan] = useState(false);

  const fetchPendingMeals = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Buscar plano ativo
      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1);

      if (plansError) throw plansError;

      if (!plans || plans.length === 0) {
        setHasMealPlan(false);
        setPendingMeals([]);
        setIsLoading(false);
        return;
      }

      setHasMealPlan(true);
      const activePlanId = plans[0].id;

      // Buscar TODAS as refeições não completadas do plano
      const { data: meals, error: mealsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", activePlanId)
        .is("completed_at", null)
        .order("day_of_week", { ascending: true });

      if (mealsError) throw mealsError;

      if (!meals || meals.length === 0) {
        setPendingMeals([]);
        setIsLoading(false);
        return;
      }

      // Ordenar por dia e depois por ordem da refeição
      const sortedMeals = meals.sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) {
          return a.day_of_week - b.day_of_week;
        }
        return MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type);
      });

      // Converter para o formato esperado
      const formattedMeals: PendingMealData[] = sortedMeals.map(meal => ({
        ...meal,
        recipe_ingredients: meal.recipe_ingredients as Ingredient[],
        recipe_instructions: meal.recipe_instructions as string[],
      }));

      setPendingMeals(formattedMeals);
    } catch (error) {
      console.error("Error fetching pending meals:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingMeals();
    
    // Atualizar a cada minuto
    const interval = setInterval(fetchPendingMeals, 60000);
    return () => clearInterval(interval);
  }, [fetchPendingMeals]);

  const markAsComplete = useCallback(async (mealId: string) => {
    try {
      const { error } = await supabase
        .from("meal_plan_items")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", mealId);

      if (error) throw error;
      
      await fetchPendingMeals();
      return true;
    } catch (error) {
      console.error("Error marking meal as complete:", error);
      return false;
    }
  }, [fetchPendingMeals]);

  const skipMeal = useCallback(async (mealId: string) => {
    try {
      const { error } = await supabase
        .from("meal_plan_items")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", mealId);

      if (error) throw error;
      
      await fetchPendingMeals();
      return true;
    } catch (error) {
      console.error("Error skipping meal:", error);
      return false;
    }
  }, [fetchPendingMeals]);

  return {
    pendingMeals,
    isLoading,
    hasMealPlan,
    markAsComplete,
    skipMeal,
    refetch: fetchPendingMeals,
    MEAL_LABELS,
    DAY_LABELS,
    getMealStatus,
    getMinutesOverdue,
  };
}
