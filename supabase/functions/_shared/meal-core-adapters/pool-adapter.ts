/**
 * POOL ADAPTER
 * 
 * Converte refeições do pool (banco de dados) para o formato do Core Unificado
 */

import { 
  processRawMeal, 
  RawComponent, 
  ProcessingResult,
  UserContext,
  MealType,
} from '../unified-meal-core/index.ts';

export interface PoolMeal {
  id: string;
  name: string;
  meal_type: string;
  components: Array<{
    type: string;
    name: string;
    name_en: string;
    portion_grams?: number;
    portion_ml?: number;
    canonical_id?: string;
  }>;
  total_calories: number;
}

/**
 * Processa uma refeição do pool através do Core Unificado
 */
export async function processPoolMeal(
  poolMeal: PoolMeal,
  userContext: UserContext,
): Promise<ProcessingResult> {
  // Converter components para RawComponents
  const rawComponents: RawComponent[] = poolMeal.components.map(comp => ({
    name: comp.name,
    name_en: comp.name_en,
    grams: comp.portion_grams || comp.portion_ml || 100,
    ingredient_key: comp.canonical_id,
    type: comp.type,
  }));
  
  // Normalizar meal_type
  const mealType = normalizeMealType(poolMeal.meal_type) as MealType;
  
  // Processar através do Core
  return processRawMeal(
    rawComponents,
    mealType,
    poolMeal.name,
    userContext,
    { type: 'pool', meal_id: poolMeal.id },
  );
}

function normalizeMealType(type: string): string {
  const mapping: Record<string, string> = {
    'cafe_da_manha': 'breakfast',
    'cafe_manha': 'breakfast',
    'lanche_manha': 'morning_snack',
    'almoco': 'lunch',
    'lanche_tarde': 'afternoon_snack',
    'jantar': 'dinner',
    'ceia': 'supper',
  };
  return mapping[type.toLowerCase()] || type;
}
