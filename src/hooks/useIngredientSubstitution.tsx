import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface IngredientResult {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g?: number;
  category?: string;
}

export interface MacrosDiff {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface OriginalIngredient {
  item: string;
  quantity: string;
  unit: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  grams?: number;
}

export function useIngredientSubstitution() {
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [originalIngredient, setOriginalIngredient] = useState<OriginalIngredient | null>(null);

  const searchIngredient = useCallback(async (query: string, context?: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return [];
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-ingredient", {
        body: { query, context, limit: 10 },
      });

      if (error) throw error;

      const ingredients = data?.results || [];
      setResults(ingredients);
      return ingredients;
    } catch (error) {
      console.error("Error searching ingredient:", error);
      toast.error("Erro ao buscar ingredientes");
      setResults([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateMacrosDiff = useCallback(
    (original: IngredientResult | null, substitute: IngredientResult): MacrosDiff => {
      if (!original) {
        return {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        };
      }

      return {
        calories: Math.round(substitute.calories_per_100g - original.calories_per_100g),
        protein: Math.round((substitute.protein_per_100g - original.protein_per_100g) * 10) / 10,
        carbs: Math.round((substitute.carbs_per_100g - original.carbs_per_100g) * 10) / 10,
        fat: Math.round((substitute.fat_per_100g - original.fat_per_100g) * 10) / 10,
      };
    },
    []
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setOriginalIngredient(null);
  }, []);

  const openSubstitution = useCallback((ingredient: OriginalIngredient) => {
    setOriginalIngredient(ingredient);
  }, []);

  return {
    results,
    isLoading,
    originalIngredient,
    searchIngredient,
    calculateMacrosDiff,
    clearResults,
    openSubstitution,
  };
}
