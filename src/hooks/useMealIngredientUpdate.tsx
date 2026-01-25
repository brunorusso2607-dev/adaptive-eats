import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Ingredient {
  item: string;
  quantity: string;
  unit?: string;
}

interface MacrosUpdate {
  recipe_calories?: number;
  recipe_protein?: number;
  recipe_carbs?: number;
  recipe_fat?: number;
}

interface IngredientNutrition {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

// Parse quantity string to grams (approximate conversions)
function parseQuantityToGrams(quantity: string, unit: string): number {
  const numValue = parseFloat(quantity.replace(",", ".")) || 0;
  
  const unitLower = (unit || "").toLowerCase().trim();
  
  // Common unit conversions to grams
  const conversions: Record<string, number> = {
    "g": 1,
    "gramas": 1,
    "grama": 1,
    "kg": 1000,
    "ml": 1, // approximate for liquids
    "l": 1000,
    "litro": 1000,
    "litros": 1000,
    "xícara": 240,
    "xicara": 240,
    "xícaras": 240,
    "xicaras": 240,
    "colher de sopa": 15,
    "colheres de sopa": 15,
    "cs": 15,
    "colher de chá": 5,
    "colheres de chá": 5,
    "cc": 5,
    "unidade": 100, // approximate
    "unidades": 100,
    "un": 100,
    "fatia": 30,
    "fatias": 30,
    "dente": 5,
    "dentes": 5,
  };

  // Check for matching unit
  for (const [key, multiplier] of Object.entries(conversions)) {
    if (unitLower.includes(key)) {
      return numValue * multiplier;
    }
  }

  // Default: assume grams if no unit or unknown
  return numValue * 100; // Default to 100g if can't parse
}

export function useMealIngredientUpdate() {
  const updateIngredients = useCallback(async (
    mealId: string, 
    ingredients: Ingredient[],
    macrosUpdate?: MacrosUpdate
  ) => {
    try {
      console.log('[useMealIngredientUpdate] Saving to database:', {
        mealId,
        ingredientNames: ingredients.map(i => i.item),
        macrosUpdate
      });
      
      const updateData: Record<string, unknown> = {
        recipe_ingredients: ingredients as unknown as Json,
      };

      // Add macros if provided
      if (macrosUpdate) {
        if (macrosUpdate.recipe_calories !== undefined) {
          updateData.recipe_calories = Math.round(macrosUpdate.recipe_calories);
        }
        if (macrosUpdate.recipe_protein !== undefined) {
          updateData.recipe_protein = Math.round(macrosUpdate.recipe_protein * 10) / 10;
        }
        if (macrosUpdate.recipe_carbs !== undefined) {
          updateData.recipe_carbs = Math.round(macrosUpdate.recipe_carbs * 10) / 10;
        }
        if (macrosUpdate.recipe_fat !== undefined) {
          updateData.recipe_fat = Math.round(macrosUpdate.recipe_fat * 10) / 10;
        }
      }

      console.log('[useMealIngredientUpdate] Attempting update with:', updateData);
      
      const { error, data } = await supabase
        .from("meal_plan_items")
        .update(updateData)
        .eq("id", mealId)
        .select();

      if (error) {
        console.error('[useMealIngredientUpdate] Supabase error:', error);
        throw error;
      }
      
      // Verificar imediatamente se salvou
      const { data: verifyData } = await supabase
        .from("meal_plan_items")
        .select("recipe_ingredients")
        .eq("id", mealId)
        .single();
      
      const savedIngredients = verifyData?.recipe_ingredients as any[];
      console.log('[useMealIngredientUpdate] VERIFICATION - Data in DB after save:', {
        mealId,
        ingredientsInDB: savedIngredients?.map((i: any) => i.item),
        expectedIngredients: ingredients.map(i => i.item)
      });
      
      // Verificar se realmente salvou
      if (!data || data.length === 0) {
        console.error('[useMealIngredientUpdate] No rows updated! mealId:', mealId);
        return { success: false, error: 'No rows updated' };
      }
      
      return { success: true, data: data[0] };
    } catch (error) {
      console.error("[useMealIngredientUpdate] Error updating ingredients:", error);
      toast.error("Erro ao salvar substituição");
      return { success: false, error };
    }
  }, []);

  const calculateMacrosDiff = useCallback((
    originalNutrition: IngredientNutrition | null,
    newNutrition: IngredientNutrition,
    quantity: string,
    unit: string
  ): MacrosUpdate => {
    const grams = parseQuantityToGrams(quantity, unit);
    const factor = grams / 100;

    if (!originalNutrition) {
      // If no original data, just add the new ingredient's contribution
      return {
        recipe_calories: newNutrition.calories_per_100g * factor,
        recipe_protein: newNutrition.protein_per_100g * factor,
        recipe_carbs: newNutrition.carbs_per_100g * factor,
        recipe_fat: newNutrition.fat_per_100g * factor,
      };
    }

    // Calculate the difference
    return {
      recipe_calories: (newNutrition.calories_per_100g - originalNutrition.calories_per_100g) * factor,
      recipe_protein: (newNutrition.protein_per_100g - originalNutrition.protein_per_100g) * factor,
      recipe_carbs: (newNutrition.carbs_per_100g - originalNutrition.carbs_per_100g) * factor,
      recipe_fat: (newNutrition.fat_per_100g - originalNutrition.fat_per_100g) * factor,
    };
  }, []);

  return { updateIngredients, calculateMacrosDiff, parseQuantityToGrams };
}
