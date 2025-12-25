import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HealthPeriod = 7 | 14 | 21 | 30;

interface HealthStats {
  wellMealsCount: number;
  totalMealsCount: number;
  symptomsCount: number;
  score: number;
  isLoading: boolean;
}

export function useHealthStats(days: HealthPeriod = 7) {
  const [wellMealsCount, setWellMealsCount] = useState(0);
  const [totalMealsCount, setTotalMealsCount] = useState(0);
  const [symptomsCount, setSymptomsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      return;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Fetch well meals count (includes 'well' and 'auto_well')
      const { count: wellCount } = await supabase
        .from("meal_consumption")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("feedback_status", ["well", "auto_well"])
        .gte("consumed_at", startDate.toISOString());

      // Fetch meals with symptoms
      const { count: symptomsCount } = await supabase
        .from("meal_consumption")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("feedback_status", "symptoms")
        .gte("consumed_at", startDate.toISOString());

      // Total = well + symptoms (excluding pending)
      const totalEvaluated = (wellCount || 0) + (symptomsCount || 0);

      setWellMealsCount(wellCount || 0);
      setTotalMealsCount(totalEvaluated);
      setSymptomsCount(symptomsCount || 0);
    } catch (error) {
      console.error("Error fetching health stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Calculate score as percentage
  const score = useMemo(() => {
    if (totalMealsCount === 0) return 100;
    
    // Base score from well meals ratio
    const wellRatio = wellMealsCount / totalMealsCount;
    
    // Penalty for symptoms (each symptom reduces score)
    const symptomPenalty = Math.min(symptomsCount * 5, 30); // Max 30% penalty
    
    const calculatedScore = Math.round((wellRatio * 100) - symptomPenalty);
    return Math.max(0, Math.min(100, calculatedScore));
  }, [wellMealsCount, totalMealsCount, symptomsCount]);

  return {
    wellMealsCount,
    totalMealsCount,
    symptomsCount,
    score,
    isLoading,
    refetch: fetchStats,
  };
}
