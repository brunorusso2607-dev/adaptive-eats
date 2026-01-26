import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserTimezone, getCurrentTimeInTimezone } from "./useUserTimezone";
import { getMealTimeRangesSync, getMealLabelsSync, getMealOrderSync, type MealTimeRanges } from "@/lib/mealTimeConfig";

export interface PendingMealForReplacement {
  id: string;
  meal_plan_id: string;
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  day_of_week: number;
  week_number: number;
}

export interface MealTimeDetectionResult {
  detectedMealType: string;
  detectedMealLabel: string;
  pendingMeal: PendingMealForReplacement | null;
  hasPendingMeal: boolean;
  isLoading: boolean;
}

/**
 * Hook para detectar automaticamente o tipo de refeição baseado no horário atual
 * e verificar se existe uma refeição pendente do plano para substituição
 */
export function useMealTimeDetection() {
  const { timezone, isLoading: isTimezoneLoading } = useUserTimezone();
  const [pendingMeal, setPendingMeal] = useState<PendingMealForReplacement | null>(null);
  const [isLoadingPending, setIsLoadingPending] = useState(true);

  // Detectar meal type baseado no horário atual no timezone do usuário
  const detectMealType = useCallback((ranges: MealTimeRanges): string => {
    const { hours, minutes } = getCurrentTimeInTimezone(timezone);
    const currentTime = hours + minutes / 60;

    // Percorrer os ranges e encontrar qual refeição corresponde ao horário atual
    for (const [mealType, range] of Object.entries(ranges)) {
      if (currentTime >= range.start && currentTime < range.end) {
        return mealType;
      }
    }

    // Se não encontrar nenhuma, usar "extra"
    return "extra";
  }, [timezone]);

  // Resultado memoizado da detecção
  const detectionResult = useMemo(() => {
    if (isTimezoneLoading) {
      return { detectedMealType: "extra", detectedMealLabel: "Refeição Extra" };
    }

    const ranges = getMealTimeRangesSync();
    const labels = getMealLabelsSync();
    const detectedMealType = detectMealType(ranges);
    const detectedMealLabel = labels[detectedMealType] || "Refeição Extra";

    return { detectedMealType, detectedMealLabel };
  }, [isTimezoneLoading, timezone, detectMealType]);

  // Buscar refeição pendente do plano ativo para o meal type detectado
  const fetchPendingMealForType = useCallback(async (mealType: string) => {
    console.log("[useMealTimeDetection] fetchPendingMealForType called with:", mealType);
    
    if (mealType === "extra") {
      console.log("[useMealTimeDetection] mealType is 'extra', skipping pending meal search");
      setPendingMeal(null);
      setIsLoadingPending(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setPendingMeal(null);
        setIsLoadingPending(false);
        return;
      }

      // Buscar plano ativo
      const today = new Date().toISOString().split('T')[0];
      const { data: activePlan, error: planError } = await supabase
        .from("meal_plans")
        .select("id, start_date")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .lte("start_date", today)
        .gte("end_date", today)
        .maybeSingle();

      if (planError || !activePlan) {
        setPendingMeal(null);
        setIsLoadingPending(false);
        return;
      }

      // Calcular dia do plano
      const { hours, dayOfWeek } = getCurrentTimeInTimezone(timezone);
      const startDate = new Date(activePlan.start_date);
      const todayDate = new Date();
      const diffDays = Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(diffDays / 7) + 1;
      const dayOfPlan = diffDays % 7;

      console.log("[useMealTimeDetection] Searching for pending meal:", {
        mealType,
        planId: activePlan.id,
        startDate: activePlan.start_date,
        todayDate: todayDate.toISOString(),
        diffDays,
        dayOfPlan,
        weekNumber,
        timezone,
      });

      // Buscar refeição pendente daquele tipo para hoje
      const { data: pendingMealData, error: mealError } = await supabase
        .from("meal_plan_items")
        .select(`
          id,
          meal_plan_id,
          meal_type,
          recipe_name,
          recipe_calories,
          recipe_protein,
          recipe_carbs,
          recipe_fat,
          day_of_week,
          week_number
        `)
        .eq("meal_plan_id", activePlan.id)
        .eq("meal_type", mealType)
        .eq("day_of_week", dayOfPlan)
        .eq("week_number", weekNumber)
        .is("completed_at", null)
        .maybeSingle();

      if (mealError) {
        console.error("[useMealTimeDetection] Error fetching pending meal:", mealError);
        setPendingMeal(null);
      } else {
        console.log("[useMealTimeDetection] Pending meal found:", {
          mealType,
          dayOfPlan,
          weekNumber,
          meal: pendingMealData,
        });
        setPendingMeal(pendingMealData);
      }
    } catch (error) {
      console.error("[useMealTimeDetection] Error:", error);
      setPendingMeal(null);
    } finally {
      setIsLoadingPending(false);
    }
  }, [timezone]);

  // Efeito para buscar refeição pendente quando o meal type é detectado
  useEffect(() => {
    if (!isTimezoneLoading) {
      fetchPendingMealForType(detectionResult.detectedMealType);
    }
  }, [isTimezoneLoading, detectionResult.detectedMealType, fetchPendingMealForType]);

  // Refresh para recarregar dados
  const refresh = useCallback(() => {
    setIsLoadingPending(true);
    fetchPendingMealForType(detectionResult.detectedMealType);
  }, [detectionResult.detectedMealType, fetchPendingMealForType]);

  return {
    ...detectionResult,
    pendingMeal,
    hasPendingMeal: pendingMeal !== null,
    isLoading: isTimezoneLoading || isLoadingPending,
    refresh,
  };
}

/**
 * Função utilitária para obter o tipo de refeição baseado em um horário específico
 */
export function getMealTypeForTime(time: string, ranges?: MealTimeRanges): string {
  const effectiveRanges = ranges || getMealTimeRangesSync();
  const [hours, minutes] = time.split(':').map(Number);
  const currentTime = hours + minutes / 60;

  for (const [mealType, range] of Object.entries(effectiveRanges)) {
    if (currentTime >= range.start && currentTime < range.end) {
      return mealType;
    }
  }

  return "extra";
}
