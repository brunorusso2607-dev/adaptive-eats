// v2.1 - Internationalization: All templates now use English keys
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { shouldShowSpecialFood } from "../_shared/filterSpecialDietFoods.ts";
import {
  CALORIE_TABLE, 
  normalizeForCalorieTable, 
  findCaloriesPerGram, 
  calculateFoodCalories 
} from "../_shared/calorieTable.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getPortionFormat
} from "../_shared/nutritionPrompt.ts";
// Importar cálculos nutricionais centralizados
import {
  calculateNutritionalTargets,
  calculateMealDistribution,
  buildNutritionalContextForPrompt,
  buildMealDistributionForPrompt,
  buildMealMacroTargetsForPrompt,
  estimateTimeToGoal,
  validateTargetsHealth,
  type UserPhysicalData,
  type NutritionalTargets,
} from "../_shared/nutritionalCalculations.ts";
// Importar cálculo de macros reais da tabela foods
import {
  calculateOptimizedMacrosForDay,
  type FoodItem as RealMacrosFoodItem,
  type CalculatedFoodItem,
} from "../_shared/calculateRealMacros.ts";
// Importar injeção de tabela nutricional no prompt
import {
  getNutritionalTablePrompt,
  loadNutritionalTable,
  type NutritionalFood,
} from "../_shared/nutritionalTableInjection.ts";
// ============= IMPORTAR CONFIGURAÇÃO COMPARTILHADA =============
import {
  REGIONAL_CONFIGS,
  DEFAULT_CONFIG,
  getRegionalConfig,
  normalizeText,
  validateFood,
  fetchIntoleranceMappings,
  getRestrictionText,
  getStrategyPromptRules,
  getStrategyPersona,
  groupSeparatedIngredients,
  updateMealTitleIfNeeded,
  sortMealIngredients,
  cleanInstructionsFromFruitsAndBeverages,
  // getMasterMealPromptV5 removido - não usado (Unified Core é a única fonte)
  getLocalizedDefaultPortions,
  type RegionalConfig,
  type IntoleranceMapping,
  type SafeKeyword,
  type FoodItem,
  type ValidationResult,
  // type MasterPromptParams removido - não usado (Unified Core é a única fonte)
  type DefaultPortion,
} from "../_shared/mealGenerationConfig.ts";

// ============= UNIFIED CORE - ÚNICA FONTE DE GERAÇÃO =============
import { generateMealsWithCore, type GenerateMealsOptions } from "../_shared/advanced-meal-generator.ts";
import type { UnifiedMeal, UserContext } from "../_shared/unified-meal-core/types.ts";
// ✅ Importar formatação de porções dinâmica
import { formatPortionDynamic } from "../_shared/unified-meal-core/portion-formatter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-MEAL-PLAN] ${step}${detailsStr}`);
};

