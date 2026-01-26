import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SymptomType {
  id: string;
  name: string;
  icon: string;
  category: string;
}

export interface SymptomLog {
  id: string;
  user_id: string;
  meal_consumption_id: string | null;
  symptoms: string[];
  severity: "leve" | "moderado" | "severo";
  notes: string | null;
  logged_at: string;
  created_at: string;
}

export function useSymptomTracker() {
  const [symptomTypes, setSymptomTypes] = useState<SymptomType[]>([]);
  const [recentLogs, setRecentLogs] = useState<SymptomLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSymptomTypes = useCallback(async () => {
    const { data, error } = await supabase
      .from("symptom_types")
      .select("id, name, icon, category")
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      console.error("Error fetching symptom types:", error);
      return;
    }

    setSymptomTypes(data || []);
  }, []);

  const fetchRecentLogs = useCallback(async (days: number = 7) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("symptom_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", startDate.toISOString())
      .order("logged_at", { ascending: false });

    if (error) {
      console.error("Error fetching symptom logs:", error);
      return;
    }

    setRecentLogs((data as SymptomLog[]) || []);
  }, []);

  const logSymptoms = async (
    symptoms: string[],
    severity: "leve" | "moderado" | "severo",
    notes?: string,
    mealConsumptionId?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para registrar sintomas.",
        variant: "destructive",
      });
      return null;
    }

    const { data, error } = await supabase
      .from("symptom_logs")
      .insert({
        user_id: user.id,
        symptoms,
        severity,
        notes: notes || null,
        meal_consumption_id: mealConsumptionId || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error logging symptoms:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar os sintomas.",
        variant: "destructive",
      });
      return null;
    }

    toast({
      title: "Sintomas registrados",
      description: "Seu registro foi salvo com sucesso.",
    });

    await fetchRecentLogs();
    return data;
  };

  const deleteLog = async (logId: string) => {
    const { error } = await supabase
      .from("symptom_logs")
      .delete()
      .eq("id", logId);

    if (error) {
      console.error("Error deleting symptom log:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o registro.",
        variant: "destructive",
      });
      return false;
    }

    await fetchRecentLogs();
    return true;
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchSymptomTypes(), fetchRecentLogs()]);
      setIsLoading(false);
    };
    init();
  }, [fetchSymptomTypes, fetchRecentLogs]);

  return {
    symptomTypes,
    recentLogs,
    isLoading,
    logSymptoms,
    deleteLog,
    refetch: fetchRecentLogs,
  };
}
