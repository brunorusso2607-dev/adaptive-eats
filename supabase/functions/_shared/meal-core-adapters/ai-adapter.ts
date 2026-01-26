/**
 * AI ADAPTER
 * 
 * Converte output da IA (Gemini) para o formato do Core Unificado
 * Garante que qualquer output da IA passa pelo mesmo processamento
 */

import { 
  processRawMeal, 
  RawComponent, 
  ProcessingResult,
  UserContext,
  MealType,
} from '../unified-meal-core/index.ts';

export interface AIGeneratedMeal {
  title: string;
  foods: Array<{
    name: string;
    grams: number;
    calories?: number;
  }>;
  instructions?: string[];
  calories_kcal?: number;
}

/**
 * Processa uma refeição gerada pela IA através do Core Unificado
 */
export async function processAIMeal(
  aiMeal: AIGeneratedMeal,
  mealType: MealType,
  userContext: UserContext,
  promptVersion: string = 'v5',
): Promise<ProcessingResult> {
  // Converter foods da IA para RawComponents
  const rawComponents: RawComponent[] = aiMeal.foods.map(food => ({
    name: food.name,
    grams: food.grams,
    kcal: food.calories,
  }));
  
  // Processar através do Core
  return processRawMeal(
    rawComponents,
    mealType,
    aiMeal.title,
    userContext,
    { type: 'ai', model: 'gemini-1.5-flash', prompt_version: promptVersion },
  );
}
