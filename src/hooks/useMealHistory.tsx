import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MealStatus = "all" | "evaluated" | "ok" | "symptoms" | "pending" | "skipped";

export interface MealHistoryItem {
  id: string;
  consumedAt: string;
  recipeName: string | null;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  feedbackStatus: string;
  symptoms: string[];
  severity: string | null;
  symptomNotes: string | null;
  timeSinceSymptom: number | null;
}

export interface MealHistoryFilters {
  days: 0 | 7 | 14 | 21 | 30;
  status: MealStatus;
}

export function useMealHistory(filters: MealHistoryFilters) {
  const [meals, setMeals] = useState<MealHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Usuário não autenticado");
        setIsLoading(false);
        return;
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      if (filters.days === 0) {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.days);
      }

      // Build query for meal_consumption
      let query = supabase
        .from("meal_consumption")
        .select(`
          id,
          consumed_at,
          total_calories,
          total_protein,
          total_carbs,
          total_fat,
          feedback_status,
          followed_plan,
          meal_plan_item_id,
          custom_meal_name,
          meal_plan_items:meal_plan_item_id (
            recipe_name
          ),
          consumption_items (
            food_name
          )
        `)
        .eq("user_id", session.user.id)
        .gte("consumed_at", startDate.toISOString())
        .order("consumed_at", { ascending: false });

      // Apply status filter
      if (filters.status === "evaluated") {
        // Only meals with feedback (excludes pending)
        query = query.in("feedback_status", ["well", "auto_well", "symptoms"]);
      } else if (filters.status === "ok") {
        query = query.in("feedback_status", ["well", "auto_well"]);
      } else if (filters.status === "symptoms") {
        query = query.eq("feedback_status", "symptoms");
      } else if (filters.status === "pending") {
        query = query.eq("feedback_status", "pending");
      } else if (filters.status === "skipped") {
        query = query.eq("followed_plan", false);
      }

      const { data: mealsData, error: mealsError } = await query;

      if (mealsError) {
        console.error("Error fetching meal history:", mealsError);
        setError(mealsError.message);
        return;
      }

      // Get meal IDs to fetch related symptom logs
      const mealIds = mealsData?.map(m => m.id) || [];
      
      // Fetch symptom logs for these meals
      const { data: symptomLogs } = await supabase
        .from("symptom_logs")
        .select("meal_consumption_id, symptoms, severity, notes, logged_at")
        .in("meal_consumption_id", mealIds.length > 0 ? mealIds : ['no-match']);

      // Create a map of meal_id -> symptom info
      const symptomMap = new Map<string, { 
        symptoms: string[]; 
        severity: string; 
        notes: string | null;
        loggedAt: string;
      }>();
      
      for (const log of symptomLogs || []) {
        if (log.meal_consumption_id) {
          symptomMap.set(log.meal_consumption_id, {
            symptoms: log.symptoms || [],
            severity: log.severity,
            notes: log.notes,
            loggedAt: log.logged_at,
          });
        }
      }

      // Transform data
      const mealItems: MealHistoryItem[] = (mealsData || []).map(meal => {
        const symptomInfo = symptomMap.get(meal.id);
        const mealTime = new Date(meal.consumed_at);
        
        let timeSinceSymptom: number | null = null;
        if (symptomInfo) {
          const symptomTime = new Date(symptomInfo.loggedAt);
          timeSinceSymptom = Math.round(
            (symptomTime.getTime() - mealTime.getTime()) / (1000 * 60 * 60) * 10
          ) / 10;
        }

        const recipeInfo = (meal as any).meal_plan_items;
        // Prioridade: custom_meal_name (o que usuário digitou) > recipe_name (do plano) > consumption_items > fallback
        let recipeName = meal.custom_meal_name || 
          recipeInfo?.recipe_name ||
          (meal.consumption_items && meal.consumption_items.length > 0 
            ? meal.consumption_items.map((i: any) => i.food_name).join(", ")
            : "Refeição");

        // Determine if meal was skipped
        const isSkipped = meal.followed_plan === false && meal.total_calories === 0;
        const effectiveStatus = isSkipped ? "skipped" : meal.feedback_status;

        return {
          id: meal.id,
          consumedAt: meal.consumed_at,
          recipeName: recipeName.length > 40 ? recipeName.substring(0, 40) + "..." : recipeName,
          totalCalories: meal.total_calories,
          totalProtein: meal.total_protein,
          totalCarbs: meal.total_carbs,
          totalFat: meal.total_fat,
          feedbackStatus: effectiveStatus,
          symptoms: symptomInfo?.symptoms || [],
          severity: symptomInfo?.severity || null,
          symptomNotes: symptomInfo?.notes || null,
          timeSinceSymptom,
        };
      });

      setMeals(mealItems);
    } catch (err) {
      console.error("Error in meal history:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, [filters.days, filters.status]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Count by status
  const counts = {
    ok: meals.filter(m => m.feedbackStatus === "well" || m.feedbackStatus === "auto_well").length,
    symptoms: meals.filter(m => m.feedbackStatus === "symptoms").length,
    pending: meals.filter(m => m.feedbackStatus === "pending").length,
    skipped: meals.filter(m => m.feedbackStatus === "skipped").length,
  };

  return {
    meals,
    counts,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}
