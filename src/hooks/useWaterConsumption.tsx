import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export interface WaterSettings {
  daily_goal_ml: number;
  reminder_enabled: boolean;
  reminder_interval_minutes: number;
  reminder_start_hour: number;
  reminder_end_hour: number;
}

export interface WaterConsumption {
  id: string;
  amount_ml: number;
  consumed_at: string;
}

const DEFAULT_SETTINGS: WaterSettings = {
  daily_goal_ml: 2000,
  reminder_enabled: true,
  reminder_interval_minutes: 60,
  reminder_start_hour: 8,
  reminder_end_hour: 22,
};

// Callback type for achievement check
type AchievementCheckCallback = () => void;

export function useWaterConsumption(onAchievementCheck?: AchievementCheckCallback) {
  const [settings, setSettings] = useState<WaterSettings>(DEFAULT_SETTINGS);
  const [todayConsumption, setTodayConsumption] = useState<WaterConsumption[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("water_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          daily_goal_ml: data.daily_goal_ml,
          reminder_enabled: data.reminder_enabled,
          reminder_interval_minutes: data.reminder_interval_minutes,
          reminder_start_hour: data.reminder_start_hour,
          reminder_end_hour: data.reminder_end_hour,
        });
      }
    } catch (error) {
      console.error("Error fetching water settings:", error);
    }
  }, []);

  const fetchTodayConsumption = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      const { data, error } = await supabase
        .from("water_consumption")
        .select("*")
        .eq("user_id", user.id)
        .gte("consumed_at", dayStart)
        .lte("consumed_at", dayEnd)
        .order("consumed_at", { ascending: false });

      if (error) throw error;

      setTodayConsumption(data || []);
      setTotalToday((data || []).reduce((sum, item) => sum + item.amount_ml, 0));
    } catch (error) {
      console.error("Error fetching water consumption:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addWater = async (amount_ml: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado",
          variant: "destructive",
        });
        return false;
      }

      const { error } = await supabase
        .from("water_consumption")
        .insert({
          user_id: user.id,
          amount_ml,
        });

      if (error) throw error;

      await fetchTodayConsumption();

      const newTotal = totalToday + amount_ml;
      if (newTotal >= settings.daily_goal_ml && totalToday < settings.daily_goal_ml) {
        toast({
          title: "🎉 Meta atingida!",
          description: "Parabéns! Você atingiu sua meta diária de água!",
        });
      } else {
        toast({
          title: "💧 Água registrada",
          description: `+${amount_ml}ml adicionados`,
        });
      }

      // Check for achievements after adding water
      if (onAchievementCheck) {
        setTimeout(() => onAchievementCheck(), 500);
      }

      return true;
    } catch (error) {
      console.error("Error adding water:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeWater = async (id: string) => {
    try {
      const { error } = await supabase
        .from("water_consumption")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await fetchTodayConsumption();

      toast({
        title: "Registro removido",
        description: "Consumo de água removido",
      });

      return true;
    } catch (error) {
      console.error("Error removing water:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateSettings = async (newSettings: Partial<WaterSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const updatedSettings = { ...settings, ...newSettings };

      const { error } = await supabase
        .from("water_settings")
        .upsert({
          user_id: user.id,
          ...updatedSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setSettings(updatedSettings);

      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas",
      });

      return true;
    } catch (error) {
      console.error("Error updating settings:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchTodayConsumption();
  }, [fetchSettings, fetchTodayConsumption]);

  const percentage = Math.min((totalToday / settings.daily_goal_ml) * 100, 100);
  const remaining = Math.max(settings.daily_goal_ml - totalToday, 0);

  return {
    settings,
    todayConsumption,
    totalToday,
    percentage,
    remaining,
    isLoading,
    addWater,
    removeWater,
    updateSettings,
    refetch: fetchTodayConsumption,
  };
}
