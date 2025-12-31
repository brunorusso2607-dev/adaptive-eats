// ============================================
// CÁLCULO HÍBRIDO DE MACROS - TABELA REAL + FALLBACK IA
// ============================================
// Este módulo calcula os macros reais baseados na tabela foods,
// com busca em cascata (país → global → fallback → IA) e sanity checks.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { applySanityCheck, getCategoryFallback, detectFoodCategory } from "./sanityCheckLimits.ts";

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
  source: 'database' | 'database_global' | 'category_fallback' | 'ai_estimate';
  confidence: number; // 0-100
  food_id?: string;
  matched_name?: string;
  sanity_adjusted?: boolean;
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

// Mapeamento de país para fontes prioritárias
const COUNTRY_SOURCE_PRIORITY: Record<string, string[]> = {
  'BR': ['TBCA', 'taco', 'curated'],
  'US': ['usda', 'curated'],
  'FR': ['CIQUAL', 'curated'],
  'UK': ['McCance', 'curated'],
  'MX': ['BAM', 'curated'],
  'ES': ['AESAN Spain', 'curated'],
  'DE': ['BLS Germany', 'curated'],
  'IT': ['CREA', 'curated'],
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
    'sem acucar', 'sugar free', 'sin azucar', 'zero', 'diet',
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
 * Busca o alimento na tabela foods com priorização por país
 */
async function findFoodInDatabase(
  supabase: any,
  ingredientName: string,
  userCountry?: string
): Promise<{ food: any; matchType: string; source: 'database' | 'database_global' } | null> {
  const searchTerms = extractBaseName(ingredientName);
  const prioritySources = userCountry ? COUNTRY_SOURCE_PRIORITY[userCountry] || [] : [];
  
  logStep('Searching for ingredient', { ingredientName, searchTerms, userCountry, prioritySources });
  
  // ========================================
  // FASE 1: Busca por fonte do país do usuário
  // ========================================
  if (prioritySources.length > 0) {
    for (const term of searchTerms) {
      // Busca exata com fonte prioritária
      const { data: exactMatch } = await supabase
        .from('foods')
        .select('*')
        .eq('name_normalized', term)
        .eq('is_recipe', false)
        .in('source', prioritySources)
        .limit(1)
        .maybeSingle();
      
      if (exactMatch) {
        logStep('Exact match found (country source)', { term, name: exactMatch.name, source: exactMatch.source });
        return { food: exactMatch, matchType: 'exact_country', source: 'database' };
      }
      
      // Busca parcial com fonte prioritária
      const { data: partialMatches } = await supabase
        .from('foods')
        .select('*')
        .eq('is_recipe', false)
        .in('source', prioritySources)
        .or(`name_normalized.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(5);
      
      if (partialMatches && partialMatches.length > 0) {
        const verified = partialMatches.find((f: any) => f.is_verified);
        const selected = verified || partialMatches[0];
        logStep('Partial match found (country source)', { term, name: selected.name, source: selected.source });
        return { food: selected, matchType: 'partial_country', source: 'database' };
      }
    }
  }
  
  // ========================================
  // FASE 2: Busca global (qualquer fonte)
  // ========================================
  for (const term of searchTerms) {
    // Busca exata global
    const { data: exactMatch } = await supabase
      .from('foods')
      .select('*')
      .eq('name_normalized', term)
      .eq('is_recipe', false)
      .limit(1)
      .maybeSingle();
    
    if (exactMatch) {
      logStep('Exact match found (global)', { term, name: exactMatch.name, source: exactMatch.source });
      return { food: exactMatch, matchType: 'exact_global', source: 'database_global' };
    }
    
    // Busca parcial global
    const { data: partialMatches } = await supabase
      .from('foods')
      .select('*')
      .eq('is_recipe', false)
      .or(`name_normalized.ilike.%${term}%,name.ilike.%${term}%`)
      .order('is_verified', { ascending: false })
      .order('search_count', { ascending: false })
      .limit(5);
    
    if (partialMatches && partialMatches.length > 0) {
      const selected = partialMatches[0];
      logStep('Partial match found (global)', { term, name: selected.name, source: selected.source });
      return { food: selected, matchType: 'partial_global', source: 'database_global' };
    }
  }
  
  // ========================================
  // FASE 3: Busca em aliases
  // ========================================
  const { data: aliasResults } = await supabase
    .from('ingredient_aliases')
    .select('food_id, alias, foods!inner(*)')
    .or(searchTerms.map(t => `alias.ilike.%${t}%`).join(','))
    .limit(3);
  
  if (aliasResults && aliasResults.length > 0) {
    const food = aliasResults[0].foods;
    if (food && !food.is_recipe) {
      logStep('Alias match found', { alias: aliasResults[0].alias, name: food.name });
      return { food, matchType: 'alias', source: 'database_global' };
    }
  }
  
  logStep('No match found in database', { ingredientName });
  return null;
}

/**
 * Calcula macros de um ingrediente baseado na gramagem
 */
function calculateMacrosForGrams(
  food: any, 
  grams: number,
  source: 'database' | 'database_global'
): Omit<CalculatedFoodItem, 'name' | 'grams' | 'estimated_calories' | 'estimated_protein' | 'estimated_carbs' | 'estimated_fat'> {
  const factor = grams / 100;
  
  return {
    calories: Math.round(food.calories_per_100g * factor),
    protein: Math.round(food.protein_per_100g * factor * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
    fat: Math.round(food.fat_per_100g * factor * 10) / 10,
    fiber: Math.round((food.fiber_per_100g || 0) * factor * 10) / 10,
    source,
    confidence: source === 'database' ? 100 : 95,
    food_id: food.id,
    matched_name: food.name,
  };
}

/**
 * Fallback por categoria quando não encontra na tabela
 */
function getCategoryFallbackMacros(item: FoodItem): Omit<CalculatedFoodItem, 'name' | 'grams' | 'estimated_calories' | 'estimated_protein' | 'estimated_carbs' | 'estimated_fat'> {
  const category = detectFoodCategory(item.name);
  const calories = getCategoryFallback(item.name, item.grams);
  
  // Estimativas de macros por categoria
  const categoryMacroRatios: Record<string, { proteinRatio: number; carbRatio: number; fatRatio: number }> = {
    'cha': { proteinRatio: 0, carbRatio: 0, fatRatio: 0 },
    'cafe': { proteinRatio: 0.1, carbRatio: 0, fatRatio: 0 },
    'agua': { proteinRatio: 0, carbRatio: 0, fatRatio: 0 },
    'leite_vegetal': { proteinRatio: 0.04, carbRatio: 0.12, fatRatio: 0.08 },
    'leite': { proteinRatio: 0.08, carbRatio: 0.12, fatRatio: 0.08 },
    'suco': { proteinRatio: 0.01, carbRatio: 0.25, fatRatio: 0 },
    'fruta': { proteinRatio: 0.02, carbRatio: 0.22, fatRatio: 0.005 },
    'vegetal': { proteinRatio: 0.03, carbRatio: 0.08, fatRatio: 0.005 },
    'folhoso': { proteinRatio: 0.02, carbRatio: 0.03, fatRatio: 0.003 },
    'carne': { proteinRatio: 0.26, carbRatio: 0, fatRatio: 0.15 },
    'frango': { proteinRatio: 0.31, carbRatio: 0, fatRatio: 0.04 },
    'peixe': { proteinRatio: 0.25, carbRatio: 0, fatRatio: 0.05 },
    'ovo': { proteinRatio: 0.13, carbRatio: 0.01, fatRatio: 0.11 },
    'queijo': { proteinRatio: 0.25, carbRatio: 0.02, fatRatio: 0.28 },
    'arroz': { proteinRatio: 0.027, carbRatio: 0.28, fatRatio: 0.003 },
    'pao': { proteinRatio: 0.09, carbRatio: 0.49, fatRatio: 0.03 },
    'iogurte': { proteinRatio: 0.10, carbRatio: 0.04, fatRatio: 0.005 },
    'gelatina': { proteinRatio: 0.02, carbRatio: 0.15, fatRatio: 0 },
    'gelatina_diet': { proteinRatio: 0.02, carbRatio: 0.01, fatRatio: 0 },
    'default': { proteinRatio: 0.05, carbRatio: 0.15, fatRatio: 0.03 },
  };
  
  const ratios = categoryMacroRatios[category] || categoryMacroRatios['default'];
  const factor = item.grams / 100;
  
  logStep('Using category fallback', { category, calories, grams: item.grams });
  
  return {
    calories,
    protein: Math.round(ratios.proteinRatio * 100 * factor * 10) / 10,
    carbs: Math.round(ratios.carbRatio * 100 * factor * 10) / 10,
    fat: Math.round(ratios.fatRatio * 100 * factor * 10) / 10,
    fiber: 0,
    source: 'category_fallback',
    confidence: 85,
  };
}

/**
 * Estima macros quando não encontra na tabela (último recurso - IA com sanity check)
 */
function estimateMacrosFromAI(item: FoodItem): Omit<CalculatedFoodItem, 'name' | 'grams' | 'estimated_calories' | 'estimated_protein' | 'estimated_carbs' | 'estimated_fat'> {
  // Se a IA não passou estimativas, usar fallback de categoria
  if (item.estimated_calories === undefined) {
    return getCategoryFallbackMacros(item);
  }
  
  // Aplicar sanity check nas estimativas da IA
  const sanityResult = applySanityCheck(item.name, item.estimated_calories, item.grams);
  
  if (sanityResult.wasAdjusted) {
    logStep('AI estimate rejected by sanity check', { 
      original: item.estimated_calories, 
      corrected: sanityResult.calories,
      reason: sanityResult.reason 
    });
    
    // Recalcular proteína/carbs/gordura proporcionalmente
    const ratio = sanityResult.calories / item.estimated_calories;
    
    return {
      calories: sanityResult.calories,
      protein: Math.round((item.estimated_protein || 0) * ratio * 10) / 10,
      carbs: Math.round((item.estimated_carbs || 0) * ratio * 10) / 10,
      fat: Math.round((item.estimated_fat || 0) * ratio * 10) / 10,
      fiber: 0,
      source: 'ai_estimate',
      confidence: 70, // Menor confiança porque foi ajustado
      sanity_adjusted: true,
    };
  }
  
  return {
    calories: item.estimated_calories,
    protein: item.estimated_protein || 0,
    carbs: item.estimated_carbs || 0,
    fat: item.estimated_fat || 0,
    fiber: 0,
    source: 'ai_estimate',
    confidence: 75,
  };
}

/**
 * OTIMIZAÇÃO: Busca em batch para reduzir queries ao banco
 * Carrega todos os alimentos de uma vez e faz matching local
 */
async function batchFindFoodsInDatabase(
  supabase: any,
  searchTerms: string[],
  prioritySources: string[]
): Promise<Map<string, { food: any; source: 'database' | 'database_global' }>> {
  const results = new Map<string, { food: any; source: 'database' | 'database_global' }>();
  
  if (searchTerms.length === 0) return results;
  
  // Criar termos normalizados únicos
  const uniqueTerms = [...new Set(searchTerms.map(t => normalizeText(t)))];
  const simplifiedTerms = uniqueTerms.map(t => {
    // Extrair apenas a palavra principal (primeira palavra significativa)
    const words = t.split(/\s+/).filter(w => w.length > 2);
    return words[0] || t;
  }).filter(t => t.length > 2);
  
  const allTermsSet = new Set([...uniqueTerms, ...simplifiedTerms]);
  const allTerms = [...allTermsSet];
  
  // Query única: buscar todos os alimentos que contenham qualquer termo
  const orConditions = allTerms.slice(0, 20).map(term => 
    `name_normalized.ilike.%${term}%`
  ).join(',');
  
  const { data: allFoods } = await supabase
    .from('foods')
    .select('*')
    .eq('is_recipe', false)
    .or(orConditions)
    .order('is_verified', { ascending: false })
    .order('search_count', { ascending: false })
    .limit(200);
  
  if (!allFoods || allFoods.length === 0) return results;
  
  // Fazer matching local
  for (const originalTerm of searchTerms) {
    const normalizedOriginal = normalizeText(originalTerm);
    
    // Tentar match exato primeiro
    let matched = allFoods.find((f: any) => f.name_normalized === normalizedOriginal);
    
    // Tentar match parcial
    if (!matched) {
      // Priorizar fontes do país
      matched = allFoods.find((f: any) => 
        prioritySources.includes(f.source) && 
        (f.name_normalized.includes(normalizedOriginal) || normalizedOriginal.includes(f.name_normalized))
      );
    }
    
    // Qualquer match parcial
    if (!matched) {
      const words = normalizedOriginal.split(/\s+/).filter(w => w.length > 2);
      matched = allFoods.find((f: any) => 
        words.some(word => f.name_normalized.includes(word))
      );
    }
    
    if (matched) {
      const source = prioritySources.includes(matched.source) ? 'database' : 'database_global';
      results.set(originalTerm, { food: matched, source });
    }
  }
  
  return results;
}

/**
 * Processa um array de ingredientes e calcula macros reais
 * VERSÃO OTIMIZADA: Usa busca em batch para reduzir latência
 */
export async function calculateRealMacrosForFoods(
  supabase: any,
  foods: FoodItem[],
  userCountry?: string
): Promise<{ items: CalculatedFoodItem[]; matchRate: number; fromDb: number; fromAi: number }> {
  const calculatedItems: CalculatedFoodItem[] = [];
  let fromDatabase = 0;
  let fromAI = 0;
  
  // Determinar fontes prioritárias
  const country = userCountry || 'BR';
  const prioritySources = COUNTRY_SOURCE_PRIORITY[country] || COUNTRY_SOURCE_PRIORITY['BR'];
  
  // Extrair termos de busca de todos os alimentos
  const allSearchTerms = foods.map(item => item.name);
  
  // OTIMIZAÇÃO: Busca em batch única
  const batchResults = await batchFindFoodsInDatabase(supabase, allSearchTerms, prioritySources);
  
  // Processar resultados
  for (const item of foods) {
    const match = batchResults.get(item.name);
    
    if (match) {
      // ✅ Encontrou no banco de dados (via batch)
      const macros = calculateMacrosForGrams(match.food, item.grams, match.source);
      calculatedItems.push({
        name: item.name,
        grams: item.grams,
        ...macros,
      });
      fromDatabase++;
    } else {
      // ❌ Não encontrou - usar fallback de categoria (mais rápido que busca individual)
      const estimated = getCategoryFallbackMacros(item);
      calculatedItems.push({
        name: item.name,
        grams: item.grams,
        ...estimated,
      });
      fromAI++;
    }
  }
  
  const matchRate = foods.length > 0 ? Math.round((fromDatabase / foods.length) * 100) : 0;
  
  logStep('Batch calculation complete', { 
    totalItems: foods.length,
    fromDb: fromDatabase, 
    fromFallback: fromAI,
    matchRate: `${matchRate}%`
  });
  
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
  foods: FoodItem[],
  userCountry?: string
): Promise<MealMacros> {
  const { items, matchRate } = await calculateRealMacrosForFoods(supabase, foods, userCountry);
  
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
  meals: Array<{ title: string; foods: FoodItem[] }>,
  userCountry?: string
): Promise<MacroCalculationResult> {
  const processedMeals: MealMacros[] = [];
  let totalFromDb = 0;
  let totalFromAi = 0;
  
  for (const meal of meals) {
    const { items, fromDb, fromAi } = await calculateRealMacrosForFoods(supabase, meal.foods, userCountry);
    
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
