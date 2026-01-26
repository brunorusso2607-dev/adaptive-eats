import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMealTimeSettings, MealTimeSetting, MEAL_DELAY_TOLERANCE_HOURS } from "./useMealTimeSettings";
import { formatMealTime } from "@/lib/mealTimeConfig";

export type MealTimeConfig = {
  meal_type: string;
  label: string;
  start_hour: number;
  sort_order: number;
  isCustom: boolean; // Indica se é horário personalizado do plano
};

export type CustomMealTimes = Record<string, string>; // { "breakfast": "07:00", "lunch": "12:30" }

interface UsePlanMealTimesOptions {
  planId?: string | null;
  userId?: string | null;
}

/**
 * Hook que busca horários de refeição com suporte a personalização por plano.
 * 
 * Prioridade:
 * 1. custom_meal_times do plano ativo (se disponível)
 * 2. default_meal_times do perfil do usuário
 * 3. Configurações globais de meal_time_settings
 */
export function usePlanMealTimes(options: UsePlanMealTimesOptions = {}) {
  const { planId, userId } = options;
  
  const { settings: globalSettings, isLoading: globalLoading } = useMealTimeSettings();
  const [customTimes, setCustomTimes] = useState<CustomMealTimes | null | undefined>(undefined);
  const [profileTimes, setProfileTimes] = useState<CustomMealTimes | null | undefined>(undefined);
  const [activePlanId, setActivePlanId] = useState<string | null>(planId || null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Buscar plano ativo e perfil do usuário
  useEffect(() => {
    async function fetchActivePlanAndProfile() {
      // Determinar userId
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        currentUserId = user.id;
      }

      setIsLoadingPlan(true);
      try {
        // Buscar perfil do usuário (para default_meal_times)
        const { data: profileData } = await supabase
          .from("profiles")
          .select("default_meal_times")
          .eq("id", currentUserId)
          .single();
        
        if (profileData?.default_meal_times) {
          setProfileTimes(profileData.default_meal_times as CustomMealTimes);
        }

        // Se planId foi passado, usar ele
        if (planId) {
          setActivePlanId(planId);
          return;
        }

        // Buscar plano ativo
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from("meal_plans")
          .select("id, custom_meal_times")
          .eq("user_id", currentUserId)
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

    fetchActivePlanAndProfile();
  }, [planId, userId]);

  // Buscar custom_meal_times se temos planId mas não temos customTimes
  useEffect(() => {
    async function fetchPlanCustomTimes() {
      if (!activePlanId || customTimes !== undefined) return;

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
    const [hStr, mStr] = timeStr.split(":");
    const hours = Number(hStr);
    const minutes = Number(mStr);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    return hours + minutes / 60;
  }, []);

  // Fonte de dados efetiva: plano > perfil > global
  const effectiveTimes = useMemo((): CustomMealTimes | null => {
    // Se o plano tem horários customizados, usar eles
    if (customTimes && Object.keys(customTimes).length > 0) {
      return customTimes;
    }
    // Se o perfil tem horários, usar eles
    if (profileTimes && Object.keys(profileTimes).length > 0) {
      return profileTimes;
    }
    return null;
  }, [customTimes, profileTimes]);

  // Mesclar horários globais com personalizados
  const mergedSettings = useMemo((): MealTimeConfig[] => {
    if (!globalSettings.length) return [];

    return globalSettings.map(setting => {
      // Hierarquia: plano > perfil > global
      const planTime = customTimes?.[setting.meal_type];
      const profileTime = profileTimes?.[setting.meal_type];
      const effectiveTime = typeof planTime === 'string' ? planTime : 
                           typeof profileTime === 'string' ? profileTime : null;
      
      if (effectiveTime) {
        const customHour = parseTimeToHour(effectiveTime);
        return {
          meal_type: setting.meal_type,
          label: setting.label,
          start_hour: customHour,
          sort_order: setting.sort_order,
          isCustom: true,
        };
      }

      return {
        meal_type: setting.meal_type,
        label: setting.label,
        start_hour: setting.start_hour,
        sort_order: setting.sort_order,
        isCustom: false,
      };
    });
  }, [globalSettings, customTimes, profileTimes, parseTimeToHour]);

  // Converter para formato Record
  // O "end" é calculado como o início da próxima refeição
  const getTimeRanges = useCallback((): Record<string, { start: number; end: number; isCustom: boolean }> => {
    const ranges: Record<string, { start: number; end: number; isCustom: boolean }> = {};
    const sortedSettings = [...mergedSettings].sort((a, b) => a.start_hour - b.start_hour);
    
    sortedSettings.forEach((s, index) => {
      const nextSetting = sortedSettings[index + 1];
      // O fim é o início da próxima refeição ou start + tolerância
      const end = nextSetting ? nextSetting.start_hour : s.start_hour + MEAL_DELAY_TOLERANCE_HOURS;
      ranges[s.meal_type] = { start: s.start_hour, end, isCustom: s.isCustom };
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

  // Obter ordem das refeições (tipos de refeição ordenados por horário)
  const getMealOrder = useCallback((): string[] => {
    return mergedSettings.map(s => s.meal_type);
  }, [mergedSettings]);

  // Formatar hora para exibição
  const formatHour = useCallback((hour: number): string => {
    return formatMealTime(hour);
  }, []);

  // Obter hora formatada para um tipo de refeição
  const getMealTime = useCallback((mealType: string): string => {
    const setting = mergedSettings.find(s => s.meal_type === mealType);
    if (!setting) {
      return "";
    }
    
    // Hierarquia: plano > perfil > global
    const planTime = customTimes?.[mealType];
    const profileTime = profileTimes?.[mealType];
    if (typeof planTime === 'string') {
      return planTime;
    }
    if (typeof profileTime === 'string') {
      return profileTime;
    }
    
    return formatHour(setting.start_hour);
  }, [mergedSettings, customTimes, profileTimes, formatHour]);

  // Verificar se há horários personalizados (plano ou perfil)
  const hasCustomTimes = useMemo(() => {
    const planHasTimes = customTimes !== null && customTimes !== undefined && Object.keys(customTimes).length > 0;
    const profileHasTimes = profileTimes !== null && profileTimes !== undefined && Object.keys(profileTimes).length > 0;
    return planHasTimes || profileHasTimes;
  }, [customTimes, profileTimes]);

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
    profileTimes,
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
