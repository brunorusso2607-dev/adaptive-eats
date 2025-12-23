import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MealStatusColor = {
  id: string;
  status_key: string;
  label: string;
  background_color: string;
  text_color: string;
  border_color: string | null;
  sort_order: number;
};

// Cache global para evitar múltiplas requisições
let cachedColors: MealStatusColor[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

export function useMealStatusColors() {
  const [colors, setColors] = useState<MealStatusColor[]>(cachedColors || []);
  const [isLoading, setIsLoading] = useState(!cachedColors);

  const fetchColors = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && cachedColors && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setColors(cachedColors);
      setIsLoading(false);
      return cachedColors;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("meal_status_colors")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const formattedData: MealStatusColor[] = (data || []).map(item => ({
        id: item.id,
        status_key: item.status_key,
        label: item.label,
        background_color: item.background_color,
        text_color: item.text_color,
        border_color: item.border_color,
        sort_order: item.sort_order,
      }));

      cachedColors = formattedData;
      cacheTimestamp = Date.now();
      
      setColors(formattedData);
      return formattedData;
    } catch (error) {
      console.error("Error fetching meal status colors:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColors();
  }, [fetchColors]);

  const getColorByStatus = useCallback((statusKey: string): MealStatusColor | undefined => {
    return colors.find(c => c.status_key === statusKey);
  }, [colors]);

  const getStyleByStatus = useCallback((statusKey: string): React.CSSProperties => {
    const color = colors.find(c => c.status_key === statusKey);
    if (!color) {
      // Fallback colors
      const fallbacks: Record<string, React.CSSProperties> = {
        on_time: { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: 'rgba(34, 197, 94, 1)', borderColor: 'rgba(34, 197, 94, 0.3)' },
        alert: { backgroundColor: 'rgba(251, 191, 36, 0.1)', color: 'rgba(217, 119, 6, 1)', borderColor: 'rgba(251, 191, 36, 0.3)' },
        late: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgba(239, 68, 68, 1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
      };
      return fallbacks[statusKey] || {};
    }
    return {
      backgroundColor: color.background_color,
      color: color.text_color,
      borderColor: color.border_color || undefined,
    };
  }, [colors]);

  return {
    colors,
    isLoading,
    refetch: () => fetchColors(true),
    getColorByStatus,
    getStyleByStatus,
  };
}

// Hook para administração (CRUD)
export function useMealStatusColorsAdmin() {
  const [colors, setColors] = useState<MealStatusColor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchColors = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("meal_status_colors")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const formattedData: MealStatusColor[] = (data || []).map(item => ({
        id: item.id,
        status_key: item.status_key,
        label: item.label,
        background_color: item.background_color,
        text_color: item.text_color,
        border_color: item.border_color,
        sort_order: item.sort_order,
      }));
      
      setColors(formattedData);
    } catch (error) {
      console.error("Error fetching meal status colors:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchColors();
  }, [fetchColors]);

  const updateColor = async (id: string, updates: Partial<Omit<MealStatusColor, "id">>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("meal_status_colors")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Invalidar cache global
      cachedColors = null;
      cacheTimestamp = 0;

      await fetchColors();
      return true;
    } catch (error) {
      console.error("Error updating meal status color:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  return {
    colors,
    isLoading,
    isSaving,
    refetch: fetchColors,
    updateColor,
  };
}