// ============= TIPOS - FORMATO SIMPLIFICADO =============
interface SimpleMealOption {
  title: string;
  name?: string; // Nome da refeição (para geração direta)
  foods: FoodItem[];
  calories_kcal: number;
  calculated_calories?: number; // Calculado pelo script
  instructions?: string[]; // Passos de preparo
  // Pool integration fields
  fromPool?: boolean;
  fromDirect?: boolean; // Gerado diretamente (sem pool, sem IA)
  poolMealId?: string;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface SimpleMeal {
  meal_type: string;
  label: string;
  target_calories: number;
  options: SimpleMealOption[];
}

interface SimpleDayPlan {
  day: number;
  day_name: string;
  meals: SimpleMeal[];
  total_calories: number;
}

// ============= CONVERSÃO: UnifiedMeal → SimpleMeal =============
function convertUnifiedMealToSimpleMeal(
  unifiedMeal: UnifiedMeal,
  mealLabel: string,
  targetCalories: number
): SimpleMeal {
  const option: SimpleMealOption = {
    title: unifiedMeal.name,
    name: unifiedMeal.name,
    foods: unifiedMeal.components.map(comp => ({
      name: comp.name_pt,
      grams: comp.portion_grams,
      calories: comp.macros.kcal,
      protein: comp.macros.protein,
      carbs: comp.macros.carbs,
      fat: comp.macros.fat,
    })),
    calories_kcal: unifiedMeal.totals.calories,
    protein: unifiedMeal.totals.protein,
    carbs: unifiedMeal.totals.carbs,
    fat: unifiedMeal.totals.fat,
    fromPool: unifiedMeal.source.type === 'pool',
    fromDirect: unifiedMeal.source.type === 'direct',
  };

  return {
    meal_type: unifiedMeal.meal_type,
    label: mealLabel,
    target_calories: targetCalories,
    options: [option],
  };
}

// Nota: REGIONAL_CONFIGS, DEFAULT_CONFIG, getRegionalConfig importados de mealGenerationConfig.ts

// Nota: getRestrictionText importado de mealGenerationConfig.ts

// ============= PROMPT LEGADO REMOVIDO =============
// buildSimpleNutritionistPrompt foi removido - Unified Core é a única fonte de geração
// Todas as refeições passam por generateMealsWithCore() que aplica:
// - Safety Engine (intolerâncias)
// - Mifflin-St Jeor (compatibilidade com meta)
// - Cultural Rules (arroz+feijão, macarrão sem salada)
// - Composite Rules (alface+tomate = Salada)
// - Ordenação BR e formatação de porções

// ============= CALORIE DISTRIBUTION (English keys) =============
const CALORIE_DISTRIBUTION: Record<string, number> = {
  breakfast: 0.22,
  morning_snack: 0.08,
  lunch: 0.30,
  afternoon_snack: 0.10,
  dinner: 0.22,
  supper: 0.08,
};

// ARCHITECTURE: Validação de ingredientes agora usa globalSafetyEngine internamente
// via mealGenerationConfig.ts. As funções validateFood e fetchIntoleranceMappings
// já delegam para o engine centralizado.

// Função local para verificar ingredientes proibidos (wrapper para uso interno)
function checkForbiddenIngredient(
  food: string,
  forbiddenList: string[],
  safeKeywords: string[] = []
): boolean {
  const normalizedFood = normalizeText(food);
  
  // Primeiro verifica se é seguro (ex: "leite de coco" é seguro para lactose)
  for (const safe of safeKeywords) {
    if (normalizedFood.includes(normalizeText(safe))) {
      return false; // É seguro, não é proibido
    }
  }
  
  // Depois verifica se contém ingrediente proibido
  for (const forbidden of forbiddenList) {
    if (normalizedFood.includes(normalizeText(forbidden))) {
      return true; // Contém ingrediente proibido
    }
  }
  
  return false;
}

// ============= CÁLCULO DE CALORIAS (usa tabela compartilhada) =============
function calculateOptionCalories(foods: FoodItem[]): number {
  return foods.reduce((total, food) => {
    const result = calculateFoodCalories(food.name, food.grams);
    return total + result.calories;
  }, 0);
}

// ============= STRUCTURAL VALIDATION: Title-Ingredients Coherence =============
// EXPANDED list of key ingredients that must appear in title and foods
const TITLE_FOOD_KEYWORDS = [
  // Proteins
  { titleKey: 'frango', foodKeys: ['frango', 'peito de frango', 'coxa', 'chicken'] },
  { titleKey: 'chicken', foodKeys: ['chicken', 'frango', 'peito de frango'] },
  { titleKey: 'carne', foodKeys: ['carne', 'bife', 'file', 'filé', 'beef'] },
  { titleKey: 'beef', foodKeys: ['beef', 'carne', 'bife'] },
  { titleKey: 'peixe', foodKeys: ['peixe', 'tilapia', 'atum', 'sardinha', 'fish'] },
  { titleKey: 'fish', foodKeys: ['fish', 'peixe', 'tilapia', 'tuna', 'atum'] },
  { titleKey: 'salmao', foodKeys: ['salmao', 'salmão', 'salmon'] },
  { titleKey: 'salmon', foodKeys: ['salmon', 'salmao', 'salmão'] },
  { titleKey: 'ovo', foodKeys: ['ovo', 'ovos', 'clara', 'mexidos', 'egg'] },
  { titleKey: 'egg', foodKeys: ['egg', 'eggs', 'ovo', 'ovos'] },
  { titleKey: 'tofu', foodKeys: ['tofu'] },
  
  // Carbs - BREAD AND TOAST (critical for breakfast)
  { titleKey: 'pao integral', foodKeys: ['pao integral', 'pão integral', 'fatia de pao', 'fatia de pão', 'whole wheat bread'] },
  { titleKey: 'pao', foodKeys: ['pao', 'pão', 'fatia de pao', 'fatia de pão', 'pao frances', 'pão francês', 'bisnaguinha', 'bread'] },
  { titleKey: 'bread', foodKeys: ['bread', 'pao', 'pão', 'toast', 'torrada'] },
  { titleKey: 'torrada', foodKeys: ['torrada', 'toast', 'pao torrado', 'pão torrado'] },
  { titleKey: 'toast', foodKeys: ['toast', 'torrada', 'toasted bread'] },
  { titleKey: 'feijao', foodKeys: ['feijao', 'feijão', 'beans'] },
  { titleKey: 'beans', foodKeys: ['beans', 'feijao', 'feijão'] },
  { titleKey: 'arroz', foodKeys: ['arroz', 'rice'] },
  { titleKey: 'rice', foodKeys: ['rice', 'arroz'] },
  { titleKey: 'quinoa', foodKeys: ['quinoa', 'quinua'] },
  { titleKey: 'grao de bico', foodKeys: ['grao de bico', 'grão de bico', 'grao-de-bico', 'grão-de-bico', 'homus', 'hummus', 'farinha de grao', 'chickpea'] },
  { titleKey: 'chickpea', foodKeys: ['chickpea', 'grao de bico', 'grão de bico', 'hummus'] },
  { titleKey: 'aveia', foodKeys: ['aveia', 'flocos de aveia', 'oats', 'oatmeal'] },
  { titleKey: 'oats', foodKeys: ['oats', 'oatmeal', 'aveia'] },
  { titleKey: 'tapioca', foodKeys: ['tapioca', 'goma de tapioca'] },
  { titleKey: 'batata', foodKeys: ['batata', 'batata doce', 'batata-doce', 'potato', 'sweet potato'] },
  { titleKey: 'potato', foodKeys: ['potato', 'batata', 'sweet potato'] },
  
  // Dairy
  { titleKey: 'queijo', foodKeys: ['queijo', 'cheese'] },
  { titleKey: 'cheese', foodKeys: ['cheese', 'queijo'] },
  { titleKey: 'iogurte', foodKeys: ['iogurte', 'yogurt'] },
  { titleKey: 'yogurt', foodKeys: ['yogurt', 'iogurte'] },
  { titleKey: 'leite', foodKeys: ['leite', 'leite de coco', 'leite de amendoas', 'leite de aveia', 'milk'] },
  { titleKey: 'milk', foodKeys: ['milk', 'leite'] },
  
  // Important beverages
  { titleKey: 'suco', foodKeys: ['suco', 'suco de', 'copo de suco', 'juice'] },
  { titleKey: 'juice', foodKeys: ['juice', 'suco'] },
  { titleKey: 'cafe', foodKeys: ['cafe', 'café', 'cafezinho', 'coffee'] },
  { titleKey: 'coffee', foodKeys: ['coffee', 'cafe', 'café'] },
  
  // Composite preparations
  { titleKey: 'crepioca', foodKeys: ['crepioca', 'tapioca', 'goma de tapioca', 'grao de bico', 'farinha de grao'] },
  { titleKey: 'panqueca', foodKeys: ['panqueca', 'massa de panqueca', 'farinha', 'aveia', 'pancake'] },
  { titleKey: 'pancake', foodKeys: ['pancake', 'panqueca'] },
  { titleKey: 'omelete', foodKeys: ['omelete', 'ovo', 'ovos', 'clara', 'omelet', 'omelette'] },
  { titleKey: 'omelet', foodKeys: ['omelet', 'omelette', 'omelete', 'egg', 'eggs'] },
  { titleKey: 'wrap', foodKeys: ['wrap', 'tortilla', 'tortilha'] },
  { titleKey: 'sanduiche', foodKeys: ['sanduiche', 'sanduíche', 'pao', 'pão', 'sandwich'] },
  { titleKey: 'sandwich', foodKeys: ['sandwich', 'sanduiche', 'bread'] },
  
  // Soups and preparations that NEED the main ingredient
  { titleKey: 'sopa', foodKeys: ['sopa', 'caldo', 'abobora', 'abóbora', 'legume', 'frango', 'carne', 'feijao', 'lentilha', 'ervilha', 'soup'] },
  { titleKey: 'soup', foodKeys: ['soup', 'sopa', 'broth'] },
  { titleKey: 'creme', foodKeys: ['creme', 'abobora', 'abóbora', 'legume', 'milho', 'espinafre', 'mandioquinha', 'cream'] },
  { titleKey: 'pure', foodKeys: ['pure', 'purê', 'batata', 'mandioca', 'mandioquinha', 'abobora', 'mash', 'puree'] },
  { titleKey: 'vitamina', foodKeys: ['vitamina', 'banana', 'morango', 'mamao', 'manga', 'leite', 'iogurte', 'smoothie'] },
  { titleKey: 'smoothie', foodKeys: ['smoothie', 'vitamina', 'banana', 'morango', 'leite'] },
  { titleKey: 'mingau', foodKeys: ['mingau', 'aveia', 'tapioca', 'fuba', 'maizena', 'porridge'] },
  { titleKey: 'porridge', foodKeys: ['porridge', 'mingau', 'oats'] },
  { titleKey: 'salada', foodKeys: ['salada', 'alface', 'rucula', 'tomate', 'pepino', 'folha', 'verdura', 'legume', 'salad'] },
  { titleKey: 'salad', foodKeys: ['salad', 'salada', 'lettuce', 'greens'] },
  { titleKey: 'pudim', foodKeys: ['pudim', 'chia', 'leite', 'leite de coco', 'pudding'] },
  { titleKey: 'pudding', foodKeys: ['pudding', 'pudim'] },
  
  // Preparations with specific ingredients
  { titleKey: 'abobora', foodKeys: ['abobora', 'abóbora', 'pumpkin', 'squash'] },
  { titleKey: 'pumpkin', foodKeys: ['pumpkin', 'squash', 'abobora', 'abóbora'] },
  { titleKey: 'gengibre', foodKeys: ['gengibre', 'ginger'] },
  { titleKey: 'ginger', foodKeys: ['ginger', 'gengibre'] },
  { titleKey: 'leite de coco', foodKeys: ['leite de coco', 'coco', 'coconut milk'] },
  { titleKey: 'coconut milk', foodKeys: ['coconut milk', 'leite de coco'] },
  { titleKey: 'chia', foodKeys: ['chia', 'semente de chia', 'chia seed'] },
  
  // Important fruits when mentioned in title
  { titleKey: 'banana', foodKeys: ['banana'] },
  { titleKey: 'mamao', foodKeys: ['mamao', 'mamão', 'papaia', 'papaya'] },
  { titleKey: 'papaya', foodKeys: ['papaya', 'mamao', 'mamão', 'papaia'] },
  { titleKey: 'laranja', foodKeys: ['laranja', 'suco de laranja', 'orange'] },
  { titleKey: 'orange', foodKeys: ['orange', 'laranja', 'orange juice'] },
  { titleKey: 'morango', foodKeys: ['morango', 'morangos', 'strawberry', 'strawberries'] },
  { titleKey: 'strawberry', foodKeys: ['strawberry', 'strawberries', 'morango'] },
];

// ============= BIDIRECTIONAL COHERENCE VALIDATION =============
// Direction 1: Title mentions something NOT in foods? → Incoherent
// Direction 2: Foods have main ingredients NOT reflected in title? → Incoherent
function validateTitleIngredientCoherence(
  title: string,
  foods: FoodItem[]
): { isCoherent: boolean; issue?: string; missingIngredients: string[]; shouldRegenerateTitle: boolean } {
  const normalizedTitle = normalizeText(title);
  const foodNames = foods.map(f => normalizeText(f.name)).join(' ');
  const missingIngredients: string[] = [];
  let shouldRegenerateTitle = false;
  
  // Direction 1: Title mentions ingredient not in foods
  for (const mapping of TITLE_FOOD_KEYWORDS) {
    if (normalizedTitle.includes(mapping.titleKey)) {
      const hasIngredient = mapping.foodKeys.some(fk => foodNames.includes(fk));
      if (!hasIngredient) {
        missingIngredients.push(mapping.titleKey);
      }
    }
  }
  
  // Direction 2: Foods have MAIN ingredients (proteins, carbs) not in title
  // Only check proteins and main carbs - the core identity of the meal
  const mainProteinKeywords = [
    { foodKey: 'frango', titleKeys: ['frango', 'chicken', 'omelete', 'sanduiche', 'wrap'] },
    { foodKey: 'chicken', titleKeys: ['chicken', 'frango', 'omelet', 'sandwich', 'wrap'] },
    { foodKey: 'carne', titleKeys: ['carne', 'beef', 'hamburguer', 'burger', 'bife', 'steak'] },
    { foodKey: 'beef', titleKeys: ['beef', 'carne', 'burger', 'steak'] },
    { foodKey: 'peixe', titleKeys: ['peixe', 'fish', 'tilapia', 'atum', 'sardinha'] },
    { foodKey: 'fish', titleKeys: ['fish', 'peixe', 'tilapia', 'tuna'] },
    { foodKey: 'salmao', titleKeys: ['salmao', 'salmon'] },
    { foodKey: 'salmon', titleKeys: ['salmon', 'salmao'] },
    { foodKey: 'ovo', titleKeys: ['ovo', 'ovos', 'egg', 'omelete', 'omelet', 'crepioca', 'panqueca'] },
    { foodKey: 'egg', titleKeys: ['egg', 'eggs', 'omelet', 'omelette', 'crepioca', 'pancake'] },
    { foodKey: 'tofu', titleKeys: ['tofu'] },
    { foodKey: 'camarao', titleKeys: ['camarao', 'camarão', 'shrimp'] },
    { foodKey: 'shrimp', titleKeys: ['shrimp', 'camarao'] },
  ];
  
  const mainCarbKeywords = [
    { foodKey: 'arroz', titleKeys: ['arroz', 'rice', 'risoto', 'risotto'] },
    { foodKey: 'rice', titleKeys: ['rice', 'arroz', 'risotto'] },
    { foodKey: 'feijao', titleKeys: ['feijao', 'feijão', 'beans', 'feijoada'] },
    { foodKey: 'beans', titleKeys: ['beans', 'feijao'] },
    { foodKey: 'tapioca', titleKeys: ['tapioca', 'crepioca'] },
    { foodKey: 'aveia', titleKeys: ['aveia', 'oats', 'mingau', 'porridge', 'oatmeal'] },
    { foodKey: 'oats', titleKeys: ['oats', 'oatmeal', 'aveia', 'porridge'] },
    { foodKey: 'pao', titleKeys: ['pao', 'pão', 'bread', 'toast', 'torrada', 'sanduiche', 'sandwich'] },
    { foodKey: 'bread', titleKeys: ['bread', 'pao', 'toast', 'sandwich'] },
    { foodKey: 'macarrao', titleKeys: ['macarrao', 'macarrão', 'pasta', 'espaguete', 'spaghetti', 'lasanha'] },
    { foodKey: 'pasta', titleKeys: ['pasta', 'macarrao', 'spaghetti', 'lasagna'] },
  ];
  
  // Check if main proteins in foods are reflected in title
  for (const mapping of mainProteinKeywords) {
    if (foodNames.includes(mapping.foodKey)) {
      const isInTitle = mapping.titleKeys.some(tk => normalizedTitle.includes(tk));
      if (!isInTitle) {
        // Main protein found in foods but not in title - needs regeneration
        shouldRegenerateTitle = true;
        break;
      }
    }
  }
  
  // Check if main carbs in foods are reflected in title (only if no protein issue)
  if (!shouldRegenerateTitle) {
    for (const mapping of mainCarbKeywords) {
      if (foodNames.includes(mapping.foodKey)) {
        const isInTitle = mapping.titleKeys.some(tk => normalizedTitle.includes(tk));
        if (!isInTitle) {
          // Main carb found in foods but not in title - needs regeneration
          shouldRegenerateTitle = true;
          break;
        }
      }
    }
  }
  
  if (missingIngredients.length > 0) {
    return { 
      isCoherent: false, 
      issue: `Title mentions [${missingIngredients.join(', ')}] but they are not in ingredients`,
      missingIngredients,
      shouldRegenerateTitle: true, // Always regenerate if title mentions phantom ingredients
    };
  }
  
  if (shouldRegenerateTitle) {
    return {
      isCoherent: false,
      issue: 'Title does not reflect main ingredients in foods',
      missingIngredients: [],
      shouldRegenerateTitle: true,
    };
  }
  
  return { isCoherent: true, missingIngredients: [], shouldRegenerateTitle: false };
}

// ============= GENERATE TITLE BASED ON ACTUAL INGREDIENTS =============
function generateTitleFromFoods(foods: FoodItem[], mealType: string): string {
  if (foods.length === 0) return 'Refeição';
  
  // Find main ingredients (proteins and main carbs)
  const proteins: string[] = [];
  const carbs: string[] = [];
  const others: string[] = [];
  
  // Mapping from food keywords to display names
  const DISPLAY_NAMES: Record<string, string> = {
    'frango': 'Frango',
    'peito de frango': 'Frango',
    'chicken': 'Frango',
    'carne': 'Carne',
    'bife': 'Bife',
    'beef': 'Carne',
    'peixe': 'Peixe',
    'tilapia': 'Tilápia',
    'fish': 'Peixe',
    'salmao': 'Salmão',
    'salmon': 'Salmão',
    'atum': 'Atum',
    'tuna': 'Atum',
    'ovo': 'Ovos',
    'ovos': 'Ovos',
    'egg': 'Ovos',
    'omelete': 'Omelete',
    'omelet': 'Omelete',
    'tofu': 'Tofu',
    'camarao': 'Camarão',
    'shrimp': 'Camarão',
    'arroz': 'Arroz',
    'rice': 'Arroz',
    'feijao': 'Feijão',
    'beans': 'Feijão',
    'tapioca': 'Tapioca',
    'crepioca': 'Crepioca',
    'aveia': 'Aveia',
    'oats': 'Aveia',
    'pao': 'Pão',
    'pao integral': 'Pão Integral',
    'bread': 'Pão',
    'torrada': 'Torrada',
    'toast': 'Torrada',
    'macarrao': 'Macarrão',
    'pasta': 'Macarrão',
    'iogurte': 'Iogurte',
    'yogurt': 'Iogurte',
    'mingau': 'Mingau',
    'porridge': 'Mingau',
    'quinoa': 'Quinoa',
    'batata': 'Batata',
    'batata doce': 'Batata Doce',
    'sweet potato': 'Batata Doce',
  };
  
  for (const food of foods) {
    const normalized = normalizeText(food.name);
    
    // Skip simple beverages and fruits for title
    if (normalized.includes('cha ') || normalized.includes('cafe') || normalized.includes('agua') ||
        normalized.includes('tea') || normalized.includes('coffee') || normalized.includes('water') ||
        normalized.includes('suco') || normalized.includes('juice')) {
      continue;
    }
    
    // Check for proteins
    let foundProtein = false;
    const proteinKeywords = ['frango', 'chicken', 'carne', 'bife', 'beef', 'peixe', 'fish', 'salmao', 'salmon', 
                            'atum', 'tuna', 'ovo', 'ovos', 'egg', 'omelete', 'omelet', 'tofu', 'camarao', 'shrimp'];
    for (const pk of proteinKeywords) {
      if (normalized.includes(pk) && proteins.length < 2) {
        const displayName = DISPLAY_NAMES[pk] || pk.charAt(0).toUpperCase() + pk.slice(1);
        if (!proteins.includes(displayName)) {
          proteins.push(displayName);
          foundProtein = true;
          break;
        }
      }
    }
    
    if (foundProtein) continue;
    
    // Check for main carbs
    let foundCarb = false;
    const carbKeywords = ['arroz', 'rice', 'feijao', 'beans', 'tapioca', 'crepioca', 'aveia', 'oats', 
                         'pao integral', 'pao', 'bread', 'torrada', 'toast', 'macarrao', 'pasta', 
                         'mingau', 'porridge', 'quinoa', 'batata doce', 'batata', 'sweet potato'];
    for (const ck of carbKeywords) {
      if (normalized.includes(ck) && carbs.length < 2) {
        const displayName = DISPLAY_NAMES[ck] || ck.charAt(0).toUpperCase() + ck.slice(1);
        if (!carbs.includes(displayName)) {
          carbs.push(displayName);
          foundCarb = true;
          break;
        }
      }
    }
    
    if (foundCarb) continue;
    
    // Check for other significant items (iogurte, etc)
    const otherKeywords = ['iogurte', 'yogurt'];
    for (const ok of otherKeywords) {
      if (normalized.includes(ok) && others.length < 1) {
        const displayName = DISPLAY_NAMES[ok] || ok.charAt(0).toUpperCase() + ok.slice(1);
        if (!others.includes(displayName)) {
          others.push(displayName);
          break;
        }
      }
    }
  }
  
  // Build title in Portuguese format
  // REGRA: Para almoço/jantar, proteína SEMPRE primeiro
  // Para café/lanches, manter ordem original (carb/dairy primeiro)
  const isMainMeal = mealType === 'lunch' || mealType === 'dinner' || mealType === 'almoco' || mealType === 'jantar';
  
  let allParts: string[];
  if (isMainMeal && proteins.length > 0) {
    // Almoço/Jantar: Proteína primeiro, depois carbs, depois outros
    allParts = [...proteins, ...carbs, ...others];
  } else if (others.length > 0 && (mealType === 'breakfast' || mealType === 'cafe_manha' || mealType === 'supper' || mealType === 'ceia')) {
    // Café/Ceia: Laticínios primeiro se houver
    allParts = [...others, ...carbs, ...proteins];
  } else {
    // Lanches e outros: ordem padrão
    allParts = [...carbs, ...proteins, ...others];
  }
  
  // ============= COMBINAÇÕES PROIBIDAS NO TÍTULO =============
  // Regras culturais brasileiras - não combinar no título
  const FORBIDDEN_TITLE_COMBINATIONS: [string, string][] = [
    ['Arroz', 'Salada'],      // Arroz com Salada não é padrão BR
    ['Macarrão', 'Salada'],   // Macarrão com Salada não é padrão BR
    ['Macarrão', 'Feijão'],   // Macarrão com Feijão não existe
    ['Macarrão', 'Arroz'],    // Macarrão com Arroz não existe
    ['Batata', 'Arroz'],      // Dois carboidratos principais
  ];
  
  // Filtrar combinações proibidas do título
  let filteredParts = [...allParts];
  for (const [item1, item2] of FORBIDDEN_TITLE_COMBINATIONS) {
    const hasItem1 = filteredParts.some(p => p.toLowerCase().includes(item1.toLowerCase()));
    const hasItem2 = filteredParts.some(p => p.toLowerCase().includes(item2.toLowerCase()));
    
    if (hasItem1 && hasItem2) {
      // Remover o item menos importante (geralmente o segundo)
      // Prioridade: Proteína > Carb principal > Vegetal/Salada
      const item2Index = filteredParts.findIndex(p => p.toLowerCase().includes(item2.toLowerCase()));
      if (item2Index !== -1) {
        filteredParts.splice(item2Index, 1);
      }
    }
  }
  
  // Se após filtrar sobrou apenas carb sem proteína em refeição principal, buscar proteína nos foods
  if (isMainMeal && proteins.length === 0 && filteredParts.length > 0) {
    // Verificar se há proteína nos foods que não foi detectada
    const proteinFoods = foods.filter(f => {
      const n = normalizeText(f.name);
      return n.includes('frango') || n.includes('carne') || n.includes('bife') || 
             n.includes('peixe') || n.includes('ovo') || n.includes('file');
    });
    if (proteinFoods.length > 0) {
      // Adicionar proteína ao início
      const protName = proteinFoods[0].name.split(' ').slice(0, 2).join(' ');
      filteredParts.unshift(protName.charAt(0).toUpperCase() + protName.slice(1));
    }
  }
  
  if (filteredParts.length === 0) {
    // Fallback: use first food name
    return foods[0]?.name?.substring(0, 40) || 'Refeição';
  }
  
  if (filteredParts.length === 1) {
    return filteredParts[0];
  }
  
  if (filteredParts.length === 2) {
    return `${filteredParts[0]} com ${filteredParts[1]}`;
  }
  
  // 3+ parts: "A com B e C"
  const last = filteredParts.pop();
  return `${filteredParts.join(', ')} e ${last}`;
}

// ============= STOP WORDS - Verbos e palavras comuns que NÃO são ingredientes =============
const INSTRUCTION_STOP_WORDS = new Set([
  // Verbos culinários (português)
  'aqueça', 'aqueca', 'coloque', 'adicione', 'misture', 'sirva', 'corte', 'pique', 'frite',
  'asse', 'cozinhe', 'ferva', 'refogue', 'grelhe', 'tempere', 'bata', 'amasse', 'despeje',
  'espalhe', 'dobre', 'enrole', 'monte', 'finalize', 'decore', 'reserve', 'escorra',
  'leve', 'deixe', 'tampe', 'destampe', 'mexa', 'vire', 'retire', 'transfira',
  // Verbos culinários (espanhol)
  'caliente', 'agregue', 'mezcle', 'sirva', 'corte', 'pique', 'fria', 'hornee', 'cocine',
  'hierva', 'saltee', 'ase', 'sazone', 'bata', 'vierta', 'esparza', 'doble', 'enrolle',
  // Verbos culinários (inglês)
  'heat', 'add', 'mix', 'serve', 'cut', 'chop', 'fry', 'bake', 'cook', 'boil', 'saute',
  'grill', 'season', 'beat', 'pour', 'spread', 'fold', 'roll', 'garnish', 'drain',
  // Artigos e preposições (multi-idioma)
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'com', 'para', 'por', 'pelo', 'pela', 'ao', 'à',
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'del', 'al', 'con', 'para', 'por',
  'the', 'a', 'an', 'of', 'in', 'on', 'with', 'for', 'to', 'and', 'or',
  // Palavras comuns de instruções
  'uma', 'frigideira', 'panela', 'forno', 'microondas', 'antiaderente', 'medio', 'médio',
  'fogo', 'brando', 'alto', 'baixo', 'minutos', 'segundos', 'horas', 'ate', 'até',
  'bem', 'levemente', 'cuidadosamente', 'uniformemente', 'completamente',
  'picado', 'picada', 'picados', 'picadas', 'fatias', 'cubos', 'pedacos', 'pedaços',
  'meio', 'metade', 'inteiro', 'inteira', 'quente', 'frio', 'fria', 'morno', 'morna',
  'preferir', 'gosto', 'desejado', 'necessario', 'necessário',
  // Utensílios
  'colher', 'garfo', 'faca', 'prato', 'tigela', 'bowl', 'forma', 'assadeira', 'tabuleiro',
]);

// ============= EXTRAIR PALAVRAS-CHAVE DOS FOODS (AUTOMÁTICO) =============
function extractFoodKeywords(foods: FoodItem[]): Set<string> {
  const keywords = new Set<string>();
  
  for (const food of foods) {
    // Normalizar e tokenizar o nome do alimento
    const normalized = normalizeText(food.name);
    const words = normalized.split(/[\s,\-\(\)\/]+/).filter(w => w.length >= 3);
    
    for (const word of words) {
      // Ignorar números e palavras muito curtas
      if (!/^\d+$/.test(word) && word.length >= 3) {
        keywords.add(word);
        // Adicionar variações sem acento
        keywords.add(word.replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i').replace(/[óòôõ]/g, 'o').replace(/[úùû]/g, 'u').replace(/ç/g, 'c'));
      }
    }
  }
  
  return keywords;
}

// ============= VALIDAR E CORRIGIR INSTRUÇÕES (AUTOMÁTICO) =============
function validateAndFixInstructions(
  instructions: string[] | undefined,
  foods: FoodItem[]
): string[] {
  if (!instructions || instructions.length === 0) {
    return [];
  }
  
  // Extrair AUTOMATICAMENTE todas as palavras-chave dos foods
  const foodKeywords = extractFoodKeywords(foods);
  
  const validInstructions: string[] = [];
  
  for (const instruction of instructions) {
    const normalizedInstruction = normalizeText(instruction);
    const instructionWords = normalizedInstruction.split(/[\s,\-\(\)\/\.]+/).filter(w => w.length >= 3);
    
    let mentionsPhantomIngredient = false;
    let phantomIngredient = '';
    
    for (const word of instructionWords) {
      // Ignorar stop words (verbos, artigos, preposições)
      if (INSTRUCTION_STOP_WORDS.has(word)) continue;
      
      // Ignorar números
      if (/^\d+$/.test(word)) continue;
      
      // Verificar se a palavra parece ser um ingrediente (substantivo alimentar)
      // Se a palavra NÃO está nos foods E tem características de ingrediente, é fantasma
      const wordVariant = word.replace(/[áàâã]/g, 'a').replace(/[éèê]/g, 'e').replace(/[íìî]/g, 'i').replace(/[óòôõ]/g, 'o').replace(/[úùû]/g, 'u').replace(/ç/g, 'c');
      
      const isInFoods = foodKeywords.has(word) || foodKeywords.has(wordVariant) ||
        Array.from(foodKeywords).some(fk => fk.includes(word) || word.includes(fk));
      
      if (!isInFoods) {
        // Verificar se parece ser um ingrediente (não é verbo comum, utensílio, etc.)
        // Palavras que terminam em padrões de ingredientes
        const looksLikeIngredient = 
          word.endsWith('oca') || word.endsWith('ioca') || // tapioca, crepioca
          word.endsWith('elo') || word.endsWith('elos') || // cogumelo
          word.endsWith('ssa') || // massa
          word.endsWith('nte') || word.endsWith('ntes') || // ingrediente comum
          word.endsWith('ao') || word.endsWith('ão') || // feijão, limão
          word.endsWith('igo') || // trigo
          word.endsWith('ote') || // mamão, abacate
          word.endsWith('ngo') || // frango
          word.endsWith('xa') || // linhaça
          word.endsWith('ia') || // chia, tapioca
          (word.length >= 5 && !INSTRUCTION_STOP_WORDS.has(word));
        
        if (looksLikeIngredient) {
          mentionsPhantomIngredient = true;
          phantomIngredient = word;
          break;
        }
      }
    }
    
    if (mentionsPhantomIngredient) {
      logStep(`🚫 INSTRUÇÃO REJEITADA: "${instruction}" menciona "${phantomIngredient}" que NÃO está nos ingredientes`, {
        ingredientesPresentes: Array.from(foodKeywords).slice(0, 20),
      });
    } else {
      validInstructions.push(instruction);
    }
  }
  
  // Se removemos TODAS as instruções, gerar instruções genéricas baseadas nos foods
  if (validInstructions.length === 0 && foods.length > 0) {
    const mainFoods = foods.filter(f => {
      const n = normalizeText(f.name);
      return !n.includes('cha') && !n.includes('cafe') && !n.includes('agua');
    });
    
    if (mainFoods.length > 0) {
      // Extrair nome limpo do primeiro alimento
      const firstFoodName = mainFoods[0].name
        .replace(/^\d+\s*(unidade[s]?|porcao|colher[es]?\s*(de\s*sopa)?)\s*(de\s*)?/gi, '')
        .trim();
      
      validInstructions.push(`Sirva ${firstFoodName} como preferir.`);
    } else {
      // Último fallback para frutas/bebidas
      validInstructions.push('Consumir naturalmente.');
    }
    
    logStep(`🔧 INSTRUÇÕES GERADAS AUTOMATICAMENTE para refeição com ${foods.length} alimento(s)`, {
      novasInstrucoes: validInstructions,
    });
  }
  
  return validInstructions;
}

// ============= VALIDAÇÃO: Macros Realistas por Tipo de Alimento =============
function validateRealisticMacros(
  food: FoodItem,
  declaredCalories: number
): { isRealistic: boolean; suggestedCalories?: number; issue?: string } {
  const normalizedName = normalizeText(food.name);
  
  // Bebidas simples (chás, água) - máximo 5 calorias por 100g
  const zeroCalorieBeverages = [
    'cha', 'agua', 'cafe preto', 'cafe sem acucar', 'infusao'
  ];
  
  const isZeroCalorieBeverage = zeroCalorieBeverages.some(b => normalizedName.includes(b));
  if (isZeroCalorieBeverage) {
    const maxCalsForBeverage = Math.round(food.grams * 0.05); // 5 cal/100g max
    if (declaredCalories > maxCalsForBeverage + 20) {
      return { 
        isRealistic: false, 
        suggestedCalories: maxCalsForBeverage,
        issue: `Bebida "${food.name}" com ${declaredCalories} kcal é irrealista. Máx esperado: ~${maxCalsForBeverage} kcal`
      };
    }
  }
  
  // Frutas simples - entre 30-100 cal por 100g
  const simpleFruits = ['banana', 'maca', 'laranja', 'pera', 'morango', 'mamao', 'manga'];
  const isSimpleFruit = simpleFruits.some(f => normalizedName.includes(f) && !normalizedName.includes('vitamina'));
  if (isSimpleFruit && food.grams <= 200) {
    const minCals = Math.round(food.grams * 0.3);
    const maxCals = Math.round(food.grams * 1.1);
    if (declaredCalories < minCals || declaredCalories > maxCals * 1.5) {
      const suggested = Math.round(food.grams * 0.6); // ~60 cal/100g média
      return { 
        isRealistic: false, 
        suggestedCalories: suggested,
        issue: `Fruta "${food.name}" com ${declaredCalories} kcal. Esperado: ${minCals}-${maxCals} kcal`
      };
    }
  }
  
  return { isRealistic: true };
}

// ============= VALIDAÇÃO: Uso Correto de Medidas Caseiras =============
function validateMeasureUsage(food: FoodItem): { isCorrect: boolean; fixedName?: string; issue?: string } {
  const name = food.name;
  const normalizedName = normalizeText(name);
  const usesCupMeasure = normalizedName.includes('xicara') || name.includes('xícara');
  
  // ============= ARROZ/GRÃOS NÃO devem usar "xícara" - corrigir para "colher de sopa" =============
  const grainsFoods = ['arroz', 'quinoa', 'quinua', 'feijao', 'lentilha', 'grao de bico', 'ervilha'];
  const hasGrain = grainsFoods.some(g => normalizedName.includes(g));
  
  if (hasGrain && usesCupMeasure) {
    // Calcular quantas colheres de sopa baseado na gramagem (1 colher de sopa ≈ 25g)
    const tablespoons = Math.max(2, Math.round(food.grams / 25));
    const fixedName = name
      .replace(/\d+\s*x[íi]cara[s]?\s*(de\s*)?/gi, `${tablespoons} colheres de sopa de `)
      .replace(/uma\s*x[íi]cara\s*(de\s*)?/gi, `${tablespoons} colheres de sopa de `);
    return { 
      isCorrect: false, 
      fixedName,
      issue: `Grão/arroz "${name}" deve usar "colher de sopa", não "xícara"`
    };
  }
  
  // ============= VEGETAIS sólidos NÃO devem usar "xícara" - corrigir para "porção" =============
  const solidVegetables = ['brocolis', 'couve', 'espinafre', 'alface', 'rucula', 'agriao', 'repolho', 'cenoura', 'abobrinha', 'berinjela', 'tomate', 'pepino', 'legume'];
  const hasSolidVeggie = solidVegetables.some(v => normalizedName.includes(v));
  
  if (hasSolidVeggie && usesCupMeasure) {
    const fixedName = name
      .replace(/\d+\s*x[íi]cara[s]?\s*(de\s*)?/gi, '1 porção de ')
      .replace(/uma\s*x[íi]cara\s*(de\s*)?/gi, '1 porção de ');
    return { 
      isCorrect: false, 
      fixedName,
      issue: `Vegetal sólido "${name}" não deve usar medida "xícara"`
    };
  }
  
  // ============= FRUTAS NÃO devem usar "xícara" - corrigir para "unidade" =============
  const fruits = ['banana', 'maca', 'laranja', 'pera', 'morango', 'mamao', 'manga', 'abacate', 'kiwi', 'uva', 'melancia', 'melao'];
  const hasFruit = fruits.some(f => normalizedName.includes(f));
  
  if (hasFruit && usesCupMeasure) {
    const fixedName = name
      .replace(/\d+\s*x[íi]cara[s]?\s*(de\s*)?/gi, '1 unidade média de ')
      .replace(/uma\s*x[íi]cara\s*(de\s*)?/gi, '1 unidade média de ');
    return { 
      isCorrect: false, 
      fixedName,
      issue: `Fruta "${name}" deve usar "unidade", não "xícara"`
    };
  }
  
  // ============= Gramas duplicados no nome (ex: "100g de atum") =============
  const gramsInName = /\d+\s*g\s*(de\s*)?/i.test(name);
  if (gramsInName) {
    const fixedName = name.replace(/\d+\s*g\s*(de\s*)?/gi, '1 porção de ');
    return { 
      isCorrect: false, 
      fixedName,
      issue: `Gramagem duplicada no nome "${name}" - já existe no campo grams`
    };
  }
  
  return { isCorrect: true };
}

// ============= LOCALIZED DEFAULT PORTIONS =============
// Now imported from mealGenerationConfig.ts for centralization
// getLocalizedDefaultPortions is available via import

function validateMealPlan(
  dayPlan: SimpleDayPlan,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  dbMappings: IntoleranceMapping[],
  dbSafeKeywords: SafeKeyword[],
  countryCode: string = 'BR'
): {
  validatedPlan: SimpleDayPlan;
  violations: Array<{ meal: string; food: string; reason: string; restriction: string }>;
  needsRegeneration: boolean;
} {
  const violations: Array<{ meal: string; food: string; reason: string; restriction: string }> = [];
  let needsRegeneration = false;
  
  const validatedMeals = dayPlan.meals.map(meal => {
    const validatedOptions = meal.options.map(option => {
      const cleanedFoods: FoodItem[] = [];
      let optionTotalCalories = 0;
      
      for (const food of option.foods) {
        const foodName = typeof food === 'string' ? food : food.name;
        const foodGrams = typeof food === 'object' && 'grams' in food ? food.grams : 100;
        const validation = validateFood(foodName, restrictions, dbMappings, dbSafeKeywords);
        
        if (validation.isValid) {
          // Use substituted name if available (Smart Substitution)
          const effectiveName = validation.substitutedName || foodName;
          let fixedFood: FoodItem = { name: effectiveName, grams: foodGrams };
          
          // Log smart substitution
          if (validation.substitutedName) {
            logStep(`🔄 SMART SUBSTITUTION: "${foodName}" → "${validation.substitutedName}"`);
          }
          
          // Validação 1: Corrigir uso incorreto de medidas
          const measureCheck = validateMeasureUsage(fixedFood);
          if (!measureCheck.isCorrect && measureCheck.fixedName) {
            logStep(`🔧 CORREÇÃO DE MEDIDA: "${effectiveName}" → "${measureCheck.fixedName}"`, { issue: measureCheck.issue });
            fixedFood.name = measureCheck.fixedName;
          }
          
          // Calcular calorias do item para validação
          const itemCalories = calculateFoodCalories(fixedFood.name, fixedFood.grams);
          optionTotalCalories += itemCalories.calories;
          
          cleanedFoods.push(fixedFood);
        } else {
          violations.push({
            meal: meal.label,
            food: foodName,
            reason: validation.reason || 'Restriction violated',
            restriction: validation.restriction || 'unknown',
          });
        }
      }
      
      // Validation 2: Title-ingredient coherence - BIDIRECTIONAL CHECK
      const coherenceCheck = validateTitleIngredientCoherence(option.title, cleanedFoods);
      let finalTitle = option.title;
      
      if (!coherenceCheck.isCoherent || coherenceCheck.shouldRegenerateTitle) {
        logStep(`⚠️ TITLE-INGREDIENT INCOHERENCE DETECTED`, {
          originalTitle: option.title,
          issue: coherenceCheck.issue,
          missingIngredients: coherenceCheck.missingIngredients,
          shouldRegenerateTitle: coherenceCheck.shouldRegenerateTitle,
          foods: cleanedFoods.map(f => f.name),
        });
        
        // If shouldRegenerateTitle is true (Direction 2 failed: foods have main ingredients not in title)
        // OR if we have phantom ingredients in title - always regenerate title from foods
        if (coherenceCheck.shouldRegenerateTitle) {
          const correctedTitle = generateTitleFromFoods(cleanedFoods, meal.meal_type);
          finalTitle = correctedTitle;
          logStep(`🔧 TITLE REGENERATED FROM FOODS: "${option.title}" → "${correctedTitle}"`);
        } else if (coherenceCheck.missingIngredients.length > 0) {
          // Direction 1: Title mentions phantom ingredients - try to add them or fix title
          // LOCALIZED defaultPortions by countryCode - names in user's native language
          const defaultPortions = getLocalizedDefaultPortions(countryCode);
          
          // Detect categories already present in foods
          const categoriesPresent = new Set<string>();
          for (const food of cleanedFoods) {
            const foodNameLower = normalizeText(food.name);
            for (const [key, data] of Object.entries(defaultPortions)) {
              if (foodNameLower.includes(key) || foodNameLower.includes(data.category)) {
                categoriesPresent.add(data.category);
              }
            }
            // Detect categories by common keywords
            if (foodNameLower.includes('pao') || foodNameLower.includes('bread') || foodNameLower.includes('torrada') || foodNameLower.includes('toast') || foodNameLower.includes('baguete')) {
              categoriesPresent.add('bread');
            }
            if (foodNameLower.includes('cafe') || foodNameLower.includes('coffee') || foodNameLower.includes('suco') || foodNameLower.includes('juice') || foodNameLower.includes('cha') || foodNameLower.includes('tea') || foodNameLower.includes('leite') || foodNameLower.includes('milk')) {
              categoriesPresent.add('beverage');
            }
            if (foodNameLower.includes('banana') || foodNameLower.includes('mamao') || foodNameLower.includes('papaya') || foodNameLower.includes('morango') || foodNameLower.includes('strawberry') || foodNameLower.includes('laranja') || foodNameLower.includes('orange') || foodNameLower.includes('maca') || foodNameLower.includes('apple')) {
              categoriesPresent.add('fruit');
            }
          }
          
          let ingredientsAdded = 0;
          for (const missing of coherenceCheck.missingIngredients) {
            const portion = defaultPortions[missing];
            if (portion) {
              // NEW RULE: Don't add if category already exists
              if (categoriesPresent.has(portion.category)) {
                logStep(`⚠️ DUPLICATE CATEGORY AVOIDED: "${missing}" (${portion.category}) - already in meal`);
                continue;
              }
              cleanedFoods.push({ name: portion.name, grams: portion.grams });
              categoriesPresent.add(portion.category); // Mark as present
              ingredientsAdded++;
              logStep(`🔧 INGREDIENT ADDED: "${missing}" → "${portion.name}" (${portion.grams}g)`);
            } else {
              // If we don't have default portion, will fix title instead
              logStep(`⚠️ NO DEFAULT PORTION for "${missing}" - will be removed from title`);
            }
          }
          
          // Revalidate after adding ingredients
          const recheck = validateTitleIngredientCoherence(option.title, cleanedFoods);
          if (!recheck.isCoherent || recheck.shouldRegenerateTitle) {
            // Still incoherent: generate title based on actual ingredients
            const correctedTitle = generateTitleFromFoods(cleanedFoods, meal.meal_type);
            finalTitle = correctedTitle;
            logStep(`🔧 TITLE CORRECTED: "${option.title}" → "${correctedTitle}"`);
          }
        }
      }
      
      // Validação 3: Corrigir instruções que mencionam ingredientes fantasmas
      const validatedInstructions = validateAndFixInstructions(
        option.instructions as string[] | undefined,
        cleanedFoods
      );
      
      if (option.instructions && validatedInstructions.length !== (option.instructions as string[]).length) {
        logStep(`🔧 INSTRUÇÕES CORRIGIDAS: ${(option.instructions as string[]).length} → ${validatedInstructions.length} passos`, {
          original: option.instructions,
          corrected: validatedInstructions,
        });
      }
      
      // Validação 4: Macros realistas
      for (const food of cleanedFoods) {
        const macroCheck = validateRealisticMacros(food, option.calories_kcal);
        if (!macroCheck.isRealistic) {
          logStep(`⚠️ MACRO IRREALISTA: ${macroCheck.issue}`, { 
            food: food.name, 
            declared: option.calories_kcal,
            suggested: macroCheck.suggestedCalories 
          });
        }
      }
      
      // ============= VALIDAÇÃO 5: REMOVER DUPLICATAS DE CATEGORIA =============
      // Ex: Se houver "pão integral" E "pão francês", manter apenas o primeiro
      const CATEGORY_KEYWORDS: Record<string, string[]> = {
        'pao': ['pao', 'pão', 'torrada', 'baguete', 'bisnaguinha', 'croissant'],
        'arroz': ['arroz'],
        'feijao': ['feijao', 'feijão', 'lentilha', 'grao de bico', 'grão-de-bico', 'ervilha'],
        'proteina_frango': ['frango', 'peito de frango'],
        'proteina_carne': ['carne', 'bife', 'patinho', 'alcatra', 'file mignon'],
        'proteina_peixe': ['peixe', 'tilapia', 'salmao', 'atum', 'sardinha'],
        'ovo': ['ovo', 'ovos', 'omelete', 'clara'],
        'iogurte': ['iogurte', 'yogurt', 'coalhada'],
        'queijo': ['queijo', 'ricota', 'cottage', 'requeijao'],
        'leguminosa': ['feijao', 'feijão', 'lentilha', 'grao de bico', 'grão-de-bico', 'ervilha', 'fava'],
        'vegetal': ['salada', 'alface', 'tomate', 'pepino', 'brocolis', 'couve', 'espinafre', 'cenoura', 'abobrinha', 'legumes'],
        'fruta': ['banana', 'maca', 'maçã', 'laranja', 'mamao', 'mamão', 'morango', 'melancia', 'melao', 'abacaxi', 'uva', 'pera', 'kiwi', 'manga'],
      };
      
      const categoryUsed = new Set<string>();
      const deduplicatedFoods: FoodItem[] = [];
      
      for (const food of cleanedFoods) {
        const foodNameLower = normalizeText(food.name);
        let foodCategory: string | null = null;
        
        for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          for (const kw of keywords) {
            if (foodNameLower.includes(kw)) {
              foodCategory = category;
              break;
            }
          }
          if (foodCategory) break;
        }
        
        // Se é uma categoria rastreada e já usada, remover duplicata
        if (foodCategory && categoryUsed.has(foodCategory)) {
          logStep(`🚫 DUPLICATA REMOVIDA: "${food.name}" - categoria "${foodCategory}" já presente`);
          continue;
        }
        
        if (foodCategory) {
          categoryUsed.add(foodCategory);
        }
        deduplicatedFoods.push(food);
      }
      
      // Usar a lista deduplicada
      let finalCleanedFoods = deduplicatedFoods;
      
      // ============= VALIDAÇÃO 6: ESTRUTURA OBRIGATÓRIA POR TIPO DE REFEIÇÃO =============
      // Garantir que cada refeição tenha os componentes essenciais
      const MEAL_STRUCTURE_REQUIREMENTS: Record<string, { 
        required: string[];  // Categorias obrigatórias
        optional?: string[]; // Categorias opcionais mas recomendadas
        minComponents: number;
      }> = {
        breakfast: {
          required: ['proteina'],  // Proteína obrigatória no café
          optional: ['carbo', 'fruta', 'gordura_boa'],
          minComponents: 3,
        },
        morning_snack: {
          required: ['proteina'],  // Proteína leve obrigatória
          optional: ['fruta'],
          minComponents: 2,
        },
        lunch: {
          required: ['proteina', 'leguminosa', 'vegetal'],  // Proteína + feijão + vegetal obrigatórios
          optional: ['carbo'],
          minComponents: 4,
        },
        afternoon_snack: {
          required: ['proteina'],  // Proteína obrigatória
          optional: ['carbo', 'fruta'],
          minComponents: 2,
        },
        dinner: {
          required: ['proteina', 'vegetal'],  // Proteína + vegetal obrigatórios
          optional: ['carbo', 'leguminosa'],
          minComponents: 3,
        },
        supper: {
          required: ['proteina'],  // Proteína obrigatória para recuperação noturna
          optional: ['gordura_boa'],
          minComponents: 1,
        },
      };
      
      // Mapeamento de categorias para detecção
      const STRUCTURE_CATEGORY_DETECTION: Record<string, string[]> = {
        'proteina': ['frango', 'carne', 'peixe', 'ovo', 'ovos', 'omelete', 'clara', 'tofu', 'queijo', 'iogurte', 'ricota', 'cottage', 'atum', 'salmao', 'tilapia', 'sardinha', 'peito de peru', 'whey', 'presunto', 'peito de frango', 'bife', 'file', 'filé', 'camarao', 'camarão'],
        'leguminosa': ['feijao', 'feijão', 'lentilha', 'grao de bico', 'grão-de-bico', 'ervilha', 'fava', 'soja', 'edamame'],
        'vegetal': ['salada', 'alface', 'tomate', 'pepino', 'brocolis', 'brócolis', 'couve', 'espinafre', 'cenoura', 'abobrinha', 'legumes', 'rucula', 'rúcula', 'agriao', 'agrião', 'repolho', 'acelga', 'chicoria', 'berinjela', 'vagem', 'aspargo'],
        'carbo': ['arroz', 'pao', 'pão', 'torrada', 'batata', 'mandioca', 'macarrao', 'massa', 'aveia', 'tapioca', 'cuscuz', 'quinoa', 'milho', 'polenta', 'inhame', 'cará'],
        'fruta': ['banana', 'maca', 'maçã', 'laranja', 'mamao', 'mamão', 'morango', 'melancia', 'melao', 'melão', 'abacaxi', 'uva', 'pera', 'pêra', 'kiwi', 'manga', 'goiaba', 'abacate', 'ameixa', 'framboesa', 'mirtilo'],
        'gordura_boa': ['azeite', 'castanha', 'amendoa', 'amêndoa', 'nozes', 'semente', 'chia', 'linhaca', 'linhaça', 'pasta de amendoim', 'manteiga de amendoim', 'abacate', 'coco'],
      };
      
      // Ingredientes padrão para adicionar quando componente estiver faltando
      const DEFAULT_STRUCTURE_FOODS: Record<string, { name: string; grams: number }[]> = {
        'proteina': [
          { name: 'Ovo cozido', grams: 50 },
          { name: 'Iogurte natural', grams: 150 },
          { name: 'Queijo branco', grams: 30 },
        ],
        'leguminosa': [
          { name: 'Feijão carioca', grams: 80 },
          { name: 'Lentilha cozida', grams: 80 },
          { name: 'Grão-de-bico', grams: 80 },
        ],
        'vegetal': [
          { name: 'Salada verde', grams: 60 },
          { name: 'Legumes no vapor', grams: 80 },
          { name: 'Tomate fatiado', grams: 50 },
        ],
        'carbo': [
          { name: '2 colheres de arroz', grams: 100 },
          { name: '1 fatia de pão integral', grams: 35 },
        ],
        'fruta': [
          { name: 'Banana', grams: 100 },
          { name: 'Maçã', grams: 120 },
        ],
        'gordura_boa': [
          { name: '1 colher de azeite', grams: 10 },
          { name: 'Castanhas', grams: 20 },
        ],
      };
      
      // Verificar e completar estrutura da refeição
      const mealReq = MEAL_STRUCTURE_REQUIREMENTS[meal.meal_type];
      if (mealReq) {
        // Detectar categorias presentes
        const presentCategories = new Set<string>();
        for (const food of finalCleanedFoods) {
          const foodNameLower = normalizeText(food.name);
          for (const [category, keywords] of Object.entries(STRUCTURE_CATEGORY_DETECTION)) {
            for (const kw of keywords) {
              if (foodNameLower.includes(kw)) {
                presentCategories.add(category);
                break;
              }
            }
          }
        }
        
        // Verificar componentes obrigatórios faltantes
        const missingRequired: string[] = [];
        for (const required of mealReq.required) {
          if (!presentCategories.has(required)) {
            missingRequired.push(required);
          }
        }
        
        // Adicionar componentes faltantes
        if (missingRequired.length > 0) {
          logStep(`⚠️ ESTRUTURA INCOMPLETA em "${meal.label}"`, {
            mealType: meal.meal_type,
            required: mealReq.required,
            present: Array.from(presentCategories),
            missing: missingRequired,
          });
          
          for (const missingCategory of missingRequired) {
            const defaults = DEFAULT_STRUCTURE_FOODS[missingCategory];
            if (defaults && defaults.length > 0) {
              // Escolher um alimento aleatório do pool para variedade
              const randomIndex = Math.floor(Math.random() * defaults.length);
              const foodToAdd = defaults[randomIndex];
              
              // Verificar se o alimento é seguro para as restrições do usuário
              const validation = validateFood(foodToAdd.name, {
                intolerances: restrictions.intolerances,
                dietaryPreference: restrictions.dietaryPreference,
                excludedIngredients: restrictions.excludedIngredients,
              }, dbMappings, dbSafeKeywords);
              
              if (validation.isValid) {
                finalCleanedFoods.push(foodToAdd);
                logStep(`✅ COMPONENTE ADICIONADO: "${foodToAdd.name}" (${missingCategory}) em "${meal.label}"`);
              } else {
                // Se o primeiro não for válido, tentar os outros
                let added = false;
                for (const alt of defaults) {
                  if (alt.name === foodToAdd.name) continue;
                  const altValidation = validateFood(alt.name, {
                    intolerances: restrictions.intolerances,
                    dietaryPreference: restrictions.dietaryPreference,
                    excludedIngredients: restrictions.excludedIngredients,
                  }, dbMappings, dbSafeKeywords);
                  if (altValidation.isValid) {
                    finalCleanedFoods.push(alt);
                    logStep(`✅ COMPONENTE ALTERNATIVO ADICIONADO: "${alt.name}" (${missingCategory}) em "${meal.label}"`);
                    added = true;
                    break;
                  }
                }
                if (!added) {
                  logStep(`⚠️ NÃO FOI POSSÍVEL ADICIONAR ${missingCategory} - todas as opções violam restrições`);
                }
              }
            }
          }
        }
      }
      
      // ============= PÓS-PROCESSAMENTO: AGRUPAR INGREDIENTES SEPARADOS =============
      const foodsForGrouping: FoodItem[] = finalCleanedFoods.map(f => ({
        name: typeof f === 'string' ? f : f.name,
        grams: typeof f === 'object' && 'grams' in f ? f.grams : 100,
      }));
      
      const { groupedFoods, wasGrouped, groupedTitle } = groupSeparatedIngredients(
        foodsForGrouping,
        meal.meal_type
      );
      
      if (wasGrouped) {
        logStep(`🔄 AGRUPAMENTO APLICADO em "${meal.label}"`, {
          originalCount: finalCleanedFoods.length,
          groupedCount: groupedFoods.length,
          groupedTitle,
          originalItems: finalCleanedFoods.map(f => typeof f === 'string' ? f : f.name),
          groupedItems: groupedFoods.map(f => f.name),
        });
      }
      
      // Se houve agrupamento e ainda há incoerência, atualizar título novamente
      const titleAfterGrouping = updateMealTitleIfNeeded(finalTitle, groupedTitle, wasGrouped);
      
      // ============= ORDENAR INGREDIENTES (FRUTAS/SOBREMESAS POR ÚLTIMO) =============
      const sortedFoods = sortMealIngredients(groupedFoods);
      
      const orderChanged = groupedFoods.length > 1 && 
        groupedFoods.some((f, i) => sortedFoods[i]?.name !== f.name);
      if (orderChanged) {
        logStep(`📋 ORDENAÇÃO APLICADA em "${meal.label}"`, {
          antes: groupedFoods.map(f => f.name),
          depois: sortedFoods.map(f => f.name),
        });
      }
      
      // Calcular calorias baseado na tabela (usar foods ordenados)
      const calculatedCalories = calculateOptionCalories(sortedFoods);
      
      // Garantir que nunca retornamos 0 calorias
      let finalCalories = calculatedCalories > 0 ? calculatedCalories : option.calories_kcal;
      if (finalCalories <= 0) {
        // Fallback: estimar baseado em 100 cal por 100g (média genérica)
        const estimatedFromGrams = sortedFoods.reduce((sum, f) => sum + (f.grams || 100), 0);
        finalCalories = Math.max(estimatedFromGrams, 100);
        logStep(`⚠️ FALLBACK CALORIAS: option "${option.title}" tinha 0 cal, estimando ${finalCalories}`);
      }
      
      if (sortedFoods.length === 0) {
        logStep(`⚠️ WARNING: Option "${option.title}" has all foods removed by restrictions - keeping original foods for user to swap later`);
      }
      
      return {
        ...option,
        title: titleAfterGrouping,
        foods: sortedFoods.length > 0 ? sortedFoods : option.foods,
        instructions: validatedInstructions.length > 0 ? validatedInstructions : option.instructions,
        calculated_calories: finalCalories,
        calories_kcal: finalCalories,
      };
    });
    
    return {
      ...meal,
      options: validatedOptions,
    };
  });
  
  return {
    validatedPlan: {
      ...dayPlan,
      meals: validatedMeals,
    },
    violations,
    needsRegeneration,
  };
}

// ============= MAIN SERVER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Client com SERVICE_ROLE para operações de banco (bypass RLS)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Client com ANON_KEY para validar tokens de usuário
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("AI Meal Plan Generator - Hybrid Mode (Simple + Smart)");

