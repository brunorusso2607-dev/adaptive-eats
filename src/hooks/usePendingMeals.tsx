import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  getMealTimeRangesSync, 
  getMealLabelsSync, 
  getMealOrderSync,
  getMealTimeRanges,
  formatMealTime as formatTime,
  MealTimeRanges,
  MEAL_DELAY_TOLERANCE_HOURS
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

// Tipo para horários customizados do perfil
type CustomMealTimes = Record<string, string>;

// Re-exportar para manter compatibilidade
export const MEAL_TIME_RANGES = getMealTimeRangesSync();

// Função para formatar horário (ex: 6 -> "06:00", 17.5 -> "17:30")
export function formatMealTime(hour: number): string {
  return formatTime(hour);
}

// Função para mesclar horários globais com customizados do perfil
function getMergedTimeRanges(profileTimes: CustomMealTimes | null): MealTimeRanges {
  const globalRanges = getMealTimeRangesSync();
  
  if (!profileTimes || Object.keys(profileTimes).length === 0) {
    return globalRanges;
  }

  const merged: MealTimeRanges = { ...globalRanges };
  
  for (const [mealType, customTime] of Object.entries(profileTimes)) {
    if (typeof customTime !== 'string') continue;
    if (globalRanges[mealType]) {
      const [hours] = customTime.split(":").map(Number);
      const duration = globalRanges[mealType].end - globalRanges[mealType].start;
      merged[mealType] = {
        start: hours,
        end: hours + duration
      };
    }
  }

  return merged;
}

// Função para verificar se o horário da refeição já começou (com suporte a ranges customizados)
export function isMealTimeStartedWithRanges(
  mealType: string, 
  actualDate: Date | undefined,
  customRanges?: MealTimeRanges | null
): boolean {
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
  
  const timeRanges = customRanges || getMealTimeRangesSync();
  const range = timeRanges[mealType];
  if (!range) return true;
  
  const startTimeInMinutes = range.start * 60;
  return currentTimeInMinutes >= startTimeInMinutes;
}

