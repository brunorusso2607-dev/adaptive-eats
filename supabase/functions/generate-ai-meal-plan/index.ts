import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
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
  getMasterMealPromptV5,
  getLocalizedDefaultPortions,
  type RegionalConfig,
  type IntoleranceMapping,
  type SafeKeyword,
  type FoodItem,
  type ValidationResult,
  type MasterPromptParams,
  type DefaultPortion,
} from "../_shared/mealGenerationConfig.ts";

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
  foods: FoodItem[];
  calories_kcal: number;
  calculated_calories?: number; // Calculado pelo script
  instructions?: string[]; // Passos de preparo
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

// Nota: REGIONAL_CONFIGS, DEFAULT_CONFIG, getRegionalConfig importados de mealGenerationConfig.ts

// Nota: getRestrictionText importado de mealGenerationConfig.ts

// ============= PROMPT CENTRALIZADO v5.0 =============
// Agora usa getMasterMealPromptV5 do mealGenerationConfig.ts
function buildSimpleNutritionistPrompt(params: {
  dailyCalories: number;
  meals: { type: string; label: string; targetCalories: number; targetProtein?: number; targetCarbs?: number; targetFat?: number }[];
  optionsPerMeal: number;
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  };
  dayNumber: number;
  dayName: string;
  regional: RegionalConfig;
  countryCode: string;
  baseSystemPrompt?: string;
  nutritionalContext?: string;
  strategyKey?: string;
  previousDaysMeals?: string[];
  nutritionalTablePrompt?: string;
}): string {
  // Usar o PROMPT v5.0 centralizado do mealGenerationConfig
  const promptParams: MasterPromptParams = {
    dailyCalories: params.dailyCalories,
    meals: params.meals.map(m => ({
      type: m.type,
      label: m.label,
      targetCalories: m.targetCalories
    })),
    restrictions: params.restrictions,
    dayNumber: params.dayNumber,
    dayName: params.dayName,
    regional: params.regional,
    strategyKey: params.strategyKey,
    previousDaysMeals: params.previousDaysMeals,
    nutritionalTablePrompt: params.nutritionalTablePrompt,
  };

  return getMasterMealPromptV5(promptParams);
}

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
  const allParts: string[] = [...proteins, ...carbs, ...others];
  
  if (allParts.length === 0) {
    // Fallback: use first food name
    return foods[0]?.name?.substring(0, 40) || 'Refeição';
  }
  
  if (allParts.length === 1) {
    return allParts[0];
  }
  
  if (allParts.length === 2) {
    return `${allParts[0]} com ${allParts[1]}`;
  }
  
  // 3+ parts: "A com B e C"
  const last = allParts.pop();
  return `${allParts.join(', ')} e ${last}`;
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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("AI Meal Plan Generator - Hybrid Mode (Simple + Smart)");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
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
    } = requestBody;
    
    // Detectar automaticamente se deve salvar no banco
    const shouldSaveToDatabase = saveToDatabase || planName || startDate;

    logStep("Request params", { requestedCalories, daysCount, optionsPerMeal, requestedMealTypes, shouldSaveToDatabase });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
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
      const { data: strategyData } = await supabaseClient
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
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    logStep("Intolerance mappings loaded", { 
      mappingsCount: dbMappings.length, 
      safeKeywordsCount: dbSafeKeywords.length 
    });

    // ============= CARREGAR TABELA NUTRICIONAL (MEMÓRIA + PROMPT) =============
    logStep("Loading nutritional table for memory lookup and prompt injection");
    const nutritionalTable: NutritionalFood[] = await loadNutritionalTable(supabaseClient, userCountry);
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
    
    // Coletar receitas já geradas para evitar repetição entre dias
    const previousDaysMeals: string[] = [];
    
    // Configuração de paralelismo
    const BATCH_SIZE = 2; // Reduzir para 2 dias simultaneamente para evitar rate limit
    const MAX_RETRIES = 3; // Aumentar retries para lidar com erros internos
    
    // Função para gerar um único dia
    async function generateSingleDay(
      dayIndex: number, 
      previousMeals: string[]
    ): Promise<{ dayIndex: number; plan: SimpleDayPlan | null; violations: any[] }> {
      const dayName = regional.dayNames?.[dayIndex % 7] || `Day ${dayIndex + 1}`;
      
      logStep(`🚀 Starting day ${dayIndex + 1}`, { dayName, batchMode: true });

      const prompt = buildSimpleNutritionistPrompt({
        dailyCalories,
        meals,
        optionsPerMeal,
        restrictions,
        dayNumber: dayIndex + 1,
        dayName,
        regional,
        countryCode: userCountry,
        baseSystemPrompt: undefined, // Prompts são hardcoded em mealGenerationConfig.ts
        nutritionalContext,
        strategyKey: effectiveStrategyKey,
        previousDaysMeals: previousMeals,
        nutritionalTablePrompt,
      });

      const GOOGLE_AI_API_KEY = await getGeminiApiKey();

      // Usar sempre gemini-2.5-flash-lite diretamente via Google API
      const modelName = 'gemini-2.5-flash-lite';

      let content = "";
      let retryCount = 0;
      
      while (retryCount <= MAX_RETRIES) {
        try {
          // Google Gemini API direta
          const aiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_AI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt + (retryCount > 0 ? '\n\nIMPORTANTE: JSON COMPACTO e COMPLETO.' : '') }] }],
                generationConfig: {
                  temperature: 0.6,
                  maxOutputTokens: 16384,
                }
              }),
            }
          );

          if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            logStep(`Google AI error (status ${aiResponse.status})`, { error: errorText.substring(0, 200) });
            
            if (aiResponse.status === 429 || aiResponse.status === 503 || aiResponse.status === 500) {
              // Rate limit, serviço indisponível ou erro interno - esperar com backoff exponencial
              const waitTime = Math.min(5000 * Math.pow(2, retryCount), 30000);
              logStep(`Waiting ${waitTime}ms before retry ${retryCount + 1}`);
              await new Promise(r => setTimeout(r, waitTime));
              retryCount++;
              continue;
            }
            throw new Error(`Google AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Verificar se há blocked content ou safety filters
          const finishReason = aiData.candidates?.[0]?.finishReason;
          if (finishReason === 'SAFETY' || finishReason === 'BLOCKED') {
            logStep(`Content blocked by safety filter (attempt ${retryCount + 1})`, { finishReason });
            await new Promise(r => setTimeout(r, 3000));
            retryCount++;
            continue;
          }
          
          // Verificar se o content é válido antes de processar
          if (!content || content.startsWith('[INTERNAL') || content.includes('[INTERNAL') || content.length < 50) {
            logStep(`Invalid AI response (attempt ${retryCount + 1})`, { 
              contentStart: content?.substring(0, 100) || 'empty',
              length: content?.length || 0,
              finishReason
            });
            // Espera maior para erros internos (indica sobrecarga do servidor)
            const waitTime = Math.min(5000 * Math.pow(2, retryCount), 30000);
            logStep(`Waiting ${waitTime}ms before retry due to internal error`);
            await new Promise(r => setTimeout(r, waitTime));
            retryCount++;
            continue;
          }
          
          // Remover markdown
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          // Parse JSON
          const parsedContent: SimpleDayPlan = JSON.parse(content);
          
          // Validar
          const validationResult = validateMealPlan(
            parsedContent,
            {
              intolerances: restrictions.intolerances,
              dietaryPreference: restrictions.dietaryPreference,
              excludedIngredients: restrictions.excludedIngredients,
            },
            dbMappings,
            dbSafeKeywords,
            userCountry
          );
          
          logStep(`✓ Day ${dayIndex + 1} complete`, { 
            mealsCount: validationResult.validatedPlan.meals?.length,
            violations: validationResult.violations.length
          });
          
          return {
            dayIndex,
            plan: validationResult.validatedPlan,
            violations: validationResult.violations.map(v => ({ day: dayIndex + 1, ...v }))
          };
          
        } catch (parseError) {
          logStep(`⚠️ Day ${dayIndex + 1} parse error (attempt ${retryCount + 1})`, { 
            error: parseError instanceof Error ? parseError.message : 'Unknown' 
          });
          retryCount++;
          
          if (retryCount > MAX_RETRIES) {
            throw new Error(`Failed to generate day ${dayIndex + 1}`);
          }
        }
      }
      
      throw new Error(`Failed to generate day ${dayIndex + 1} after retries`);
    }
    
    // Processar em batches paralelos
    const totalBatches = Math.ceil(daysCount / BATCH_SIZE);
    logStep(`📦 Starting parallel generation`, { 
      totalDays: daysCount, 
      batchSize: BATCH_SIZE, 
      totalBatches 
    });
    
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, daysCount);
      const batchDays = [];
      
      logStep(`🔄 Processing batch ${batchNum + 1}/${totalBatches}`, { 
        days: `${batchStart + 1}-${batchEnd}` 
      });
      
      // Criar array de promises para este batch
      const batchPromises: Promise<{ dayIndex: number; plan: SimpleDayPlan | null; violations: any[] }>[] = [];
      
      for (let dayIndex = batchStart; dayIndex < batchEnd; dayIndex++) {
        // Passar as receitas já geradas dos batches anteriores
        batchPromises.push(generateSingleDay(dayIndex, [...previousDaysMeals]));
      }
      
      // Executar batch em paralelo
      const batchResults = await Promise.all(batchPromises);
      
      // Processar resultados do batch
      for (const result of batchResults) {
        if (result.plan) {
          generatedDays[result.dayIndex] = result.plan;
          
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
      
      logStep(`✅ Batch ${batchNum + 1} complete`, { 
        recipesCollected: previousDaysMeals.length 
      });
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
        const { data: existingPlan, error: fetchError } = await supabaseClient
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
        
        await supabaseClient
          .from("meal_plans")
          .update(updateData)
          .eq("id", existingPlanId);
        
        mealPlan = { ...existingPlan, custom_meal_times: customMealTimes || existingPlan.custom_meal_times };
        mealPlanIdToUse = existingPlan.id;
        logStep("Updated existing meal plan", { planId: mealPlanIdToUse });
      } else {
        // Criar novo plano
        const { data: newPlan, error: planError } = await supabaseClient
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
        await supabaseClient
          .from("meal_plans")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .neq("id", mealPlanIdToUse);
      }

      // Converter os dias gerados para meal_plan_items COM MACROS REAIS
      const items: any[] = [];
      const targetWeekNum = weekNumber || 1;
      
      // ============= CALCULAR MACROS OTIMIZADO (1 vez para todos) =============
      // Primeiro, coletar TODOS os alimentos de TODAS as refeições
      const allFoodsForCalculation: Array<{ mealIndex: number; food: RealMacrosFoodItem }> = [];
      const mealInfoMap: Map<number, { dayIndex: number; meal: any; firstOption: any }> = new Map();
      
      let mealCounter = 0;
      for (let dayIndex = 0; dayIndex < generatedDays.length; dayIndex++) {
        const day = generatedDays[dayIndex];
        
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
        supabaseClient,
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
        
        // Converter foods para o formato recipe_ingredients (com macros individuais)
        const recipeIngredients = mealResult.items.map((item: CalculatedFoodItem) => ({
          item: item.name,
          quantity: `${item.grams}g`,
          unit: "",
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          source: item.source,
          food_id: item.food_id,
        }));
        
        // Extrair instruções se existirem e LIMPAR menções a frutas/bebidas
        const rawInstructions = Array.isArray((firstOption as any).instructions) 
          ? (firstOption as any).instructions 
          : [];
        const instructions = cleanInstructionsFromFruitsAndBeverages(rawInstructions);
        
        items.push({
          meal_plan_id: mealPlanIdToUse,
          day_of_week: dayIndex,
          meal_type: meal.meal_type,
          recipe_name: firstOption.title || meal.label,
          recipe_calories: Math.round(totalMacros.calories),
          recipe_protein: Math.round(totalMacros.protein * 10) / 10,
          recipe_carbs: Math.round(totalMacros.carbs * 10) / 10,
          recipe_fat: Math.round(totalMacros.fat * 10) / 10,
          recipe_prep_time: 15,
          recipe_ingredients: recipeIngredients,
          recipe_instructions: instructions,
          week_number: targetWeekNum
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

      logStep("Inserting meal items with real macros", { count: items.length });

      const { error: itemsError } = await supabaseClient
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
