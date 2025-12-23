import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getMealTimeRangesSync, 
  getMealLabelsSync, 
  getMealOrderSync,
  getMealTimeRanges,
  formatMealTime as formatTime 
} from "@/lib/mealTimeConfig";

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
  // Calculated field for the actual date
  actual_date?: Date;
};

// Re-exportar para manter compatibilidade
export const MEAL_TIME_RANGES = getMealTimeRangesSync();

// Função para formatar horário (ex: 6 -> "06:00", 17.5 -> "17:30")
export function formatMealTime(hour: number): string {
  return formatTime(hour);
}

// Função para verificar se o horário da refeição já começou
export function isMealTimeStarted(mealType: string, actualDate: Date | undefined): boolean {
  if (!actualDate) return false;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mealDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
  
  // Se é de um dia anterior, já passou
  if (mealDate < today) return true;
  
  // Se é de um dia futuro, ainda não começou
  if (mealDate > today) return false;
  
  // Se é hoje, verificar se já chegou no horário de início
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMealTimeRangesSync();
  const range = timeRanges[mealType];
  if (!range) return true;
  
  const startTimeInMinutes = range.start * 60;
  return currentTimeInMinutes >= startTimeInMinutes;
}

// Labels em português - usar do banco
export const MEAL_LABELS = getMealLabelsSync();

// Ordem das refeições - usar do banco
const MEAL_ORDER = getMealOrderSync();

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
  const timeRanges = getMealTimeRangesSync();
  const mealOrder = getMealOrderSync();
  
  // Encontrar a refeição atual baseado no horário
  for (const mealType of mealOrder) {
    const range = timeRanges[mealType];
    if (range) {
      if (hour >= range.start && hour < range.end) {
        return mealType;
      }
    }
  }
  
  // Verificar ceia (pode ir até meia-noite ou passar)
  const ceiaRange = timeRanges["ceia"];
  if (ceiaRange && (hour >= ceiaRange.start || hour < 6)) {
    return "ceia";
  }
  
  // Fallback para o primeiro da ordem
  return mealOrder[0] || "cafe_manha";
}

export function getMealStatus(mealType: string, actualDate: Date | undefined, completedAt: string | null): MealStatus {
  if (completedAt) return "completed";
  
  if (!actualDate) return "on_time";
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mealDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
  
  // Se a refeição é de um dia futuro, está "on_time"
  if (mealDate > today) {
    return "on_time";
  }
  
  // Se a refeição é de um dia anterior, está "critical"
  if (mealDate < today) {
    return "critical";
  }
  
  // Se é do dia atual, verificar o horário
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  
  const timeRanges = getMealTimeRangesSync();
  const range = timeRanges[mealType];
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
  
  return "on_time";
}