    // Auth - extrair token do header Authorization
    const authHeader = req.headers.get("Authorization");
    logStep("Auth header check", { exists: !!authHeader, length: authHeader?.length || 0 });
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length, tokenStart: token.substring(0, 30) });
    
    // Validar token usando o client com ANON_KEY
    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    logStep("Auth result", { success: !userError, error: userError?.message, userId: userData?.user?.id });
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request
    const requestBody = await req.json();
    const {
      dailyCalories: requestedCalories, // Pode ser undefined, será calculado
      daysCount = 1,
      optionsPerMeal = 3,
      mealTypes: requestedMealTypes, // Pode ser undefined, será buscado do perfil
      // Novos parâmetros para salvar no banco (vindos do MealPlanGenerator)
      planName,
      startDate,
      existingPlanId,
      weekNumber,
      customMealTimes,
      saveToDatabase = false, // Por padrão não salva (modo teste admin)
      dayOffset = 0, // Offset global de dias para batches subsequentes
    } = requestBody;
    
    // Detectar automaticamente se deve salvar no banco
    const shouldSaveToDatabase = saveToDatabase || planName || startDate;

    logStep("Request params", { requestedCalories, daysCount, optionsPerMeal, requestedMealTypes, shouldSaveToDatabase });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    
    // ============= DETERMINE MEAL TYPES BASED ON PROFILE =============
    // Priority: 1) requestedMealTypes (from request), 2) enabled_meals (from profile), 3) default 5 meals
    const DEFAULT_MEAL_TYPES = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"];
    
    // Normalization map for legacy Portuguese keys
    const MEAL_TYPE_NORMALIZATION: Record<string, string> = {
      "cafe_manha": "breakfast",
      "lanche_manha": "morning_snack",
      "almoco": "lunch",
      "lanche": "afternoon_snack",
      "lanche_tarde": "afternoon_snack",
      "jantar": "dinner",
      "ceia": "supper",
    };
    
    const normalizeMealType = (meal: string): string => {
      return MEAL_TYPE_NORMALIZATION[meal] || meal;
    };
    
    logStep("🔍 DEBUG: Checking mealTypes sources", { 
      requestedMealTypes, 
      profileEnabledMeals: profile.enabled_meals,
      hasRequestedTypes: !!(requestedMealTypes && Array.isArray(requestedMealTypes) && requestedMealTypes.length > 0),
      hasProfileTypes: !!(profile.enabled_meals && Array.isArray(profile.enabled_meals) && profile.enabled_meals.length > 0)
    });
    
    let mealTypes: string[];
    if (requestedMealTypes && Array.isArray(requestedMealTypes) && requestedMealTypes.length > 0) {
      // Use types from request (normalize if needed)
      mealTypes = requestedMealTypes.map(normalizeMealType);
      logStep("✅ Using mealTypes from REQUEST", { mealTypes, count: mealTypes.length });
    } else if (profile.enabled_meals && Array.isArray(profile.enabled_meals) && profile.enabled_meals.length > 0) {
      // Use types from user profile (normalize legacy Portuguese keys)
      mealTypes = profile.enabled_meals.map(normalizeMealType);
      logStep("✅ Using mealTypes from PROFILE (enabled_meals)", { mealTypes, count: mealTypes.length, original: profile.enabled_meals });
    } else {
      // Fallback to default
      mealTypes = DEFAULT_MEAL_TYPES;
      logStep("⚠️ Using DEFAULT mealTypes (no source found)", { mealTypes, count: mealTypes.length });
    }
    
    logStep("📋 FINAL mealTypes to generate", { mealTypes, count: mealTypes.length });
    
    // Get regional configuration based on user's country
    const userCountry = profile.country || 'BR';
    const regional = getRegionalConfig(userCountry);
    
    logStep("Regional config", { country: userCountry, language: regional.language });

    const restrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || 'omnivore',
      excludedIngredients: profile.excluded_ingredients || [],
      goal: profile.goal || 'maintain',
    };

    logStep("User restrictions", restrictions);

    // ============= DETERMINAR STRATEGY KEY =============
    // Buscar a chave da estratégia nutricional para aplicar persona culinária
    let strategyKey: string | undefined = undefined;
    let originalStrategyKey: string | undefined = undefined; // Guardar a estratégia original para alternativas
    
    if (profile.strategy_id) {
      // Buscar a key da estratégia do banco
      const { data: strategyData } = await supabaseAdmin
        .from("nutritional_strategies")
        .select("key")
        .eq("id", profile.strategy_id)
        .single();
      
      if (strategyData?.key) {
        strategyKey = strategyData.key;
        originalStrategyKey = strategyData.key;
        logStep("Strategy key from database", { strategyId: profile.strategy_id, strategyKey });
      }
    }
    
    // Fallback: usar goal legado como strategyKey
    if (!strategyKey) {
      strategyKey = restrictions.goal;
      originalStrategyKey = restrictions.goal;
      logStep("Using goal as fallback strategy key", { strategyKey });
    }

    // ============= REGRA DIETA FLEXÍVEL =============
    // Para Dieta Flexível: gerar plano com pool de EMAGRECIMENTO (saudável)
    // As comfort foods só aparecem como ALTERNATIVAS ao trocar refeição
    let effectiveStrategyKey = strategyKey;
    if (strategyKey === 'dieta_flexivel') {
      effectiveStrategyKey = 'lose_weight'; // Usa pool saudável para o plano principal
      logStep("🍽️ Dieta Flexível: usando pool de EMAGRECIMENTO para plano principal");
      logStep("💡 Comfort foods disponíveis apenas nas alternativas de troca");
    }

    logStep("🎯 Final strategy key for culinary persona", { 
      original: originalStrategyKey, 
      effective: effectiveStrategyKey 
    });

    // ============= CÁLCULOS NUTRICIONAIS CENTRALIZADOS =============
    // Calcular targets nutricionais baseados no perfil do usuário
    let nutritionalTargets: NutritionalTargets | null = null;
    let dailyCalories = requestedCalories || 2000; // Fallback padrão
    let nutritionalContext = ""; // Contexto para enriquecer o prompt
    
    if (profile.weight_current && profile.height && profile.age && profile.sex) {
      const physicalData: UserPhysicalData = {
        sex: profile.sex ?? null,
        age: profile.age ?? null,
        height: profile.height ?? null,
        weight_current: profile.weight_current ?? null,
        weight_goal: profile.weight_goal ?? null,
        activity_level: profile.activity_level ?? null,
      };

      // Determinar parâmetros de estratégia baseado no objetivo
      // Database now stores: "lose_weight" | "maintain" | "gain_weight"
      const goal = profile.goal || 'maintain';
      const dietaryPreference = profile.dietary_preference || 'omnivore';
      
      let calorieModifier = 0;
      let proteinPerKg = 1.6;
      let carbRatio = 0.45;
      let fatRatio = 0.30;

      // Ajustes por objetivo
      if (goal === 'lose_weight') {
        calorieModifier = -500;
        proteinPerKg = 2.0;
      } else if (goal === 'gain_weight') {
        calorieModifier = 400;
        proteinPerKg = 2.2;
      }

      // Ajustes por dieta
      if (dietaryPreference === 'cetogenica') {
        carbRatio = 0.10;
        fatRatio = 0.70;
      } else if (dietaryPreference === 'low_carb') {
        carbRatio = 0.25;
        fatRatio = 0.40;
      }

      const strategyParams = {
        calorieModifier,
        proteinPerKg,
        carbRatio,
        fatRatio,
      };

      nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
      
      if (nutritionalTargets) {
        // Se não foi passado dailyCalories na request, usar o calculado
        if (!requestedCalories) {
          dailyCalories = nutritionalTargets.targetCalories;
        }
        
        // Gerar contexto nutricional para o prompt
        nutritionalContext = buildNutritionalContextForPrompt(nutritionalTargets);
        nutritionalContext += "\n" + buildMealDistributionForPrompt(nutritionalTargets, mealTypes);
        
        // ============= MOTOR DE DECISÃO NUTRICIONAL =============
        // Injetar targets de macros por refeição baseado no objetivo/sexo/atividade
        const goal = profile.goal || 'maintain';
        const sex = profile.sex || 'male';
        const activityLevel = profile.activity_level || 'moderate';
        
        const macroTargetsPrompt = buildMealMacroTargetsForPrompt(
          goal,
          sex,
          activityLevel,
          mealTypes
        );
        nutritionalContext += "\n" + macroTargetsPrompt;
        logStep("Macro targets injected into prompt", { goal, sex, activityLevel });
        
        // Validar saúde dos targets
        const healthCheck = validateTargetsHealth(nutritionalTargets);
        if (!healthCheck.isHealthy) {
          logStep("⚠️ Health warnings", { warnings: healthCheck.warnings });
        }
        
        // Estimar tempo para atingir meta (se aplicável)
        if (profile.weight_goal && calorieModifier !== 0) {
          const timeEstimate = estimateTimeToGoal(
            profile.weight_current,
            profile.weight_goal,
            calorieModifier
          );
          if (timeEstimate) {
            logStep("Goal time estimate", { weeks: timeEstimate.weeks, months: timeEstimate.months });
          }
        }
        
        logStep("Nutritional targets calculated", {
          bmr: nutritionalTargets.bmr,
          tdee: nutritionalTargets.tdee,
          targetCalories: nutritionalTargets.targetCalories,
          protein: nutritionalTargets.protein,
          carbs: nutritionalTargets.carbs,
          fat: nutritionalTargets.fat,
        });
      }
    } else {
      logStep("Incomplete profile data, using default calories", { dailyCalories });
    }

    // Fetch intolerance mappings from database for validation
    logStep("Fetching intolerance mappings from database");
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseAdmin);
    logStep("Intolerance mappings loaded", { 
      mappingsCount: dbMappings.length, 
      safeKeywordsCount: dbSafeKeywords.length 
    });

    // ============= CARREGAR TABELA NUTRICIONAL (MEMÓRIA + PROMPT) =============
    logStep("Loading nutritional table for memory lookup and prompt injection");
    const nutritionalTable: NutritionalFood[] = await loadNutritionalTable(supabaseAdmin, userCountry);
    const { formatNutritionalTableForPrompt } = await import("../_shared/nutritionalTableInjection.ts");
    const nutritionalTablePrompt = formatNutritionalTableForPrompt(nutritionalTable);
    logStep("Nutritional table loaded", { 
      tableSize: nutritionalTable.length,
      promptLength: nutritionalTablePrompt.length,
      estimatedTokens: Math.round(nutritionalTablePrompt.length / 4)
    });

    // Modelo hardcoded para consistência (não busca mais do banco)
    const AI_MODEL = "gemini-2.5-flash-lite";
    logStep("Using hardcoded AI model", { model: AI_MODEL });

    // ============= CARREGAR POOL DE REFEIÇÕES APROVADAS =============
    logStep("Loading approved meal combinations from pool");
    
    interface MealCombinationFromPool {
      id: string;
      name: string;
      meal_type: string;
      components: any;
      total_calories: number;
      total_protein: number;
      total_carbs: number;
      total_fat: number;
      instructions: any;
      blocked_for_intolerances: string[] | null;
      dietary_tags: string[] | null;
      country_codes: string[] | string;
    }
    
    // Buscar refeições aprovadas (filtro de país será feito em TypeScript)
    logStep("🔍 Loading meal pool from database...");
    const { data: approvedMeals, error: poolError } = await supabaseAdmin
      .from("meal_combinations")
      .select("id, name, meal_type, components, total_calories, total_protein, total_carbs, total_fat, instructions, blocked_for_intolerances, dietary_tags, country_codes")
      .eq("is_active", true)
      .eq("approval_status", "approved");
    
    if (poolError) {
      logStep("⚠️ Error loading meal pool, will use AI fallback", { error: poolError.message });
    } else {
      logStep("✅ Pool query successful", { rowsReturned: approvedMeals?.length || 0 });
    }
    
    // Filtrar refeições por compatibilidade com restrições do usuário
    const userIntolerances = restrictions.intolerances || [];
    const userDietaryPref = restrictions.dietaryPreference;
    const userExcluded = restrictions.excludedIngredients || [];
    
    // Contadores para diagnóstico
    let filteredByCountry = 0;
    let filteredByIntolerance = 0;
    let filteredByDietary = 0;
    let filteredByExcluded = 0;
    
    const compatiblePoolMeals: MealCombinationFromPool[] = (approvedMeals || []).filter((meal: MealCombinationFromPool) => {
      // Verificar compatibilidade com país do usuário
      if (meal.country_codes && meal.country_codes.length > 0) {
        try {
          const codes = typeof meal.country_codes === 'string' 
            ? JSON.parse(meal.country_codes) 
            : meal.country_codes;
          if (Array.isArray(codes) && codes.length > 0 && !codes.includes(userCountry)) {
            filteredByCountry++;
            return false;
          }
        } catch {
          // Se falhar parse, aceita a refeição (fallback seguro)
        }
      }
      
      // Verificar intolerâncias bloqueadas
      if (meal.blocked_for_intolerances && meal.blocked_for_intolerances.length > 0) {
        const hasBlockedIntolerance = userIntolerances.some(
          (intol: string) => meal.blocked_for_intolerances!.includes(intol)
        );
        if (hasBlockedIntolerance) {
          filteredByIntolerance++;
          return false;
        }
      }
      
      // Verificar preferência dietária
      if (userDietaryPref && userDietaryPref !== 'omnivore' && meal.dietary_tags) {
        // Para vegetarianos, a refeição precisa ter tag vegetarian
        if (userDietaryPref === 'vegetarian' && !meal.dietary_tags.includes('vegetarian') && !meal.dietary_tags.includes('vegan')) {
          filteredByDietary++;
          return false;
        }
        // Para veganos, a refeição precisa ter tag vegan
        if (userDietaryPref === 'vegan' && !meal.dietary_tags.includes('vegan')) {
          filteredByDietary++;
          return false;
        }
      }
      
      // Verificar ingredientes excluídos manualmente
      if (userExcluded.length > 0 && Array.isArray(meal.components)) {
        const mealIngredients = meal.components.map((c: any) => 
          (c.name || c.item || '').toLowerCase()
        );
        const hasExcluded = userExcluded.some((excluded: string) =>
          mealIngredients.some((ing: string) => ing.includes(excluded.toLowerCase()))
        );
        if (hasExcluded) {
          filteredByExcluded++;
          return false;
        }
      }
      
      // Filtrar alimentos especiais (sem glúten/sem lactose) para usuários sem intolerâncias
      // Usuários SEM intolerância a glúten NÃO devem ver "pão sem glúten"
      // Usuários SEM intolerância a lactose NÃO devem ver "leite sem lactose"
      if (!shouldShowSpecialFood(meal.name, userIntolerances)) {
        return false;
      }
      
      return true;
    });
    
    logStep("🔍 Pool filtering results", {
      totalFromDb: approvedMeals?.length || 0,
      compatible: compatiblePoolMeals.length,
      filteredByCountry,
      filteredByIntolerance,
      filteredByDietary,
      filteredByExcluded,
      userCountry,
      userExcluded: userExcluded.slice(0, 5),
    });
    
    // Mapeamento BIDIRECIONAL de meal_type
    // O banco usa português, o código interno usa inglês
    const PT_TO_EN: Record<string, string> = {
      'cafe_manha': 'breakfast',
      'cafe_da_manha': 'breakfast',
      'lanche_manha': 'morning_snack',
      'almoco': 'lunch',
      'lanche_tarde': 'afternoon_snack',
      'jantar': 'dinner',
      'ceia': 'supper',
    };
    
    const EN_TO_PT: Record<string, string> = {
      'breakfast': 'cafe_manha',
      'morning_snack': 'lanche_manha',
      'lunch': 'almoco',
      'afternoon_snack': 'lanche_tarde',
      'dinner': 'jantar',
      'supper': 'ceia',
    };
    
    // Mapeamento completo (aceita ambos os formatos)
    const MEAL_TYPE_MAPPING: Record<string, string> = {
      ...PT_TO_EN,
      // Inglês -> Inglês (já correto)
      'breakfast': 'breakfast',
      'morning_snack': 'morning_snack',
      'lunch': 'lunch',
      'afternoon_snack': 'afternoon_snack',
      'dinner': 'dinner',
      'supper': 'supper',
    };
    
    function normalizePoolMealType(type: string): string {
      return MEAL_TYPE_MAPPING[type.toLowerCase()] || type;
    }
    
    // Organizar por tipo de refeição (normalizado para inglês)
    const poolByMealType: Record<string, MealCombinationFromPool[]> = {};
    
    for (const meal of compatiblePoolMeals) {
      // Normalizar meal_type para inglês
      const mealType = normalizePoolMealType(meal.meal_type);
      if (!poolByMealType[mealType]) {
        poolByMealType[mealType] = [];
      }
      poolByMealType[mealType].push(meal);
    }
    
    // Log dos tipos ORIGINAIS do banco antes da normalização
    const originalTypes = [...new Set((approvedMeals || []).map((m: any) => m.meal_type))];
    
    logStep("📦 Pool organized by meal type", {
      originalTypesFromDb: originalTypes,
      poolByMealType_keys: Object.keys(poolByMealType),
      poolByMealType_counts: Object.fromEntries(Object.entries(poolByMealType).map(([k, v]) => [k, v.length]))
    });
    
    logStep("Approved meal pool loaded", { 
      totalApproved: approvedMeals?.length || 0,
      compatibleWithUser: compatiblePoolMeals.length,
      byType: Object.fromEntries(Object.entries(poolByMealType).map(([k, v]) => [k, v.length])),
      poolError: poolError?.message || null,
      userCountry,
      userIntolerances,
      userDietaryPref
    });
    
    // Função para buscar refeições do pool compatíveis com target de calorias
    function getPoolMealsForType(
      mealType: string, 
      targetCalories: number, 
      count: number,
      usedMealIds: Set<string>
    ): MealCombinationFromPool[] {
      const totalInPool = (poolByMealType[mealType] || []).length;
      const available = (poolByMealType[mealType] || []).filter(m => !usedMealIds.has(m.id));
      
      logStep(`🔍 CRITICAL DEBUG: getPoolMealsForType called`, { 
        mealType, 
        targetCalories, 
        count, 
        totalInPool,
        available: available.length,
        usedIds: usedMealIds.size,
        poolByMealType_has_key: poolByMealType.hasOwnProperty(mealType),
        available_calories: available.slice(0, 5).map(m => Math.round(m.total_calories))
      });
      
      if (available.length === 0) {
        logStep(`❌ CRITICAL: No available meals for ${mealType}`, {
          totalInPool,
          allUsed: usedMealIds.size >= totalInPool
        });
        return [];
      }
      
      // Filtrar por faixa de calorias (±50% do target)
      const minCal = targetCalories * 0.5;
      const maxCal = targetCalories * 1.5;
      
      const inRange = available.filter(m => 
        m.total_calories >= minCal && m.total_calories <= maxCal
      );
      
      logStep(`📊 CRITICAL DEBUG: Calorie range filter`, { 
        mealType,
        targetCal: Math.round(targetCalories),
        minCal: Math.round(minCal), 
        maxCal: Math.round(maxCal), 
        inRange: inRange.length,
        available: available.length,
        rejected: available.length - inRange.length,
        sample_rejected: available.filter(m => m.total_calories < minCal || m.total_calories > maxCal).slice(0, 3).map(m => ({
          name: m.name,
          cal: Math.round(m.total_calories)
        }))
      });
      
      // Se tiver suficientes na faixa, usar aleatoriamente
      if (inRange.length >= count) {
        const shuffled = inRange.sort(() => Math.random() - 0.5);
        const result = shuffled.slice(0, count);
        logStep(`✅ Using ${result.length} meals in calorie range for ${mealType}`, {
          calories: result.map(r => Math.round(r.total_calories))
        });
        return result;
      }
      
      // Se não tiver suficientes na faixa, pegar as mais próximas
      const sorted = available.sort((a, b) => 
        Math.abs(a.total_calories - targetCalories) - Math.abs(b.total_calories - targetCalories)
      );
      const result = sorted.slice(0, count);
      logStep(`⚠️ Using closest ${result.length} meals for ${mealType} (outside ideal range)`, { 
        targetCal: targetCalories,
        selectedCal: result.map(r => Math.round(r.total_calories)),
        deviation: result.map(r => Math.round(Math.abs(r.total_calories - targetCalories)))
      });
      return result;
    }
    
    // Converter refeição do pool para formato SimpleMealOption
    function convertPoolMealToOption(poolMeal: MealCombinationFromPool): SimpleMealOption {
      const foods = Array.isArray(poolMeal.components) 
        ? poolMeal.components.map((c: any) => ({
            name: c.name || c.item || '',
            grams: c.grams || c.quantity_grams || 100,
            calories: c.calories || 0,
            protein: c.protein || 0,
            carbs: c.carbs || 0,
            fat: c.fat || 0,
          }))
        : [];
      
      return {
        title: poolMeal.name,
        foods,
        instructions: Array.isArray(poolMeal.instructions) ? poolMeal.instructions : [],
        calories_kcal: poolMeal.total_calories,
        protein: poolMeal.total_protein,
        carbs: poolMeal.total_carbs,
        fat: poolMeal.total_fat,
        fromPool: true,
        poolMealId: poolMeal.id,
      };
    }

    // Build meals with target calories and regional labels
    // IMPORTANTE: Se o usuário passou dailyCalories explicitamente, devemos respeitar essa preferência
    // mesmo que tenhamos nutritionalTargets calculados do perfil
    let meals: Array<{ type: string; label: string; targetCalories: number; targetProtein?: number; targetCarbs?: number; targetFat?: number }>;
    if (nutritionalTargets) {
      // Se o usuário passou calorias explicitamente, ajustar os targets para respeitar
      const effectiveTargets = requestedCalories 
        ? {
            ...nutritionalTargets,
            targetCalories: dailyCalories, // Usar as calorias solicitadas pelo usuário
            // Recalcular macros proporcionalmente
            protein: Math.round(nutritionalTargets.protein * (dailyCalories / nutritionalTargets.targetCalories)),
            carbs: Math.round(nutritionalTargets.carbs * (dailyCalories / nutritionalTargets.targetCalories)),
            fat: Math.round(nutritionalTargets.fat * (dailyCalories / nutritionalTargets.targetCalories)),
          }
        : nutritionalTargets;
      
      logStep("Using effective calorie target", { 
        requested: requestedCalories, 
        calculated: nutritionalTargets.targetCalories, 
        effective: effectiveTargets.targetCalories 
      });
      
      const mealDistribution = calculateMealDistribution(effectiveTargets, mealTypes);
      meals = mealDistribution.map((dist) => ({
        type: dist.mealType,
        label: regional.mealLabels[dist.mealType] || dist.label,
        targetCalories: dist.calories,
        targetProtein: dist.protein,
        targetCarbs: dist.carbs,
        targetFat: dist.fat,
      }));
      logStep("Meal distribution calculated from nutritional targets", { 
        meals: meals.map(m => ({ type: m.type, cal: m.targetCalories, prot: m.targetProtein })) 
      });
    } else {
      meals = mealTypes.map((type: string) => ({
        type,
        label: regional.mealLabels[type] || type,
        targetCalories: Math.round(dailyCalories * (CALORIE_DISTRIBUTION[type] || 0.10)),
      }));
    }

    // ============= GERAÇÃO PARALELA EM BATCHES =============
    const generatedDays: SimpleDayPlan[] = new Array(daysCount).fill(null);
    const allViolations: Array<{ day: number; meal: string; food: string; reason: string; restriction: string }> = [];
    
    // Rastrear IDs de refeições do pool já usadas (para evitar repetição)
    const usedPoolMealIds = new Set<string>();
    
    // Configuração de paralelismo (agora paralelo dentro de cada batch)
    const BATCH_SIZE = 5; // 5 dias por batch = 4 batches para 20 dias (25% cada)
    const MAX_RETRIES = 3; // retries para lidar com erros internos

    const googleApiKey = await getGeminiApiKey();
    
    // ============= GERAÇÃO VIA UNIFIED CORE (CASCATA: Pool → Templates → IA) =============
    // Normalizar goal para WeightGoal type
    const normalizedGoal = ((): 'lose_weight' | 'maintain' | 'gain_weight' => {
      const goal = profile.goal || profile.goals?.[0] || 'maintain';
      if (goal === 'weight_loss' || goal === 'lose_weight' || goal === 'emagrecer') return 'lose_weight';
      if (goal === 'weight_gain' || goal === 'gain_weight' || goal === 'gain_muscle' || goal === 'ganhar') return 'gain_weight';
      return 'maintain';
    })();
    
    // Normalizar activity_level
    const normalizedActivity = ((): 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' => {
      const activity = profile.activity_level || 'moderate';
      if (activity === 'sedentary' || activity === 'sedentario') return 'sedentary';
      if (activity === 'light' || activity === 'leve') return 'light';
      if (activity === 'active' || activity === 'ativo') return 'active';
      if (activity === 'very_active' || activity === 'muito_ativo') return 'very_active';
      return 'moderate';
    })();
    
    // Normalizar sex
    const normalizedSex = ((): 'male' | 'female' => {
      const sex = profile.sex || 'male';
      if (sex === 'male' || sex === 'masculino' || sex === 'm') return 'male';
      return 'female';
    })();
    
    // Contexto do usuário para o Unified Core
    const userContextForCore: UserContext = {
      user_id: user.id,
      country: userCountry,
      language: 'pt-BR',
      
      // Safety Engine
      intolerances: userIntolerances || [],
      dietary_preference: restrictions.dietaryPreference || null,
      excluded_ingredients: restrictions.excludedIngredients || [],
      
      // Meta de Peso (Mifflin-St Jeor)
      goal: normalizedGoal,
      
      // Dados Físicos (para cálculo de BMR/TDEE)
      physical_data: {
        age: profile.age || 30,
        weight_kg: profile.weight_current || 70,
        height_cm: profile.height || 170,
        activity_level: normalizedActivity,
        sex: normalizedSex,
      },
      
      // Campos legados (compatibilidade)
      goals: profile.goals || [],
    };

    // Função que usa generateMealsWithCore com cascata completa
    async function generateMealWithUnifiedCore(
      mealType: string,
      targetCalories: number,
      mealLabel: string
    ): Promise<SimpleMeal | null> {
      
      logStep(`🔄 [UNIFIED-CORE] Generating ${mealType} via cascata (Pool → Templates → IA)`, {
        targetCalories,
        country: userCountry
      });
      
      try {
        // Filtrar pool por tipo de refeição (usando poolByMealType que já está normalizado)
        const poolForType = poolByMealType[mealType] || [];
        
        logStep(`📦 [POOL] Refeições do pool para ${mealType}`, {
          totalCompatible: compatiblePoolMeals.length,
          forThisType: poolForType.length,
          mealType,
          sampleNames: poolForType.slice(0, 3).map((m: any) => m.name)
        });
        
        // Usar generateMealsWithCore com cascata completa
        const unifiedMeals = await generateMealsWithCore(
          1,  // quantity: 1
          mealType,
          targetCalories,
          userCountry,
          userIntolerances || [],
          userContextForCore,
          {
            source: 'auto',  // Cascata: Pool → Templates → IA
            supabaseClient: supabaseAdmin,
            googleApiKey: googleApiKey,
            poolMeals: poolForType,
          }
        );
        
        if (!unifiedMeals || unifiedMeals.length === 0) {
          logStep(`❌ [UNIFIED-CORE] No meals generated for ${mealType}`);
          return null;
        }
        
        // Converter UnifiedMeal para SimpleMeal
        const unifiedMeal = unifiedMeals[0];
        const simpleMeal = convertUnifiedMealToSimpleMeal(unifiedMeal, mealLabel, targetCalories);
        
        logStep(`✅ [UNIFIED-CORE] ${mealType} generated via ${unifiedMeal.source.type}`, {
          name: unifiedMeal.name,
          calories: unifiedMeal.totals.calories,
          source: unifiedMeal.source.type
        });
        
        return simpleMeal;
        
      } catch (error) {
        logStep(`❌ [UNIFIED-CORE] Error generating ${mealType}`, {
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      }
    }

    // Manter compatibilidade: generateMealDirect agora delega para generateMealWithUnifiedCore
    async function generateMealDirect(
      mealType: string,
      targetCalories: number,
      mealLabel: string
    ): Promise<SimpleMeal | null> {
      return generateMealWithUnifiedCore(mealType, targetCalories, mealLabel);
    }
    
    // ============= FUNÇÃO SIMPLIFICADA: USA APENAS generateMealWithUnifiedCore =============
    // A cascata (Pool → Templates → IA) agora é feita DENTRO de generateMealsWithCore
    async function generateSingleDay(
      dayIndex: number, 
      previousMeals: string[]
    ): Promise<{ dayIndex: number; plan: SimpleDayPlan | null; violations: any[]; fromPool: boolean; fromDirect: boolean; fromAI: boolean }> {
      const dayName = regional.dayNames?.[dayIndex % 7] || `Day ${dayIndex + 1}`;
      
      logStep(`🚀 [UNIFIED-CORE] Starting day ${dayIndex + 1}`, { dayName });
      
      try {
        const generatedMeals: SimpleMeal[] = [];
        let fromPool = false;
        let fromDirect = false;
        let fromAI = false;
        
        // Gerar cada refeição usando generateMealWithUnifiedCore (cascata interna)
        for (const meal of meals) {
          const simpleMeal = await generateMealWithUnifiedCore(
            meal.type,
            meal.targetCalories,
            meal.label
          );
          
          if (simpleMeal) {
            generatedMeals.push(simpleMeal);
            
            // Rastrear origem
            const option = simpleMeal.options[0];
            if (option?.fromPool) fromPool = true;
            if (option?.fromDirect) fromDirect = true;
            // Se não é pool nem direct, é AI ou fallback
            if (!option?.fromPool && !option?.fromDirect) fromAI = true;
          } else {
            logStep(`⚠️ [UNIFIED-CORE] Failed to generate ${meal.type}, using fallback`);
            // Criar refeição de fallback básica
            generatedMeals.push({
              meal_type: meal.type,
              label: meal.label,
              target_calories: meal.targetCalories,
              options: [{
                title: `${meal.label} Básico`,
                foods: [],
                calories_kcal: 0,
                fromDirect: true,
              }]
            });
          }
        }
        
        // Calcular total de calorias
        const totalCalories = generatedMeals.reduce((sum, meal) => {
          const firstOption = meal.options[0];
          return sum + (firstOption?.calories_kcal || 0);
        }, 0);
        
        const dayPlan: SimpleDayPlan = {
          day: dayIndex + 1,
          day_name: dayName,
          meals: generatedMeals,
          total_calories: totalCalories,
        };
        
        logStep(`✅ [UNIFIED-CORE] Day ${dayIndex + 1} complete`, { 
          mealsCount: generatedMeals.length,
          totalCalories,
          sources: { fromPool, fromDirect, fromAI }
        });
        
        return {
          dayIndex,
          plan: dayPlan,
          violations: [],
          fromPool,
          fromDirect,
          fromAI,
        };
        
      } catch (error) {
        logStep(`❌ [UNIFIED-CORE] Day ${dayIndex + 1} failed`, {
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }
    
    // Coletar receitas já geradas para evitar repetição entre dias
    const previousDaysMeals: string[] = [];
    
    // Rastrear origem de cada dia (pool vs IA) - GLOBAL para todos os batches
    const dayOriginMap = new Map<number, boolean>(); // dayIndex -> fromPool
    
    // Processar em batches PARALELOS
    const totalBatches = Math.ceil(daysCount / BATCH_SIZE);
    logStep(`📦 Starting PARALLEL batch generation`, {
      totalDays: daysCount,
      batchSize: BATCH_SIZE,
      totalBatches,
      mode: 'parallel-within-batch',
    });

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, daysCount);

      logStep(`🔄 Processing batch ${batchNum + 1}/${totalBatches} in PARALLEL`, {
        days: `${batchStart + 1}-${batchEnd}`,
        parallelCalls: batchEnd - batchStart,
      });

      // Gerar todos os dias do batch EM PARALELO
      const batchPromises = [];
      for (let dayIndex = batchStart; dayIndex < batchEnd; dayIndex++) {
        // Passar as receitas já geradas dos batches anteriores (não do batch atual)
        batchPromises.push(generateSingleDay(dayIndex, [...previousDaysMeals]));
      }

      // Aguardar TODOS os dias do batch terminarem (permite falhas parciais)
      const batchSettled = await Promise.allSettled(batchPromises);
      
      // Extrair resultados bem-sucedidos
      const batchResults = batchSettled
        .map((settled, idx) => {
          if (settled.status === 'fulfilled') {
            return settled.value;
          } else {
            // Log de erro mas não quebra o batch
            const dayIdx = batchStart + idx;
            logStep(`❌ Day ${dayIdx + 1} failed completely`, { 
              error: settled.reason instanceof Error ? settled.reason.message : String(settled.reason)
            });
            return { dayIndex: dayIdx, plan: null, violations: [], fromPool: false, fromDirect: false, fromAI: false };
          }
        });

      // Processar resultados do batch
      for (const result of batchResults) {
        if (result.plan) {
          generatedDays[result.dayIndex] = result.plan;
          dayOriginMap.set(result.dayIndex, result.fromPool); // Guardar origem (mantém compatibilidade)

          // Coletar receitas para próximos batches
          for (const meal of result.plan.meals) {
            for (const option of meal.options) {
              if (option.title) {
                previousDaysMeals.push(option.title);
              }
            }
          }

          // Adicionar violações
          allViolations.push(...result.violations);
        }
      }
      
      // Contabilizar origem (pool + direto + AI)
      const fromPoolCount = batchResults.filter(r => r.fromPool).length;
      const fromDirectCount = batchResults.filter(r => r.fromDirect).length;
      const fromAiCount = batchResults.filter(r => r.fromAI).length;

      // Verificar quais dias falharam neste batch
      const failedDays = batchResults
        .filter(r => !r.plan)
        .map(r => r.dayIndex + 1);
      
      if (failedDays.length > 0) {
        logStep(`⚠️ Batch ${batchNum + 1} had failures`, { 
          failedDays,
          successCount: batchResults.filter(r => r.plan).length,
          failureCount: failedDays.length
        });
      }
      
      logStep(`✅ Batch ${batchNum + 1} complete`, {
        recipesCollected: previousDaysMeals.length,
        daysGenerated: batchResults.filter(r => r.plan).length,
        fromPool: fromPoolCount,
        fromDirect: fromDirectCount,
        fromAI: fromAiCount,
      });

      // Pequeno delay entre batches para evitar rate limit
      if (batchNum < totalBatches - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    
    // Verificar se todos os dias foram gerados
    const failedDays = generatedDays.map((d, i) => d === null ? i + 1 : null).filter(Boolean);
    if (failedDays.length > 0) {
      throw new Error(`Failed to generate days: ${failedDays.join(', ')}`);
    }

    // Log summary of all violations
    if (allViolations.length > 0) {
      logStep("⚠️ TOTAL VIOLATIONS SUMMARY", {
        totalViolations: allViolations.length,
        byRestriction: allViolations.reduce((acc, v) => {
          acc[v.restriction] = (acc[v.restriction] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });
    } else {
      logStep("✓ ALL DAYS PASSED VALIDATION - no violations detected");
    }

    logStep("All days generated and validated", { totalDays: generatedDays.length });

    // ============= SALVAR NO BANCO DE DADOS (se solicitado) =============
    if (shouldSaveToDatabase) {
      logStep("Saving to database...");
      
      const start = startDate ? new Date(startDate) : new Date();
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + daysCount - 1);
      
      let mealPlanIdToUse = existingPlanId;
      let mealPlan;
      
      if (existingPlanId) {
        // Atualizar plano existente
        const { data: existingPlan, error: fetchError } = await supabaseAdmin
          .from("meal_plans")
          .select("*")
          .eq("id", existingPlanId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !existingPlan) {
          throw new Error("Plano alimentar não encontrado");
        }

        const newEndDate = endDate.toISOString().split('T')[0];
        
        const updateData: any = { 
          updated_at: new Date().toISOString(),
          custom_meal_times: customMealTimes || existingPlan.custom_meal_times || null
        };
        
        if (newEndDate > existingPlan.end_date) {
          updateData.end_date = newEndDate;
        }
        
        await supabaseAdmin
          .from("meal_plans")
          .update(updateData)
          .eq("id", existingPlanId);
        
        mealPlan = { ...existingPlan, custom_meal_times: customMealTimes || existingPlan.custom_meal_times };
        mealPlanIdToUse = existingPlan.id;
        logStep("Updated existing meal plan", { planId: mealPlanIdToUse });
      } else {
        // Criar novo plano
        const { data: newPlan, error: planError } = await supabaseAdmin
          .from("meal_plans")
          .insert({
            user_id: user.id,
            name: planName || `Plano ${start.toLocaleDateString('pt-BR')}`,
            start_date: start.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_active: true,
            custom_meal_times: customMealTimes || null
          })
          .select()
          .single();

        if (planError) throw new Error(`Error creating meal plan: ${planError.message}`);
        
        mealPlan = newPlan;
        mealPlanIdToUse = newPlan.id;
        logStep("Meal plan created", { planId: mealPlanIdToUse });

        // Desativar outros planos
        await supabaseAdmin
          .from("meal_plans")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .neq("id", mealPlanIdToUse);
      }

      // Converter os dias gerados para meal_plan_items COM MACROS REAIS
      const items: any[] = [];
      // NOTA: week_number e day_of_week são calculados baseados no dayIndex para alinhar com o frontend
      // Frontend usa: planDayOfWeek = daysSinceStart % 7, planWeekNumber = Math.floor(daysSinceStart / 7) + 1
      
      // ============= CALCULAR MACROS OTIMIZADO (1 vez para todos) =============
      // Primeiro, coletar TODOS os alimentos de TODAS as refeições
      const allFoodsForCalculation: Array<{ mealIndex: number; food: RealMacrosFoodItem }> = [];
      const mealInfoMap: Map<number, { dayIndex: number; meal: any; firstOption: any }> = new Map();
      
      let mealCounter = 0;
      for (let dayIndex = 0; dayIndex < generatedDays.length; dayIndex++) {
        const day = generatedDays[dayIndex];
        
        // Pular dias que falharam na geração
        if (!day || !day.meals) {
          logStep(`⚠️ Skipping day ${dayIndex} - generation failed`, { dayIndex });
          continue;
        }
        
        for (const meal of day.meals) {
          const firstOption = meal.options?.[0];
          if (!firstOption) continue;
          
          // Guardar info da refeição para reconstrução depois
          mealInfoMap.set(mealCounter, { dayIndex, meal, firstOption });
          
          // Preparar foods para cálculo
          const mealFoods = (firstOption.foods || []).map((food: any) => {
            if (typeof food === 'string') {
              return { name: food, grams: 100 };
            }
            return {
              name: food.name || food.item || "",
              grams: food.grams || 100,
            };
          });
          
          // Adicionar ao array global com índice da refeição
          for (const food of mealFoods) {
            allFoodsForCalculation.push({ mealIndex: mealCounter, food });
          }
          
          mealCounter++;
        }
      }
      
      logStep("Starting optimized macro calculation for all meals", { 
        totalMeals: mealCounter,
        totalFoods: allFoodsForCalculation.length,
        nutritionalTableSize: nutritionalTable.length
      });
      
      // Calcular TODOS os macros de uma vez (memória → DB batch → AI)
      const { results: macroResults, stats: macroStats } = await calculateOptimizedMacrosForDay(
        supabaseAdmin,
        allFoodsForCalculation,
        nutritionalTable,
        userCountry
      );
      
      logStep("Optimized macro calculation complete", { 
        fromMemory: macroStats.totalFromMemory,
        fromDb: macroStats.totalFromDb,
        fromAi: macroStats.totalFromAi,
        matchRate: `${macroStats.matchRate}%`
      });
      
      // Reconstruir items com os macros calculados
      for (const [mealIdx, mealInfo] of mealInfoMap.entries()) {
        const { dayIndex, meal, firstOption } = mealInfo;
        const mealResult = macroResults.get(mealIdx);
        
        if (!mealResult) continue;
        
        // Calcular totais dos macros
        const totalMacros = mealResult.items.reduce(
          (acc: { calories: number; protein: number; carbs: number; fat: number }, item: CalculatedFoodItem) => ({
            calories: acc.calories + item.calories,
            protein: acc.protein + item.protein,
            carbs: acc.carbs + item.carbs,
            fat: acc.fat + item.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        
        // Converter foods para o formato recipe_ingredients (com macros individuais e porção humanizada)
        const recipeIngredients = mealResult.items.map((item: CalculatedFoodItem) => {
          // ✅ Extrair dados de porção do canonical se disponível
          const canonicalData = item.canonical_id ? {
            default_portion_grams: (item as any).default_portion_grams || 100,
            portion_unit: (item as any).portion_unit || 'g',
            portion_unit_singular_pt: (item as any).portion_unit_singular_pt || null,
            portion_unit_plural_pt: (item as any).portion_unit_plural_pt || null,
            is_liquid: (item as any).is_liquid || false,
          } : null;
          
          // ✅ Formatar porção humanizada (1 pote, 2 ovos, etc)
          const portionDisplay = formatPortionDynamic(
            normalizeText(item.name).replace(/\s+/g, '_'),
            item.grams,
            'pt-BR',
            undefined,
            canonicalData
          );
          
          return {
            item: item.name,
            quantity: item.grams.toString(),
            unit: portionDisplay.unit,
            portion_label: portionDisplay.label,  // ✅ "1 pote de iogurte (150ml)"
            portion_quantity: portionDisplay.quantity,
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            source: item.source,
            food_id: item.food_id,
          };
        });
        
        // Extrair instruções se existirem e LIMPAR menções a frutas/bebidas
        const rawInstructions = Array.isArray((firstOption as any).instructions) 
          ? (firstOption as any).instructions 
          : [];
        const instructions = cleanInstructionsFromFruitsAndBeverages(rawInstructions);
        
        // Calcular week_number e day_of_week baseados no dayIndex absoluto + dayOffset
        // Isso alinha com o frontend que usa: planDayOfWeek = daysSinceStart % 7
        const globalDayIndex = dayIndex + dayOffset;
        const calculatedWeekNumber = Math.floor(globalDayIndex / 7) + 1;
        const calculatedDayOfWeek = globalDayIndex % 7;
        
        items.push({
          meal_plan_id: mealPlanIdToUse,
          day_of_week: calculatedDayOfWeek,
          meal_type: meal.meal_type,
          recipe_name: firstOption.title || meal.label,
          recipe_calories: Math.round(totalMacros.calories),
          recipe_protein: Math.round(totalMacros.protein * 10) / 10,
          recipe_carbs: Math.round(totalMacros.carbs * 10) / 10,
          recipe_fat: Math.round(totalMacros.fat * 10) / 10,
          recipe_prep_time: 15,
          recipe_ingredients: recipeIngredients,
          recipe_instructions: instructions,
          week_number: calculatedWeekNumber,
          from_pool: dayOriginMap.get(dayIndex) || false // Adicionar origem
        });
      }

      const totalIngredients = macroStats.totalFromMemory + macroStats.totalFromDb + macroStats.totalFromAi;
      const matchRate = totalIngredients > 0 ? Math.round(((macroStats.totalFromMemory + macroStats.totalFromDb) / totalIngredients) * 100) : 0;
      
      logStep("Real macros calculation complete", { 
        matchRate: `${matchRate}%`,
        fromMemory: macroStats.totalFromMemory,
        fromDatabase: macroStats.totalFromDb,
        fromAI: macroStats.totalFromAi,
      });

      // Log detalhado dos items antes de inserir
      const itemsSummary = items.reduce((acc: any, item: any) => {
        const key = `week${item.week_number}_day${item.day_of_week}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      
      logStep("Inserting meal items with real macros", { 
        count: items.length,
        daysCount,
        itemsByDay: itemsSummary,
        firstItem: items[0] ? { day_of_week: items[0].day_of_week, week_number: items[0].week_number } : null,
        lastItem: items[items.length - 1] ? { day_of_week: items[items.length - 1].day_of_week, week_number: items[items.length - 1].week_number } : null
      });

      const { error: itemsError } = await supabaseAdmin
        .from("meal_plan_items")
        .insert(items);

      if (itemsError) throw new Error(`Error creating meal plan items: ${itemsError.message}`);
      logStep("Meal plan items created", { count: items.length });

      return new Response(
        JSON.stringify({
          success: true,
          plan: {
            id: mealPlanIdToUse,
            daily_calories: dailyCalories,
            options_per_meal: optionsPerMeal,
            restrictions,
            regional: {
              country: userCountry,
              language: regional.language,
              measurement_system: regional.measurementSystem,
            },
            days: generatedDays,
            items: items
          },
          mealPlan: {
            id: mealPlanIdToUse,
            ...mealPlan,
            items: items
          },
          stats: {
            daysGenerated: generatedDays.length,
            totalMeals: items.length,
            macrosFromMemory: macroStats.totalFromMemory,
            macrosFromDatabase: macroStats.totalFromDb,
            macrosFromAI: macroStats.totalFromAi,
            databaseMatchRate: matchRate,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retorno padrão para modo teste (sem salvar no banco)
    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          daily_calories: dailyCalories,
          options_per_meal: optionsPerMeal,
          restrictions,
          regional: {
            country: userCountry,
            language: regional.language,
            measurement_system: regional.measurementSystem,
          },
          days: generatedDays,
        },
        validation: {
          totalViolationsRemoved: allViolations.length,
          violations: allViolations.length > 0 ? allViolations : undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("Error", { message: errorMessage, stack: errorStack });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

