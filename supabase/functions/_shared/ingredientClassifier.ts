// Classificador de ingredientes por categoria nutricional
// Usado para sugerir substituições inteligentes

export type IngredientCategory = 
  | 'protein'
  | 'carbohydrate'
  | 'vegetable'
  | 'fruit'
  | 'fat'
  | 'dairy'
  | 'grain'
  | 'legume'
  | 'beverage'
  | 'condiment'
  | 'other';

export interface NutritionalProfile {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export interface IngredientSubstitute {
  id: string;
  name: string;
  category: IngredientCategory;
  suggestedGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  caloriesDiff: number; // % de diferença
  proteinDiff: number;
  matchScore: number; // 0-100
}

/**
 * Classifica um ingrediente em categoria nutricional baseado em seus macros
 */
export function classifyIngredient(
  name: string,
  macros: NutritionalProfile
): IngredientCategory {
  const { protein, carbs, fat } = macros;
  const totalMacros = protein + carbs + fat;
  
  if (totalMacros === 0) return 'other';
  
  const proteinPercent = (protein * 4 / (totalMacros * 4)) * 100;
  const carbsPercent = (carbs * 4 / (totalMacros * 4)) * 100;
  const fatPercent = (fat * 9 / (totalMacros * 4)) * 100;
  
  const nameLower = name.toLowerCase();
  
  // Classificação por nome (mais específico)
  if (nameLower.includes('leite') || nameLower.includes('iogurte') || 
      nameLower.includes('queijo') || nameLower.includes('requeijão')) {
    return 'dairy';
  }
  
  if (nameLower.includes('feijão') || nameLower.includes('lentilha') || 
      nameLower.includes('grão') || nameLower.includes('ervilha')) {
    return 'legume';
  }
  
  if (nameLower.includes('arroz') || nameLower.includes('macarrão') || 
      nameLower.includes('pão') || nameLower.includes('aveia') ||
      nameLower.includes('granola') || nameLower.includes('cereal')) {
    return 'grain';
  }
  
  if (nameLower.includes('azeite') || nameLower.includes('óleo') || 
      nameLower.includes('manteiga') || nameLower.includes('margarina') ||
      nameLower.includes('abacate')) {
    return 'fat';
  }
  
  if (nameLower.includes('suco') || nameLower.includes('café') || 
      nameLower.includes('chá') || nameLower.includes('água')) {
    return 'beverage';
  }
  
  if (nameLower.includes('sal') || nameLower.includes('pimenta') || 
      nameLower.includes('molho') || nameLower.includes('tempero')) {
    return 'condiment';
  }
  
  // Classificação por macros (proteína > 40%)
  if (proteinPercent > 40) {
    return 'protein';
  }
  
  // Carboidrato > 50% e baixa gordura
  if (carbsPercent > 50 && fatPercent < 20) {
    // Verificar se é vegetal ou fruta
    if (nameLower.includes('batata') || nameLower.includes('mandioca') ||
        nameLower.includes('inhame') || nameLower.includes('cará')) {
      return 'carbohydrate';
    }
    
    if (nameLower.includes('banana') || nameLower.includes('maçã') || 
        nameLower.includes('laranja') || nameLower.includes('morango') ||
        nameLower.includes('uva') || nameLower.includes('melancia')) {
      return 'fruit';
    }
    
    // Vegetais geralmente têm baixas calorias
    if (macros.calories < 50) {
      return 'vegetable';
    }
    
    return 'carbohydrate';
  }
  
  // Gordura > 50%
  if (fatPercent > 50) {
    return 'fat';
  }
  
  // Vegetais (baixas calorias, alto carboidrato relativo mas baixo absoluto)
  if (macros.calories < 50 && carbs > protein) {
    return 'vegetable';
  }
  
  return 'other';
}

/**
 * Calcula score de compatibilidade entre dois ingredientes
 * Score de 0-100, onde 100 é substituição perfeita
 */
export function calculateMatchScore(
  original: NutritionalProfile,
  substitute: NutritionalProfile,
  category: IngredientCategory
): number {
  let score = 100;
  
  // Penalizar diferença de calorias (peso 40%)
  const caloriesDiff = Math.abs(original.calories - substitute.calories) / original.calories;
  score -= caloriesDiff * 40;
  
  // Para proteínas, penalizar diferença de proteína (peso 30%)
  if (category === 'protein') {
    const proteinDiff = Math.abs(original.protein - substitute.protein) / Math.max(original.protein, 1);
    score -= proteinDiff * 30;
  }
  
  // Para carboidratos, penalizar diferença de carbs (peso 30%)
  if (category === 'carbohydrate' || category === 'grain') {
    const carbsDiff = Math.abs(original.carbs - substitute.carbs) / Math.max(original.carbs, 1);
    score -= carbsDiff * 30;
  }
  
  // Para gorduras, penalizar diferença de gordura (peso 30%)
  if (category === 'fat') {
    const fatDiff = Math.abs(original.fat - substitute.fat) / Math.max(original.fat, 1);
    score -= fatDiff * 30;
  }
  
  // Penalizar diferença geral de macros (peso 30%)
  const totalOriginal = original.protein + original.carbs + original.fat;
  const totalSubstitute = substitute.protein + substitute.carbs + substitute.fat;
  const macrosDiff = Math.abs(totalOriginal - totalSubstitute) / Math.max(totalOriginal, 1);
  score -= macrosDiff * 30;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Ajusta a porção do substituto para igualar calorias do original
 */
export function calculateEquivalentPortion(
  originalGrams: number,
  originalCaloriesPer100g: number,
  substituteCaloriesPer100g: number
): number {
  const originalTotalCalories = (originalGrams / 100) * originalCaloriesPer100g;
  const equivalentGrams = (originalTotalCalories / substituteCaloriesPer100g) * 100;
  
  // Arredondar para múltiplos de 5g
  return Math.round(equivalentGrams / 5) * 5;
}

/**
 * Filtra ingredientes por restrições do usuário
 */
export function filterByRestrictions(
  ingredients: any[],
  intolerances: string[],
  dietaryPreference: string,
  excludedIngredients: string[]
): any[] {
  return ingredients.filter(ingredient => {
    // Excluir ingredientes manualmente excluídos
    if (excludedIngredients.includes(ingredient.id)) {
      return false;
    }
    
    // Filtrar por intolerâncias
    if (intolerances && intolerances.length > 0) {
      const allergens = ingredient.allergens_static || [];
      const dynamicAllergens = ingredient.allergens_dynamic || [];
      const allAllergens = [...allergens, ...dynamicAllergens];
      
      for (const intolerance of intolerances) {
        if (allAllergens.includes(intolerance)) {
          return false;
        }
      }
    }
    
    // Filtrar por preferência dietária
    if (dietaryPreference === 'vegetarian') {
      const category = ingredient.category?.toLowerCase() || '';
      if (category.includes('meat') || category.includes('fish') || category.includes('seafood')) {
        return false;
      }
    }
    
    if (dietaryPreference === 'vegan') {
      const category = ingredient.category?.toLowerCase() || '';
      if (category.includes('meat') || category.includes('fish') || 
          category.includes('seafood') || category.includes('dairy') ||
          category.includes('egg')) {
        return false;
      }
    }
    
    return true;
  });
}

