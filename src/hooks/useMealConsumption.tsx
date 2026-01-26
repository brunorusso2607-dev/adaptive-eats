import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConsumedItem {
  food_id: string | null;
  food_name: string;
  quantity_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SaveConsumptionParams {
  mealPlanItemId: string;
  followedPlan: boolean;
  items: ConsumedItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  notes?: string;
  onSuccess?: () => void; // Callback para refresh de gamificação
}

export function useMealConsumption() {
  const saveConsumption = useCallback(async (params: SaveConsumptionParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create meal consumption record
      const { data: consumption, error: consumptionError } = await supabase
        .from("meal_consumption")
        .insert({
          user_id: user.id,
          meal_plan_item_id: params.mealPlanItemId,
          followed_plan: params.followedPlan,
          total_calories: params.totalCalories,
          total_protein: params.totalProtein,
          total_carbs: params.totalCarbs,
          total_fat: params.totalFat,
          notes: params.notes,
        })
        .select()
        .single();

      if (consumptionError) throw consumptionError;

      // Insert consumption items if not following plan
      if (!params.followedPlan && params.items.length > 0) {
        const itemsToInsert = params.items.map((item) => ({
          meal_consumption_id: consumption.id,
          food_id: item.food_id,
          food_name: item.food_name,
          quantity_grams: item.quantity_grams,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        }));

        const { error: itemsError } = await supabase
          .from("consumption_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      // Mark the meal plan item as completed
      const { error: updateError } = await supabase
        .from("meal_plan_items")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", params.mealPlanItemId);

      if (updateError) throw updateError;

      // Trigger gamification refresh callback if provided
      if (params.onSuccess) {
        params.onSuccess();
      }

      return { success: true, consumption };
    } catch (error) {
      console.error("Error saving consumption:", error);
      return { success: false, error };
    }
  }, []);

  return { saveConsumption };
}
