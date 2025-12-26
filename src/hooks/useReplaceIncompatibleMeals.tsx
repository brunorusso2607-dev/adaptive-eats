import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type Ingredient = { item: string; quantity: string; unit: string };

type MealPlanItem = {
  id: string;
  day_of_week: number;
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: Ingredient[];
  recipe_instructions: string[];
  is_favorite: boolean;
  week_number?: number;
};

type ReplacementResult = {
  mealId: string;
  success: boolean;
  newMeal?: MealPlanItem;
  error?: string;
};

export function useReplaceIncompatibleMeals() {
  const [isReplacing, setIsReplacing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const replaceIncompatibleMeals = useCallback(async (
    incompatibleMeals: MealPlanItem[],
    onMealUpdated?: (updatedMeal: MealPlanItem) => void
  ): Promise<ReplacementResult[]> => {
    if (incompatibleMeals.length === 0) {
      toast({
        title: "Nenhuma refeição incompatível",
        description: "Não há refeições para substituir.",
      });
      return [];
    }

    setIsReplacing(true);
    setProgress({ current: 0, total: incompatibleMeals.length });
    
    const results: ReplacementResult[] = [];

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Não autenticado");
      }

      for (let i = 0; i < incompatibleMeals.length; i++) {
        const meal = incompatibleMeals[i];
        setProgress({ current: i + 1, total: incompatibleMeals.length });

        try {
          const response = await supabase.functions.invoke("regenerate-meal", {
            body: {
              mealItemId: meal.id,
              mealType: meal.meal_type,
              ingredients: null,
              mode: "automatic",
            },
          });

          if (response.error) {
            results.push({
              mealId: meal.id,
              success: false,
              error: response.error.message || "Erro ao regenerar",
            });
            continue;
          }

          if (response.data?.success && response.data?.meal) {
            results.push({
              mealId: meal.id,
              success: true,
              newMeal: response.data.meal,
            });

            if (onMealUpdated) {
              onMealUpdated(response.data.meal);
            }
          } else {
            results.push({
              mealId: meal.id,
              success: false,
              error: response.data?.error || "Erro desconhecido",
            });
          }
        } catch (error) {
          results.push({
            mealId: meal.id,
            success: false,
            error: error instanceof Error ? error.message : "Erro desconhecido",
          });
        }

        // Small delay between requests to avoid rate limiting
        if (i < incompatibleMeals.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (successCount > 0) {
        toast({
          title: "Substituição concluída!",
          description: failCount > 0
            ? `${successCount} refeições substituídas, ${failCount} falharam.`
            : `${successCount} refeições substituídas com sucesso.`,
        });
      } else {
        toast({
          title: "Erro na substituição",
          description: "Não foi possível substituir as refeições.",
          variant: "destructive",
        });
      }

      return results;
    } catch (error) {
      console.error("Error replacing incompatible meals:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao substituir refeições",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsReplacing(false);
      setProgress({ current: 0, total: 0 });
    }
  }, []);

  return {
    replaceIncompatibleMeals,
    isReplacing,
    progress,
  };
}
