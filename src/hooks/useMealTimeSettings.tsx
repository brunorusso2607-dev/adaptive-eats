import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateMealTimeCache } from "@/lib/mealTimeConfig";

export type MealTimeSetting = {
  id: string;
  meal_type: string;
  label: string;
  start_hour: number;
  sort_order: number;
};

// Cache global para evitar múltiplas requisições
let cachedSettings: MealTimeSetting[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Constante: tolerância em horas para considerar refeição atrasada
export const MEAL_DELAY_TOLERANCE_HOURS = 1;

export function useMealTimeSettings() {
  const [settings, setSettings] = useState<MealTimeSetting[]>(cachedSettings || []);
  const [isLoading, setIsLoading] = useState(!cachedSettings);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    // Usar cache se ainda válido e não forçar refresh
    if (!forceRefresh && cachedSettings && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setSettings(cachedSettings);
      setIsLoading(false);
      return cachedSettings;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("meal_time_settings")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const formattedData: MealTimeSetting[] = (data || []).map(item => ({
        id: item.id,
        meal_type: item.meal_type,
        label: item.label,
        start_hour: Number(item.start_hour),
        sort_order: item.sort_order,
      }));

      // Atualizar cache
      cachedSettings = formattedData;
      cacheTimestamp = Date.now();
      
      setSettings(formattedData);
      return formattedData;
    } catch (error) {
      console.error("Error fetching meal time settings:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Converter para o formato Record usado nos hooks existentes
  // Agora o "end" é calculado como start + tolerância (para compatibilidade)
  const getTimeRanges = useCallback((): Record<string, { start: number; end: number }> => {
    const ranges: Record<string, { start: number; end: number }> = {};
    const sortedSettings = [...settings].sort((a, b) => a.sort_order - b.sort_order);
    
    sortedSettings.forEach((s, index) => {
      // O "fim" agora é o início da próxima refeição, ou start + tolerância se for a última
      const nextSetting = sortedSettings[index + 1];
      const end = nextSetting ? nextSetting.start_hour : s.start_hour + MEAL_DELAY_TOLERANCE_HOURS;
      ranges[s.meal_type] = { start: s.start_hour, end };
    });
    return ranges;
  }, [settings]);

  // Converter para o formato de labels
  const getLabels = useCallback((): Record<string, string> => {
    const labels: Record<string, string> = {};
    settings.forEach(s => {
      labels[s.meal_type] = s.label;
    });
    return labels;
  }, [settings]);

  // Obter ordem das refeições
  const getMealOrder = useCallback((): string[] => {
    return settings.map(s => s.meal_type);
  }, [settings]);

  return {
    settings,
    isLoading,
    refetch: () => fetchSettings(true),
    getTimeRanges,
    getLabels,
    getMealOrder,
  };
}

// Hook para administração (CRUD)
export function useMealTimeSettingsAdmin() {
  const [settings, setSettings] = useState<MealTimeSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("meal_time_settings")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const formattedData: MealTimeSetting[] = (data || []).map(item => ({
        id: item.id,
        meal_type: item.meal_type,
        label: item.label,
        start_hour: Number(item.start_hour),
        sort_order: item.sort_order,
      }));
      
      setSettings(formattedData);
    } catch (error) {
      console.error("Error fetching meal time settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = async (id: string, updates: Partial<Omit<MealTimeSetting, "id">>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meal_time_settings")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Invalidar cache global e mealTimeConfig
      cachedSettings = null;
      cacheTimestamp = 0;
      invalidateMealTimeCache();

      await fetchSettings();
      return true;
    } catch (error) {
      console.error("Error updating meal time setting:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const createSetting = async (setting: Omit<MealTimeSetting, "id">) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meal_time_settings")
        .insert(setting);

      if (error) throw error;

      // Invalidar cache global e mealTimeConfig
      cachedSettings = null;
      cacheTimestamp = 0;
      invalidateMealTimeCache();

      await fetchSettings();
      return true;
    } catch (error) {
      console.error("Error creating meal time setting:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSetting = async (id: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meal_time_settings")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Invalidar cache global e mealTimeConfig
      cachedSettings = null;
      cacheTimestamp = 0;
      invalidateMealTimeCache();

      await fetchSettings();
      return true;
    } catch (error) {
      console.error("Error deleting meal time setting:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    isLoading,
    isSaving,
    refetch: fetchSettings,
    updateSetting,
    createSetting,
    deleteSetting,
  };
}
