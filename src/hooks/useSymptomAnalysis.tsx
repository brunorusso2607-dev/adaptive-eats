import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SymptomCorrelation {
  symptom: string;
  foods: { food: string; count: number }[];
}

interface TopSymptom {
  symptom: string;
  count: number;
}

export interface SymptomAnalysis {
  insights: string[];
  safetyScore: number;
  totalSymptomDays: number;
  totalDays: number;
  correlations: SymptomCorrelation[];
  topSymptoms: TopSymptom[];
  message?: string;
}

export function useSymptomAnalysis(days: number = 30) {
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Usuário não autenticado");
        setIsLoading(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke(
        "analyze-symptom-patterns",
        {
          body: { days },
        }
      );

      if (fnError) {
        console.error("Error analyzing symptoms:", fnError);
        setError(fnError.message);
        return;
      }

      setAnalysis(data);
    } catch (err) {
      console.error("Error in symptom analysis:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  return {
    analysis,
    isLoading,
    error,
    refetch: fetchAnalysis,
  };
}
