/**
 * MACRO CALCULATOR
 * 
 * Cálculo centralizado de macros
 * Fonte única de verdade para todos os módulos
 */

import { ComponentMacros } from './types.ts';
import { INGREDIENTS } from '../meal-ingredients-db.ts';

// ============= FUNÇÃO PRINCIPAL =============
/**
 * Calcula macros de um ingrediente baseado em gramas
 * Usa meal-ingredients-db.ts como fonte de verdade
 */
export async function calculateMacros(
  ingredientKey: string,
  grams: number,
  rawData?: {
    kcal?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
  }
): Promise<ComponentMacros> {
  // Tentar buscar do INGREDIENTS primeiro
  const ingredient = INGREDIENTS[ingredientKey];
  
  if (ingredient) {
    const factor = grams / 100;
    return {
      kcal: Math.round(ingredient.kcal * factor),
      protein: Math.round(ingredient.prot * factor * 10) / 10,
      carbs: Math.round(ingredient.carbs * factor * 10) / 10,
      fat: Math.round(ingredient.fat * factor * 10) / 10,
      fiber: Math.round(ingredient.fiber * factor * 10) / 10,
    };
  }
  
  // Fallback: usar dados fornecidos (se disponíveis)
  if (rawData && rawData.kcal !== undefined) {
    return {
      kcal: Math.round(rawData.kcal),
      protein: Math.round((rawData.protein || 0) * 10) / 10,
      carbs: Math.round((rawData.carbs || 0) * 10) / 10,
      fat: Math.round((rawData.fat || 0) * 10) / 10,
      fiber: Math.round((rawData.fiber || 0) * 10) / 10,
    };
  }
  
  // Fallback final: estimativa conservadora
  console.warn(`[MACRO-CALCULATOR] Ingrediente não encontrado: ${ingredientKey}, usando estimativa`);
  return {
    kcal: Math.round(grams * 1.5), // ~150 kcal por 100g (conservador)
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };
}
