import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PendingMealFeedback {
  id: string;
  consumed_at: string;
  meal_plan_item_id: string | null;
  meal_name: string;
  meal_type: string;
  total_calories: number;
}

export function usePendingSymptomFeedback() {
  const [pendingMeals, setPendingMeals] = useState<PendingMealFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPendingMeals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPendingMeals([]);
      setIsLoading(false);
      return;
    }

    // Calculate time boundaries
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // First, auto-mark meals older than 24h as 'auto_well'
    await supabase
      .from("meal_consumption")
      .update({ feedback_status: "auto_well" })
      .eq("user_id", user.id)
      .eq("feedback_status", "pending")
      .lt("consumed_at", twentyFourHoursAgo.toISOString());

    // Fetch pending meals (consumed 2-24h ago with pending status)
    const { data: consumptions, error } = await supabase
      .from("meal_consumption")
      .select(`
        id,
        consumed_at,
        meal_plan_item_id,
        total_calories,
        meal_plan_items (
          recipe_name,
          meal_type
        )
      `)
      .eq("user_id", user.id)
      .eq("feedback_status", "pending")
      .lte("consumed_at", twoHoursAgo.toISOString())
      .gte("consumed_at", twentyFourHoursAgo.toISOString())
      .order("consumed_at", { ascending: true });

    if (error) {
      console.error("Error fetching pending meals:", error);
      setPendingMeals([]);
      setIsLoading(false);
      return;
    }

    // Transform data
    const meals: PendingMealFeedback[] = (consumptions || []).map((c: any) => ({
      id: c.id,
      consumed_at: c.consumed_at,
      meal_plan_item_id: c.meal_plan_item_id,
      meal_name: c.meal_plan_items?.recipe_name || "Refeição",
      meal_type: c.meal_plan_items?.meal_type || "refeicao",
      total_calories: c.total_calories,
    }));

    setPendingMeals(meals);
    setIsLoading(false);
  }, []);

  const markAsWell = async (mealId: string) => {
    const { error } = await supabase
      .from("meal_consumption")
      .update({ feedback_status: "well" })
      .eq("id", mealId);

    if (error) {
      console.error("Error marking meal as well:", error);
      return false;
    }

    await fetchPendingMeals();
    return true;
  };

  const markWithSymptoms = async (
    mealId: string,
    symptoms: string[],
    severity: "leve" | "moderado" | "severo",
    notes?: string
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Insert symptom log
    const { error: symptomError } = await supabase
      .from("symptom_logs")
      .insert({
        user_id: user.id,
        meal_consumption_id: mealId,
        symptoms,
        severity,
        notes: notes || null,
      });

    if (symptomError) {
      console.error("Error logging symptoms:", symptomError);
      return false;
    }

    // Update meal consumption status
    const { error: updateError } = await supabase
      .from("meal_consumption")
      .update({ feedback_status: "symptoms" })
      .eq("id", mealId);

    if (updateError) {
      console.error("Error updating meal status:", updateError);
      return false;
    }

    await fetchPendingMeals();
    return true;
  };

  // Defer initial fetch to avoid blocking first render
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPendingMeals();
    }, 2500); // 2.5s delay for initial load
    return () => clearTimeout(timer);
  }, [fetchPendingMeals]);

  return {
    pendingMeals,
    pendingCount: pendingMeals.length,
    isLoading,
    markAsWell,
    markWithSymptoms,
    refetch: fetchPendingMeals,
  };
}
