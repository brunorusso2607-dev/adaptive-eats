// Busca substitutos por categoria usando lookup-ingredient Edge Function
import { supabase } from '@/integrations/supabase/client';

export interface CategorySubstitute {
  id: string;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  source: string;
  suggestedGrams?: number;
  caloriesDiff?: number;
}

/**
 * Busca substitutos da mesma categoria usando a Edge Function lookup-ingredient
 * que tem acesso ao UNIVERSAL_INGREDIENTS
 */
export async function findCategorySubstitutes(
  originalIngredientName: string,
  originalCalories: number,
  calorieTolerancePercent: number = 30,
  maxResults: number = 10,
  country: string = 'BR'
): Promise<CategorySubstitute[]> {
  try {
    console.log(`🔍 Finding category substitutes for: ${originalIngredientName} (${originalCalories} kcal)`);
    
    // Chamar Edge Function com parâmetro especial para busca por categoria
    const { data, error } = await supabase.functions.invoke('lookup-ingredient', {
      body: { 
        query: originalIngredientName,
        searchByCategory: true, // Flag para buscar por categoria
        originalCalories,
        calorieTolerancePercent,
        limit: maxResults,
        country
      }
    });

    if (error) {
      console.error('Error fetching category substitutes:', error);
      return [];
    }

    if (!data?.results || data.results.length === 0) {
      console.warn(`No category substitutes found for: ${originalIngredientName}`);
      return [];
    }

    // Mapear resultados para CategorySubstitute
    const substitutes: CategorySubstitute[] = data.results.map((item: any) => {
      const suggestedGrams = Math.round((originalCalories / item.calories_per_100g) * 100);
      const caloriesDiff = ((item.calories_per_100g - originalCalories) / originalCalories) * 100;
      
      return {
        id: item.id,
        name: item.name,
        category: item.category || 'other',
        calories_per_100g: item.calories_per_100g,
        protein_per_100g: item.protein_per_100g,
        carbs_per_100g: item.carbs_per_100g,
        fat_per_100g: item.fat_per_100g,
        fiber_per_100g: item.fiber_per_100g || 0,
        source: item.source || 'Local',
        suggestedGrams,
        caloriesDiff: Math.round(caloriesDiff)
      };
    });

    console.log(`✅ Found ${substitutes.length} category substitutes`);
    return substitutes;

  } catch (error) {
    console.error('Error in findCategorySubstitutes:', error);
    return [];
  }
}

/**
 * Mapeia categoria para label em português
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    'protein_animal': 'Proteína Animal',
    'protein_plant': 'Proteína Vegetal',
    'carb': 'Carboidrato',
    'vegetable': 'Vegetal',
    'fruit': 'Fruta',
    'fat': 'Gordura',
    'dairy': 'Laticínio',
    'grain': 'Grão',
    'legume': 'Leguminosa',
    'beverage': 'Bebida',
    'condiment': 'Condimento',
    'other': 'Outro'
  };
  
  return labels[category] || category;
}