export function getMinutesOverdue(mealType: string, actualDate: Date | undefined): number {
  if (!actualDate) return 0;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mealDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
  
  // Se a refeição é de um dia futuro, não está atrasada
  if (mealDate >= today) {
    // Se é hoje, calcular baseado no horário
    if (mealDate.getTime() === today.getTime()) {
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
    }
    return 0;
  }
  
  // Se é de um dia anterior, calcular dias de atraso
  const daysDiff = Math.floor((today.getTime() - mealDate.getTime()) / (1000 * 60 * 60 * 24));
  const timeRanges = getMealTimeRangesSync();
  const range = timeRanges[mealType];
  if (!range) return daysDiff * 24 * 60;
  
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  const endTimeInMinutes = range.end * 60;
  
  return (daysDiff * 24 * 60) + currentTimeInMinutes - endTimeInMinutes;
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

      // Buscar plano ativo com start_date e created_at
      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("id, start_date, created_at")
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
      const activePlan = plans[0];
      const planStartDate = new Date(activePlan.start_date + "T00:00:00");
      const planCreatedAt = new Date(activePlan.created_at);

      // Buscar TODAS as refeições não completadas do plano
      const { data: meals, error: mealsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("meal_plan_id", activePlan.id)
        .is("completed_at", null)
        .order("day_of_week", { ascending: true });

      if (mealsError) throw mealsError;

      if (!meals || meals.length === 0) {
        setPendingMeals([]);
        setIsLoading(false);
        return;
      }

      // Calcular a data real de cada refeição baseada no start_date do plano e week_number
      // O banco usa: dayOfWeek: 0=Segunda, 1=Terça, 2=Quarta, ..., 6=Domingo
      // O start_date é sempre uma segunda-feira (dia 0 no banco)
      const calculateActualDate = (dayOfWeek: number, weekNumber: number): Date => {
        const date = new Date(planStartDate);
        // Adicionar semanas: (week_number - 1) * 7 dias
        const weeksOffset = (weekNumber - 1) * 7;
        // dayOfWeek no banco: 0=Segunda, 1=Terça, ..., 6=Domingo
        // Como o start_date é segunda-feira (dia 0), basta somar o dayOfWeek
        date.setDate(date.getDate() + weeksOffset + dayOfWeek);
        return date;
      };

      // Verificar se uma refeição existia quando o plano foi criado
      // (se o horário da refeição é APÓS a criação do plano)
      const isMealValidSinceCreation = (mealType: string, actualDate: Date): boolean => {
        // Pegar o horário de fim da refeição naquele dia
        const range = MEAL_TIME_RANGES[mealType];
        if (!range) return true;
        
        // Criar data/hora do fim da refeição
        const mealEndTime = new Date(actualDate);
        const endHour = Math.floor(range.end);
        const endMinutes = (range.end % 1) * 60;
        mealEndTime.setHours(endHour, endMinutes, 0, 0);
        
        // A refeição só é válida se o horário de fim dela é DEPOIS da criação do plano
        return mealEndTime >= planCreatedAt;
      };

      // Verificar se uma refeição já passou (horário de FIM ultrapassado)
      const isMealPast = (mealType: string, actualDate: Date): boolean => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const mealDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
        
        // Se é de um dia anterior, já passou
        if (mealDate < today) {
          return true;
        }
        
        // Se é de um dia futuro, ainda não passou
        if (mealDate > today) {
          return false;
        }
        
        // Se é hoje, verificar se o horário de FIM já passou
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const currentTimeInMinutes = hour * 60 + minutes;
        
        const range = MEAL_TIME_RANGES[mealType];
        if (!range) return false;
        
        const endTimeInMinutes = range.end * 60;
        return currentTimeInMinutes >= endTimeInMinutes;
      };

      // Verificar se uma refeição é a atual (já começou mas ainda não terminou)
      const isMealCurrent = (mealType: string, actualDate: Date): boolean => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const mealDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
        
        // Só pode ser atual se for hoje
        if (mealDate.getTime() !== today.getTime()) {
          return false;
        }
        
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const currentTimeInMinutes = hour * 60 + minutes;
        
        const range = MEAL_TIME_RANGES[mealType];
        if (!range) return false;
        
        const startTimeInMinutes = range.start * 60;
        const endTimeInMinutes = range.end * 60;
        
        // Atual = já começou E ainda não terminou
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < endTimeInMinutes;
      };

      // Converter para o formato esperado com data calculada
      const mealsWithDates: PendingMealData[] = meals.map(meal => ({
        ...meal,
        recipe_ingredients: meal.recipe_ingredients as Ingredient[],
        actual_date: calculateActualDate(meal.day_of_week, meal.week_number),
        recipe_instructions: meal.recipe_instructions as string[],
      }));

      // Primeiro, filtrar apenas refeições que são válidas desde a criação do plano
      // (exclui refeições cujo horário já tinha passado quando o usuário se cadastrou)
      const validMeals = mealsWithDates.filter(meal =>
        meal.actual_date && isMealValidSinceCreation(meal.meal_type, meal.actual_date)
      );

      // Encontrar a refeição ATUAL (já começou mas ainda não terminou)
      const currentMeal = validMeals.find(meal => 
        meal.actual_date && isMealCurrent(meal.meal_type, meal.actual_date)
      );

      // Filtrar refeições PASSADAS (horário de fim já ultrapassado) - são as atrasadas
      const overdueMeals = validMeals.filter(meal => 
        meal.actual_date && isMealPast(meal.meal_type, meal.actual_date)
      );

      // Encontrar refeições FUTURAS (ainda não começaram) - apenas das válidas
      const futureMeals = validMeals.filter(meal => 
        meal.actual_date && !isMealPast(meal.meal_type, meal.actual_date) && !isMealCurrent(meal.meal_type, meal.actual_date)
      );

      // Ordenar refeições futuras por data e horário (mais próxima primeiro)
      const sortedFutureMeals = futureMeals.sort((a, b) => {
        const dateA = a.actual_date?.getTime() || 0;
        const dateB = b.actual_date?.getTime() || 0;
        if (dateA !== dateB) {
          return dateA - dateB; // Crescente - mais próxima primeiro
        }
        return MEAL_ORDER.indexOf(a.meal_type) - MEAL_ORDER.indexOf(b.meal_type);
      });

      // A "próxima refeição" é: refeição atual OU a primeira futura (se não há atual)
      const nextMeal = currentMeal ? [currentMeal] : (sortedFutureMeals.length > 0 ? [sortedFutureMeals[0]] : []);

      // Ordenar atrasadas por data DECRESCENTE (mais recente primeiro)
      const sortedOverdueMeals = overdueMeals.sort((a, b) => {
        const dateA = a.actual_date?.getTime() || 0;
        const dateB = b.actual_date?.getTime() || 0;
        if (dateA !== dateB) {
          return dateB - dateA; // Decrescente
        }
        return MEAL_ORDER.indexOf(b.meal_type) - MEAL_ORDER.indexOf(a.meal_type);
      });

      // Combinar: próxima refeição + atrasadas
      // A próxima refeição vem primeiro para ser identificada como "on_time"
      const combinedMeals = [...nextMeal, ...sortedOverdueMeals];

      setPendingMeals(combinedMeals);
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
