import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ingredient = { item: string; quantity: string; unit: string };

export type MealStatus = "on_time" | "delayed" | "critical" | "completed";

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

// Mapeamento de horários para cada refeição
const MEAL_TIME_RANGES: Record<string, { start: number; end: number }> = {
  breakfast: { start: 6, end: 10 },
  lunch: { start: 10, end: 14 },
  snack: { start: 14, end: 17 },
  dinner: { start: 17, end: 21 },
  supper: { start: 21, end: 24 },
};

// Labels em português
export const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  snack: "Lanche",
  dinner: "Jantar",
  supper: "Ceia",
};

// Ordem das refeições
const MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner", "supper"];

function getCurrentMealType(): string {
  const hour = new Date().getHours();
  
  for (const [mealType, { start, end }] of Object.entries(MEAL_TIME_RANGES)) {
    if (hour >= start && hour < end) {
      return mealType;
    }
  }
  
  // Se for depois da meia-noite até às 6h, considera ceia ainda
  if (hour < 6) {
    return "supper";
  }
  
  return "breakfast";
}

function getMealStatus(mealType: string, completedAt: string | null): MealStatus {
  if (completedAt) return "completed";
  
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const range = MEAL_TIME_RANGES[mealType];
  if (!range) return "on_time";
  
  const endTimeInMinutes = range.end * 60;
  const delayedThreshold = endTimeInMinutes + 30; // 30 min após o fim
  const criticalThreshold = endTimeInMinutes + 60; // 1 hora após o fim
  
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
  
  const range = MEAL_TIME_RANGES[mealType];
  if (!range) return 0;
  
  const endTimeInMinutes = range.end * 60;
  
  if (currentTimeInMinutes > endTimeInMinutes) {
    return currentTimeInMinutes - endTimeInMinutes;
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

      // Buscar plano ativo do mês atual
      const today = new Date();
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
        setNextMeal(null);
        setIsLoading(false);
        return;
      }

      setHasMealPlan(true);
      const activePlanId = plans[0].id;

      // Buscar refeições do dia atual
      const dayOfWeek = today.getDay(); // 0 = domingo, 6 = sábado
      
      const { data: meals, error: mealsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", activePlanId)
        .eq("day_of_week", dayOfWeek)
        .order("meal_type", { ascending: true });

      if (mealsError) throw mealsError;

      if (!meals || meals.length === 0) {
        setNextMeal(null);
        setIsLoading(false);
        return;
      }

      // Determinar qual refeição mostrar
      const currentMealType = getCurrentMealType();
      const currentMealIndex = MEAL_ORDER.indexOf(currentMealType);

      // Procurar a próxima refeição não completada
      let nextMealData: NextMealData | null = null;

      // Primeiro, verificar se a refeição atual não foi completada
      for (let i = currentMealIndex; i < MEAL_ORDER.length; i++) {
        const mealType = MEAL_ORDER[i];
        const meal = meals.find(m => m.meal_type === mealType && !m.completed_at);
        if (meal) {
          nextMealData = {
            ...meal,
            recipe_ingredients: meal.recipe_ingredients as Ingredient[],
            recipe_instructions: meal.recipe_instructions as string[],
          };
          break;
        }
      }

      // Se não encontrou, verificar refeições anteriores não completadas (atrasadas)
      if (!nextMealData) {
        for (let i = 0; i < currentMealIndex; i++) {
          const mealType = MEAL_ORDER[i];
          const meal = meals.find(m => m.meal_type === mealType && !m.completed_at);
          if (meal) {
            nextMealData = {
              ...meal,
              recipe_ingredients: meal.recipe_ingredients as Ingredient[],
              recipe_instructions: meal.recipe_instructions as string[],
            };
            break;
          }
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
