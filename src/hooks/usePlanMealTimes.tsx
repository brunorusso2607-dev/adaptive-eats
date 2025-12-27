import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMealTimeSettings, MealTimeSetting } from "./useMealTimeSettings";

export type MealTimeConfig = {
  meal_type: string;
  label: string;
  start_hour: number;
  end_hour: number;
  sort_order: number;
  isCustom: boolean; // Indica se é horário personalizado do plano
};

export type CustomMealTimes = Record<string, string>; // { "cafe_manha": "07:00", "almoco": "12:30" }

interface UsePlanMealTimesOptions {
  planId?: string | null;
  userId?: string | null;
}

/**
 * Hook que busca horários de refeição com suporte a personalização por plano.
 * 
 * Prioridade:
 * 1. custom_meal_times do plano ativo (se disponível)
 * 2. Configurações globais de meal_time_settings
 */
export function usePlanMealTimes(options: UsePlanMealTimesOptions = {}) {
  const { planId, userId } = options;
  
  const { settings: globalSettings, isLoading: globalLoading } = useMealTimeSettings();
  const [customTimes, setCustomTimes] = useState<CustomMealTimes | null>(null);
  const [activePlanId, setActivePlanId] = useState<string | null>(planId || null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Buscar plano ativo se não foi passado planId
  useEffect(() => {
    async function fetchActivePlan() {
      if (planId) {
        setActivePlanId(planId);
        return;
      }

      if (!userId) {
        // Buscar usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setIsLoadingPlan(true);
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data, error } = await supabase
            .from("meal_plans")
            .select("id, custom_meal_times")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .lte("start_date", today)
            .gte("end_date", today)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error("Error fetching active plan:", error);
            return;
          }

          if (data) {
            setActivePlanId(data.id);
            setCustomTimes(data.custom_meal_times as CustomMealTimes | null);
          }
        } finally {
          setIsLoadingPlan(false);
        }
      } else {
        // Usar userId passado
        setIsLoadingPlan(true);
        try {
          const today = new Date().toISOString().split('T')[0];
          const { data, error } = await supabase
            .from("meal_plans")
            .select("id, custom_meal_times")
            .eq("user_id", userId)
            .eq("is_active", true)
            .lte("start_date", today)
            .gte("end_date", today)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error("Error fetching active plan:", error);
            return;
          }

          if (data) {
            setActivePlanId(data.id);
            setCustomTimes(data.custom_meal_times as CustomMealTimes | null);
          }
        } finally {
          setIsLoadingPlan(false);
        }
      }
    }

    fetchActivePlan();
  }, [planId, userId]);

  // Buscar custom_meal_times se temos planId mas não temos customTimes
  useEffect(() => {
    async function fetchPlanCustomTimes() {
      if (!activePlanId || customTimes !== null) return;

      try {
        const { data, error } = await supabase
          .from("meal_plans")
          .select("custom_meal_times")
          .eq("id", activePlanId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching plan custom times:", error);
          return;
        }

        setCustomTimes(data?.custom_meal_times as CustomMealTimes | null);
      } catch (err) {
        console.error("Error in fetchPlanCustomTimes:", err);
      }
    }

    fetchPlanCustomTimes();
  }, [activePlanId, customTimes]);

  // Converter string de hora "HH:MM" para número de hora
  const parseTimeToHour = useCallback((timeStr: string): number => {
    const [hours] = timeStr.split(":").map(Number);
    return hours;
  }, []);

  // Mesclar horários globais com personalizados
  const mergedSettings = useMemo((): MealTimeConfig[] => {
    if (!globalSettings.length) return [];

    return globalSettings.map(setting => {
      const customTime = customTimes?.[setting.meal_type];
      
      if (customTime) {
        const customHour = parseTimeToHour(customTime);
        return {
          meal_type: setting.meal_type,
          label: setting.label,
          start_hour: customHour,
          end_hour: customHour + (setting.end_hour - setting.start_hour), // Manter mesma duração
          sort_order: setting.sort_order,
          isCustom: true,
        };
      }

      return {
        meal_type: setting.meal_type,
        label: setting.label,
        start_hour: setting.start_hour,
        end_hour: setting.end_hour,
        sort_order: setting.sort_order,
        isCustom: false,
      };
    });
  }, [globalSettings, customTimes, parseTimeToHour]);

  // Converter para formato Record
  const getTimeRanges = useCallback((): Record<string, { start: number; end: number; isCustom: boolean }> => {
    const ranges: Record<string, { start: number; end: number; isCustom: boolean }> = {};
    mergedSettings.forEach(s => {
      ranges[s.meal_type] = { start: s.start_hour, end: s.end_hour, isCustom: s.isCustom };
    });
    return ranges;
  }, [mergedSettings]);

  // Converter para formato de labels
  const getLabels = useCallback((): Record<string, string> => {
    const labels: Record<string, string> = {};
    mergedSettings.forEach(s => {
      labels[s.meal_type] = s.label;
    });
    return labels;
  }, [mergedSettings]);

  // Obter ordem das refeições
  const getMealOrder = useCallback((): string[] => {
    return mergedSettings.map(s => s.meal_type);
  }, [mergedSettings]);

  // Formatar hora para exibição
  const formatHour = useCallback((hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`;
  }, []);

  // Obter hora formatada para um tipo de refeição
  const getMealTime = useCallback((mealType: string): string => {
    const setting = mergedSettings.find(s => s.meal_type === mealType);
    if (!setting) return "";
    
    // Se tiver horário customizado, usar ele diretamente
    if (customTimes?.[mealType]) {
      return customTimes[mealType];
    }
    
    return formatHour(setting.start_hour);
  }, [mergedSettings, customTimes, formatHour]);

  // Verificar se o plano tem horários personalizados
  const hasCustomTimes = useMemo(() => {
    return customTimes !== null && Object.keys(customTimes).length > 0;
  }, [customTimes]);

  // Atualizar horários personalizados do plano
  const updateCustomTimes = useCallback(async (newCustomTimes: CustomMealTimes | null): Promise<boolean> => {
    if (!activePlanId) return false;

    try {
      const { error } = await supabase
        .from("meal_plans")
        .update({ custom_meal_times: newCustomTimes })
        .eq("id", activePlanId);

      if (error) {
        console.error("Error updating custom meal times:", error);
        return false;
      }

      setCustomTimes(newCustomTimes);
      return true;
    } catch (err) {
      console.error("Error in updateCustomTimes:", err);
      return false;
    }
  }, [activePlanId]);

  return {
    settings: mergedSettings,
    globalSettings,
    customTimes,
    activePlanId,
    isLoading: globalLoading || isLoadingPlan,
    hasCustomTimes,
    getTimeRanges,
    getLabels,
    getMealOrder,
    getMealTime,
    updateCustomTimes,
  };
}
