import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface IngredientSubstitute {
  id: string;
  name: string;
  category: string;
  suggestedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  caloriesDiff: number;
  proteinDiff: number;
  matchScore: number;
}

export interface SubstituteRequest {
  ingredientId: string;
  ingredientName: string;
  currentGrams: number;
  currentCaloriesPer100g: number;
  currentProteinPer100g: number;
  currentCarbsPer100g: number;
  currentFatPer100g: number;
  userIntolerances?: string[];
  dietaryPreference?: string;
  excludedIngredients?: string[];
  currentMealIngredients?: string[];
  maxResults?: number;
}

export function useIngredientSubstitutes() {
  const [substitutes, setSubstitutes] = useState<IngredientSubstitute[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [originalCategory, setOriginalCategory] = useState<string>('');
  const { toast } = useToast();

  const fetchSubstitutes = async (request: SubstituteRequest) => {
    setIsLoading(true);
    setSubstitutes([]);

    try {
      console.log('🔍 Fetching substitutes with request:', request);
      
      const { data, error } = await supabase.functions.invoke('get-ingredient-substitutes', {
        body: request
      });

      console.log('📦 Response:', { data, error });

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('❌ Data error:', data.error);
        throw new Error(data.error);
      }

      console.log('✅ Substitutes found:', data?.substitutes?.length || 0);
      
      setSubstitutes(data?.substitutes || []);
      setOriginalCategory(data?.originalCategory || '');

      if (!data?.substitutes || data.substitutes.length === 0) {
        toast({
          title: "Sem substituições disponíveis",
          description: "Não encontramos ingredientes similares no pool para substituir este item.",
          variant: "default"
        });
      }

      return data?.substitutes || [];

    } catch (error: any) {
      console.error('❌ Error fetching substitutes:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        context: error.context
      });
      
      toast({
        title: "Erro ao buscar substituições",
        description: error.message || error.statusText || "Edge Function retornou erro. Verifique os logs do console.",
        variant: "destructive"
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const applySubstitute = async (
    mealPlanItemId: string,
    componentIndex: number,
    substitute: IngredientSubstitute
  ) => {
    try {
      // Buscar o item atual do meal plan
      const { data: currentItem, error: fetchError } = await supabase
        .from('meal_plan_items')
        .select('recipe_ingredients, recipe_calories, recipe_protein, recipe_carbs, recipe_fat')
        .eq('id', mealPlanItemId)
        .single();

      if (fetchError) throw fetchError;

      // Clonar ingredientes e substituir
      const ingredients = Array.isArray(currentItem.recipe_ingredients) 
        ? currentItem.recipe_ingredients 
        : [];
      const updatedIngredients = [...ingredients];
      updatedIngredients[componentIndex] = {
        id: substitute.id,
        item: substitute.name,
        quantity: substitute.suggestedGrams.toString(),
        unit: 'g',
        calories: substitute.calories,
        protein: substitute.protein,
        carbs: substitute.carbs,
        fat: substitute.fat
      };

      // Recalcular totais
      const newTotals = updatedIngredients.reduce(
        (acc, ing: any) => ({
          calories: acc.calories + (ing.calories || 0),
          protein: acc.protein + (ing.protein || 0),
          carbs: acc.carbs + (ing.carbs || 0),
          fat: acc.fat + (ing.fat || 0)
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('meal_plan_items')
        .update({
          recipe_ingredients: updatedIngredients,
          recipe_calories: Math.round(newTotals.calories),
          recipe_protein: Math.round(newTotals.protein * 10) / 10,
          recipe_carbs: Math.round(newTotals.carbs * 10) / 10,
          recipe_fat: Math.round(newTotals.fat * 10) / 10
        })
        .eq('id', mealPlanItemId);

      if (updateError) throw updateError;

      toast({
        title: "Ingrediente substituído!",
        description: `${substitute.name} foi adicionado ao seu plano.`,
        variant: "default"
      });

      return true;

    } catch (error: any) {
      console.error('Error applying substitute:', error);
      toast({
        title: "Erro ao substituir ingrediente",
        description: error.message || "Não foi possível aplicar a substituição. Tente novamente.",
        variant: "destructive"
      });
      return false;
    }
  };

  return {
    substitutes,
    isLoading,
    originalCategory,
    fetchSubstitutes,
    applySubstitute
  };
}
