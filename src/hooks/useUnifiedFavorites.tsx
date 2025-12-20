import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export type UnifiedFavorite = {
  id: string;
  name: string;
  description: string | null;
  prep_time: number;
  complexity: "rapida" | "equilibrada" | "elaborada";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  is_favorite: boolean;
  created_at: string | null;
  ingredients: Json;
  instructions: Json;
  input_ingredients: string | null;
  /** Origem do favorito: 'recipe' ou 'meal_plan' */
  source: "recipe" | "meal_plan";
  /** ID do plano de refeição (se source === 'meal_plan') */
  meal_plan_id?: string;
  /** Nome do plano de refeição (se source === 'meal_plan') */
  meal_plan_name?: string;
  /** Tipo da refeição (se source === 'meal_plan') */
  meal_type?: string;
  /** Dia da semana (se source === 'meal_plan') */
  day_of_week?: number;
};

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Café da Manhã",
  lunch: "Almoço",
  dinner: "Jantar",
  snack: "Lanche",
};

export function useUnifiedFavorites() {
  const [favorites, setFavorites] = useState<UnifiedFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    setIsLoading(true);
    try {
      // Busca favoritos de receitas avulsas
      const { data: recipeFavorites, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_favorite", true)
        .order("created_at", { ascending: false });

      if (recipeError) throw recipeError;

      // Busca favoritos de receitas do plano alimentar
      const { data: mealPlanFavorites, error: mealPlanError } = await supabase
        .from("meal_plan_items")
        .select(`
          *,
          meal_plans (
            id,
            name
          )
        `)
        .eq("is_favorite", true)
        .order("created_at", { ascending: false });

      if (mealPlanError) throw mealPlanError;

      // Normaliza receitas avulsas
      const normalizedRecipes: UnifiedFavorite[] = (recipeFavorites || []).map(recipe => ({
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        prep_time: recipe.prep_time,
        complexity: recipe.complexity,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        servings: recipe.servings,
        is_favorite: recipe.is_favorite,
        created_at: recipe.created_at,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        input_ingredients: recipe.input_ingredients,
        source: "recipe" as const,
      }));

      // Normaliza receitas do plano alimentar
      const normalizedMealPlanItems: UnifiedFavorite[] = (mealPlanFavorites || []).map(item => ({
        id: item.id,
        name: item.recipe_name,
        description: `${MEAL_LABELS[item.meal_type] || item.meal_type} - ${DAY_NAMES[item.day_of_week]}`,
        prep_time: item.recipe_prep_time,
        complexity: "equilibrada" as const, // Planos não têm complexidade definida
        calories: item.recipe_calories,
        protein: Number(item.recipe_protein),
        carbs: Number(item.recipe_carbs),
        fat: Number(item.recipe_fat),
        servings: 1,
        is_favorite: item.is_favorite,
        created_at: item.created_at,
        ingredients: item.recipe_ingredients,
        instructions: item.recipe_instructions,
        input_ingredients: null,
        source: "meal_plan" as const,
        meal_plan_id: item.meal_plan_id,
        meal_plan_name: (item.meal_plans as any)?.name || "Plano",
        meal_type: item.meal_type,
        day_of_week: item.day_of_week,
      }));

      // Combina e ordena por data de criação
      const allFavorites = [...normalizedRecipes, ...normalizedMealPlanItems].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setFavorites(allFavorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      toast.error("Erro ao carregar favoritos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (favorite: UnifiedFavorite) => {
    try {
      if (favorite.source === "recipe") {
        const { error } = await supabase
          .from("recipes")
          .update({ is_favorite: !favorite.is_favorite })
          .eq("id", favorite.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("meal_plan_items")
          .update({ is_favorite: !favorite.is_favorite })
          .eq("id", favorite.id);

        if (error) throw error;
      }

      // Remove da lista se estiver desfavoritando
      if (favorite.is_favorite) {
        setFavorites(prev => prev.filter(f => f.id !== favorite.id));
      }

      toast.success(favorite.is_favorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favorito");
    }
  };

  const deleteRecipe = async (favorite: UnifiedFavorite) => {
    try {
      if (favorite.source === "recipe") {
        const { error } = await supabase
          .from("recipes")
          .delete()
          .eq("id", favorite.id);

        if (error) throw error;
        
        setFavorites(prev => prev.filter(f => f.id !== favorite.id));
        toast.success("Receita deletada com sucesso");
      } else {
        // Para itens do plano, apenas remove dos favoritos (não deleta)
        await toggleFavorite(favorite);
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Erro ao deletar receita");
    }
  };

  return {
    favorites,
    isLoading,
    refetch: fetchFavorites,
    toggleFavorite,
    deleteRecipe,
  };
}
