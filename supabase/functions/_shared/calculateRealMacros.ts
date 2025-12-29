// ============================================
// CÁLCULO HÍBRIDO DE MACROS - TABELA REAL + FALLBACK IA
// ============================================
// Este módulo calcula os macros reais baseados na tabela foods,
// com fallback para estimativas da IA quando o ingrediente não existe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface FoodItem {
  name: string;
  grams: number;
  // Estimativas da IA (fallback)
  estimated_calories?: number;
  estimated_protein?: number;
  estimated_carbs?: number;
  estimated_fat?: number;
}

export interface CalculatedFoodItem extends FoodItem {
  // Macros calculados
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  // Metadados
  source: 'database' | 'ai_estimate';
  food_id?: string;
  matched_name?: string;
}

export interface MealMacros {
  title: string;
  foods: CalculatedFoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  total_fiber: number;
  database_match_rate: number; // 0-100% de ingredientes encontrados
}

export interface MacroCalculationResult {
  meals: MealMacros[];
  overall_match_rate: number;
  ingredients_from_database: number;
  ingredients_from_ai: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REAL-MACROS] ${step}${detailsStr}`);
};

/**
 * Normaliza texto para busca (remove acentos, lowercase)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrai nome base do alimento (remove detalhes como "grelhado", "cozido", etc.)
 */
function extractBaseName(ingredientName: string): string[] {
  const normalized = normalizeText(ingredientName);
  
  // Remover preparações comuns
  const preparations = [
    'grelhado', 'grelhada', 'cozido', 'cozida', 'frito', 'frita',
    'assado', 'assada', 'refogado', 'refogada', 'cru', 'crua',
    'natural', 'integral', 'desnatado', 'desnatada', 'light',
    'sem pele', 'com pele', 'picado', 'picada', 'ralado', 'ralada',
    'em cubos', 'em fatias', 'em tiras', 'temperado', 'temperada',
    'grilled', 'baked', 'fried', 'boiled', 'steamed', 'raw', 'cooked',
    'hervido', 'asado', 'frito', 'cocido', 'crudo',
  ];
  
  let cleaned = normalized;
  for (const prep of preparations) {
    cleaned = cleaned.replace(new RegExp(`\\b${prep}\\b`, 'gi'), '').trim();
  }
  
  // Remover artigos e preposições
  cleaned = cleaned
    .replace(/\b(de|do|da|dos|das|com|sem|e|a|o|um|uma|the|with|without|and)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Retornar variações para busca
  const variations = [normalized, cleaned];
  
  // Adicionar primeira palavra como variação
  const firstWord = cleaned.split(' ')[0];
  if (firstWord && firstWord.length >= 3) {
    variations.push(firstWord);
  }
  
  return [...new Set(variations)].filter(v => v.length >= 2);
}

/**
 * Busca o alimento na tabela foods
 */
async function findFoodInDatabase(
  supabase: any,
  ingredientName: string
): Promise<{ food: any; matchType: string } | null> {
  const searchTerms = extractBaseName(ingredientName);
  
  logStep('Searching for ingredient', { ingredientName, searchTerms });
  
  for (const term of searchTerms) {
    // Busca exata primeiro
    const { data: exactMatch } = await supabase
      .from('foods')
      .select('*')
      .eq('name_normalized', term)
      .eq('is_recipe', false)
      .limit(1)
      .maybeSingle();
    
    if (exactMatch) {
      logStep('Exact match found', { term, name: exactMatch.name });
      return { food: exactMatch, matchType: 'exact' };
    }
    
    // Busca parcial
    const { data: partialMatches } = await supabase
      .from('foods')
      .select('*')
      .eq('is_recipe', false)
      .or(`name_normalized.ilike.%${term}%,name.ilike.%${term}%`)
      .limit(5);
    
    if (partialMatches && partialMatches.length > 0) {
      // Priorizar por fonte verificada
      const verified = partialMatches.find((f: any) => f.is_verified);
      const selected = verified || partialMatches[0];
      logStep('Partial match found', { term, name: selected.name, source: selected.source });
      return { food: selected, matchType: 'partial' };
    }
  }
  
  // Busca em aliases
  const { data: aliasResults } = await supabase
    .from('ingredient_aliases')
    .select('food_id, alias, foods!inner(*)')
    .or(searchTerms.map(t => `alias.ilike.%${t}%`).join(','))
    .limit(3);
  
  if (aliasResults && aliasResults.length > 0) {
    const food = aliasResults[0].foods;
    if (food && !food.is_recipe) {
      logStep('Alias match found', { alias: aliasResults[0].alias, name: food.name });
      return { food, matchType: 'alias' };
    }
  }
  
  logStep('No match found', { ingredientName });
  return null;
}

/**
 * Calcula macros de um ingrediente baseado na gramagem
 */
function calculateMacrosForGrams(food: any, grams: number): Omit<CalculatedFoodItem, 'name' | 'grams' | 'estimated_calories' | 'estimated_protein' | 'estimated_carbs' | 'estimated_fat'> {
  const factor = grams / 100;
  
  return {
    calories: Math.round(food.calories_per_100g * factor),
    protein: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat: Math.round(food.fat_per_100g * factor * 10) / 10,
    fiber: Math.round((food.fiber_per_100g || 0) * factor * 10) / 10,
    source: 'database',
    food_id: food.id,
    matched_name: food.name,
  };
}

/**
 * Estima macros quando não encontra na tabela (fallback para valores da IA)
 */
function estimateMacrosFromAI(item: FoodItem): Omit<CalculatedFoodItem, 'name' | 'grams' | 'estimated_calories' | 'estimated_protein' | 'estimated_carbs' | 'estimated_fat'> {
  // Se a IA passou estimativas, usa elas
  if (item.estimated_calories !== undefined) {
    return {
      calories: item.estimated_calories,
      protein: item.estimated_protein || 0,
      carbs: item.estimated_carbs || 0,
      fat: item.estimated_fat || 0,
      fiber: 0,
      source: 'ai_estimate',
    };
  }
  
  // Fallback genérico baseado em tipo de alimento (último recurso)
  const name = item.name.toLowerCase();
  const grams = item.grams;
  const factor = grams / 100;
  
  // Estimativas genéricas por categoria
  if (name.includes('frango') || name.includes('chicken') || name.includes('pollo')) {
    return { calories: Math.round(165 * factor), protein: Math.round(31 * factor * 10) / 10, carbs: 0, fat: Math.round(3.6 * factor * 10) / 10, fiber: 0, source: 'ai_estimate' };
  }
  if (name.includes('carne') || name.includes('beef') || name.includes('bife') || name.includes('steak')) {
    return { calories: Math.round(250 * factor), protein: Math.round(26 * factor * 10) / 10, carbs: 0, fat: Math.round(15 * factor * 10) / 10, fiber: 0, source: 'ai_estimate' };
  }
  if (name.includes('peixe') || name.includes('fish') || name.includes('pescado') || name.includes('salmão') || name.includes('tilapia')) {
    return { calories: Math.round(140 * factor), protein: Math.round(25 * factor * 10) / 10, carbs: 0, fat: Math.round(4 * factor * 10) / 10, fiber: 0, source: 'ai_estimate' };
  }
  if (name.includes('ovo') || name.includes('egg') || name.includes('huevo')) {
    return { calories: Math.round(155 * factor), protein: Math.round(13 * factor * 10) / 10, carbs: Math.round(1.1 * factor * 10) / 10, fat: Math.round(11 * factor * 10) / 10, fiber: 0, source: 'ai_estimate' };
  }
  if (name.includes('arroz') || name.includes('rice') || name.includes('arroz')) {
    return { calories: Math.round(130 * factor), protein: Math.round(2.7 * factor * 10) / 10, carbs: Math.round(28 * factor * 10) / 10, fat: Math.round(0.3 * factor * 10) / 10, fiber: Math.round(0.4 * factor * 10) / 10, source: 'ai_estimate' };
  }
  if (name.includes('feijão') || name.includes('beans') || name.includes('frijoles')) {
    return { calories: Math.round(127 * factor), protein: Math.round(8.7 * factor * 10) / 10, carbs: Math.round(22 * factor * 10) / 10, fat: Math.round(0.5 * factor * 10) / 10, fiber: Math.round(7.5 * factor * 10) / 10, source: 'ai_estimate' };
  }
  if (name.includes('pão') || name.includes('bread') || name.includes('pan')) {
    return { calories: Math.round(265 * factor), protein: Math.round(9 * factor * 10) / 10, carbs: Math.round(49 * factor * 10) / 10, fat: Math.round(3 * factor * 10) / 10, fiber: Math.round(2.7 * factor * 10) / 10, source: 'ai_estimate' };
  }
  if (name.includes('batata') || name.includes('potato') || name.includes('papa')) {
    return { calories: Math.round(77 * factor), protein: Math.round(2 * factor * 10) / 10, carbs: Math.round(17 * factor * 10) / 10, fat: Math.round(0.1 * factor * 10) / 10, fiber: Math.round(2.2 * factor * 10) / 10, source: 'ai_estimate' };
  }
  if (name.includes('salada') || name.includes('salad') || name.includes('ensalada') || name.includes('alface') || name.includes('lettuce')) {
    return { calories: Math.round(15 * factor), protein: Math.round(1.5 * factor * 10) / 10, carbs: Math.round(2 * factor * 10) / 10, fat: Math.round(0.2 * factor * 10) / 10, fiber: Math.round(1.5 * factor * 10) / 10, source: 'ai_estimate' };
  }
  if (name.includes('fruta') || name.includes('fruit') || name.includes('banana') || name.includes('maçã') || name.includes('apple')) {
    return { calories: Math.round(60 * factor), protein: Math.round(0.8 * factor * 10) / 10, carbs: Math.round(15 * factor * 10) / 10, fat: Math.round(0.2 * factor * 10) / 10, fiber: Math.round(2 * factor * 10) / 10, source: 'ai_estimate' };
  }
  if (name.includes('iogurte') || name.includes('yogurt') || name.includes('yogur')) {
    return { calories: Math.round(60 * factor), protein: Math.round(10 * factor * 10) / 10, carbs: Math.round(4 * factor * 10) / 10, fat: Math.round(0.5 * factor * 10) / 10, fiber: 0, source: 'ai_estimate' };
  }
  if (name.includes('leite') || name.includes('milk') || name.includes('leche')) {
    return { calories: Math.round(42 * factor), protein: Math.round(3.4 * factor * 10) / 10, carbs: Math.round(5 * factor * 10) / 10, fat: Math.round(1 * factor * 10) / 10, fiber: 0, source: 'ai_estimate' };
  }
  if (name.includes('café') || name.includes('coffee') || name.includes('cafe')) {
    return { calories: Math.round(2 * factor), protein: Math.round(0.3 * factor * 10) / 10, carbs: 0, fat: 0, fiber: 0, source: 'ai_estimate' };
  }
  if (name.includes('tapioca')) {
    return { calories: Math.round(130 * factor), protein: Math.round(0.2 * factor * 10) / 10, carbs: Math.round(31 * factor * 10) / 10, fat: Math.round(0 * factor * 10) / 10, fiber: 0, source: 'ai_estimate' };
  }
  
  // Fallback genérico
  return { calories: Math.round(100 * factor), protein: Math.round(5 * factor * 10) / 10, carbs: Math.round(15 * factor * 10) / 10, fat: Math.round(3 * factor * 10) / 10, fiber: Math.round(1 * factor * 10) / 10, source: 'ai_estimate' };
}

/**
 * Processa um array de ingredientes e calcula macros reais
 */
export async function calculateRealMacrosForFoods(
  supabase: any,
  foods: FoodItem[]
): Promise<{ items: CalculatedFoodItem[]; matchRate: number; fromDb: number; fromAi: number }> {
  const calculatedItems: CalculatedFoodItem[] = [];
  let fromDatabase = 0;
  let fromAI = 0;
  
  for (const item of foods) {
    const match = await findFoodInDatabase(supabase, item.name);
    
    if (match) {
      const macros = calculateMacrosForGrams(match.food, item.grams);
      calculatedItems.push({
        name: item.name,
        grams: item.grams,
        ...macros,
      });
      fromDatabase++;
    } else {
      const estimated = estimateMacrosFromAI(item);
      calculatedItems.push({
        name: item.name,
        grams: item.grams,
        ...estimated,
      });
      fromAI++;
    }
  }
  
  const matchRate = foods.length > 0 ? Math.round((fromDatabase / foods.length) * 100) : 0;
  
  return {
    items: calculatedItems,
    matchRate,
    fromDb: fromDatabase,
    fromAi: fromAI,
  };
}

/**
 * Calcula macros reais para uma refeição completa
 */
export async function calculateMealMacros(
  supabase: any,
  title: string,
  foods: FoodItem[]
): Promise<MealMacros> {
  const { items, matchRate } = await calculateRealMacrosForFoods(supabase, foods);
  
  const totals = items.reduce(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
      fiber: acc.fiber + item.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
  
  return {
    title,
    foods: items,
    total_calories: Math.round(totals.calories),
    total_protein: Math.round(totals.protein * 10) / 10,
    total_carbs: Math.round(totals.carbs * 10) / 10,
    total_fat: Math.round(totals.fat * 10) / 10,
    total_fiber: Math.round(totals.fiber * 10) / 10,
    database_match_rate: matchRate,
  };
}

/**
 * Processa um dia completo de refeições e recalcula todos os macros
 */
export async function processFullDayMacros(
  supabase: any,
  meals: Array<{ title: string; foods: FoodItem[] }>
): Promise<MacroCalculationResult> {
  const processedMeals: MealMacros[] = [];
  let totalFromDb = 0;
  let totalFromAi = 0;
  
  for (const meal of meals) {
    const { items, fromDb, fromAi } = await calculateRealMacrosForFoods(supabase, meal.foods);
    
    totalFromDb += fromDb;
    totalFromAi += fromAi;
    
    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
        fiber: acc.fiber + item.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );
    
    const matchRate = meal.foods.length > 0 ? Math.round((fromDb / meal.foods.length) * 100) : 0;
    
    processedMeals.push({
      title: meal.title,
      foods: items,
      total_calories: Math.round(totals.calories),
      total_protein: Math.round(totals.protein * 10) / 10,
      total_carbs: Math.round(totals.carbs * 10) / 10,
      total_fat: Math.round(totals.fat * 10) / 10,
      total_fiber: Math.round(totals.fiber * 10) / 10,
      database_match_rate: matchRate,
    });
  }
  
  const totalIngredients = totalFromDb + totalFromAi;
  const overallMatchRate = totalIngredients > 0 ? Math.round((totalFromDb / totalIngredients) * 100) : 0;
  
  logStep('Day processing complete', {
    meals: processedMeals.length,
    overallMatchRate,
    fromDatabase: totalFromDb,
    fromAI: totalFromAi,
  });
  
  return {
    meals: processedMeals,
    overall_match_rate: overallMatchRate,
    ingredients_from_database: totalFromDb,
    ingredients_from_ai: totalFromAi,
  };
}
