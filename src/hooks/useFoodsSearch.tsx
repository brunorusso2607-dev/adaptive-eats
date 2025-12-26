import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Food {
  id: string;
  name: string;
  name_normalized: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sodium_per_100g: number | null;
  category: string | null;
  serving_unit: 'g' | 'ml' | 'un' | 'fatia';
  default_serving_size: number;
}

export function useFoodsSearch() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchFoods = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setFoods([]);
      return;
    }

    setIsLoading(true);
    try {
      const normalizedQuery = query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .or(`name.ilike.%${query}%,name_normalized.ilike.%${normalizedQuery}%`)
        .order("name")
        .limit(20);

      if (error) throw error;
      setFoods((data as Food[]) || []);
    } catch (error) {
      console.error("Error searching foods:", error);
      setFoods([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearFoods = useCallback(() => {
    setFoods([]);
  }, []);

  return { foods, isLoading, searchFoods, clearFoods };
}
