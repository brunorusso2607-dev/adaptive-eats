/**
 * FALLBACK MEALS
 * 
 * Refeições de emergência que SEMPRE funcionam
 * Usadas quando todos os outros métodos falham
 */

import { UnifiedMeal, UnifiedComponent, MealType, UserContext } from './types.ts';

// ============= REFEIÇÕES BÁSICAS PRÉ-DEFINIDAS =============
const EMERGENCY_MEALS: Record<MealType, UnifiedMeal> = {
  breakfast: {
    name: 'Café da Manhã Básico',
    meal_type: 'breakfast',
    components: [
      createBasicComponent('french_bread', 'Pão francês', 50, 'carb'),
      createBasicComponent('boiled_eggs', 'Ovo cozido', 50, 'protein'),
      createBasicComponent('black_coffee', 'Café preto', 150, 'beverage'),
    ],
    totals: { calories: 280, protein: 12, carbs: 35, fat: 8, fiber: 2 },
    meta: {
      country: 'BR',
      density: 'moderate',
      prep_time_minutes: 10,
      blocked_for_intolerances: ['gluten', 'egg'],
      dietary_tags: [],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  morning_snack: {
    name: 'Lanche da Manhã Básico',
    meal_type: 'morning_snack',
    components: [
      createBasicComponent('banana', 'Banana', 100, 'fruit'),
    ],
    totals: { calories: 89, protein: 1, carbs: 23, fat: 0, fiber: 3 },
    meta: {
      country: 'BR',
      density: 'light',
      prep_time_minutes: 1,
      blocked_for_intolerances: [],
      dietary_tags: ['vegan'],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  lunch: {
    name: 'Almoço Básico',
    meal_type: 'lunch',
    components: [
      createBasicComponent('grilled_chicken_breast', 'Peito de frango grelhado', 120, 'protein'),
      createBasicComponent('white_rice', 'Arroz branco', 100, 'rice'),
      createBasicComponent('beans', 'Feijão', 100, 'beans'),
      createBasicComponent('iceberg_lettuce', 'Salada verde', 50, 'vegetable'),
    ],
    totals: { calories: 450, protein: 42, carbs: 52, fat: 6, fiber: 12 },
    meta: {
      country: 'BR',
      density: 'moderate',
      prep_time_minutes: 20,
      blocked_for_intolerances: [],
      dietary_tags: [],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  afternoon_snack: {
    name: 'Lanche da Tarde Básico',
    meal_type: 'afternoon_snack',
    components: [
      createBasicComponent('apple', 'Maçã', 150, 'fruit'),
      createBasicComponent('brazil_nuts', 'Castanha do Pará', 20, 'fat'),
    ],
    totals: { calories: 210, protein: 3, carbs: 28, fat: 12, fiber: 4 },
    meta: {
      country: 'BR',
      density: 'light',
      prep_time_minutes: 1,
      blocked_for_intolerances: ['nuts'],
      dietary_tags: ['vegan'],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  dinner: {
    name: 'Jantar Básico',
    meal_type: 'dinner',
    components: [
      createBasicComponent('grilled_tilapia', 'Tilápia grelhada', 150, 'protein'),
      createBasicComponent('boiled_sweet_potato', 'Batata doce cozida', 150, 'carb'),
      createBasicComponent('steamed_broccoli', 'Brócolis no vapor', 80, 'vegetable'),
    ],
    totals: { calories: 320, protein: 35, carbs: 32, fat: 4, fiber: 6 },
    meta: {
      country: 'BR',
      density: 'moderate',
      prep_time_minutes: 25,
      blocked_for_intolerances: ['fish'],
      dietary_tags: [],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
  
  supper: {
    name: 'Ceia Básica',
    meal_type: 'supper',
    components: [
      createBasicComponent('natural_yogurt', 'Iogurte natural', 150, 'dairy'),
    ],
    totals: { calories: 90, protein: 5, carbs: 7, fat: 5, fiber: 0 },
    meta: {
      country: 'BR',
      density: 'light',
      prep_time_minutes: 1,
      blocked_for_intolerances: ['lactose'],
      dietary_tags: ['vegetarian'],
      confidence: 'high',
    },
    source: { type: 'fallback', reason: 'Emergency fallback' },
  },
};

// ============= FUNÇÃO PRINCIPAL =============
export function getEmergencyFallback(
  mealType: MealType,
  userContext: UserContext,
): UnifiedMeal {
  // Retornar fallback padrão
  return {
    ...EMERGENCY_MEALS[mealType],
    source: { type: 'fallback', reason: 'Emergency fallback' },
  };
}

// ============= HELPER =============
function createBasicComponent(
  key: string,
  namePt: string,
  grams: number,
  type: string,
): UnifiedComponent {
  return {
    ingredient_key: key,
    name_pt: namePt,
    name_en: key.replace(/_/g, ' '),
    type: type as any,
    category: 'other',
    portion_grams: grams,
    portion_display: {
      quantity: grams,
      unit: 'g',
      label: `${namePt} (${grams}g)`,
    },
    macros: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    safety: { contains: [], blocked_for: [], is_safe_for_all: true },
  };
}
