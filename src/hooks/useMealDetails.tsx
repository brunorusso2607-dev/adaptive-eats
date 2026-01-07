import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type Ingredient = { item: string; quantity: string; unit: string };

export interface MealDetails {
  id: string;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
}

// Cache global para evitar re-fetching
const detailsCache = new Map<string, MealDetails>();

/**
 * Hook para lazy-load de detalhes de refeição (ingredientes e instruções)
 * Carrega sob demanda quando o usuário abre o detalhe da refeição
 */
export function useMealDetails() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMealDetails = useCallback(async (mealId: string): Promise<MealDetails | null> => {
    // Verificar cache primeiro
    if (detailsCache.has(mealId)) {
      return detailsCache.get(mealId)!;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("meal_plan_items")
        .select("id, recipe_ingredients, recipe_instructions")
        .eq("id", mealId)
        .single();

      if (fetchError) throw fetchError;

      const details: MealDetails = {
        id: data.id,
        recipe_ingredients: (data.recipe_ingredients || []) as unknown as Ingredient[],
        recipe_instructions: (data.recipe_instructions || []) as unknown as string[],
      };

      // Armazenar no cache
      detailsCache.set(mealId, details);

      return details;
    } catch (err) {
      console.error("[useMealDetails] Error fetching meal details:", err);
      setError("Erro ao carregar detalhes da refeição");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Pré-carregar detalhes em background (para refeições visíveis)
  const prefetchMealDetails = useCallback(async (mealIds: string[]) => {
    const uncachedIds = mealIds.filter(id => !detailsCache.has(id));
    
    if (uncachedIds.length === 0) return;

    try {
      const { data } = await supabase
        .from("meal_plan_items")
        .select("id, recipe_ingredients, recipe_instructions")
        .in("id", uncachedIds);

      if (data) {
        for (const item of data) {
          const details: MealDetails = {
            id: item.id,
            recipe_ingredients: (item.recipe_ingredients || []) as unknown as Ingredient[],
            recipe_instructions: (item.recipe_instructions || []) as unknown as string[],
          };
          detailsCache.set(item.id, details);
        }
      }
    } catch (err) {
      console.error("[useMealDetails] Error prefetching:", err);
    }
  }, []);

  // Invalidar cache de um item específico (após substituição de ingrediente)
  const invalidateCache = useCallback((mealId: string) => {
    detailsCache.delete(mealId);
  }, []);

  // Limpar todo o cache
  const clearCache = useCallback(() => {
    detailsCache.clear();
  }, []);

  // Verificar se já está em cache
  const isCached = useCallback((mealId: string) => {
    return detailsCache.has(mealId);
  }, []);

  // Obter do cache se existir
  const getFromCache = useCallback((mealId: string): MealDetails | null => {
    return detailsCache.get(mealId) || null;
  }, []);

  return {
    fetchMealDetails,
    prefetchMealDetails,
    invalidateCache,
    clearCache,
    isCached,
    getFromCache,
    isLoading,
    error,
  };
}
