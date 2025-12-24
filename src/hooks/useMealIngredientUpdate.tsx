import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Ingredient {
  item: string;
  quantity: string;
  unit?: string;
}

export function useMealIngredientUpdate() {
  const updateIngredients = useCallback(async (mealId: string, ingredients: Ingredient[]) => {
    try {
      const { error } = await supabase
        .from("meal_plan_items")
        .update({ recipe_ingredients: ingredients as unknown as Json })
        .eq("id", mealId);

      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error("Error updating ingredients:", error);
      toast.error("Erro ao salvar substituição");
      return { success: false, error };
    }
  }, []);

  return { updateIngredients };
}
