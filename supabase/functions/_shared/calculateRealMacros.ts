// ============================================
// CÁLCULO HÍBRIDO DE MACROS - TABELA REAL + FALLBACK IA
// ============================================
// Este módulo calcula os macros reais baseados na tabela foods,
// com busca em cascata: canonical → memória → país → global → fallback → IA
// CAMADA 0: canonical_ingredients (prioridade máxima, dados verificados)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { applySanityCheck, getCategoryFallback, detectFoodCategory } from "./sanityCheckLimits.ts";
import { 
  NutritionalFood, 
  lookupFromNutritionalTable, 
  batchLookupFromNutritionalTable,
  loadNutritionalTable,
} from "./nutritionalTableInjection.ts";

// ============================================
// INTERFACE PARA CANONICAL INGREDIENTS
// ============================================
export interface CanonicalIngredient {
  id: string;
  name_en: string;
  name_pt: string;
  name_es: string | null;
  category: string;
  subcategory: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  default_portion_grams: number | null;
  portion_label_en: string | null;
  portion_label_pt: string | null;
  intolerance_flags: string[];
  dietary_flags: string[];
  country_specific: string[] | null;
  // ✅ NOVOS CAMPOS: Porções humanizadas dinâmicas
  portion_unit: string | null;              // Ex: "pote", "copo", "fatia"
  portion_unit_singular_pt: string | null;  // Ex: "pote de iogurte"
  portion_unit_plural_pt: string | null;    // Ex: "potes de iogurte"
  is_liquid: boolean | null;                // Ex: true para líquidos
}

// Cache global para canonical ingredients (evita queries repetidas)
let canonicalCache: Map<string, CanonicalIngredient> | null = null;
let canonicalCacheTimestamp = 0;
const CANONICAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Carrega e cacheia todos os canonical ingredients
 */
async function loadCanonicalIngredients(supabase: any): Promise<Map<string, CanonicalIngredient>> {
  const now = Date.now();
  
  // Retornar cache se ainda válido
  if (canonicalCache && (now - canonicalCacheTimestamp) < CANONICAL_CACHE_TTL) {
    return canonicalCache;
  }
  
  const { data, error } = await supabase
    .from('canonical_ingredients')
    .select('*')
    .eq('is_active', true);
  
  if (error || !data) {
    console.log('[CANONICAL] Failed to load canonical ingredients:', error?.message);
    return new Map();
  }
  
  // Criar mapa com múltiplas chaves para busca rápida
  const map = new Map<string, CanonicalIngredient>();
  
  for (const item of data) {
    // Chave primária: ID
    map.set(item.id.toLowerCase(), item);
    
    // Chave por nome em inglês (normalizado)
    if (item.name_en) {
      map.set(normalizeText(item.name_en), item);
    }
    
    // Chave por nome em português (normalizado)
    if (item.name_pt) {
      map.set(normalizeText(item.name_pt), item);
    }
    
    // Chave por nome em espanhol (normalizado)
    if (item.name_es) {
      map.set(normalizeText(item.name_es), item);
    }
  }
  
  canonicalCache = map;
  canonicalCacheTimestamp = now;
  
  console.log(`[CANONICAL] Loaded ${data.length} canonical ingredients (${map.size} lookup keys)`);
  
  return map;
}

/**
 * Busca um ingrediente na tabela canonical_ingredients
 * Retorna dados nutricionais se encontrado
 */
function lookupCanonicalIngredient(
  canonicalMap: Map<string, CanonicalIngredient>,
  ingredientName: string,
  grams: number
): { found: boolean; macros?: { calories: number; protein: number; carbs: number; fat: number; fiber: number }; canonical?: CanonicalIngredient; matchedName?: string } {
  const normalized = normalizeText(ingredientName);
  
  // Busca exata
  let match = canonicalMap.get(normalized);
  
  // Se não encontrou, tentar com primeira palavra significativa
  if (!match) {
    const words = normalized.split(/\s+/).filter(w => w.length > 2);
    for (const word of words) {
      match = canonicalMap.get(word);
      if (match) break;
    }
  }
  
  if (!match) {
    return { found: false };
  }
  
  // Calcular macros proporcionais
  const factor = grams / 100;
  
  return {
    found: true,
    macros: {
      calories: Math.round(match.calories_per_100g * factor),
      protein: Math.round(match.protein_per_100g * factor * 10) / 10,
      carbs: Math.round(match.carbs_per_100g * factor * 10) / 10,
      fat: Math.round(match.fat_per_100g * factor * 10) / 10,
      fiber: Math.round((match.fiber_per_100g || 0) * factor * 10) / 10,
    },
    canonical: match,
    matchedName: match.name_pt || match.name_en,
  };
}

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
  source: 'canonical' | 'database' | 'database_global' | 'category_fallback' | 'ai_estimate';
  confidence: number; // 0-100
  food_id?: string;
  matched_name?: string;
  sanity_adjusted?: boolean;
  canonical_id?: string; // ID do ingrediente canônico se encontrado
  intolerance_flags?: string[]; // Flags de intolerância do canonical
  // ✅ NOVOS CAMPOS: Dados de porção do canonical
  default_portion_grams?: number;
  portion_unit?: string;
  portion_unit_singular_pt?: string;
  portion_unit_plural_pt?: string;
  is_liquid?: boolean;
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

