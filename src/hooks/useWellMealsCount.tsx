import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWellMealsCount(days: number = 7) {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWellMeals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { count: wellCount, error } = await supabase
      .from("meal_consumption")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feedback_status", "well")
      .gte("consumed_at", startDate.toISOString());

    if (error) {
      console.error("Error fetching well meals count:", error);
      return;
    }

    setCount(wellCount || 0);
    setIsLoading(false);
  }, [days]);

  useEffect(() => {
    fetchWellMeals();
  }, [fetchWellMeals]);

  return { count, isLoading, refetch: fetchWellMeals };
}
