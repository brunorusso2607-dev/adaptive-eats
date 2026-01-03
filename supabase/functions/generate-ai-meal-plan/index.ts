import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  CALORIE_TABLE, 
  normalizeForCalorieTable, 
  findCaloriesPerGram, 
  calculateFoodCalories 
} from "../_shared/calorieTable.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getPortionFormat
} from "../_shared/nutritionPrompt.ts";
import { getAIPrompt, type AIPromptData } from "../_shared/getAIPrompt.ts";
// Importar cálculos nutricionais centralizados
import {
  calculateNutritionalTargets,
  calculateMealDistribution,
  buildNutritionalContextForPrompt,
  buildMealDistributionForPrompt,
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
  type RegionalConfig,
  type IntoleranceMapping,
  type SafeKeyword,
  type FoodItem,
  type ValidationResult,
  type MasterPromptParams,
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

// ============= DISTRIBUICAO CALORICA =============
const CALORIE_DISTRIBUTION: Record<string, number> = {
  cafe_manha: 0.22,
  lanche_manha: 0.08,
  almoco: 0.30,
  lanche_tarde: 0.10,
  jantar: 0.22,
  ceia: 0.08,
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

// ============= VALIDAÇÃO ESTRUTURAL: Coerência Título-Ingredientes =============
// Lista EXPANDIDA de ingredientes-chave que devem aparecer no título e nos foods
const TITLE_FOOD_KEYWORDS = [
  // Proteínas
  { titleKey: 'frango', foodKeys: ['frango', 'peito de frango', 'coxa'] },
  { titleKey: 'carne', foodKeys: ['carne', 'bife', 'file', 'filé'] },
  { titleKey: 'peixe', foodKeys: ['peixe', 'tilapia', 'atum', 'sardinha'] },
  { titleKey: 'salmao', foodKeys: ['salmao', 'salmão', 'salmon'] },
  { titleKey: 'ovo', foodKeys: ['ovo', 'ovos', 'clara'] },
  { titleKey: 'tofu', foodKeys: ['tofu'] },
  
  // Carboidratos
  { titleKey: 'feijao', foodKeys: ['feijao', 'feijão'] },
  { titleKey: 'arroz', foodKeys: ['arroz'] },
  { titleKey: 'quinoa', foodKeys: ['quinoa', 'quinua'] },
  { titleKey: 'grao de bico', foodKeys: ['grao de bico', 'grão de bico', 'grao-de-bico', 'grão-de-bico', 'homus', 'hummus', 'farinha de grao'] },
  { titleKey: 'aveia', foodKeys: ['aveia', 'flocos de aveia'] },
  { titleKey: 'tapioca', foodKeys: ['tapioca', 'goma de tapioca'] },
  { titleKey: 'batata', foodKeys: ['batata', 'batata doce', 'batata-doce'] },
  
  // Laticínios
  { titleKey: 'queijo', foodKeys: ['queijo'] },
  { titleKey: 'iogurte', foodKeys: ['iogurte', 'yogurt'] },
  { titleKey: 'leite', foodKeys: ['leite', 'leite de coco', 'leite de amendoas', 'leite de aveia'] },
  
  // Preparações compostas
  { titleKey: 'crepioca', foodKeys: ['crepioca', 'tapioca', 'goma de tapioca', 'grao de bico', 'farinha de grao'] },
  { titleKey: 'panqueca', foodKeys: ['panqueca', 'massa de panqueca', 'farinha', 'aveia'] },
  { titleKey: 'omelete', foodKeys: ['omelete', 'ovo', 'ovos', 'clara'] },
  { titleKey: 'wrap', foodKeys: ['wrap', 'tortilla', 'tortilha'] },
  { titleKey: 'sanduiche', foodKeys: ['sanduiche', 'sanduíche', 'pao', 'pão'] },
  
  // Sopas e preparações que PRECISAM do ingrediente principal
  { titleKey: 'sopa', foodKeys: ['sopa', 'caldo', 'abobora', 'abóbora', 'legume', 'frango', 'carne', 'feijao', 'lentilha', 'ervilha'] },
  { titleKey: 'creme', foodKeys: ['creme', 'abobora', 'abóbora', 'legume', 'milho', 'espinafre', 'mandioquinha'] },
  { titleKey: 'pure', foodKeys: ['pure', 'purê', 'batata', 'mandioca', 'mandioquinha', 'abobora'] },
  { titleKey: 'vitamina', foodKeys: ['vitamina', 'banana', 'morango', 'mamao', 'manga', 'leite', 'iogurte'] },
  { titleKey: 'mingau', foodKeys: ['mingau', 'aveia', 'tapioca', 'fuba', 'maizena'] },
  { titleKey: 'salada', foodKeys: ['salada', 'alface', 'rucula', 'tomate', 'pepino', 'folha', 'verdura', 'legume'] },
  { titleKey: 'smoothie', foodKeys: ['smoothie', 'vitamina', 'banana', 'morango', 'leite'] },
  { titleKey: 'pudim', foodKeys: ['pudim', 'chia', 'leite', 'leite de coco'] },
  
  // Preparações com ingredientes específicos
  { titleKey: 'abobora', foodKeys: ['abobora', 'abóbora'] },
  { titleKey: 'gengibre', foodKeys: ['gengibre'] },
  { titleKey: 'leite de coco', foodKeys: ['leite de coco', 'coco'] },
  { titleKey: 'chia', foodKeys: ['chia', 'semente de chia'] },
  
  // Torradas (diferente de pão)
  { titleKey: 'torrada', foodKeys: ['torrada', 'toast'] },
];

function validateTitleIngredientCoherence(
  title: string,
  foods: FoodItem[]
): { isCoherent: boolean; issue?: string; missingIngredients: string[] } {
  const normalizedTitle = normalizeText(title);
  const foodNames = foods.map(f => normalizeText(f.name)).join(' ');
  const missingIngredients: string[] = [];
  
  for (const mapping of TITLE_FOOD_KEYWORDS) {
    if (normalizedTitle.includes(mapping.titleKey)) {
      const hasIngredient = mapping.foodKeys.some(fk => foodNames.includes(fk));
      if (!hasIngredient) {
        missingIngredients.push(mapping.titleKey);
      }
    }
  }
  
  if (missingIngredients.length > 0) {
    return { 
      isCoherent: false, 
      issue: `Título menciona [${missingIngredients.join(', ')}] mas não estão nos ingredientes`,
      missingIngredients,
    };
  }
  
  return { isCoherent: true, missingIngredients: [] };
}

// ============= GERAR TÍTULO BASEADO NOS INGREDIENTES REAIS =============
function generateTitleFromFoods(foods: FoodItem[], mealType: string): string {
  if (foods.length === 0) return 'Refeição';
  
  // Encontrar ingredientes principais (excluindo bebidas e frutas)
  const mainIngredients: string[] = [];
  const sideIngredients: string[] = [];
  
  for (const food of foods) {
    const normalized = normalizeText(food.name);
    
    // Ignorar bebidas simples
    if (normalized.includes('cha') || normalized.includes('cafe') || normalized.includes('agua')) {
      continue;
    }
    
    // Classificar como principal ou acompanhamento
    const isMainIngredient = 
      normalized.includes('frango') || normalized.includes('carne') || normalized.includes('peixe') ||
      normalized.includes('tofu') || normalized.includes('ovo') || normalized.includes('omelete') ||
      normalized.includes('hamburguer') || normalized.includes('salmao') || normalized.includes('atum') ||
      normalized.includes('feijao') || normalized.includes('wrap') || normalized.includes('sanduiche') ||
      normalized.includes('espaguete') || normalized.includes('macarrao') || normalized.includes('mingau') ||
      normalized.includes('iogurte') || normalized.includes('tapioca') || normalized.includes('crepioca');
    
    // Extrair nome simplificado (primeira parte significativa)
    const simpleName = food.name
      .replace(/^\d+\s*(unidade[s]?|porcao|porcoes|colher[es]?\s*(de\s*sopa)?|fatia[s]?|copo[s]?|xicara[s]?)\s*(de\s*)?/gi, '')
      .replace(/\s*\(\d+g\)\s*$/g, '')
      .replace(/^\s*(1\s+)?/g, '')
      .trim();
    
    if (simpleName.length > 2) {
      if (isMainIngredient) {
        mainIngredients.push(simpleName);
      } else if (mainIngredients.length < 3 && sideIngredients.length < 2) {
        sideIngredients.push(simpleName);
      }
    }
  }
  
  // Construir título
  if (mainIngredients.length > 0) {
    const main = mainIngredients.slice(0, 2).join(' com ');
    if (sideIngredients.length > 0) {
      return `${main} e ${sideIngredients[0]}`;
    }
    return main;
  }
  
  // Fallback: usar primeiros 2 ingredientes
  if (sideIngredients.length > 0) {
    return sideIngredients.slice(0, 2).join(' com ');
  }
  
  return foods[0]?.name?.substring(0, 50) || 'Refeição';
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

function validateMealPlan(
  dayPlan: SimpleDayPlan,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  dbMappings: IntoleranceMapping[],
  dbSafeKeywords: SafeKeyword[]
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
          let fixedFood: FoodItem = { name: foodName, grams: foodGrams };
          
          // Validação 1: Corrigir uso incorreto de medidas
          const measureCheck = validateMeasureUsage(fixedFood);
          if (!measureCheck.isCorrect && measureCheck.fixedName) {
            logStep(`🔧 CORREÇÃO DE MEDIDA: "${foodName}" → "${measureCheck.fixedName}"`, { issue: measureCheck.issue });
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
            reason: validation.reason || 'Restrição violada',
            restriction: validation.restriction || 'unknown',
          });
        }
      }
      
      // Validação 2: Coerência título-ingredientes - AGORA CORRIGE AUTOMATICAMENTE
      const coherenceCheck = validateTitleIngredientCoherence(option.title, cleanedFoods);
      let finalTitle = option.title;
      
      if (!coherenceCheck.isCoherent) {
        logStep(`⚠️ INCOERÊNCIA TÍTULO-INGREDIENTES DETECTADA`, {
          originalTitle: option.title,
          issue: coherenceCheck.issue,
          missingIngredients: coherenceCheck.missingIngredients,
          foods: cleanedFoods.map(f => f.name),
        });
        
        // CORREÇÃO AUTOMÁTICA: Gerar novo título baseado nos ingredientes reais
        const correctedTitle = generateTitleFromFoods(cleanedFoods, meal.meal_type);
        finalTitle = correctedTitle;
        logStep(`🔧 TÍTULO CORRIGIDO: "${option.title}" → "${correctedTitle}"`);
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
      
      // ============= PÓS-PROCESSAMENTO: AGRUPAR INGREDIENTES SEPARADOS =============
      const foodsForGrouping: FoodItem[] = cleanedFoods.map(f => ({
        name: typeof f === 'string' ? f : f.name,
        grams: typeof f === 'object' && 'grams' in f ? f.grams : 100,
      }));
      
      const { groupedFoods, wasGrouped, groupedTitle } = groupSeparatedIngredients(
        foodsForGrouping,
        meal.meal_type
      );
      
      if (wasGrouped) {
        logStep(`🔄 AGRUPAMENTO APLICADO em "${meal.label}"`, {
          originalCount: cleanedFoods.length,
          groupedCount: groupedFoods.length,
          groupedTitle,
          originalItems: cleanedFoods.map(f => typeof f === 'string' ? f : f.name),
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
    
    // ============= DETERMINAR MEAL TYPES BASEADO NO PERFIL =============
    // Prioridade: 1) requestedMealTypes (da request), 2) enabled_meals (do perfil), 3) default 5 refeições
    const DEFAULT_MEAL_TYPES = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"];
    
    logStep("🔍 DEBUG: Checking mealTypes sources", { 
      requestedMealTypes, 
      profileEnabledMeals: profile.enabled_meals,
      hasRequestedTypes: !!(requestedMealTypes && Array.isArray(requestedMealTypes) && requestedMealTypes.length > 0),
      hasProfileTypes: !!(profile.enabled_meals && Array.isArray(profile.enabled_meals) && profile.enabled_meals.length > 0)
    });
    
    let mealTypes: string[];
    if (requestedMealTypes && Array.isArray(requestedMealTypes) && requestedMealTypes.length > 0) {
      // Usar os tipos passados na request
      mealTypes = requestedMealTypes;
      logStep("✅ Using mealTypes from REQUEST", { mealTypes, count: mealTypes.length });
    } else if (profile.enabled_meals && Array.isArray(profile.enabled_meals) && profile.enabled_meals.length > 0) {
      // Usar os tipos do perfil do usuário
      // Normalizar nomes: "lanche" -> "lanche_tarde" para manter consistência
      mealTypes = profile.enabled_meals.map((meal: string) => {
        if (meal === "lanche") return "lanche_tarde";
        return meal;
      });
      logStep("✅ Using mealTypes from PROFILE (enabled_meals)", { mealTypes, count: mealTypes.length, original: profile.enabled_meals });
    } else {
      // Fallback para default
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
      dietaryPreference: profile.dietary_preference || 'comum',
      excludedIngredients: profile.excluded_ingredients || [],
      goal: profile.goal || 'manter',
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
      effectiveStrategyKey = 'emagrecer'; // Usa pool saudável para o plano principal
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
      const goal = profile.goal || 'manter';
      const dietaryPreference = profile.dietary_preference || 'comum';
      
      let calorieModifier = 0;
      let proteinPerKg = 1.6;
      let carbRatio = 0.45;
      let fatRatio = 0.30;

      // Ajustes por objetivo
      if (goal === 'emagrecer') {
        calorieModifier = -500;
        proteinPerKg = 2.0;
      } else if (goal === 'ganhar_peso') {
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

    // Buscar prompt do banco de dados
    let aiPromptData: AIPromptData | null = null;
    try {
      aiPromptData = await getAIPrompt('generate-ai-meal-plan');
      logStep("AI Prompt loaded from database", { 
        functionId: aiPromptData.function_id,
        model: aiPromptData.model,
        promptLength: aiPromptData.system_prompt.length,
        promptPreview: aiPromptData.system_prompt.substring(0, 200) + '...'
      });
    } catch (promptError) {
      logStep("❌ CRITICAL: Could not load AI prompt from database, using fallback", { 
        error: promptError instanceof Error ? promptError.message : 'Unknown error' 
      });
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
    
    // Coletar receitas já geradas para evitar repetição entre dias
    const previousDaysMeals: string[] = [];
    
    // Configuração de paralelismo
    const BATCH_SIZE = 4; // Gerar 4 dias simultaneamente
    const MAX_RETRIES = 1;
    
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
        baseSystemPrompt: aiPromptData?.system_prompt,
        nutritionalContext,
        strategyKey: effectiveStrategyKey,
        previousDaysMeals: previousMeals,
        nutritionalTablePrompt,
      });

      const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

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
            
            if (aiResponse.status === 429 || aiResponse.status === 503) {
              // Rate limit ou serviço indisponível - esperar e tentar novamente
              await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
              retryCount++;
              continue;
            }
            throw new Error(`Google AI API error: ${aiResponse.status}`);
          }

          const aiData = await aiResponse.json();
          content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          
          // Verificar se o content é válido antes de processar
          if (!content || content.startsWith('[INTERNAL') || content.length < 50) {
            logStep(`Invalid AI response (attempt ${retryCount + 1})`, { 
              contentStart: content?.substring(0, 100) || 'empty',
              length: content?.length || 0
            });
            await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
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
            dbSafeKeywords
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