// ============================================
// PROTEÇÃO ANTI-FALSO MATCH (CATEGORIA + NUTRICIONAL)
// ============================================
const BEVERAGE_TERMS = ['cha', 'cafe', 'suco', 'agua', 'leite', 'vitamina', 'smoothie', 'infusao', 'refrigerante', 'camomila', 'hortela', 'hibisco', 'mate', 'erva-doce', 'boldo', 'cidreira', 'funcho', 'gengibre'];
const LOW_CALORIE_BEVERAGE_TERMS = ['cha', 'cafe', 'agua', 'infusao', 'camomila', 'hortela', 'hibisco', 'mate', 'erva-doce', 'boldo', 'cidreira', 'funcho'];
const SOLID_FOOD_TERMS = ['batata', 'arroz', 'feijao', 'carne', 'frango', 'peixe', 'ovo', 'pao', 'bolo', 'queijo', 'macarrao'];

// Termos que indicam cortes de carne (falsos positivos para "chá")
// "chã de dentro" e "chã de fora" são cortes bovinos que normalizam para "cha"
const MEAT_CUT_INDICATORS = ['coxao', 'dentro', 'fora', 'boi', 'bovina', 'bovino', 'polpa', 'alcatra', 'patinho', 'gordura', 'charque', 'acougue', 'moida', 'costela', 'file', 'contra', 'maminha', 'picanha', 'fraldinha'];

function isBeverageTerm(text: string): boolean {
  const normalized = normalizeText(text);
  return BEVERAGE_TERMS.some(b => normalized.includes(b));
}

function isLowCalorieBeverage(text: string): boolean {
  const normalized = normalizeText(text);
  return LOW_CALORIE_BEVERAGE_TERMS.some(b => normalized.includes(b));
}

function isSolidFood(text: string): boolean {
  const normalized = normalizeText(text);
  // Verificar palavras-chave de sólidos
  if (SOLID_FOOD_TERMS.some(s => normalized.includes(s))) {
    return true;
  }
  // Detectar cortes de carne que contém "chã" (normaliza para "cha")
  if (MEAT_CUT_INDICATORS.some(kw => normalized.includes(kw))) {
    return true;
  }
  return false;
}

/**
 * Validação nutricional ESTRITA: bebidas de baixa caloria não têm proteína/calorias altas
 */