// Versão retrocompatível
export function isMealTimeStarted(mealType: string, actualDate: Date | undefined): boolean {
  return isMealTimeStartedWithRanges(mealType, actualDate, null);
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

// Versão com suporte a ranges customizados
export function getMealStatusWithRanges(
  mealType: string, 
  actualDate: Date | undefined, 
  completedAt: string | null,
  customRanges?: MealTimeRanges | null
): MealStatus {
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
  
  const timeRanges = customRanges || getMealTimeRangesSync();
  const range = timeRanges[mealType];
  if (!range) return "on_time";
  
  // Nova lógica: atraso baseado em start_hour + tolerância
  const startTimeInMinutes = range.start * 60;
  const delayedThreshold = startTimeInMinutes + (MEAL_DELAY_TOLERANCE_HOURS * 60); // 1 hora após início
  const criticalThreshold = startTimeInMinutes + (MEAL_DELAY_TOLERANCE_HOURS * 60 * 2); // 2 horas após início
  
  if (currentTimeInMinutes >= criticalThreshold) {
    return "critical";
  } else if (currentTimeInMinutes >= delayedThreshold) {
    return "delayed";
  }
  
  return "on_time";
}

// Versão retrocompatível (usa ranges globais)
export function getMealStatus(mealType: string, actualDate: Date | undefined, completedAt: string | null): MealStatus {
  return getMealStatusWithRanges(mealType, actualDate, completedAt, null);
}

// Versão com suporte a ranges customizados
export function getMinutesOverdueWithRanges(
  mealType: string, 
  actualDate: Date | undefined,
  customRanges?: MealTimeRanges | null
): number {
  if (!actualDate) return 0;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mealDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
  
  const timeRanges = customRanges || getMealTimeRangesSync();
  
  // Se a refeição é de um dia futuro, não está atrasada
  if (mealDate >= today) {
    // Se é hoje, calcular baseado no horário
    if (mealDate.getTime() === today.getTime()) {
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const currentTimeInMinutes = hour * 60 + minutes;
      
      const range = timeRanges[mealType];
      if (!range) return 0;
      
      // Atraso começa após start_hour + tolerância
      const delayStartInMinutes = (range.start * 60) + (MEAL_DELAY_TOLERANCE_HOURS * 60);
      
      if (currentTimeInMinutes > delayStartInMinutes) {
        return currentTimeInMinutes - delayStartInMinutes;
      }
    }
    return 0;
  }
  
  // Se é de um dia anterior, calcular dias de atraso
  const daysDiff = Math.floor((today.getTime() - mealDate.getTime()) / (1000 * 60 * 60 * 24));
  const range = timeRanges[mealType];
  if (!range) return daysDiff * 24 * 60;
  
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const currentTimeInMinutes = hour * 60 + minutes;
  const delayStartInMinutes = (range.start * 60) + (MEAL_DELAY_TOLERANCE_HOURS * 60);
  
  return (daysDiff * 24 * 60) + currentTimeInMinutes - delayStartInMinutes;
}

// Versão retrocompatível (usa ranges globais)
export function getMinutesOverdue(mealType: string, actualDate: Date | undefined): number {
  return getMinutesOverdueWithRanges(mealType, actualDate, null);
}

export function usePendingMeals() {
  const [pendingMeals, setPendingMeals] = useState<PendingMealData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMealPlan, setHasMealPlan] = useState(false);
  const [effectiveTimeRanges, setEffectiveTimeRanges] = useState<MealTimeRanges>(getMealTimeRangesSync());

  const fetchPendingMeals = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Buscar perfil do usuário para pegar horários customizados
      const { data: profile } = await supabase
        .from("profiles")
        .select("default_meal_times")
        .eq("id", session.user.id)
        .single();
      
      // Mesclar horários do perfil com os globais
      const profileTimes = profile?.default_meal_times as CustomMealTimes | null;
      const mergedRanges = getMergedTimeRanges(profileTimes);
      setEffectiveTimeRanges(mergedRanges);

      // Buscar plano ativo com start_date e created_at
      const { data: plans, error: plansError } = await supabase
        .from("meal_plans")
        .select("id, start_date, created_at, unlocks_at, custom_meal_times")
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

      // Check if the plan is scheduled (locked until future date)
      const now = new Date();
      const plan = plans[0];
      if (plan.unlocks_at) {
        const unlocksAt = new Date(plan.unlocks_at);
        if (unlocksAt > now) {
          console.log("[usePendingMeals] Plano agendado, unlocks_at:", plan.unlocks_at);
          setHasMealPlan(true); // Has a plan but it's scheduled
          setPendingMeals([]);
          setIsLoading(false);
          return;
        }
      }

      // Se o plano tem horários customizados, usar eles (prioridade sobre perfil)
      const planCustomTimes = plan.custom_meal_times as CustomMealTimes | null;
      if (planCustomTimes && Object.keys(planCustomTimes).length > 0) {
        const planMergedRanges = getMergedTimeRanges(planCustomTimes);
        setEffectiveTimeRanges(planMergedRanges);
      }

      setHasMealPlan(true);
      const activePlan = plan;
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

      // Usar ranges mesclados (plano > perfil > global)
      const currentRanges = planCustomTimes && Object.keys(planCustomTimes).length > 0 
        ? getMergedTimeRanges(planCustomTimes)
        : mergedRanges;

      // Verificar se uma refeição existia quando o plano foi criado
      // Refeições do mesmo dia sempre são válidas (para permitir registro retroativo)
      // Refeições de dias anteriores à criação do plano são excluídas
      const isMealValidSinceCreation = (mealType: string, actualDate: Date): boolean => {
        const createdDate = new Date(planCreatedAt.getFullYear(), planCreatedAt.getMonth(), planCreatedAt.getDate());
        const mealDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
        
        // Se a refeição é do mesmo dia ou posterior à criação do plano, é válida
        // Isso permite que refeições "atrasadas" do mesmo dia apareçam para registro
        return mealDate >= createdDate;
      };

      // Verificar se uma refeição já passou (start_hour + tolerância ultrapassado)
      // Agora usamos: passou = current > start + 1h (quando começa atraso)
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
        
        // Se é hoje, verificar se o horário de início + tolerância já passou
        // Uma refeição é considerada "passada" quando está atrasada (start + 1h)
        const hour = now.getHours();
        const minutes = now.getMinutes();
        const currentTimeInMinutes = hour * 60 + minutes;
        
        const range = currentRanges[mealType];
        if (!range) return false;
        
        // Passou = ultrapassou start_hour + tolerância (1 hora)
        const pastThresholdMinutes = (range.start * 60) + (MEAL_DELAY_TOLERANCE_HOURS * 60);
        return currentTimeInMinutes >= pastThresholdMinutes;
      };

      // Verificar se uma refeição é a atual (já começou mas ainda não passou da tolerância)
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
        
        const range = currentRanges[mealType];
        if (!range) return false;
        
        const startTimeInMinutes = range.start * 60;
        // "Atual" = entre start e start + tolerância (1 hora) - período on_time
        const onTimeEndMinutes = startTimeInMinutes + (MEAL_DELAY_TOLERANCE_HOURS * 60);
        
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < onTimeEndMinutes;
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

      console.log("[usePendingMeals] validMeals count:", validMeals.length);
      console.log("[usePendingMeals] currentRanges:", currentRanges);

      // Encontrar a refeição ATUAL (já começou mas ainda não passou da tolerância - on_time)
      const currentMeal = validMeals.find(meal => 
        meal.actual_date && isMealCurrent(meal.meal_type, meal.actual_date)
      );

      console.log("[usePendingMeals] currentMeal:", currentMeal?.recipe_name, currentMeal?.meal_type);

      // Filtrar refeições PASSADAS (start_hour + tolerância ultrapassado) - são as atrasadas
      const overdueMeals = validMeals.filter(meal => 
        meal.actual_date && isMealPast(meal.meal_type, meal.actual_date)
      );

      console.log("[usePendingMeals] overdueMeals count:", overdueMeals.length);
      overdueMeals.forEach(m => console.log("[usePendingMeals] overdue:", m.meal_type, m.recipe_name));

      // Encontrar refeições FUTURAS (ainda não começaram) - apenas das válidas
      const futureMeals = validMeals.filter(meal => 
        meal.actual_date && !isMealPast(meal.meal_type, meal.actual_date) && !isMealCurrent(meal.meal_type, meal.actual_date)
      );

      console.log("[usePendingMeals] futureMeals count:", futureMeals.length);

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

      console.log("[usePendingMeals] nextMeal:", nextMeal.length > 0 ? nextMeal[0].recipe_name : "none");

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

      console.log("[usePendingMeals] combinedMeals count:", combinedMeals.length);

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
      // Get user and meal info
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: mealItem } = await supabase
        .from("meal_plan_items")
        .select("recipe_name")
        .eq("id", mealId)
        .single();

      // Create a meal consumption record with followed_plan = false and 0 calories
      // This marks it as "skipped" in the history
      const { error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: mealId,
          followed_plan: false,
          total_calories: 0,
          total_protein: 0,
          total_carbs: 0,
          total_fat: 0,
          custom_meal_name: mealItem?.recipe_name ? `${mealItem.recipe_name} (Pulada)` : "Refeição Pulada",
          feedback_status: "auto_well", // No symptoms for skipped meals
        });

      if (consumptionError) throw consumptionError;

      // Mark the meal plan item as completed
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

  // Funções wrapper que usam os effectiveTimeRanges
  const getMealStatusWithEffectiveRanges = useCallback(
    (mealType: string, actualDate: Date | undefined, completedAt: string | null) => {
      return getMealStatusWithRanges(mealType, actualDate, completedAt, effectiveTimeRanges);
    },
    [effectiveTimeRanges]
  );

  const getMinutesOverdueWithEffectiveRanges = useCallback(
    (mealType: string, actualDate: Date | undefined) => {
      return getMinutesOverdueWithRanges(mealType, actualDate, effectiveTimeRanges);
    },
    [effectiveTimeRanges]
  );

  const isMealTimeStartedWithEffectiveRanges = useCallback(
    (mealType: string, actualDate: Date | undefined) => {
      return isMealTimeStartedWithRanges(mealType, actualDate, effectiveTimeRanges);
    },
    [effectiveTimeRanges]
  );

  return {
    pendingMeals,
    isLoading,
    hasMealPlan,
    markAsComplete,
    skipMeal,
    refetch: fetchPendingMeals,
    effectiveTimeRanges,
    MEAL_LABELS,
    DAY_LABELS,
    getMealStatusForMeal: getMealStatusWithEffectiveRanges,
    getMinutesOverdueForMeal: getMinutesOverdueWithEffectiveRanges,
    isMealTimeStartedForMeal: isMealTimeStartedWithEffectiveRanges,
  };
}
