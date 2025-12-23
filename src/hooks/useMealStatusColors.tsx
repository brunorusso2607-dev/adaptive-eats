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

// Fallback colors for immediate use while loading
const FALLBACK_COLORS: MealStatusColor[] = [
  { id: '1', status_key: 'on_time', label: 'No horário', background_color: 'rgba(34, 197, 94, 0.1)', text_color: 'rgba(34, 197, 94, 1)', border_color: 'rgba(34, 197, 94, 0.3)', sort_order: 1 },
  { id: '2', status_key: 'alert', label: 'Em alerta', background_color: 'rgba(251, 191, 36, 0.1)', text_color: 'rgba(217, 119, 6, 1)', border_color: 'rgba(251, 191, 36, 0.3)', sort_order: 2 },
  { id: '3', status_key: 'late', label: 'Atrasado', background_color: 'rgba(239, 68, 68, 0.1)', text_color: 'rgba(239, 68, 68, 1)', border_color: 'rgba(239, 68, 68, 0.3)', sort_order: 3 },
];

export function useMealStatusColors() {
  const [colors, setColors] = useState<MealStatusColor[]>(FALLBACK_COLORS);
  const [isLoading, setIsLoading] = useState(false); // Start as false to avoid early returns

  const fetchColors = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("meal_status_colors")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const formattedData: MealStatusColor[] = data.map(item => ({
          id: item.id,
          status_key: item.status_key,
          label: item.label,
          background_color: item.background_color,
          text_color: item.text_color,
          border_color: item.border_color,
          sort_order: item.sort_order,
        }));
        setColors(formattedData);
      }
    } catch (error) {
      console.error("Error fetching meal status colors:", error);
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
    refetch: fetchColors,
    getColorByStatus,
    getStyleByStatus,
  };
}

// Função vazia para compatibilidade (não precisa mais limpar cache)
export function invalidateColorCache(): void {
  // Não faz nada - dados são sempre buscados do banco
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