function isNutritionallyCompatible(searchTerm: string, food: { calories_per_100g: number; protein_per_100g: number; name?: string }): boolean {
  const isBeverageSearch = isBeverageTerm(searchTerm);
  const isLowCalBeverage = isLowCalorieBeverage(searchTerm);
  
  // PROTEÇÃO CRÍTICA: Se o alimento encontrado contém indicadores de carne, REJEITAR para bebidas
  if (isBeverageSearch && food.name) {
    const foodNormalized = normalizeText(food.name);
    if (MEAT_CUT_INDICATORS.some(kw => foodNormalized.includes(kw))) {
      logStep('BLOCKED: Meat cut matched for beverage search', { search: searchTerm, food: food.name });
      return false;
    }
  }
  
  if (isBeverageSearch) {
    // Proteína > 5g/100g = definitivamente não é bebida simples
    if (food.protein_per_100g > 5) {
      return false;
    }
  }
  
  if (isLowCalBeverage) {
    // Chás e cafés puros têm no máximo ~5 kcal/100ml
    if (food.calories_per_100g > 15) {
      return false;
    }
  }
  
  return true;
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
  const originalSearchTerm = ingredientName; // Preservar termo original para validação
  const prioritySources = userCountry ? COUNTRY_SOURCE_PRIORITY[userCountry] || [] : [];
  const isBeverageSearch = isBeverageTerm(originalSearchTerm);
  const isLowCalBevSearch = isLowCalorieBeverage(originalSearchTerm);
  
  logStep('Searching for ingredient', { ingredientName, searchTerms, userCountry, prioritySources, isBeverage: isBeverageSearch });

  // ========================================
  // FASE 0: PRIORIDADE ABSOLUTA PARA BEBIDAS - BUSCAR EM CURATED PRIMEIRO
  // ========================================
  if (isLowCalBevSearch) {
    for (const term of searchTerms) {
      const { data: curatedMatch } = await supabase
        .from('foods')
        .select('*')
        .eq('source', 'curated')
        .eq('is_recipe', false)
        .or(`name_normalized.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(5);
      
      if (curatedMatch && curatedMatch.length > 0) {
        // Filtrar apenas bebidas de baixa caloria
        const validBeverages = curatedMatch.filter((f: any) => 
          f.calories_per_100g <= 15 && f.protein_per_100g <= 2
        );
        if (validBeverages.length > 0) {
          const selected = validBeverages[0];
          logStep('LOW-CAL BEVERAGE: Curated match found', { term, name: selected.name, cal: selected.calories_per_100g });
          return { food: selected, matchType: 'curated_beverage', source: 'database' };
        }
      }
    }
    
    // Fallback: criar dados sintéticos para bebidas conhecidas
    const normalized = normalizeText(ingredientName);
    
    // ÁGUA: sempre 0 kcal
    if (normalized.includes('agua') || normalized.includes('water')) {
      logStep('WATER: Using synthetic data (0 kcal)', { ingredientName });
      return {
        food: {
          id: 'synthetic-water',
          name: ingredientName,
          calories_per_100g: 0,
          protein_per_100g: 0,
          carbs_per_100g: 0,
          fat_per_100g: 0,
          fiber_per_100g: 0,
          source: 'curated',
          is_verified: true,
        },
        matchType: 'synthetic_water',
        source: 'database'
      };
    }
    
    // CHÁS E INFUSÕES: ~1 kcal
    if (normalized.includes('camomila') || normalized.includes('hortela') || normalized.includes('hibisco') || 
        normalized.includes('boldo') || normalized.includes('cidreira') || normalized.includes('mate') ||
        normalized.includes('erva-doce') || normalized.includes('funcho')) {
      logStep('LOW-CAL BEVERAGE: Using synthetic data', { ingredientName });
      return {
        food: {
          id: 'synthetic-tea',
          name: ingredientName,
          calories_per_100g: 1,
          protein_per_100g: 0,
          carbs_per_100g: 0,
          fat_per_100g: 0,
          fiber_per_100g: 0,
          source: 'curated',
          is_verified: true,
        },
        matchType: 'synthetic_beverage',
        source: 'database'
      };
    }
  }

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
      
      if (exactMatch && isNutritionallyCompatible(originalSearchTerm, exactMatch)) {
        logStep('Exact match found (country source)', { term, name: exactMatch.name, source: exactMatch.source });
        return { food: exactMatch, matchType: 'exact_country', source: 'database' };
      }
      
      // MATCH PARCIAL REMOVIDO - causava falsos positivos (chá → carne)
      // Agora confiamos na IA quando não há match exato
    }
  }
  
  // ========================================
  // FASE 2: Busca exata global (qualquer fonte) - SEM MATCH PARCIAL
  // ========================================
  for (const term of searchTerms) {
    // Busca exata global (com validação)
    const { data: exactMatch } = await supabase
      .from('foods')
      .select('*')
      .eq('name_normalized', term)
      .eq('is_recipe', false)
      .limit(1)
      .maybeSingle();
    
    if (exactMatch && isNutritionallyCompatible(originalSearchTerm, exactMatch)) {
      logStep('Exact match found (global)', { term, name: exactMatch.name, source: exactMatch.source });
      return { food: exactMatch, matchType: 'exact_global', source: 'database_global' };
    }
    
    // MATCH PARCIAL GLOBAL REMOVIDO - causava falsos positivos
    // A IA já recebe a tabela nutricional injetada no prompt e calcula corretamente
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
 * Valida se os dados do banco são fisicamente possíveis
 * Rejeita dados corrompidos (ex: 2 kcal mas 70g carbs)
 */
function validateDatabaseData(food: any): { isValid: boolean; reason?: string } {
  const cal = food.calories_per_100g || 0;
  const protein = food.protein_per_100g || 0;
  const carbs = food.carbs_per_100g || 0;
  const fat = food.fat_per_100g || 0;
  
  // Limite físico: gordura pura = 900 kcal/100g (com margem para arredondamento)
  if (cal > 910) {
    return { isValid: false, reason: `Calorias impossíveis: ${cal} kcal/100g (máx: 910)` };
  }
  
  // Limite: macros não podem exceder 100g em 100g de alimento
  if (protein > 100 || carbs > 100 || fat > 100) {
    return { isValid: false, reason: `Macro impossível: P=${protein}g, C=${carbs}g, G=${fat}g` };
  }
  
  // Verificação de consistência: calorias calculadas vs informadas
  // Fórmula: P×4 + C×4 + G×9
  const expectedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
  
  // Se calorias informadas são muito baixas mas macros são altos = dados corrompidos
  if (cal < 10 && expectedCalories > 50) {
    return { isValid: false, reason: `Inconsistência: ${cal} kcal informado mas ${Math.round(expectedCalories)} kcal calculado` };
  }
  
  // Tolerância para variações:
  // - ratio < 0.3: calorias muito BAIXAS para macros = erro de dados
  // - ratio > 10.0: calorias muito ALTAS para macros = erro (exceto álcool que pode chegar a ~7x)
  // Nota: Bebidas alcoólicas têm ratio alto (~4-7x) porque álcool tem 7kcal/g mas não é macro
  if (cal > 0 && expectedCalories > 0) {
    const ratio = cal / expectedCalories;
    if (ratio < 0.3 || ratio > 10.0) {
      return { isValid: false, reason: `Inconsistência grave: ${cal} kcal vs ${Math.round(expectedCalories)} kcal calculado (ratio: ${ratio.toFixed(2)})` };
    }
  }
  
  return { isValid: true };
}

/**
 * Calcula macros de um ingrediente baseado na gramagem
 */
function calculateMacrosForGrams(
  food: any, 
  grams: number,
  source: 'database' | 'database_global',
  originalSearchTerm?: string
): Omit<CalculatedFoodItem, 'name' | 'grams' | 'estimated_calories' | 'estimated_protein' | 'estimated_carbs' | 'estimated_fat'> | null {
  // VALIDAÇÃO DE SANIDADE: rejeitar dados impossíveis do banco
  const validation = validateDatabaseData(food);
  if (!validation.isValid) {
    logStep('DATABASE DATA REJECTED - Using fallback', { 
      food: food.name, 
      reason: validation.reason,
      cal: food.calories_per_100g,
      protein: food.protein_per_100g,
      carbs: food.carbs_per_100g,
      fat: food.fat_per_100g
    });
    return null; // Sinaliza para usar fallback
  }
  
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

// Palavras genéricas que NÃO devem ser usadas para match parcial
// Evita falsos positivos como "chá com erva-doce" → "Batata Doce"
const GENERIC_WORDS_TO_IGNORE = [
  'doce', 'salgado', 'salgada', 'cozido', 'cozida', 'frito', 'frita',
  'assado', 'assada', 'grelhado', 'grelhada', 'natural', 'integral',
  'com', 'sem', 'light', 'diet', 'zero', 'tradicional', 'caseiro', 'caseira',
  'grande', 'pequeno', 'pequena', 'medio', 'media', 'especial',
  'simples', 'cremoso', 'cremosa', 'suave', 'forte', 'leve', 'pesado',
  'fresco', 'fresca', 'maduro', 'madura', 'verde', 'preto', 'branco', 'branca',
  'amarelo', 'amarela', 'vermelho', 'vermelha', 'roxo', 'roxa',
];

/**
 * Verifica se a categoria do termo de busca é compatível com o alimento encontrado
 * Evita matches como "chá de camomila" → "Batata Doce"
 */
function isCategoryCompatible(searchTerm: string, foodName: string): boolean {
  const searchCategory = detectFoodCategory(searchTerm);
  const foodCategory = detectFoodCategory(foodName);
  
  // Se ambas categorias são identificadas e são diferentes, é incompatível
  // Exceto para 'default' que é categoria genérica
  if (searchCategory !== 'default' && foodCategory !== 'default') {
    // Categorias de bebidas devem só matchear com bebidas
    const beverageCategories = ['cha', 'cafe', 'agua', 'suco', 'leite', 'leite_vegetal', 'refrigerante', 'refrigerante_zero'];
    const searchIsBeverage = beverageCategories.includes(searchCategory);
    const foodIsBeverage = beverageCategories.includes(foodCategory);
    
    // Se busca é bebida, resultado deve ser bebida
    if (searchIsBeverage && !foodIsBeverage) {
      return false;
    }
    
    // Se busca não é bebida mas resultado é bebida diferente
    if (!searchIsBeverage && foodIsBeverage) {
      return false;
    }
  }
  
  return true;
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
    
    // Tentar match exato primeiro (com validação nutricional)
    let matched = allFoods.find((f: any) => 
      f.name_normalized === normalizedOriginal &&
      isNutritionallyCompatible(originalTerm, f)
    );
    
    // Tentar match parcial - nome completo contido
    if (!matched) {
      // Priorizar fontes do país E verificar compatibilidade de categoria E nutricional
      matched = allFoods.find((f: any) => 
        prioritySources.includes(f.source) && 
        (f.name_normalized.includes(normalizedOriginal) || normalizedOriginal.includes(f.name_normalized)) &&
        isCategoryCompatible(originalTerm, f.name) &&
        isNutritionallyCompatible(originalTerm, f)
      );
    }
    
    // Match parcial com qualquer fonte (mantendo validação de categoria E nutricional)
    if (!matched) {
      matched = allFoods.find((f: any) => 
        (f.name_normalized.includes(normalizedOriginal) || normalizedOriginal.includes(f.name_normalized)) &&
        isCategoryCompatible(originalTerm, f.name) &&
        isNutritionallyCompatible(originalTerm, f)
      );
    }
    
    // Match por palavras-chave (MAIS RESTRITIVO - ignora palavras genéricas)
    if (!matched) {
      const words = normalizedOriginal
        .split(/\s+/)
        .filter(w => w.length > 2 && !GENERIC_WORDS_TO_IGNORE.includes(w));
      
      // Requer pelo menos 2 palavras significativas no match ou palavra principal > 4 caracteres
      if (words.length > 0) {
        matched = allFoods.find((f: any) => {
          // Verificar compatibilidade de categoria E nutricional ANTES de fazer match
          if (!isCategoryCompatible(originalTerm, f.name)) {
            return false;
          }
          if (!isNutritionallyCompatible(originalTerm, f)) {
            return false;
          }
          
          // Match por múltiplas palavras (mais seguro)
          if (words.length >= 2) {
            return words.filter(word => f.name_normalized.includes(word)).length >= 2;
          }
          
          // Match por palavra única apenas se for específica (>4 caracteres) e não genérica
          const mainWord = words[0];
          return mainWord.length > 4 && f.name_normalized.includes(mainWord);
        });
      }
    }
    
    if (matched) {
      const source = prioritySources.includes(matched.source) ? 'database' : 'database_global';
      results.set(originalTerm, { food: matched, source });
      logStep('Batch match found', { search: originalTerm, matched: matched.name, source });
    }
  }
  
  return results;
}

/**
 * Processa um array de ingredientes e calcula macros reais
 * VERSÃO HÍBRIDA: Canonical (prioridade) → Batch (velocidade) → Individual (precisão) → AI (último recurso)
 */
export async function calculateRealMacrosForFoods(
  supabase: any,
  foods: FoodItem[],
  userCountry?: string
): Promise<{ items: CalculatedFoodItem[]; matchRate: number; fromDb: number; fromAi: number; fromCanonical: number }> {
  const calculatedItems: CalculatedFoodItem[] = [];
  let fromCanonical = 0;
  let fromDatabase = 0;
  let fromAI = 0;
  
  // Determinar fontes prioritárias
  const country = userCountry || 'BR';
  const prioritySources = COUNTRY_SOURCE_PRIORITY[country] || COUNTRY_SOURCE_PRIORITY['BR'];
  
  // ========================================
  // CAMADA 0: Busca em canonical_ingredients (PRIORIDADE MÁXIMA)
  // ========================================
  const canonicalMap = await loadCanonicalIngredients(supabase);
  
  const foundInCanonical: Map<string, { item: FoodItem; result: CalculatedFoodItem }> = new Map();
  const notFoundInCanonical: FoodItem[] = [];
  
  for (const item of foods) {
    const lookup = lookupCanonicalIngredient(canonicalMap, item.name, item.grams);
    
    if (lookup.found && lookup.macros && lookup.canonical) {
      foundInCanonical.set(item.name, {
        item,
        result: {
          name: item.name,
          grams: item.grams,
          ...lookup.macros,
          source: 'canonical',
          confidence: 100, // Dados verificados manualmente
          canonical_id: lookup.canonical.id,
          matched_name: lookup.matchedName,
          intolerance_flags: lookup.canonical.intolerance_flags || [],
          // ✅ Dados de porção do canonical
          default_portion_grams: lookup.canonical.default_portion_grams || 100,
          portion_unit: lookup.canonical.portion_unit || 'g',
          portion_unit_singular_pt: lookup.canonical.portion_unit_singular_pt || undefined,
          portion_unit_plural_pt: lookup.canonical.portion_unit_plural_pt || undefined,
          is_liquid: lookup.canonical.is_liquid || false,
        }
      });
      fromCanonical++;
    } else {
      notFoundInCanonical.push(item);
    }
  }
  
  logStep('Canonical phase complete', { 
    found: fromCanonical, 
    notFound: notFoundInCanonical.length 
  });
  
  // ========================================
  // FASE 1: Busca em batch para não encontrados (rápida, ~85% match)
  // ========================================
  const allSearchTerms = notFoundInCanonical.map(item => item.name);
  const batchResults = await batchFindFoodsInDatabase(supabase, allSearchTerms, prioritySources);
  
  // Separar encontrados e não encontrados
  const notFoundInBatch: FoodItem[] = [];
  const foundInBatch: Map<string, { item: FoodItem; macros: any }> = new Map();
  
  for (const item of notFoundInCanonical) {
    const match = batchResults.get(item.name);
    if (match) {
      const macros = calculateMacrosForGrams(match.food, item.grams, match.source, item.name);
      if (macros !== null) {
        foundInBatch.set(item.name, { item, macros });
      } else {
        // Dados inválidos no banco - tratar como não encontrado
        notFoundInBatch.push(item);
      }
    } else {
      notFoundInBatch.push(item);
    }
  }
  
  logStep('Batch phase complete', { 
    found: foundInBatch.size, 
    notFound: notFoundInBatch.length 
  });
  
  // ========================================
  // FASE 2: Busca individual para não encontrados (precisa, ~99% match)
  // ========================================
  const foundInIndividual: Map<string, { item: FoodItem; macros: any }> = new Map();
  const notFoundAnywhere: FoodItem[] = [];
  
  // Limitar busca individual para evitar timeout (máx 15 itens)
  const itemsToSearchIndividually = notFoundInBatch.slice(0, 15);
  const skippedItems = notFoundInBatch.slice(15);
  
  for (const item of itemsToSearchIndividually) {
    const match = await findFoodInDatabase(supabase, item.name, userCountry);
    if (match) {
      const macros = calculateMacrosForGrams(match.food, item.grams, match.source, item.name);
      if (macros !== null) {
        foundInIndividual.set(item.name, { item, macros });
      } else {
        // Dados inválidos no banco - tratar como não encontrado
        notFoundAnywhere.push(item);
      }
    } else {
      notFoundAnywhere.push(item);
    }
  }
  
  // Adicionar itens pulados diretamente para fallback
  notFoundAnywhere.push(...skippedItems);
  
  logStep('Individual search phase complete', { 
    found: foundInIndividual.size, 
    notFound: notFoundAnywhere.length,
    skipped: skippedItems.length
  });
  
  // ========================================
  // FASE 3: Montar resultado final na ordem original
  // ========================================
  for (const item of foods) {
    // PRIMEIRO: verificar se encontrou no canonical (PRIORIDADE MÁXIMA)
    const canonicalMatch = foundInCanonical.get(item.name);
    if (canonicalMatch) {
      calculatedItems.push(canonicalMatch.result);
      continue;
    }
    
    // Segundo, verificar se encontrou no batch
    const batchMatch = foundInBatch.get(item.name);
    if (batchMatch) {
      calculatedItems.push({
        name: item.name,
        grams: item.grams,
        ...batchMatch.macros,
      });
      fromDatabase++;
      continue;
    }
    
    // Terceiro, verificar se encontrou na busca individual
    const individualMatch = foundInIndividual.get(item.name);
    if (individualMatch) {
      calculatedItems.push({
        name: item.name,
        grams: item.grams,
        ...individualMatch.macros,
      });
      fromDatabase++;
      continue;
    }
    
    // Quarto, usar AI estimation como último recurso
    const estimated = estimateMacrosFromAI(item);
    calculatedItems.push({
      name: item.name,
      grams: item.grams,
      ...estimated,
    });
    fromAI++;
  }
  
  const totalFromDb = fromCanonical + fromDatabase;
  const matchRate = foods.length > 0 ? Math.round((totalFromDb / foods.length) * 100) : 0;
  
  logStep('Hybrid calculation complete', { 
    totalItems: foods.length,
    fromCanonical,
    fromDb: fromDatabase, 
    fromAI: fromAI,
    matchRate: `${matchRate}%`,
    phases: {
      canonical: fromCanonical,
      batch: foundInBatch.size,
      individual: foundInIndividual.size,
      fallback: fromAI
    }
  });
  
  return {
    items: calculatedItems,
    matchRate,
    fromDb: fromDatabase,
    fromAi: fromAI,
    fromCanonical,
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

// ============================================
// CÁLCULO OTIMIZADO COM TABELA EM MEMÓRIA
// ============================================
// Este é o método preferido para uso no generate-ai-meal-plan.
// Usa cascata: 0) Canonical → 1) Tabela em memória → 2) DB batch → 3) AI estimation

/**
 * Calcula macros para TODAS as refeições de um dia usando cascata otimizada:
 * 0. PRIORIDADE: Busca em canonical_ingredients (dados verificados)
 * 1. Segundo: Tabela nutricional em memória (rápido)
 * 2. Para não encontrados, faz UMA query batch ao DB
 * 3. Usa AI estimation apenas como último recurso
 */
export async function calculateOptimizedMacrosForDay(
  supabase: any,
  allFoods: Array<{ mealIndex: number; food: FoodItem }>,
  nutritionalTable: NutritionalFood[],
  userCountry?: string
): Promise<{
  results: Map<number, { items: CalculatedFoodItem[]; fromCanonical: number; fromMemory: number; fromDb: number; fromAi: number }>;
  stats: { totalFromCanonical: number; totalFromMemory: number; totalFromDb: number; totalFromAi: number; matchRate: number };
}> {
  const startTime = Date.now();
  logStep('Starting optimized macro calculation', { 
    totalFoods: allFoods.length,
    tableSize: nutritionalTable.length,
    country: userCountry
  });
  
  // Agrupar por refeição para retorno organizado
  const mealResults = new Map<number, { items: CalculatedFoodItem[]; fromCanonical: number; fromMemory: number; fromDb: number; fromAi: number }>();
  
  // Inicializar resultados para cada refeição
  const mealIndices = [...new Set(allFoods.map(f => f.mealIndex))];
  for (const idx of mealIndices) {
    mealResults.set(idx, { items: [], fromCanonical: 0, fromMemory: 0, fromDb: 0, fromAi: 0 });
  }
  
  let totalFromCanonical = 0;
  let totalFromMemory = 0;
  let totalFromDb = 0;
  let totalFromAi = 0;
  
  // ========================================
  // CAMADA 0: Busca em canonical_ingredients (PRIORIDADE MÁXIMA)
  // ========================================
  const canonicalMap = await loadCanonicalIngredients(supabase);
  const notFoundInCanonical: Array<{ mealIndex: number; food: FoodItem }> = [];
  
  for (const entry of allFoods) {
    const lookup = lookupCanonicalIngredient(canonicalMap, entry.food.name, entry.food.grams);
    
    if (lookup.found && lookup.macros && lookup.canonical) {
      const result = mealResults.get(entry.mealIndex)!;
      result.items.push({
        name: entry.food.name,
        grams: entry.food.grams,
        ...lookup.macros,
        source: 'canonical',
        confidence: 100,
        canonical_id: lookup.canonical.id,
        matched_name: lookup.matchedName,
        intolerance_flags: lookup.canonical.intolerance_flags || [],
        // ✅ Dados de porção do canonical
        default_portion_grams: lookup.canonical.default_portion_grams || 100,
        portion_unit: lookup.canonical.portion_unit || 'g',
        portion_unit_singular_pt: lookup.canonical.portion_unit_singular_pt || undefined,
        portion_unit_plural_pt: lookup.canonical.portion_unit_plural_pt || undefined,
        is_liquid: lookup.canonical.is_liquid || false,
      });
      result.fromCanonical++;
      totalFromCanonical++;
    } else {
      notFoundInCanonical.push(entry);
    }
  }
  
  logStep('Canonical lookup phase complete', { 
    found: totalFromCanonical, 
    notFound: notFoundInCanonical.length 
  });

  // ========================================
  // FASE 1: Busca na tabela em memória (SEGUNDO MAIS RÁPIDO)
  // ========================================
  const notFoundInMemory: Array<{ mealIndex: number; food: FoodItem }> = [];
  
  for (const entry of notFoundInCanonical) {
    const lookup = lookupFromNutritionalTable(nutritionalTable, entry.food.name, entry.food.grams);
    
    if (lookup.found && lookup.macros) {
      const result = mealResults.get(entry.mealIndex)!;
      result.items.push({
        name: entry.food.name,
        grams: entry.food.grams,
        calories: lookup.macros.calories,
        protein: lookup.macros.protein,
        carbs: lookup.macros.carbs,
        fat: lookup.macros.fat,
        fiber: 0,
        source: 'database',
        confidence: lookup.confidence,
        matched_name: lookup.matchedName,
      });
      result.fromMemory++;
      totalFromMemory++;
    } else {
      notFoundInMemory.push(entry);
    }
  }
  
  logStep('Memory lookup phase complete', { 
    found: totalFromMemory, 
    notFound: notFoundInMemory.length 
  });
  
  // ========================================
  // FASE 2: Busca em batch no DB para não encontrados
  // ========================================
  if (notFoundInMemory.length > 0) {
    const prioritySources = userCountry ? COUNTRY_SOURCE_PRIORITY[userCountry] || COUNTRY_SOURCE_PRIORITY['BR'] : COUNTRY_SOURCE_PRIORITY['BR'];
    const searchTerms = notFoundInMemory.map(e => e.food.name);
    
    const batchResults = await batchFindFoodsInDatabase(supabase, searchTerms, prioritySources);
    
    const stillNotFound: Array<{ mealIndex: number; food: FoodItem }> = [];
    
    for (const entry of notFoundInMemory) {
      const dbMatch = batchResults.get(entry.food.name);
      
      if (dbMatch) {
        const macros = calculateMacrosForGrams(dbMatch.food, entry.food.grams, dbMatch.source, entry.food.name);
        
        // Se macros retornou null (dados inválidos), tratar como não encontrado
        if (macros === null) {
          stillNotFound.push(entry);
          continue;
        }
        
        const result = mealResults.get(entry.mealIndex)!;
        result.items.push({
          name: entry.food.name,
          grams: entry.food.grams,
          ...macros,
        });
        result.fromDb++;
        totalFromDb++;
      } else {
        stillNotFound.push(entry);
      }
    }
    
    logStep('DB batch phase complete', { 
      found: totalFromDb, 
      stillNotFound: stillNotFound.length 
    });
    
    // ========================================
    // FASE 3: AI estimation para remanescentes
    // ========================================
    for (const entry of stillNotFound) {
      const estimated = estimateMacrosFromAI(entry.food);
      const result = mealResults.get(entry.mealIndex)!;
      result.items.push({
        name: entry.food.name,
        grams: entry.food.grams,
        ...estimated,
      });
      result.fromAi++;
      totalFromAi++;
    }
  }
  
  const total = totalFromCanonical + totalFromMemory + totalFromDb + totalFromAi;
  const matchRate = total > 0 ? Math.round(((totalFromCanonical + totalFromMemory + totalFromDb) / total) * 100) : 0;
  const elapsed = Date.now() - startTime;
  
  logStep('Optimized calculation complete', { 
    elapsed: `${elapsed}ms`,
    totalItems: total,
    fromCanonical: totalFromCanonical,
    fromMemory: totalFromMemory,
    fromDb: totalFromDb,
    fromAi: totalFromAi,
    matchRate: `${matchRate}%`,
  });
  
  return {
    results: mealResults,
    stats: {
      totalFromCanonical,
      totalFromMemory,
      totalFromDb,
      totalFromAi,
      matchRate,
    },
  };
}

/**
 * Wrapper simplificado para calcular macros de múltiplas refeições de uma vez.
 * Retorna array de resultados na mesma ordem das refeições de entrada.
 */
export async function calculateOptimizedMacrosForMeals(
  supabase: any,
  meals: Array<{ title: string; foods: FoodItem[] }>,
  nutritionalTable: NutritionalFood[],
  userCountry?: string
): Promise<{
  mealsWithMacros: Array<{
    title: string;
    items: CalculatedFoodItem[];
    totals: { calories: number; protein: number; carbs: number; fat: number };
  }>;
  stats: { totalFromCanonical: number; totalFromMemory: number; totalFromDb: number; totalFromAi: number; matchRate: number };
}> {
  // Flatten all foods with meal index
  const allFoods: Array<{ mealIndex: number; food: FoodItem }> = [];
  
  for (let i = 0; i < meals.length; i++) {
    for (const food of meals[i].foods) {
      allFoods.push({ mealIndex: i, food });
    }
  }
  
  // Calculate all at once
  const { results, stats } = await calculateOptimizedMacrosForDay(
    supabase,
    allFoods,
    nutritionalTable,
    userCountry
  );
  
  // Reconstruct meals with macros
  const mealsWithMacros = meals.map((meal, idx) => {
    const mealResult = results.get(idx) || { items: [], fromCanonical: 0, fromMemory: 0, fromDb: 0, fromAi: 0 };
    
    const totals = mealResult.items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    
    return {
      title: meal.title,
      items: mealResult.items,
      totals: {
        calories: Math.round(totals.calories),
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
      },
    };
  });
  
  return { mealsWithMacros, stats };
}

