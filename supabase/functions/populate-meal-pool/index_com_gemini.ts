import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * ============= MEAL POOL GOLDEN RULE =============
 * 
 * This module MUST generate meals FREELY.
 * 
 * ✅ ALLOWED:
 * - Generate ALL possible meal combinations
 * - Use ALL ingredients available in the market
 * - Explore maximum variety of proteins, carbs, vegetables, beverages
 * - Generate meals that may contain allergens
 * - Generate meals that may not fit specific diets
 * 
 * ❌ NOT ALLOWED:
 * - Filter by intolerances (done in meal planner)
 * - Filter by dietary restrictions (done in meal planner)
 * - Enforce mutual exclusion rules (done in meal planner)
 * - Block "forbidden" combinations (pool explores everything)
 * 
 * 📌 Cultural context is GUIDANCE, not enforcement.
 * 📌 The safety engine lives in generate-ai-meal-plan, NOT here.
 */

// ============= IMPORTS DOS MÓDULOS COMPARTILHADOS =============
import {
  REGIONAL_CONFIGS,
  getRegionalConfig,
  getStrategyPersona,
  normalizeText,
  type RegionalConfig,
} from "../_shared/mealGenerationConfig.ts";

import {
  loadSafetyDatabase,
  checkIngredientForDietary,
  validateIngredientList,
  normalizeUserIntolerances,
  type SafetyDatabase,
  type UserRestrictions,
} from "../_shared/globalSafetyEngine.ts";

import {
  CALORIE_TABLE,
  normalizeForCalorieTable,
} from "../_shared/calorieTable.ts";


// ============= IMPORTS DE VALIDAÇÃO DIETÉTICA =============
import {
  filterComponentsByDiet,
  validateMealForDietaryPreference,
  validateProteinForMealTypeWithDiet,
} from "./dietary-validation.ts";

// ============= IMPORTS DE VALIDAÇÃO DE PORÇÕES (CENTRALIZADO) =============
import {
  fixMealComponents,
  validateProteinVariety,
} from "../_shared/portionValidation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[MEAL-POOL] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= TIPOS =============
interface MealComponent {
  type: string; // protein, carb, vegetable, fruit, beverage, fat, fiber, dairy, grain, legume
  name: string;
  name_en?: string;
  canonical_id?: string; // ID do canonical_ingredients
  portion_grams?: number;
  portion_ml?: number;
  portion_label: string;
}

interface GeneratedMeal {
  name: string;
  description: string;
  components: MealComponent[];
  dietary_tags: string[];
  blocked_for_intolerances: string[];
  flexible_options: Record<string, string[]>;
  instructions: string[];
  prep_time_minutes: number;
}

interface CanonicalIngredient {
  id: string;
  name_en: string;
  name_pt: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  default_portion_grams: number;
  portion_label_en: string;
  portion_label_pt: string;
  intolerance_flags: string[];
  dietary_flags: string[];
  country_specific: string[] | null;
}

// ============= INTERFACES PARA SISTEMA DINÂMICO =============
interface CulturalRule {
  id: string;
  country_code: string;
  meal_type: string;
  required_components: string[];
  forbidden_components: string[];
  typical_beverages: string[];
  forbidden_beverages: string[];
  structure_description: string | null;
  examples: string[];
  negative_examples: string[];
  macro_focus: { carb: string; protein: string; fat: string };
  max_prep_time: string;
  fallback_country_code: string | null;
}

interface MealComponentPool {
  id: string;
  country_code: string;
  meal_type: string;
  component_type: string;
  name: string;
  name_en: string | null;
  portion_grams: number | null;
  portion_ml: number | null;
  portion_label: string | null;
  blocked_for: string[];
  safe_for: string[];
  is_alternative: boolean;
}

interface CountryFallback {
  country_code: string;
  fallback_chain: string[];
  notes: string | null;
}

// ============= FUNÇÕES PARA CARREGAR DADOS DINÂMICOS =============

// Carrega países ativos do onboarding
async function loadActiveCountries(supabase: any): Promise<string[]> {
  const { data } = await supabase
    .from('onboarding_countries')
    .select('country_code')
    .eq('is_active', true);
  
  return data?.map((c: any) => c.country_code) || ['BR'];
}

// Carrega hierarquia de fallback para um país
async function loadFallbackChain(supabase: any, countryCode: string): Promise<string[]> {
  const { data } = await supabase
    .from('country_fallback_hierarchy')
    .select('fallback_chain')
    .eq('country_code', countryCode)
    .single();
  
  return data?.fallback_chain || ['BR'];
}

// Carrega regras culturais para um país e tipo de refeição
async function loadCulturalRule(
  supabase: any,
  countryCode: string,
  mealType: string
): Promise<CulturalRule | null> {
  // Tentar carregar regra do país
  const { data: rule } = await supabase
    .from('cultural_rules')
    .select('*')
    .eq('country_code', countryCode)
    .eq('meal_type', mealType)
    .eq('is_active', true)
    .single();
  
  if (rule) {
    logStep("Cultural rule loaded from DB", { country: countryCode, mealType });
    return rule as CulturalRule;
  }
  
  // Se não encontrou, usar fallback
  const fallbackChain = await loadFallbackChain(supabase, countryCode);
  
  for (const fallbackCountry of fallbackChain) {
    const { data: fallbackRule } = await supabase
      .from('cultural_rules')
      .select('*')
      .eq('country_code', fallbackCountry)
      .eq('meal_type', mealType)
      .eq('is_active', true)
      .single();
    
    if (fallbackRule) {
      logStep("Using fallback cultural rule", { 
        original: countryCode, 
        fallback: fallbackCountry, 
        mealType 
      });
      return fallbackRule as CulturalRule;
    }
  }
  
  // Fallback final: Brasil
  const { data: brRule } = await supabase
    .from('cultural_rules')
    .select('*')
    .eq('country_code', 'BR')
    .eq('meal_type', mealType)
    .eq('is_active', true)
    .single();
  
  if (brRule) {
    logStep("Using BR as final fallback", { original: countryCode, mealType });
    return brRule as CulturalRule;
  }
  
  return null;
}

// Carrega componentes de refeição para um país
async function loadMealComponents(
  supabase: any,
  countryCode: string,
  mealType: string,
  intoleranceFilter?: string | null,
  dietaryFilter?: string | null
): Promise<MealComponentPool[]> {
  // Buscar componentes do país (meal_type = 'all' ou específico)
  let query = supabase
    .from('meal_components_pool')
    .select('*')
    .eq('country_code', countryCode)
    .eq('is_active', true)
    .or(`meal_type.eq.all,meal_type.eq.${mealType}`);
  
  const { data: components } = await query;
  
  if (components && components.length > 0) {
    logStep("Components loaded from DB", { 
      country: countryCode, 
      count: components.length 
    });
    
    // FILTRO CRÍTICO: Aplicar lógica de alternativas corretamente
    const filtered = components.filter((c: MealComponentPool) => {
      const isAlternative = c.is_alternative || (c.safe_for && c.safe_for.length > 0);
      
      if (!intoleranceFilter) {
        // SEM FILTRO: Excluir alternativas, manter apenas itens normais
        // "Queijo sem lactose" NÃO deve aparecer para quem não tem intolerância
        return !isAlternative;
      }
      
      // COM FILTRO: Verificar se é seguro para esta intolerância
      const isBlocked = c.blocked_for?.includes(intoleranceFilter);
      const isSafeForThisIntolerance = c.safe_for?.includes(intoleranceFilter);
      
      // Se é alternativa, só incluir se for para ESTA intolerância
      if (isAlternative) {
        return isSafeForThisIntolerance;
      }
      
      // Item normal: incluir se não está bloqueado
      return !isBlocked;
    });
    
    logStep("Components filtered by intolerance", { 
      original: components.length, 
      filtered: filtered.length,
      intolerance: intoleranceFilter || 'none',
      removedAlternatives: intoleranceFilter ? 0 : components.length - filtered.length
    });
    
    // Filtrar por preferência dietética
    let finalFiltered = filtered;
    if (dietaryFilter && dietaryFilter !== 'omnivore') {
      finalFiltered = await filterComponentsByDiet(filtered, dietaryFilter, supabase);
      logStep("Components filtered by dietary preference", {
        beforeDiet: filtered.length,
        afterDiet: finalFiltered.length,
        dietary: dietaryFilter,
        removed: filtered.length - finalFiltered.length
      });
    }
    
    return finalFiltered;
  }
  
  // Se não encontrou, usar fallback
  const fallbackChain = await loadFallbackChain(supabase, countryCode);
  
  for (const fallbackCountry of fallbackChain) {
    const { data: fallbackComponents } = await supabase
      .from('meal_components_pool')
      .select('*')
      .eq('country_code', fallbackCountry)
      .eq('is_active', true)
      .or(`meal_type.eq.all,meal_type.eq.${mealType}`);
    
    if (fallbackComponents && fallbackComponents.length > 0) {
      logStep("Using fallback components", { 
        original: countryCode, 
        fallback: fallbackCountry, 
        count: fallbackComponents.length 
      });
      
      // Aplicar mesma lógica de filtro para fallback
      let fallbackFiltered = fallbackComponents.filter((c: MealComponentPool) => {
        const isAlternative = c.is_alternative || (c.safe_for && c.safe_for.length > 0);
        
        if (!intoleranceFilter) {
          return !isAlternative;
        }
        
        const isBlocked = c.blocked_for?.includes(intoleranceFilter);
        const isSafeForThisIntolerance = c.safe_for?.includes(intoleranceFilter);
        
        if (isAlternative) {
          return isSafeForThisIntolerance;
        }
        
        return !isBlocked;
      });
      
      // Filtrar por dieta também no fallback
      if (dietaryFilter && dietaryFilter !== 'omnivore') {
        fallbackFiltered = await filterComponentsByDiet(fallbackFiltered, dietaryFilter, supabase);
      }
      
      return fallbackFiltered;
    }
  }
  
  logStep("No components found in DB, using hardcoded fallback");
  return [];
}

// Agrupa componentes por tipo
function groupComponentsByType(
  components: MealComponentPool[]
): Record<string, MealComponentPool[]> {
  const grouped: Record<string, MealComponentPool[]> = {};
  
  for (const component of components) {
    if (!grouped[component.component_type]) {
      grouped[component.component_type] = [];
    }
    grouped[component.component_type].push(component);
  }
  
  return grouped;
}
// ============= REGRAS NUTRICIONAIS GLOBAIS POR TIPO DE REFEIÇÃO =============
// Baseado em ciência nutricional e padrões alimentares reais mundiais
// Fonte: Harvard School of Public Health, WHO, padrões culturais regionais

const MEAL_STRUCTURES: Record<string, {
  required: string[];
  optional: string[];
  rules: string;
  max_prep_time: string;
  examples: string[];
  macro_focus: { carb: string; protein: string; fat: string };
  calorie_range: { min: number; max: number };
  global_rules: string[];
  forbidden_foods: string[];
}> = {
  cafe_manha: {
    required: ["carbs", "proteins"],
    optional: ["dairy", "fruits", "beverages"],
    rules: "1 carboidrato + 1 proteína + bebida opcional",
    max_prep_time: "10 minutos",
    examples: [
      "Pão francês + ovo mexido + café com leite",
      "Tapioca + queijo branco + café puro",
      "Aveia + banana + leite",
      "Pão integral + ovo cozido + suco de laranja",
      "Cuscuz + ovo frito + café com leite",
    ],
    macro_focus: { carb: "alto", protein: "médio", fat: "moderado" },
    calorie_range: { min: 250, max: 500 },
    global_rules: [
      "Carboidrato de absorção moderada (pão, aveia, tapioca)",
      "Proteína leve (ovo, queijo, iogurte)",
      "NUNCA carne vermelha, frango, peixe no café da manhã",
      "NUNCA arroz ou feijão no café da manhã",
      "Bebida quente ou suco natural opcional",
    ],
    forbidden_foods: ["arroz", "feijão", "frango", "carne", "bife", "peixe", "macarrão", "salada verde"],
  },
  lanche_manha: {
    required: ["fruits"],
    optional: ["dairy"],
    rules: "1 fruta + laticínio leve opcional",
    max_prep_time: "5 minutos",
    examples: [
      "Banana + iogurte natural",
      "Maçã + castanhas",
      "Mamão + granola",
      "Morango + iogurte",
      "Laranja",
    ],
    macro_focus: { carb: "moderado", protein: "baixo", fat: "baixo" },
    calorie_range: { min: 80, max: 200 },
    global_rules: [
      "Lanche LEVE entre café e almoço",
      "Máximo 2 itens",
      "Foco em frutas e proteína leve",
      "NUNCA refeição completa",
      "NUNCA carboidratos pesados",
    ],
    forbidden_foods: ["arroz", "feijão", "frango", "carne", "pão", "macarrão", "batata"],
  },
  almoco: {
    required: ["carbs", "proteins", "vegetables"],
    optional: ["legumes"],
    rules: "Base de carboidrato + proteína + vegetal + leguminosa opcional",
    max_prep_time: "30 minutos",
    examples: [
      "Arroz + feijão + frango grelhado + salada verde",
      "Arroz + bife grelhado + legumes refogados",
      "Macarrão com molho + carne moída + brócolis",
      "Arroz + peixe grelhado + salada",
      "Batata + frango + legumes",
    ],
    macro_focus: { carb: "alto", protein: "alto", fat: "moderado" },
    calorie_range: { min: 400, max: 700 },
    global_rules: [
      "Refeição principal do dia na maioria das culturas",
      "SEMPRE inclui proteína substancial (carne, frango, peixe)",
      "SEMPRE inclui base de carboidrato (arroz, macarrão, batata)",
      "SEMPRE inclui vegetal ou salada",
      "NUNCA tapioca, cuscuz, pão (são café da manhã)",
      "NUNCA iogurte, granola, aveia (são lanche)",
    ],
    forbidden_foods: ["tapioca", "cuscuz", "pão", "iogurte", "granola", "aveia", "leite", "café"],
  },
  lanche_tarde: {
    required: ["carbs"],
    optional: ["proteins", "dairy", "fruits"],
    rules: "Lanche leve similar ao café da manhã",
    max_prep_time: "10 minutos",
    examples: [
      "Pão integral + queijo branco",
      "Tapioca + manteiga",
      "Iogurte + granola",
      "Vitamina de banana",
      "Frutas + castanhas",
    ],
    macro_focus: { carb: "moderado", protein: "moderado", fat: "baixo" },
    calorie_range: { min: 150, max: 350 },
    global_rules: [
      "Lanche LEVE entre almoço e jantar",
      "Similar ao café da manhã mas mais leve",
      "Máximo 3 itens",
      "NUNCA refeição completa com arroz/feijão",
      "NUNCA carnes pesadas",
    ],
    forbidden_foods: ["arroz", "feijão", "frango grelhado", "bife", "peixe grelhado", "macarrão"],
  },
  jantar: {
    required: ["proteins", "vegetables", "carbs"],
    optional: [],
    rules: "Proteína + vegetal + carboidrato (porção reduzida)",
    max_prep_time: "20 minutos",
    examples: [
      "Frango grelhado + salada verde",
      "Omelete + legumes refogados",
      "Peixe grelhado + brócolis",
      "Sopa de legumes com frango",
      "Arroz + frango + salada (porção menor que almoço)",
    ],
    macro_focus: { carb: "baixo", protein: "alto", fat: "moderado" },
    calorie_range: { min: 300, max: 550 },
    global_rules: [
      "Jantar mais leve que almoço na maioria das culturas",
      "Proteína + vegetais + carboidrato como base",
      "Carboidrato OBRIGATÓRIO mas em menor quantidade que almoço",
      "Evitar alimentos pesados antes de dormir",
      "NUNCA tapioca, cuscuz, pão (são café da manhã)",
    ],
    forbidden_foods: ["tapioca", "cuscuz", "pão", "iogurte", "granola", "aveia"],
  },
  ceia: {
    required: ["dairy"],
    optional: ["fruits"],
    rules: "Lanche MUITO LEVE antes de dormir - apenas 1-2 itens",
    max_prep_time: "5 minutos",
    examples: [
      "Iogurte natural",
      "Leite morno",
      "Queijo branco (2 fatias)",
      "Iogurte com banana",
      "Chá de camomila + biscoito integral",
    ],
    macro_focus: { carb: "muito baixo", protein: "leve", fat: "baixo" },
    calorie_range: { min: 50, max: 180 },
    global_rules: [
      "CEIA É EXTREMAMENTE LEVE - máximo 150-180 calorias",
      "Objetivo: saciedade leve sem atrapalhar digestão/sono",
      "Máximo 2 itens SIMPLES",
      "Foco em proteína leve (laticínio) ou chá",
      "NUNCA ovo, carne, carboidratos pesados",
      "NUNCA tapioca, cuscuz, pão completo",
      "NUNCA café (atrapalha sono)",
      "NUNCA refeição completa - isso é CEIA, não jantar",
    ],
    forbidden_foods: ["ovo", "frango", "carne", "peixe", "arroz", "feijão", "macarrão", "tapioca", "cuscuz", "pão francês", "café", "batata"],
  },
};

// ============= MAPEAMENTO DE INTOLERÂNCIAS PARA INGREDIENTES =============
// IMPORTANTE: Chaves devem corresponder EXATAMENTE às do onboarding_options
// Onboarding usa: gluten, lactose, fodmap, peanut, nuts, seafood, fish, eggs, soy
const INTOLERANCE_INGREDIENT_MAP: Record<string, string[]> = {
  // Intolerâncias principais (onboarding)
  gluten: ["pão", "pão francês", "pão de forma", "pão integral", "pão sírio", "macarrão", "biscoito", "bolo", "farinha de trigo", "aveia", "cevada", "centeio", "torrada", "pizza", "massa", "tapioca", "cuscuz"],
  lactose: ["leite", "leite integral", "leite desnatado", "queijo", "queijo branco", "queijo minas", "queijo prato", "iogurte", "iogurte natural", "manteiga", "requeijão", "creme de leite", "nata", "sorvete", "café com leite", "vitamina"],
  fodmap: ["cebola", "alho", "feijão", "maçã", "leite", "trigo", "mel", "cogumelo", "couve-flor", "lentilha"],
  
  // Alergias (onboarding)
  peanut: ["amendoim", "pasta de amendoim", "paçoca"],
  nuts: ["castanha", "nozes", "amêndoas", "avelã", "macadâmia", "pistache", "granola"],
  tree_nuts: ["castanha", "nozes", "amêndoas", "avelã", "macadâmia", "pistache"],
  seafood: ["camarão", "lagosta", "caranguejo", "mexilhão", "lula", "polvo", "frutos do mar"],
  fish: ["peixe", "salmão", "tilápia", "atum", "bacalhau", "sardinha"],
  egg: ["ovo", "omelete", "maionese", "bolo", "torta", "suflê", "merengue"], // PADRONIZADO: singular
  soy: ["soja", "tofu", "tempeh", "molho de soja", "shoyu", "edamame", "leite de soja"],
  
  // Sensibilidades (onboarding)
  sugar: ["açúcar", "doce", "mel", "xarope", "refrigerante", "bolo", "sorvete"],
  caffeine: ["café", "chá preto", "chá verde", "energético", "chocolate"],
  histamine: ["queijo curado", "vinho", "vinagre", "embutidos", "fermentados", "peixe enlatado"],
  
  // Aliases e variantes
  milk: ["leite", "queijo", "iogurte", "manteiga", "requeijão", "creme de leite", "nata", "whey"],
  celiac: ["trigo", "cevada", "centeio", "aveia", "pão", "macarrão", "pizza", "biscoito"],
  shellfish: ["camarão", "lagosta", "caranguejo", "mexilhão", "ostra", "marisco"],
  fructose: ["maçã", "pera", "manga", "mel", "xarope de milho", "melancia"],
  sulfite: ["vinho", "frutas secas", "vinagre", "mostarda", "camarão"],
  nightshade: ["tomate", "batata", "pimentão", "berinjela", "pimenta"],
  corn: ["milho", "fubá", "polenta", "amido de milho", "xarope de milho"],
  sesame: ["gergelim", "tahine", "óleo de gergelim"],
  mustard: ["mostarda", "molho de mostarda"],
};

// ============= CULTURAL HINTS (orientação, não regra) =============
// Pool pode gerar qualquer combinação - hints são apenas para guiar a IA
const CULTURAL_HINTS: Record<string, Record<string, string[]>> = {
  BR: {
    cafe_manha: ["pão francês", "tapioca", "cuscuz", "café com leite", "vitamina", "mingau", "ovo"],
    lanche_manha: ["fruta", "iogurte", "pão de queijo", "suco", "castanha"],
    almoco: ["arroz", "feijão", "frango", "carne", "peixe", "salada", "legumes", "macarrão"],
    lanche_tarde: ["pão", "bolo", "café", "chá", "biscoito", "tapioca"],
    jantar: ["arroz", "ovo", "sopa", "omelete", "salada", "frango", "peixe"],
    ceia: ["leite", "chá", "iogurte", "fruta", "biscoito"],
  },
  US: {
    cafe_manha: ["eggs", "bacon", "pancakes", "toast", "cereal", "coffee", "orange juice"],
    almoco: ["sandwich", "salad", "burger", "soup", "wrap"],
    jantar: ["chicken", "steak", "pasta", "rice", "vegetables", "salad"],
  },
  MX: {
    cafe_manha: ["huevos", "frijoles", "tortilla", "chilaquiles", "café"],
    almoco: ["arroz", "frijoles", "carne", "pollo", "tacos", "enchiladas"],
  },
  // Outros países podem ser adicionados dinamicamente
};

// NOTA: FORBIDDEN_COMBINATIONS removido - pool explora tudo
// Validação de combinações culturais é feita no generate-ai-meal-plan

// ============= CULTURAL WEIGHTS (pesos probabilísticos) =============
// Cultura = distribuição de probabilidade, não obrigatoriedade
// Weights indicam FREQUÊNCIA, não REGRA

type CulturalWeight = {
  component: string;
  weight: number; // 0 a 1 (0 = raro, 1 = muito comum)
};

/**
 * Cultural habits increase probability, never enforce presence.
 * The meal pool must reflect reality, not stereotypes.
 */
const CULTURAL_WEIGHTS: Record<string, Record<string, CulturalWeight[]>> = {
  BR: {
    almoco: [
      { component: "arroz", weight: 0.9 },
      { component: "feijão", weight: 0.85 },
      { component: "frango", weight: 0.6 },
      { component: "carne bovina", weight: 0.6 },
      { component: "peixe", weight: 0.4 },
      { component: "salada", weight: 0.5 },
      { component: "legumes", weight: 0.45 },
      { component: "macarrão", weight: 0.35 },
      { component: "batata", weight: 0.25 },
      { component: "ovo", weight: 0.3 },
    ],
    jantar: [
      { component: "arroz", weight: 0.6 },
      { component: "ovo", weight: 0.7 },
      { component: "sopa", weight: 0.5 },
      { component: "frango", weight: 0.55 },
      { component: "salada", weight: 0.6 },
      { component: "legumes", weight: 0.5 },
      { component: "peixe", weight: 0.4 },
      { component: "omelete", weight: 0.45 },
    ],
    cafe_manha: [
      { component: "pão francês", weight: 0.8 },
      { component: "café", weight: 0.95 },
      { component: "leite", weight: 0.7 },
      { component: "tapioca", weight: 0.4 },
      { component: "cuscuz", weight: 0.35 },
      { component: "ovo", weight: 0.5 },
      { component: "queijo", weight: 0.6 },
      { component: "fruta", weight: 0.5 },
    ],
  },
  US: {
    almoco: [
      { component: "sandwich", weight: 0.8 },
      { component: "salad", weight: 0.7 },
      { component: "burger", weight: 0.6 },
      { component: "chicken", weight: 0.65 },
      { component: "fries", weight: 0.5 },
      { component: "soup", weight: 0.4 },
      { component: "wrap", weight: 0.5 },
    ],
    jantar: [
      { component: "chicken", weight: 0.7 },
      { component: "steak", weight: 0.6 },
      { component: "pasta", weight: 0.5 },
      { component: "rice", weight: 0.4 },
      { component: "vegetables", weight: 0.6 },
      { component: "salad", weight: 0.5 },
    ],
    cafe_manha: [
      { component: "eggs", weight: 0.8 },
      { component: "bacon", weight: 0.6 },
      { component: "toast", weight: 0.7 },
      { component: "pancakes", weight: 0.5 },
      { component: "cereal", weight: 0.6 },
      { component: "coffee", weight: 0.9 },
    ],
  },
  MX: {
    almoco: [
      { component: "tortilla", weight: 0.9 },
      { component: "frijoles", weight: 0.85 },
      { component: "arroz", weight: 0.7 },
      { component: "carne", weight: 0.65 },
      { component: "pollo", weight: 0.6 },
      { component: "salsa", weight: 0.8 },
      { component: "aguacate", weight: 0.5 },
    ],
    cafe_manha: [
      { component: "huevos", weight: 0.8 },
      { component: "frijoles", weight: 0.7 },
      { component: "tortilla", weight: 0.75 },
      { component: "chilaquiles", weight: 0.4 },
      { component: "café", weight: 0.9 },
    ],
  },
  PT: {
    almoco: [
      { component: "arroz", weight: 0.7 },
      { component: "batata", weight: 0.65 },
      { component: "bacalhau", weight: 0.5 },
      { component: "frango", weight: 0.6 },
      { component: "peixe", weight: 0.55 },
      { component: "legumes", weight: 0.5 },
      { component: "salada", weight: 0.45 },
    ],
  },
  ES: {
    almoco: [
      { component: "arroz", weight: 0.7 },
      { component: "pasta", weight: 0.6 },
      { component: "legumbres", weight: 0.65 },
      { component: "carne", weight: 0.6 },
      { component: "pollo", weight: 0.55 },
      { component: "verduras", weight: 0.5 },
    ],
  },
  AR: {
    almoco: [
      { component: "carne", weight: 0.85 },
      { component: "pasta", weight: 0.6 },
      { component: "papa", weight: 0.65 },
      { component: "ensalada", weight: 0.5 },
      { component: "milanesa", weight: 0.55 },
    ],
  },
  CO: {
    almoco: [
      { component: "arroz", weight: 0.9 },
      { component: "frijoles", weight: 0.85 },
      { component: "carne", weight: 0.65 },
      { component: "pollo", weight: 0.6 },
      { component: "plátano", weight: 0.7 },
      { component: "arepa", weight: 0.6 },
    ],
  },
};

// ============= COMPONENTES CONDICIONAIS =============
      country: "BR",
      meal_type: "almoco",
      base_type: "arroz",
      structure: "Arroz + Proteína + Legumes (sem feijão)",
      base_required: ["arroz"],
      components_required: ["proteína", "legumes"],
      components_optional: [],
      components_forbidden: ["macarrão", "pão", "salada", "feijão"],
      examples: [
        "Arroz + bife grelhado + legumes cozidos",
        "Arroz + frango + brócolis refogado",
      ],
    },
    {
      id: "BR_LUNCH_MACARRAO",
      country: "BR",
      meal_type: "almoco",
      base_type: "macarrão",
      structure: "Macarrão + Molho/Carne + (Vegetal cozido opcional)",
      base_required: ["macarrão"],
      components_required: ["proteína"],
      components_optional: ["brócolis", "legumes cozidos"],
      // 🔥 CRÍTICO: Salada NUNCA com macarrão no Brasil
      components_forbidden: ["arroz", "feijão", "salada", "salada verde", "couve", "pão"],
      examples: [
        "Macarrão + carne moída + molho de tomate",
        "Macarrão + frango desfiado + brócolis",
        "Macarrão ao alho e óleo + ovo frito",
      ],
    },
    {
      id: "BR_LUNCH_BATATA",
      country: "BR",
      meal_type: "almoco",
      base_type: "batata",
      structure: "Batata + Proteína + Vegetal",
      base_required: ["batata"],
      components_required: ["proteína", "vegetal"],
      components_optional: [],
      components_forbidden: ["arroz", "macarrão", "feijão", "pão"],
      examples: [
        "Batata cozida + frango grelhado + brócolis",
        "Batata doce + bife + salada verde",
        "Purê de batata + peixe grelhado + legumes",
      ],
    },
  ],
  
  // ============= BRASIL - JANTAR =============
  BR_jantar: [
    {
      id: "BR_DINNER_ARROZ",
      country: "BR",
      meal_type: "jantar",
      base_type: "arroz",
      structure: "Arroz + Proteína + Vegetal (porção menor que almoço)",
      base_required: ["arroz"],
      components_required: ["proteína", "vegetal"],
      components_optional: ["feijão"],
      components_forbidden: ["macarrão", "pão", "tapioca", "batata"],
      examples: [
        "Arroz + frango grelhado + salada verde",
        "Arroz + ovo frito + couve refogada",
        "Arroz + peixe grelhado + brócolis",
        "Arroz + feijão + frango + salada (porção reduzida)",
      ],
    },
    {
      id: "BR_DINNER_LEVE",
      country: "BR",
      meal_type: "jantar",
      base_type: "proteína",
      structure: "Proteína + Vegetal + Carboidrato (porção reduzida)",
      base_required: ["proteína"],
      components_required: ["vegetal", "carboidrato"],
      components_optional: [],
      components_forbidden: ["macarrão", "pão", "tapioca", "feijão"],
      examples: [
        "Frango grelhado + salada verde",
        "Omelete + legumes refogados",
        "Peixe grelhado + brócolis",
        "Bife grelhado + couve refogada",
      ],
    },
    {
      id: "BR_DINNER_SOPA",
      country: "BR",
      meal_type: "jantar",
      base_type: "sopa",
      structure: "Sopa de legumes com proteína",
      base_required: ["sopa"],
      components_required: ["legumes", "proteína"],
      components_optional: [],
      components_forbidden: ["arroz", "macarrão", "feijão", "salada"],
      examples: [
        "Sopa de legumes com frango desfiado",
        "Caldo de legumes com carne",
      ],
    },
  ],
  
  // ============= EUA - ALMOÇO =============
  US_almoco: [
    {
      id: "US_LUNCH_SALAD",
      country: "US",
      meal_type: "almoco",
      base_type: "salad",
      structure: "Salad bowl with protein",
      base_required: ["salad"],
      components_required: ["protein"],
      components_optional: ["dressing", "croutons"],
      components_forbidden: ["rice", "pasta", "beans"],
      examples: [
        "Grilled chicken salad + ranch dressing",
        "Caesar salad + grilled salmon",
      ],
    },
    {
      id: "US_LUNCH_SANDWICH",
      country: "US",
      meal_type: "almoco",
      base_type: "bread",
      structure: "Sandwich/Wrap with protein and vegetables",
      base_required: ["bread"],
      components_required: ["protein", "vegetables"],
      components_optional: ["chips", "soda"],
      components_forbidden: ["rice", "pasta", "beans"],
      examples: [
        "Turkey sandwich + lettuce + tomato",
        "Chicken wrap + vegetables",
      ],
    },
    {
      id: "US_LUNCH_BOWL",
      country: "US",
      meal_type: "almoco",
      base_type: "rice",
      structure: "Rice/Grain bowl with protein and vegetables",
      base_required: ["rice"],
      components_required: ["protein", "vegetables"],
      components_optional: ["sauce"],
      components_forbidden: ["bread", "pasta"],
      examples: [
        "Rice bowl + grilled chicken + vegetables",
        "Quinoa bowl + salmon + broccoli",
      ],
    },
  ],
  
  // ============= MÉXICO - ALMOÇO =============
  MX_almoco: [
    {
      id: "MX_LUNCH_TACOS",
      country: "MX",
      meal_type: "almoco",
      base_type: "tortilla",
      structure: "Tacos/Tortillas + Proteína + Frijoles + Arroz",
      base_required: ["tortilla"],
      components_required: ["proteína", "frijoles"],
      components_optional: ["arroz", "salsa", "crema"],
      components_forbidden: ["pão", "macarrão"],
      examples: [
        "Tacos de pollo + arroz + frijoles",
        "Enchiladas + arroz + ensalada",
        "Quesadillas + frijoles + salsa",
      ],
    },
    {
      id: "MX_LUNCH_ARROZ",
      country: "MX",
      meal_type: "almoco",
      base_type: "arroz",
      structure: "Arroz + Frijoles + Proteína",
      base_required: ["arroz"],
      components_required: ["frijoles", "proteína"],
      components_optional: ["tortilla", "salsa"],
      components_forbidden: ["pão", "macarrão"],
      examples: [
        "Arroz + frijoles + carne asada",
        "Arroz + frijoles + pollo + tortillas",
      ],
    },
  ],
  
  // ============= PORTUGAL - ALMOÇO =============
  PT_almoco: [
    {
      id: "PT_LUNCH_ARROZ",
      country: "PT",
      meal_type: "almoco",
      base_type: "arroz",
      structure: "Arroz + Proteína + Legumes/Salada",
      base_required: ["arroz"],
      components_required: ["proteína"],
      components_optional: ["salada", "legumes"],
      components_forbidden: ["macarrão", "pão", "feijão"],
      examples: [
        "Arroz + frango grelhado + salada mista",
        "Arroz de pato + legumes",
      ],
    },
    {
      id: "PT_LUNCH_BATATA",
      country: "PT",
      meal_type: "almoco",
      base_type: "batata",
      structure: "Batata + Peixe/Carne + Legumes",
      base_required: ["batata"],
      components_required: ["proteína", "legumes"],
      components_optional: [],
      components_forbidden: ["arroz", "macarrão", "feijão"],
      examples: [
        "Bacalhau + batata cozida + couve",
        "Bife + batatas fritas + salada",
      ],
    },
  ],
  
  // ============= ESPANHA - ALMOÇO =============
  ES_almoco: [
    {
      id: "ES_LUNCH_ARROZ",
      country: "ES",
      meal_type: "almoco",
      base_type: "arroz",
      structure: "Arroz + Proteína + Verduras",
      base_required: ["arroz"],
      components_required: ["proteína"],
      components_optional: ["verduras", "ensalada"],
      components_forbidden: ["tortilla mexicana", "frijoles"],
      examples: [
        "Paella + ensalada",
        "Arroz con pollo + verduras",
      ],
    },
    {
      id: "ES_LUNCH_LEGUMBRES",
      country: "ES",
      meal_type: "almoco",
      base_type: "legumbres",
      structure: "Legumbres (lentejas, garbanzos) + Proteína",
      base_required: ["legumbres"],
      components_required: ["proteína"],
      components_optional: ["pan"],
      components_forbidden: ["arroz", "pasta"],
      examples: [
        "Lentejas con chorizo",
        "Cocido madrileño",
        "Garbanzos con espinacas",
      ],
    },
  ],
  
  // ============= ARGENTINA - ALMOÇO =============
  AR_almoco: [
    {
      id: "AR_LUNCH_CARNE",
      country: "AR",
      meal_type: "almoco",
      base_type: "carne",
      structure: "Carne/Milanesa + Guarnición (papa/ensalada)",
      base_required: ["carne"],
      components_required: ["guarnición"],
      components_optional: ["ensalada"],
      components_forbidden: ["frijoles", "tortilla"],
      examples: [
        "Bife de chorizo + papas fritas + ensalada",
        "Milanesa + puré de papas",
        "Asado + ensalada mixta",
      ],
    },
    {
      id: "AR_LUNCH_PASTA",
      country: "AR",
      meal_type: "almoco",
      base_type: "pasta",
      structure: "Pasta + Salsa (influencia italiana)",
      base_required: ["pasta"],
      components_required: ["salsa"],
      components_optional: ["carne"],
      components_forbidden: ["arroz", "ensalada", "papas"],
      examples: [
        "Fideos con tuco + carne",
        "Ravioles con salsa bolognesa",
        "Ñoquis con salsa",
      ],
    },
  ],
  
  // ============= COLÔMBIA - ALMOÇO =============
  CO_almoco: [
    {
      id: "CO_LUNCH_BANDEJA",
      country: "CO",
      meal_type: "almoco",
      base_type: "arroz",
      structure: "Arroz + Frijoles + Proteína + Plátano/Arepa",
      base_required: ["arroz"],
      components_required: ["frijoles", "proteína"],
      components_optional: ["plátano", "arepa", "aguacate"],
      components_forbidden: ["macarrão", "pão", "tortilla mexicana"],
      examples: [
        "Bandeja paisa (arroz + frijoles + carne + huevo + plátano)",
        "Arroz + frijoles + pollo + aguacate",
        "Arroz + carne molida + tajadas",
      ],
    },
  ],
};

// ============= COMPONENTES CONDICIONAIS =============
// Define quando um componente é permitido baseado no contexto
const CONDITIONAL_COMPONENTS: Record<string, Record<string, {
  allowed_with: string[];
  forbidden_with: string[];
  notes: string;
}>> = {
  BR: {
    salada: {
      allowed_with: ["arroz", "batata", "proteína"],
      forbidden_with: ["macarrão", "sopa"],
      notes: "Salada só acompanha refeições com arroz ou batata como base",
    },
    feijao: {
      allowed_with: ["arroz"],
      forbidden_with: ["macarrão", "batata", "sopa"],
      notes: "Feijão só combina com arroz no Brasil",
    },
    legumes_cozidos: {
      allowed_with: ["arroz", "macarrão", "batata"],
      forbidden_with: [],
      notes: "Legumes cozidos são versáteis",
    },
    brocolis: {
      allowed_with: ["arroz", "macarrão", "batata", "proteína"],
      forbidden_with: [],
      notes: "Brócolis é universal",
    },
  },
  US: {
    salad: {
      allowed_with: ["protein", "bread", "chicken", "fish"],
      forbidden_with: ["pasta", "rice"],
      notes: "Salad is a meal base in US, not side with pasta",
    },
    fries: {
      allowed_with: ["burger", "sandwich", "chicken"],
      forbidden_with: ["rice", "pasta", "salad"],
      notes: "Fries accompany sandwiches and burgers",
    },
  },
  MX: {
    frijoles: {
      allowed_with: ["arroz", "tortilla", "huevos"],
      forbidden_with: ["pasta", "pan"],
      notes: "Frijoles são base da culinária mexicana",
    },
    salsa: {
      allowed_with: ["tacos", "tortilla", "arroz", "frijoles"],
      forbidden_with: [],
      notes: "Salsa é universal no México",
    },
  },
};

// ============= MEAL TYPE MAPPING =============
const MEAL_TYPE_LABELS: Record<string, Record<string, string>> = {
  BR: {
    cafe_manha: "Café da manhã",
    lanche_manha: "Lanche da manhã",
    almoco: "Almoço",
    lanche_tarde: "Lanche da tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  },
  US: {
    cafe_manha: "Breakfast",
    lanche_manha: "Morning Snack",
    almoco: "Lunch",
    lanche_tarde: "Afternoon Snack",
    jantar: "Dinner",
    ceia: "Late Night Snack",
  },
  PT: {
    cafe_manha: "Pequeno-almoço",
    lanche_manha: "Lanche da Manhã",
    almoco: "Almoço",
    lanche_tarde: "Lanche da Tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  },
  MX: {
    cafe_manha: "Desayuno",
    lanche_manha: "Colación Matutina",
    almoco: "Comida",
    lanche_tarde: "Colación Vespertina",
    jantar: "Cena",
    ceia: "Cena Ligera",
  },
  ES: {
    cafe_manha: "Desayuno",
    lanche_manha: "Media Mañana",
    almoco: "Almuerzo",
    lanche_tarde: "Merienda",
    jantar: "Cena",
    ceia: "Cena Tardía",
  },
};

// ============= PORÇÕES PADRÃO POR TIPO DE COMPONENTE =============
const DEFAULT_PORTIONS: Record<string, { grams: number; label_pt: string; label_en: string }> = {
  protein: { grams: 120, label_pt: "1 porção média", label_en: "1 medium portion" },
  carb: { grams: 100, label_pt: "1 porção", label_en: "1 portion" },
  vegetable: { grams: 80, label_pt: "1 xícara", label_en: "1 cup" },
  fruit: { grams: 120, label_pt: "1 unidade média", label_en: "1 medium piece" },
  beverage: { grams: 200, label_pt: "1 xícara", label_en: "1 cup" },
  dairy: { grams: 150, label_pt: "1 porção", label_en: "1 portion" },
  fat: { grams: 15, label_pt: "1 colher de sopa", label_en: "1 tablespoon" },
  fiber: { grams: 30, label_pt: "2 colheres de sopa", label_en: "2 tablespoons" },
  grain: { grams: 80, label_pt: "1/2 xícara", label_en: "1/2 cup" },
  legume: { grams: 100, label_pt: "1 concha", label_en: "1 ladle" },
};

// ============= REGRAS DE EXCLUSÃO MÚTUA POR PAÍS =============
// Define quais alimentos não podem aparecer juntos na mesma refeição
const MUTUAL_EXCLUSION_RULES: Record<string, Record<string, string[][]>> = {
  BR: {
    cafe_manha: [
      // Apenas 1 base de carboidrato
      ["pão francês", "pão integral", "tapioca", "cuscuz", "aveia", "batata", "batata doce"],
    ],
    almoco: [
      // Apenas 1 proteína principal
      ["frango grelhado", "frango desfiado", "bife grelhado", "carne moída", "peixe grelhado", "atum"],
    ],
    jantar: [
      // Apenas 1 proteína principal
      ["frango grelhado", "frango desfiado", "bife grelhado", "carne moída", "peixe grelhado", "atum"],
    ],
  },
  US: {
    breakfast: [
      // Apenas 1 base de carboidrato
      ["toast", "pancakes", "bagel", "muffin", "hash browns"],
      // Apenas 1 tipo de carne
      ["bacon", "sausage", "ham"],
    ],
  },
  // Outros países herdam do fallback
};

// ============= REGRAS CULTURAIS OBRIGATÓRIAS POR PAÍS =============
// Define elementos OBRIGATÓRIOS por país e tipo de refeição
// Baseado em padrões alimentares reais de cada cultura
const COUNTRY_MEAL_RULES: Record<string, Record<string, {
  mandatory_base?: string[];
  mandatory_protein?: string[];
  typical_combinations: string[];
  cultural_notes: string[];
}>> = {
  // ============= BRASIL =============
  BR: {
    cafe_manha: {
      mandatory_base: ["pão", "tapioca", "cuscuz", "aveia"],
      typical_combinations: [
        "Pão francês + ovo mexido + café com leite",
        "Tapioca + queijo branco + café puro",
        "Cuscuz + ovo frito + café com leite",
        "Pão integral + ovo cozido + suco de laranja",
        "Aveia + banana + leite",
      ],
      cultural_notes: [
        "Café da manhã brasileiro é leve: pão/tapioca + proteína leve (ovo/queijo)",
        "NUNCA arroz, feijão, carne, frango no café da manhã",
        "Café com leite é a bebida mais comum",
      ],
    },
    almoco: {
      mandatory_base: ["arroz"],  // ARROZ É OBRIGATÓRIO NO BRASIL
      typical_combinations: [
        "Arroz + feijão + frango grelhado + salada verde",
        "Arroz + bife grelhado + legumes refogados",
        "Arroz + feijão + peixe grelhado + salada",
        "Arroz + carne moída + couve refogada",
        "Macarrão + carne moída + molho de tomate",
      ],
      cultural_notes: [
        "ARROZ É OBRIGATÓRIO em 95% dos almoços brasileiros",
        "Feijão é comum mas NÃO obrigatório",
        "Proteína sempre presente (carne, frango, peixe, ovo)",
        "Macarrão substitui arroz, NUNCA juntos",
        "NUNCA tapioca, cuscuz, pão no almoço",
      ],
    },
    jantar: {
      typical_combinations: [
        "Arroz + frango grelhado + salada verde",
        "Omelete + salada verde",
        "Sopa de legumes com frango",
        "Peixe grelhado + legumes",
        "Arroz + ovo frito + salada",
      ],
      cultural_notes: [
        "Jantar brasileiro pode ser igual ao almoço (porção menor)",
        "Ou pode ser mais leve: sopa, omelete, salada com proteína",
        "Arroz opcional no jantar",
      ],
    },
    ceia: {
      typical_combinations: [
        "Iogurte natural",
        "Leite morno",
        "Queijo branco (2 fatias)",
        "Iogurte + banana",
        "Chá de camomila",
      ],
      cultural_notes: [
        "Ceia MUITO LEVE - apenas laticínio ou chá",
        "Máximo 150-180 calorias",
        "NUNCA ovo, carne, carboidrato pesado",
      ],
    },
  },
  // ============= ESTADOS UNIDOS =============
  US: {
    cafe_manha: {
      mandatory_base: ["toast", "pancakes", "cereal", "oatmeal", "bagel"],
      typical_combinations: [
        "Scrambled eggs + toast + coffee",
        "Pancakes + bacon + orange juice",
        "Oatmeal + berries + milk",
        "Cereal + milk + banana",
        "Bagel + cream cheese + coffee",
      ],
      cultural_notes: [
        "American breakfast pode incluir bacon/sausage (diferente do Brasil)",
        "Pancakes e waffles são comuns",
        "Hash browns são típicos",
      ],
    },
    almoco: {
      typical_combinations: [
        "Grilled chicken salad + dressing",
        "Turkey sandwich + chips + soda",
        "Burger + fries",
        "Rice bowl + chicken + vegetables",
        "Pasta + meatballs + salad",
      ],
      cultural_notes: [
        "Lunch americano é geralmente mais leve que almoço brasileiro",
        "Sanduíches são muito comuns",
        "Salads como refeição completa são comuns",
      ],
    },
    jantar: {
      typical_combinations: [
        "Grilled steak + mashed potatoes + vegetables",
        "Baked chicken + rice + broccoli",
        "Pasta + marinara sauce + garlic bread",
        "Salmon + quinoa + asparagus",
        "Tacos + beans + rice",
      ],
      cultural_notes: [
        "Dinner americano geralmente é a refeição principal",
        "Porções generosas",
        "Proteína + carboidrato + vegetal",
      ],
    },
    ceia: {
      typical_combinations: [
        "Glass of milk",
        "Yogurt",
        "Cheese and crackers",
        "Chamomile tea",
        "Small bowl of cereal",
      ],
      cultural_notes: [
        "Light snack before bed",
        "Dairy-focused",
        "Very light - under 200 calories",
      ],
    },
  },
  // ============= MÉXICO =============
  MX: {
    cafe_manha: {
      typical_combinations: [
        "Huevos rancheros + frijoles + tortilla",
        "Chilaquiles + crema + queso",
        "Tacos de huevo + salsa verde",
        "Pan dulce + café con leche",
        "Molletes + frijoles + queso",
      ],
      cultural_notes: [
        "Café da manhã mexicano pode ser substancial",
        "Ovos com tortilla são muito comuns",
        "Frijoles (feijão) no café da manhã é normal no México",
      ],
    },
    almoco: {
      mandatory_base: ["arroz", "tortilla"],
      typical_combinations: [
        "Arroz + frijoles + carne asada + tortillas",
        "Tacos de pollo + arroz + frijoles",
        "Enchiladas + arroz + ensalada",
        "Pozole + tortillas",
        "Mole + arroz + frijoles",
      ],
      cultural_notes: [
        "Almoço mexicano (comida) é a refeição principal",
        "Tortillas acompanham quase tudo",
        "Arroz e feijão são bases comuns",
      ],
    },
    ceia: {
      typical_combinations: [
        "Leche tibia",
        "Yogurt natural",
        "Queso fresco",
        "Té de manzanilla",
        "Galletas integrales",
      ],
      cultural_notes: [
        "Ceia leve antes de dormir",
        "Similar ao padrão global",
      ],
    },
  },
  // ============= ESPANHA =============
  ES: {
    cafe_manha: {
      typical_combinations: [
        "Tostada con tomate + aceite de oliva + café",
        "Churros + chocolate",
        "Pan con jamón + zumo de naranja",
        "Bocadillo + café con leche",
        "Galletas + leche",
      ],
      cultural_notes: [
        "Café da manhã espanhol é geralmente leve",
        "Tostada con tomate é muito típica",
        "Café com leite é a bebida mais comum",
      ],
    },
    almoco: {
      typical_combinations: [
        "Paella + ensalada",
        "Cocido madrileño",
        "Arroz + pollo + verduras",
        "Lentejas + chorizo",
        "Pescado + patatas + ensalada",
      ],
      cultural_notes: [
        "Almoço espanhol (comida) é a refeição principal",
        "Geralmente entre 14h-15h",
        "Pode incluir vários pratos (primeiro, segundo, postre)",
      ],
    },
    ceia: {
      typical_combinations: [
        "Vaso de leche",
        "Yogur natural",
        "Queso",
        "Infusión de manzanilla",
        "Fruta",
      ],
      cultural_notes: [
        "Ceia muito leve",
        "Espanhóis jantam tarde (21h-22h), então ceia é rara",
      ],
    },
  },
  // ============= PORTUGAL =============
  PT: {
    cafe_manha: {
      typical_combinations: [
        "Pão com manteiga + café com leite",
        "Torrada + queijo + sumo de laranja",
        "Croissant + galão",
        "Pão com fiambre + café",
        "Cereais + leite",
      ],
      cultural_notes: [
        "Pequeno-almoço português é simples e leve",
        "Pão é a base principal",
        "Café (galão, meia de leite) é essencial",
      ],
    },
    almoco: {
      mandatory_base: ["arroz", "batata"],
      typical_combinations: [
        "Arroz + bacalhau + batatas + grelos",
        "Arroz + frango assado + salada",
        "Bacalhau à Brás",
        "Cozido à portuguesa",
        "Peixe grelhado + arroz + legumes",
      ],
      cultural_notes: [
        "Almoço português é substancial",
        "Peixe e bacalhau são muito comuns",
        "Arroz ou batata como base",
      ],
    },
    ceia: {
      typical_combinations: [
        "Copo de leite morno",
        "Iogurte natural",
        "Queijo fresco",
        "Chá de camomila",
        "Fruta",
      ],
      cultural_notes: [
        "Ceia muito leve",
        "Similar ao padrão global",
      ],
    },
  },
  // ============= ARGENTINA =============
  AR: {
    cafe_manha: {
      typical_combinations: [
        "Medialunas + café con leche",
        "Tostadas + dulce de leche + mate",
        "Pan + manteca + café",
        "Facturas + té",
        "Cereales + leche",
      ],
      cultural_notes: [
        "Café da manhã argentino é leve e doce",
        "Medialunas (croissants) são muito típicas",
        "Mate é bebida comum",
      ],
    },
    almoco: {
      typical_combinations: [
        "Milanesa + puré + ensalada",
        "Asado + ensalada mixta",
        "Pasta + salsa bolognesa",
        "Empanadas + ensalada",
        "Bife de chorizo + papas fritas",
      ],
      cultural_notes: [
        "Carne bovina é central na culinária argentina",
        "Milanesas são muito populares",
        "Pasta tem forte influência italiana",
      ],
    },
    ceia: {
      typical_combinations: [
        "Yogur natural",
        "Leche tibia",
        "Queso",
        "Té de tilo",
        "Fruta",
      ],
      cultural_notes: [
        "Ceia leve",
        "Similar ao padrão global",
      ],
    },
  },
  // ============= COLÔMBIA =============
  CO: {
    cafe_manha: {
      typical_combinations: [
        "Arepa + huevo + queso",
        "Calentado (arroz + frijoles reaquecidos) + huevo",
        "Pan + chocolate caliente",
        "Empanada + café",
        "Changua (caldo de huevo)",
      ],
      cultural_notes: [
        "Café da manhã colombiano pode incluir arroz e feijão (calentado)",
        "Arepas são muito típicas",
        "Chocolate quente é comum",
      ],
    },
    almoco: {
      mandatory_base: ["arroz"],
      typical_combinations: [
        "Bandeja paisa (arroz, frijoles, carne, huevo, arepa, plátano)",
        "Arroz + pollo + ensalada + frijoles",
        "Sancocho + arroz",
        "Arroz + carne + plátano maduro",
        "Arroz + pescado + ensalada",
      ],
      cultural_notes: [
        "Almoço colombiano é substancial",
        "Arroz é base obrigatória",
        "Feijão muito comum",
      ],
    },
    ceia: {
      typical_combinations: [
        "Leche",
        "Yogurt",
        "Queso",
        "Aromática (chá de ervas)",
        "Galletas",
      ],
      cultural_notes: [
        "Ceia leve",
        "Similar ao padrão global",
      ],
    },
  },
};

// ============= COMBINAÇÕES OBRIGATÓRIAS POR PAÍS =============
// Define quais alimentos DEVEM vir juntos
const MANDATORY_PAIRS: Record<string, Record<string, Array<{if_has: string; must_have: string; error: string}>>> = {
  BR: {
    // Arroz é obrigatório no almoço, mas feijão não
    almoco: [],
  },
};

// ============= PORÇÕES CULTURAIS CORRETAS POR PAÍS =============
// SIMPLIFICADO: Apenas validações críticas, sem bloquear porções válidas
const CULTURAL_PORTIONS: Record<string, Record<string, {valid: RegExp[]; invalid: RegExp[]; correct: string}>> = {
  BR: {
    // Removido validações rígidas - deixar IA mais livre
  },
  US: {
    // Removido validações rígidas - deixar IA mais livre
  },
};

// ============= PREPAROS OBRIGATÓRIOS =============
// Alimentos que DEVEM ter especificação de preparo
const REQUIRED_PREPARATIONS: Record<string, string[]> = {
  ovo: ["mexido", "cozido", "frito", "pochê", "omelete"],
  eggs: ["scrambled", "fried", "poached", "boiled", "sunny-side up"],
  frango: ["grelhado", "desfiado", "assado", "cozido"],
  chicken: ["grilled", "roasted", "fried", "baked", "shredded"],
  carne: ["grelhada", "moída", "assada", "cozida"],
  beef: ["grilled", "ground", "roasted", "stewed"],
};

// ============= EXEMPLOS NEGATIVOS POR TIPO DE REFEIÇÃO =============
// REMOVIDO: Restrições que limitavam variedade
function getNegativeExamplesForMealType(mealType: string): string[] {
  return []; // IA livre para explorar
}

// ============= GERAR HINTS CULTURAIS PARA O PROMPT =============
// NOTA: Hints são ORIENTAÇÃO, não regras. Pool explora tudo.
function getCulturalRulesForPrompt(countryCode: string, mealType: string): string {
  // Buscar hints culturais para o país e tipo de refeição
  const countryHints = CULTURAL_HINTS[countryCode];
  if (!countryHints) return "";
  
  const hints = countryHints[mealType];
  if (!hints || hints.length === 0) return "";
  
  return `
💡 INGREDIENTES COMUNS (use como inspiração, não como limitação):
${hints.join(", ")}

Explore ALÉM dessa lista - use qualquer alimento disponível no mercado.
`;
}

// ============= CONTEXTO DE INTOLERÂNCIA PARA PROMPT =============
// Direciona a IA a gerar refeições específicas quando há filtro de intolerância
function buildIntolerancePromptContext(intoleranceFilter: string | null): string {
  if (!intoleranceFilter) {
    return ""; // Sem filtro = gerar refeições variadas (com e sem tudo)
  }
  
  const contexts: Record<string, string> = {
    'gluten': `
🚫 GERAR APENAS REFEIÇÕES SEM GLÚTEN!

REGRA SIMPLES: Evite trigo e derivados (pão comum, macarrão comum, farinha de trigo).

✅ USE CARBOIDRATOS NATURALMENTE SEM GLÚTEN:
Arroz, batata, mandioca, tapioca, milho, quinoa, polenta e MUITOS outros.
Se usar pão ou macarrão, especifique "sem glúten" no nome.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de alimentos sem glúten.
Não se limite - explore toda a variedade disponível.`,
    
    'lactose': `
🚫 GERAR APENAS REFEIÇÕES SEM LACTOSE!

REGRA SIMPLES: Evite leite e derivados comuns.

✅ USE ALTERNATIVAS:
Leite sem lactose, leites vegetais (coco, aveia, amêndoas), queijo sem lactose,
iogurte sem lactose, ghee, azeite e MUITAS outras opções.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de alimentos sem lactose.
Não se limite - explore toda a variedade disponível.`,
    
    'egg': `
🚫 GERAR APENAS REFEIÇÕES SEM OVO!

REGRA SIMPLES: Não use ovo em nenhuma forma.

✅ USE PROTEÍNAS ALTERNATIVAS:
Tofu, grão-de-bico, lentilha, feijão, frango, peixe, carne e MUITAS outras.
Para café da manhã: tapioca, mingau, frutas, pães com pastas.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de refeições sem ovo.
Não se limite - explore toda a variedade disponível.`,
    
    'peanut': `
🚫 GERAR APENAS REFEIÇÕES SEM AMENDOIM!

REGRA SIMPLES: Não use amendoim ou derivados.

✅ USE ALTERNATIVAS:
Outras oleaginosas (castanhas, amêndoas, nozes), sementes (girassol, abóbora, chia)
e MUITAS outras opções.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de alimentos sem amendoim.
Não se limite - explore toda a variedade disponível.`,
    
    'seafood': `
🚫 GERAR APENAS REFEIÇÕES SEM FRUTOS DO MAR!

REGRA SIMPLES: Não use camarão, lula, polvo, mexilhão, ostra, caranguejo.

✅ USE PROTEÍNAS ALTERNATIVAS:
Frango, carne, porco, peixes de água doce, ovo, tofu, leguminosas e MUITAS outras.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de proteínas sem frutos do mar.
Não se limite - explore toda a variedade disponível.`,
    
    'fish': `
🚫 GERAR APENAS REFEIÇÕES SEM PEIXE!

REGRA SIMPLES: Não use nenhum tipo de peixe.

✅ USE PROTEÍNAS ALTERNATIVAS:
Frango, carne, porco, ovo, tofu, leguminosas e MUITAS outras.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de proteínas sem peixe.
Não se limite - explore toda a variedade disponível.`,
    
    'soy': `
🚫 GERAR APENAS REFEIÇÕES SEM SOJA!

REGRA SIMPLES: Não use tofu, tempeh, edamame, molho de soja ou leite de soja.

✅ USE ALTERNATIVAS:
Outras proteínas (frango, carne, ovo, leguminosas), leites vegetais (coco, aveia, amêndoas)
e MUITAS outras opções.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de alimentos sem soja.
Não se limite - explore toda a variedade disponível.`,
    
    'tree_nuts': `
🚫 GERAR APENAS REFEIÇÕES SEM CASTANHAS/NOZES!

REGRA SIMPLES: Não use castanhas, nozes, amêndoas, avelãs, pistache, macadâmia.

✅ USE ALTERNATIVAS:
Sementes (girassol, abóbora, chia, linhaça), coco e MUITAS outras opções.

⚠️ IMPORTANTE: Seja CRIATIVO! Existem MILHARES de alimentos sem castanhas.
Não se limite - explore toda a variedade disponível.`,
  };
  
  return contexts[intoleranceFilter] || "";
}

// ============= DISTRIBUIDOR DE VARIEDADE =============
// Controla a distribuição de ingredientes base para garantir pool rico
function getVarietyDistribution(mealType: string, quantity: number, countryCode: string): string {
  // REMOVIDO: Distribuições rígidas que limitam variedade
  // A IA agora tem liberdade total para explorar ingredientes
  // Filtros e regras de distribuição são aplicados no generate-ai-meal-plan
  return "";
}

// ============= GUIAS CULTURAIS ESTRUTURADOS =============
// Orientação mínima de contexto cultural (não restritiva)
function getCulturalGuidelines(countryCode: string, mealType: string): string {
  if (countryCode === 'BR') {
    if (mealType === 'cafe_manha') {
      return `
🇧🇷 CONTEXTO CULTURAL - Café da manhã brasileiro:
Pessoas no Brasil geralmente comem: pães, tapioca, cuscuz, frutas, ovos, café, sucos.
Você pode criar QUALQUER combinação desses e outros alimentos comuns.`;
    }
    if (mealType === 'almoco') {
      return `
🇧🇷 CONTEXTO CULTURAL - Almoço brasileiro:
Pessoas no Brasil geralmente comem: arroz, feijão, carnes, massas, legumes, saladas.
Você pode criar QUALQUER combinação desses e outros alimentos comuns.`;
    }
    if (mealType === 'jantar') {
      return `
🇧🇷 CONTEXTO CULTURAL - Jantar brasileiro:
Pessoas no Brasil geralmente comem: refeições mais leves, sopas, proteínas, legumes.
Você pode criar QUALQUER combinação desses e outros alimentos comuns.`;
    }
  }
  return "";
}

// ============= VALIDAÇÃO CULTURAL DE REFEIÇÕES =============
// REMOVIDO: Todas as validações restritivas
// IA tem liberdade total - filtros aplicados em generate-ai-meal-plan
function validateCulturalRules(
  meal: any,
  countryCode: string,
  mealType: string
): { valid: boolean; errors: string[] } {
  // Sempre retorna válido - IA livre para explorar
  return { valid: true, errors: [] };
}

// ============= CONSTRUIR PROMPT DINÂMICO COM DADOS DO BANCO =============
function buildDynamicMealPoolPrompt(
  regional: RegionalConfig,
  countryCode: string,
  mealType: string,
  quantity: number,
  safetyDb: SafetyDatabase,
  existingMealNames: string[],
  culturalRule: CulturalRule | null,
  dbComponents: MealComponentPool[],
  dietaryFilter?: string | null,
  strategyKey?: string | null,
  intoleranceFilter?: string | null,
): string {
  const mealLabel = MEAL_TYPE_LABELS[countryCode]?.[mealType] || mealType;
  const language = regional.language || "pt-BR";
  const isPortuguese = language.startsWith("pt");
  
  // Usar regras do banco ou fallback para hardcoded
  const structure = culturalRule ? {
    required: culturalRule.required_components,
    optional: culturalRule.forbidden_components.length > 0 ? [] : ['extras'],
    rules: culturalRule.structure_description || 'Combinação balanceada',
    max_prep_time: culturalRule.max_prep_time,
    examples: culturalRule.examples || [],
    macro_focus: culturalRule.macro_focus || { carb: 'moderado', protein: 'moderado', fat: 'moderado' },
    negative_examples: culturalRule.negative_examples || [],
    forbidden_components: culturalRule.forbidden_components || [],
  } : MEAL_STRUCTURES[mealType] || MEAL_STRUCTURES.almoco;
  
  // Usar componentes do banco ou dar liberdade criativa à IA
  let componentsByCategory: string;
  if (dbComponents.length > 0) {
    const grouped = groupComponentsByType(dbComponents);
    componentsByCategory = Object.entries(grouped)
      .map(([category, items]) => {
        const names = items.map(i => i.name).join(", ");
        return `${category.toUpperCase()}: ${names}`;
      })
      .join("\n");
  } else {
    // Eixos de variação abertos - sem listas fechadas, sem exemplos
    componentsByCategory = `
🎯 MODO: FOOD POOL (GERAÇÃO LIVRE)

OBJETIVO:
Explorar o MAIOR número de combinações reais existentes no mercado do ${countryCode},
maximizando diversidade de ingredientes e preparações.

🧱 EIXOS DE VARIAÇÃO (distribua entre as ${quantity} refeições):
1. PROTEÍNAS: Explore TODOS os tipos disponíveis no mercado do ${countryCode}
2. CARBOIDRATOS: Explore TODOS os tipos disponíveis no mercado do ${countryCode}
3. VEGETAIS E LEGUMES: Explore TODOS os tipos disponíveis no mercado do ${countryCode}
4. GUARNIÇÕES: Explore TODAS as preparações possíveis no ${countryCode}
5. BEBIDAS: Explore TODOS os tipos disponíveis no mercado do ${countryCode}
6. LATICÍNIOS: Explore TODOS os tipos disponíveis no mercado do ${countryCode}

⚠️ REGRAS DE VARIEDADE (OBRIGATÓRIAS):
- NÃO repita a mesma proteína mais de 3x nas ${quantity} refeições
- NÃO repita o mesmo vegetal mais de 2x
- NÃO repita a mesma bebida mais de 2x
- Cada refeição deve contribuir com algo NOVO ao pool
- Explore ingredientes DIVERSOS (não só os mais comuns)

🌍 CULTURA:
- Use APENAS combinações que pessoas no ${countryCode} realmente comem
- Foque em alimentos encontrados em supermercados comuns do ${countryCode}
- NÃO invente pratos exóticos ou festivos
- Use preparações do dia a dia

🎨 CRIATIVIDADE:
- Varie métodos de preparo disponíveis no ${countryCode}
- Use temperos e condimentos típicos do ${countryCode}
- Combine ingredientes de formas diferentes
- Pense em refeições que pessoas REALMENTE fazem em casa`;
  }
  
  // NOTA: Validação de intolerâncias agora é feita via TypeScript após IA gerar
  // A IA gera livremente e o sistema valida/marca blocked_for_intolerances automaticamente
  
  // Contexto de estratégia nutricional
  let strategyContext = "";
  if (strategyKey) {
    const persona = getStrategyPersona(strategyKey);
    strategyContext = `
ESTRATÉGIA NUTRICIONAL ATIVA: ${persona.label}
- Filosofia: ${persona.philosophy}
- Estilo: ${persona.foodStyle}
- Porções: ${persona.portionStyle}`;
  }
  
  // Contexto de intolerância (direciona IA a gerar refeições específicas)
  const intoleranceContext = buildIntolerancePromptContext(intoleranceFilter || null);
  
  // Filtro dietético
  const dietaryContext = dietaryFilter 
    ? `\n⚠️ FILTRO DIETÉTICO: Apenas refeições compatíveis com "${dietaryFilter}".`
    : "";
  
  // Lista de pratos existentes para evitar repetição
  const existingContext = existingMealNames.length > 0
    ? `\n🚫 PRATOS JÁ EXISTENTES (NÃO REPETIR NOMES SIMILARES):\n${existingMealNames.slice(0, 50).join(", ")}`
    : "";
  
  // Lista de intolerâncias com ingredientes (para marcação correta)
  const intoleranceList = Object.entries(INTOLERANCE_INGREDIENT_MAP)
    .map(([key, ingredients]) => `- ${key}: ${ingredients.slice(0, 5).join(", ")}...`)
    .join("\n");
  
  // Lista de todas as intolerância keys do banco
  const allIntoleranceKeys = safetyDb.allIntoleranceKeys.join(", ");
  
  // Prompt v3 - Otimizado com distribuidor de variedade
  // ========== EXEMPLOS REAIS POR TIPO DE REFEIÇÃO ==========
  const realExamples: Record<string, string[]> = {
    cafe_manha: [
      "Pão francês com manteiga e café com leite",
      "Tapioca recheada com queijo coalho e café preto",
      "Cuscuz nordestino com ovo mexido e café",
      "Pão de forma tostado com requeijão e achocolatado",
      "Vitamina de banana com aveia e leite",
      "Pão francês com ovo frito e suco de laranja",
      "Mingau de aveia com banana e mel",
      "Pão integral com queijo branco e café",
      "Tapioca com frango desfiado e suco",
      "Cuscuz com queijo coalho e café com leite",
    ],
    lanche_manha: [
      "Banana com aveia",
      "Maçã com castanha-de-caju",
      "Iogurte natural com mel",
      "Pão de queijo",
      "Suco de laranja natural",
      "Mamão com granola",
      "Biscoito integral com chá",
      "Banana com pasta de amendoim",
      "Mix de frutas picadas",
      "Iogurte com frutas vermelhas",
    ],
    almoco: [
      "Arroz, feijão, frango grelhado e salada verde",
      "Arroz, feijão, carne moída e legumes refogados",
      "Macarrão ao molho de tomate com carne moída",
      "Arroz, feijão, bife acebolado e couve refogada",
      "Arroz, feijão, peixe grelhado e salada",
      "Arroz, feijão, ovo frito e farofa",
      "Arroz, feijão, linguiça e vinagrete",
      "Arroz, feijão, frango ao molho e purê",
      "Macarrão com frango e brócolis",
      "Arroz, feijão, costela e mandioca",
    ],
    lanche_tarde: [
      "Pão francês com margarina e café",
      "Bolo simples caseiro e café",
      "Pão de queijo com chá",
      "Torrada com requeijão",
      "Biscoito maisena com leite",
      "Tapioca com queijo e café",
      "Pão integral com geleia e chá",
      "Cuscuz com manteiga e café",
      "Sanduíche natural de frango",
      "Vitamina de frutas",
    ],
    jantar: [
      "Arroz com ovo frito e salada",
      "Sopa de legumes com frango",
      "Omelete de legumes com pão",
      "Arroz com frango desfiado e legumes",
      "Macarrão simples com molho",
      "Sanduíche de atum com salada",
      "Sopa de feijão com couve",
      "Arroz com bife grelhado e salada",
      "Omelete de queijo com tomate",
      "Caldo de frango com legumes",
    ],
    ceia: [
      "Leite quente",
      "Chá de camomila",
      "Iogurte natural",
      "Banana",
      "Biscoito água e sal com chá",
      "Leite com mel",
      "Chá de erva-cidreira",
      "Mamão picado",
      "Iogurte com granola",
      "Chá verde com biscoito integral",
    ],
  };

  const examples = realExamples[mealType] || realExamples.almoco;
  const examplesText = examples.slice(0, 10).map((e, i) => `${i + 1}. ${e}`).join("\n");

  // Prompt destravado conforme arquitetura correta do MEAL POOL
  return `You are generating a MEAL POOL, not a final menu.

Your goal is to EXPLORE the maximum possible variety of real meals that people eat in ${countryCode}.

This is NOT a diet plan.
Do NOT avoid ingredients.
Do NOT filter intolerances.
Do NOT restrict combinations.

Generate meals like a human nutritionist brainstorming options for ${mealLabel}.

EXAMPLES (use as inspiration, but VARY ingredients):
${examplesText}

RULES:
1. Respect the structure of the meal type (${mealType})
2. Use real foods available in the market
3. Maximize diversity of: proteins, carbs, vegetables, side dishes, beverages
4. Avoid repeating the same protein more than 3x
5. Use complete names: "Pão francês com manteiga" (not just "Pão")
6. Specify preparation: "Frango grelhado", "Ovo mexido", "Bife acebolado"

Cultural context is a guideline, not a restriction.
${existingContext}

OUTPUT FORMAT (JSON only):
{
  "meals": [
    {
      "name": "Nome completo da refeição",
      "description": "Descrição breve",
      "components": [
        {"type": "protein", "name": "Frango grelhado", "name_en": "Grilled chicken", "portion_grams": 120, "portion_label": "1 filé (120g)"},
        {"type": "carb", "name": "Arroz branco", "name_en": "White rice", "portion_grams": 100, "portion_label": "4 colheres de sopa (100g)"},
        {"type": "vegetable", "name": "Salada verde", "name_en": "Green salad", "portion_grams": 80, "portion_label": "1 prato de sobremesa (80g)"}
      ],
      "dietary_tags": [],
      "blocked_for_intolerances": [],
      "prep_time_minutes": 15
    }
  ]
}

TYPES: protein, carb, vegetable, fruit, beverage, dairy, fat, fiber, grain, legume

PORTIONS:
- Liquids: "1 xícara (200ml)", "1 copo (250ml)"
- Solids: "4 colheres de sopa (100g)", "1 unidade (50g)", "1 filé (120g)"

Generate ${quantity} VARIED meals. JSON only.`;
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("=== POPULATE MEAL POOL STARTED ===");
    logStep("Request method", { method: req.method });
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    logStep("Environment check", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey
    });

    // API Key do Gemini removida - usando apenas templates TypeScript

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      country_code = "BR", 
      meal_type, 
      quantity = 5,
      dietary_filter = null,
      strategy_key = null,
      intolerance_filter = null,
    } = await req.json();

    logStep("Starting meal pool generation", { country_code, meal_type, quantity, dietary_filter, strategy_key, intolerance_filter });

    // Validate meal_type
    const validMealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
    if (!validMealTypes.includes(meal_type)) {
      throw new Error(`Invalid meal_type. Use: ${validMealTypes.join(", ")}`);
    }

    // Get regional config from shared module
    const regional = getRegionalConfig(country_code);
    logStep("Regional config loaded", { language: regional.language, country: country_code });

    // Load safety database for intolerance detection
    const safetyDb = await loadSafetyDatabase(supabaseUrl, supabaseServiceKey);
    logStep("Safety database loaded", { 
      intoleranceKeys: safetyDb.allIntoleranceKeys.length,
      dietaryKeys: safetyDb.allDietaryKeys.length,
    });

    // Buscar nomes de pratos já existentes para evitar repetição
    const { data: existingMeals } = await supabase
      .from("meal_combinations")
      .select("name")
      .eq("meal_type", meal_type)
      .contains("country_codes", [country_code])
      .limit(100);
    
    const existingMealNames = existingMeals?.map((m: any) => m.name) || [];
    logStep("Existing meals fetched", { count: existingMealNames.length });

    // ============= CARREGAMENTO DINÂMICO DE DADOS =============
    // Carregar regras culturais do banco de dados
    const culturalRule = await loadCulturalRule(supabase, country_code, meal_type);
    logStep("Cultural rule status", { 
      hasRule: !!culturalRule, 
      country: country_code, 
      mealType: meal_type,
      source: culturalRule ? 'database' : 'hardcoded_fallback'
    });

    // Carregar componentes do banco de dados
    const dbComponents = await loadMealComponents(
      supabase, 
      country_code, 
      meal_type, 
      intolerance_filter,
      dietary_filter
    );
    logStep("Components status", { 
      count: dbComponents.length, 
      source: dbComponents.length > 0 ? 'database' : 'hardcoded_fallback'
    });

    // Build prompt usando dados dinâmicos do banco
    const systemPrompt = buildDynamicMealPoolPrompt(
      regional,
      country_code,
      meal_type,
      quantity,
      safetyDb,
      existingMealNames,
      culturalRule,
      dbComponents,
      dietary_filter,
      strategy_key,
      intolerance_filter,
    );

    // Helper function to call AI with retry
    const callAIWithRetry = async (maxRetries = 2): Promise<GeneratedMeal[]> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Calling Gemini API (attempt ${attempt}/${maxRetries})...`);

        const aiResponse = await fetch(
          buildGeminiApiUrl(geminiApiKey, CURRENT_AI_MODEL),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `${systemPrompt}\n\nGenerate ${quantity} meals for ${meal_type} in ${country_code}. Return ONLY valid JSON, no markdown, no code blocks.`
                }]
              }],
              generationConfig: {
                temperature: 1.0,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 16000,
              }
            })
          }
        );

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          logStep("AI Gateway error", { status: aiResponse.status, error: errorText });
          
          if (aiResponse.status === 429) {
            throw { status: 429, message: "Rate limit exceeded. Try again in a few minutes." };
          }
          if (aiResponse.status === 402) {
            throw { status: 402, message: "Insufficient credits. Please add funds." };
          }
          throw new Error(`AI Gateway error: ${aiResponse.status}`);
        }

        const data = await aiResponse.json();
        const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiContent) {
          throw new Error("AI returned empty content");
        }

        const finishReason = data.candidates?.[0]?.finishReason;

        logStep("AI response received", { length: aiContent.length, finishReason });

        // Check if response was truncated
        if (finishReason === "STOP" || aiContent.length < 1500) {
          logStep("Response possibly truncated, retrying...", { finishReason, length: aiContent.length });
          if (attempt < maxRetries) continue;
        }

        // Parse JSON (remove markdown if present)
        let cleanJson = aiContent.trim();
        if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
        }

        try {
          const parsed = JSON.parse(cleanJson);
          
          logStep("Parsed JSON structure", {
            type: typeof parsed,
            isArray: Array.isArray(parsed),
            keys: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed) : undefined,
          });

          // Handle multiple possible response formats:
          // 1. {"meals": [...]} - standard format
          // 2. [{"meals": [...]}] - wrapped in array
          // 3. [...meals...] - direct array of meals
          let candidate: unknown[];
          
          if (Array.isArray(parsed)) {
            // Check if it's [{"meals": [...]}] format
            if (parsed.length === 1 && Array.isArray((parsed[0] as any)?.meals)) {
              candidate = (parsed[0] as any).meals;
              logStep("Extracted meals from wrapped array format");
            } else if (parsed.length > 0 && (parsed[0] as any)?.components) {
              // Direct array of meals
              candidate = parsed;
              logStep("Using direct array of meals");
            } else {
              throw new Error("Unrecognized array format");
            }
          } else if (Array.isArray((parsed as any)?.meals)) {
            candidate = (parsed as any).meals;
            logStep("Extracted meals from object format");
          } else {
            throw new Error("meals is not an array");
          }

          return candidate as GeneratedMeal[];
        } catch (parseError) {
          logStep("JSON parse error", { error: String(parseError), content: cleanJson.slice(0, 1000), attempt });
          if (attempt < maxRetries) continue;
          throw new Error("Failed to parse AI response after retries");
        }
      }
      throw new Error("Failed after all retries");
    };

    // Handle rate limit/payment errors separately
    let generatedMeals: GeneratedMeal[];
    try {
      generatedMeals = await callAIWithRetry(2);
    } catch (err: any) {
      if (err.status === 429 || err.status === 402) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: err.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    logStep("Meals generated by AI", { count: generatedMeals.length });

    // Log first meal structure for debugging
    if (generatedMeals.length > 0) {
      const firstMeal = generatedMeals[0] as any;
      logStep("First meal structure", {
        name: firstMeal?.name,
        hasComponents: !!firstMeal?.components,
        componentsType: typeof firstMeal?.components,
        componentsIsArray: Array.isArray(firstMeal?.components),
        componentsLength: Array.isArray(firstMeal?.components) ? firstMeal.components.length : 0,
        allKeys: firstMeal ? Object.keys(firstMeal) : [],
      });
    }

    // Helper to coerce components to array
    const coerceMealComponents = (raw: unknown): MealComponent[] => {
      if (Array.isArray(raw)) return raw as MealComponent[];
      if (raw && typeof raw === "object") {
        return Object.values(raw as Record<string, unknown>).filter((v) => v && typeof v === "object") as MealComponent[];
      }
      return [];
    };

    // ============= PÓS-PROCESSAMENTO: CORRIGIR DADOS DA IA =============
    const fixComponentData = (comp: any, countryCode: string): any => {
      let name = comp.name || '';
      let portionLabel = comp.portion_label || '';
      
      // CORREÇÃO 1: Feijão preto/carioca → Feijão
      if (name.toLowerCase().includes('feijão preto') || name.toLowerCase().includes('feijao preto')) {
        name = 'Feijão';
      }
      if (name.toLowerCase().includes('feijão carioca') || name.toLowerCase().includes('feijao carioca')) {
        name = 'Feijão';
      }
      
      // CORREÇÃO 2: Ovo genérico → Ovo mexido (padrão)
      if (name.toLowerCase() === 'ovo' || name === 'Ovo') {
        name = 'Ovo mexido';
      }
      
      // CORREÇÃO 3: Queijo genérico → Queijo branco
      if (name.toLowerCase() === 'queijo' || name === 'Queijo') {
        name = 'Queijo branco';
      }
      
      // CORREÇÃO 4: Porções incorretas
      const normalizedName = normalizeText(name);
      
      // Tapioca
      if (normalizedName.includes('tapioca')) {
        portionLabel = '1 tapioca recheada';
        comp.portion_grams = 100;
      }
      
      // Cuscuz
      if (normalizedName.includes('cuscuz')) {
        portionLabel = '1 porção de cuscuz (100g)';
        comp.portion_grams = 100;
      }
      
      // Arroz
      if (normalizedName.includes('arroz')) {
        portionLabel = '4 colheres de sopa (100g)';
        comp.portion_grams = 100;
      }
      
      // Feijão
      if (normalizedName.includes('feijao')) {
        portionLabel = '1 concha média (80g)';
        comp.portion_grams = 80;
      }
      
      // Leite (corrigir de gramas para ml)
      if (normalizedName.includes('leite') || normalizedName.includes('cafe com leite')) {
        if (comp.portion_grams && !comp.portion_ml) {
          comp.portion_ml = comp.portion_grams;
          delete comp.portion_grams;
        }
        if (!portionLabel || portionLabel.includes('g)')) {
          portionLabel = '1 copo (200ml)';
          comp.portion_ml = 200;
        }
      }
      
      // Café
      if (normalizedName.includes('cafe') && !normalizedName.includes('leite')) {
        if (comp.portion_grams && !comp.portion_ml) {
          comp.portion_ml = comp.portion_grams;
          delete comp.portion_grams;
        }
        if (!portionLabel || portionLabel.includes('g)')) {
          portionLabel = '1 xícara pequena (150ml)';
          comp.portion_ml = 150;
        }
      }
      
      // CORREÇÃO 5: Xícara para sólidos (CRÍTICO)
      const solidFoods = [
        'frango', 'carne', 'peixe', 'bife', 'ovo',
        'legumes', 'brocolis', 'couve', 'salada', 'vegetais',
        'batata', 'mandioca', 'cenoura', 'abobrinha',
        'cuscuz', 'farofa', 'pure', 'lentilha', 'grao de bico'
      ];
      
      const portionLabelLower = portionLabel.toLowerCase();
      if (portionLabelLower.includes('xicara') || portionLabelLower.includes('xícara')) {
        const isSolid = solidFoods.some(s => normalizedName.includes(s));
        if (isSolid) {
          const grams = comp.portion_grams || 100;
          
          // Corrigir baseado no tipo de alimento
          if (normalizedName.includes('frango') || normalizedName.includes('carne') || normalizedName.includes('peixe') || normalizedName.includes('bife')) {
            portionLabel = `1 filé médio (${grams}g)`;
          } else if (normalizedName.includes('legumes') || normalizedName.includes('vegetais')) {
            portionLabel = `1 porção (${grams}g)`;
          } else if (normalizedName.includes('brocolis')) {
            portionLabel = `4 floretes (${grams}g)`;
          } else if (normalizedName.includes('couve')) {
            portionLabel = `2 colheres de sopa (${grams}g)`;
          } else if (normalizedName.includes('salada')) {
            portionLabel = `1 prato pequeno (${grams}g)`;
          } else {
            portionLabel = `1 porção (${grams}g)`;
          }
        }
      }
      
      return {
        ...comp,
        name,
        portion_label: portionLabel
      };
    };

    // Normalize + filter out invalid meals (missing or invalid components)
    const validMeals: GeneratedMeal[] = [];
    for (const meal of generatedMeals) {
      if (!meal || typeof meal !== "object") continue;

      const rawComponents = (meal as any)?.components;
      const components = coerceMealComponents(rawComponents);

      if (components.length === 0) {
        logStep("Skipping invalid meal - no components", {
          name: (meal as any)?.name,
          components_type: Array.isArray(rawComponents) ? "array" : typeof rawComponents,
          rawComponentsValue: JSON.stringify(rawComponents)?.slice(0, 200),
        });
        continue;
      }

      // APLICAR PÓS-PROCESSAMENTO EM CADA COMPONENTE
      const fixedComponents = components.map(c => fixComponentData(c, country_code));
      
      // APLICAR VALIDAÇÃO CENTRALIZADA DE PORÇÕES (xícara para sólidos)
      const finalComponents = fixMealComponents(fixedComponents);

      validMeals.push({ ...(meal as any), components: finalComponents });
    }

    logStep("Valid meals after normalization", { count: validMeals.length });

    // If no valid meals, throw an error with details
    if (validMeals.length === 0 && generatedMeals.length > 0) {
      logStep("All meals filtered out - AI returned meals without valid components");
      throw new Error("AI generated meals without valid components. Please try again.");
    }

    // Load canonical ingredients for lookup
    const { data: canonicalIngredients } = await supabase
      .from("canonical_ingredients")
      .select("*")
      .eq("is_active", true);
    
    const canonicalMap = new Map<string, CanonicalIngredient>();
    const canonicalByNamePt = new Map<string, CanonicalIngredient>();
    const canonicalByNameEn = new Map<string, CanonicalIngredient>();
    
    if (canonicalIngredients) {
      for (const ing of canonicalIngredients) {
        canonicalMap.set(ing.id, ing as CanonicalIngredient);
        canonicalByNamePt.set(normalizeText(ing.name_pt), ing as CanonicalIngredient);
        canonicalByNameEn.set(normalizeText(ing.name_en), ing as CanonicalIngredient);
      }
    }
    
    logStep("Canonical ingredients loaded", { count: canonicalMap.size });
    
    // Function to find canonical ingredient
    const findCanonicalIngredient = (name: string, nameEn?: string): CanonicalIngredient | null => {
      // Try exact match by normalized name
      const normalizedPt = normalizeText(name);
      if (canonicalByNamePt.has(normalizedPt)) {
        return canonicalByNamePt.get(normalizedPt)!;
      }
      
      if (nameEn) {
        const normalizedEn = normalizeText(nameEn);
        if (canonicalByNameEn.has(normalizedEn)) {
          return canonicalByNameEn.get(normalizedEn)!;
        }
      }
      
      // Try partial match
      for (const [key, ing] of canonicalByNamePt) {
        if (normalizedPt.includes(key) || key.includes(normalizedPt)) {
          return ing;
        }
      }
      
      return null;
    };
    
    // Calculate real macros - prefer canonical_ingredients, then foods table
    const mealsWithMacros = await Promise.all(
      validMeals.map(async (meal) => {
        const components = coerceMealComponents((meal as any)?.components);

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let macroSource = "canonical";
        let macroConfidence = "high";
        let foundCount = 0;
        let allIntoleranceFlags: string[] = [];

        // Enrich components with canonical IDs
        const enrichedComponents: MealComponent[] = [];
        
        for (const component of components) {
          const portionGrams = component.portion_grams || component.portion_ml || DEFAULT_PORTIONS[component.type]?.grams || 100;
          
          // Try to find in canonical_ingredients first
          const canonical = findCanonicalIngredient(component.name, component.name_en);
          
          if (canonical) {
            // Use canonical data
            const factor = portionGrams / 100;
            totalCalories += Math.round(canonical.calories_per_100g * factor);
            totalProtein += Math.round(canonical.protein_per_100g * factor * 10) / 10;
            totalCarbs += Math.round(canonical.carbs_per_100g * factor * 10) / 10;
            totalFat += Math.round(canonical.fat_per_100g * factor * 10) / 10;
            totalFiber += Math.round(canonical.fiber_per_100g * factor * 10) / 10;
            foundCount++;
            
            // Collect intolerance flags
            if (canonical.intolerance_flags?.length > 0) {
              allIntoleranceFlags.push(...canonical.intolerance_flags);
            }
            
            // Enrich component with canonical_id - PRESERVAR nome e porção originais
            // NÃO sobrescrever se já vieram corretos da IA ou pós-processamento
            enrichedComponents.push({
              ...component,
              canonical_id: canonical.id,
              // Manter nome original se já for específico (ex: "Ovo mexido" não vira "Ovo")
              name: component.name,
              name_en: component.name_en || canonical.name_en,
              // Manter portion_label original se já existir
              portion_label: component.portion_label || (regional.language.startsWith("pt") ? canonical.portion_label_pt : canonical.portion_label_en),
            });
          } else {
            // Fallback to foods table
            const searchTerms = [component.name_en, component.name].filter(Boolean);
            let foodMatch = null;
            
            for (const term of searchTerms) {
              if (!term) continue;
              const { data } = await supabase
                .from("foods")
                .select("calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source")
                .or(`name.ilike.%${term}%,name_normalized.ilike.%${normalizeText(term)}%`)
                .limit(1)
                .single();
              
              if (data) {
                foodMatch = data;
                break;
              }
            }

            if (foodMatch) {
              const factor = portionGrams / 100;
              totalCalories += Math.round(foodMatch.calories_per_100g * factor);
              totalProtein += Math.round(foodMatch.protein_per_100g * factor * 10) / 10;
              totalCarbs += Math.round(foodMatch.carbs_per_100g * factor * 10) / 10;
              totalFat += Math.round(foodMatch.fat_per_100g * factor * 10) / 10;
              totalFiber += Math.round((foodMatch.fiber_per_100g || 0) * factor * 10) / 10;
              foundCount++;
              macroSource = foodMatch.source || "database";
            } else {
              // FALLBACK: calorieTable or estimate
              const normalizedName = normalizeForCalorieTable(component.name);
              let calorieTableMatch: number | null = CALORIE_TABLE[normalizedName] || null;
              
              if (calorieTableMatch !== null) {
                const factor = portionGrams / 100;
                totalCalories += Math.round(calorieTableMatch * factor);
                macroSource = "calorie_table";
                macroConfidence = "medium";
              } else {
                macroConfidence = "low";
                const estimates: Record<string, { cal: number; prot: number; carb: number; fat: number; fiber: number }> = {
                  protein: { cal: 150, prot: 25, carb: 0, fat: 5, fiber: 0 },
                  carb: { cal: 120, prot: 3, carb: 25, fat: 1, fiber: 2 },
                  vegetable: { cal: 25, prot: 2, carb: 5, fat: 0, fiber: 2 },
                  fruit: { cal: 60, prot: 1, carb: 15, fat: 0, fiber: 2 },
                  beverage: { cal: 5, prot: 0, carb: 1, fat: 0, fiber: 0 },
                  dairy: { cal: 80, prot: 5, carb: 8, fat: 3, fiber: 0 },
                  fat: { cal: 90, prot: 0, carb: 0, fat: 10, fiber: 0 },
                  grain: { cal: 100, prot: 3, carb: 20, fat: 1, fiber: 3 },
                  legume: { cal: 120, prot: 8, carb: 20, fat: 1, fiber: 6 },
                  fiber: { cal: 30, prot: 2, carb: 7, fat: 0, fiber: 5 },
                };
                const est = estimates[component.type] || estimates.carb;
                const factor = portionGrams / 100;
                totalCalories += Math.round(est.cal * factor);
                totalProtein += Math.round(est.prot * factor * 10) / 10;
                totalCarbs += Math.round(est.carb * factor * 10) / 10;
                totalFat += Math.round(est.fat * factor * 10) / 10;
                totalFiber += Math.round(est.fiber * factor * 10) / 10;
              }
            }
            
            // Keep original component if no canonical match
            enrichedComponents.push(component);
          }
        }

        if (foundCount === 0) {
          macroConfidence = "low";
          macroSource = "ai_estimated";
        } else if (foundCount < components.length / 2) {
          macroConfidence = "medium";
        }

        // Deduplicate intolerance flags
        const uniqueIntoleranceFlags = [...new Set(allIntoleranceFlags)];
        
        // Merge AI-detected intolerances with canonical ones
        const mergedIntolerances = [...new Set([
          ...(meal.blocked_for_intolerances || []),
          ...uniqueIntoleranceFlags
        ])];
        
        // AUTO-APPROVAL LOGIC
        // Approve automatically if:
        // 1. High confidence macros (canonical or database source)
        // 2. Calories within reasonable range (150-900 kcal)
        // 3. All components have canonical_id OR found in foods table
        const shouldAutoApprove = 
          macroConfidence === "high" && 
          totalCalories >= 150 && 
          totalCalories <= 900 &&
          foundCount >= components.length * 0.7; // At least 70% of components found

        return {
          name: meal.name,
          description: meal.description,
          meal_type,
          components: enrichedComponents,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          total_fiber: totalFiber,
          macro_source: macroSource,
          macro_confidence: macroConfidence,
          country_codes: [country_code],
          language_code: regional.language.split("-")[0],
          dietary_tags: meal.dietary_tags || [],
          blocked_for_intolerances: mergedIntolerances,
          flexible_options: meal.flexible_options || {},
          instructions: meal.instructions || [],
          prep_time_minutes: meal.prep_time_minutes || 15,
          is_active: true,
          approval_status: shouldAutoApprove ? "approved" : "pending",
          source: "ai_generated",
          generated_by: "populate-meal-pool",
        };
      })
    );

    logStep("Macros calculated", { 
      meals: mealsWithMacros.map(m => ({ 
        name: m.name, 
        calories: m.total_calories,
        confidence: m.macro_confidence 
      })) 
    });

    // ============= VALIDAÇÃO AUTOMÁTICA VIA TYPESCRIPT (globalSafetyEngine) =============
    // Esta função analisa TODOS os ingredientes e marca blocked_for_intolerances automaticamente
    const analyzeAndMarkIntolerances = (
      meal: any
    ): { blockedIntolerances: string[]; conflicts: any[] } => {
      // Extrair nomes dos componentes
      const componentNames = (meal.components || []).map((c: any) => c.name || '');
      
      // Validar usando globalSafetyEngine (analisa TODAS as intolerâncias do banco)
      const validation = validateIngredientList(
        componentNames,
        {
          intolerances: [], // Vazio = analisa TODAS as intolerâncias
          dietaryPreference: null,
          excludedIngredients: []
        },
        safetyDb
      );
      
      // Extrair keys das intolerâncias detectadas
      const blockedIntolerances = validation.conflicts.map(c => c.key);
      
      return {
        blockedIntolerances: [...new Set(blockedIntolerances)], // Remove duplicatas
        conflicts: validation.conflicts
      };
    };

    // ============= MARCAR INTOLERÂNCIAS AUTOMATICAMENTE (TYPESCRIPT) =============
    // Analisar cada refeição e marcar blocked_for_intolerances usando globalSafetyEngine
    const mealsWithAutoMarkedIntolerances = mealsWithMacros.map(meal => {
      const analysis = analyzeAndMarkIntolerances(meal);
      
      // Mesclar intolerâncias detectadas automaticamente com as já existentes
      const mergedBlocked = [...new Set([
        ...(meal.blocked_for_intolerances || []),
        ...analysis.blockedIntolerances
      ])];
      
      logStep("🔍 Análise automática de intolerâncias", {
        name: meal.name,
        detected: analysis.blockedIntolerances,
        conflicts: analysis.conflicts.map(c => `${c.matchedIngredient} → ${c.label}`)
      });
      
      return {
        ...meal,
        blocked_for_intolerances: mergedBlocked
      };
    });
    
    logStep("✅ Marcação automática concluída", {
      total: mealsWithAutoMarkedIntolerances.length,
      withIntolerances: mealsWithAutoMarkedIntolerances.filter(m => m.blocked_for_intolerances.length > 0).length
    });

    // VALIDAÇÃO MÍNIMA: Apenas estrutura JSON válida
    // Removidas validações de bloqueio - IA gera livremente, sistema apenas marca tags
    const validatedMeals = mealsWithAutoMarkedIntolerances.filter(meal => {
      // Validar apenas estrutura mínima
      if (!meal.name || meal.name.trim() === '') {
        logStep("❌ Refeição rejeitada - nome vazio", { meal });
        return false;
      }
      
      if (!meal.components || !Array.isArray(meal.components) || meal.components.length === 0) {
        logStep("❌ Refeição rejeitada - componentes inválidos", { name: meal.name });
        return false;
      }
      
      // Validar que cada componente tem campos mínimos
      for (const comp of meal.components) {
        if (!comp.name || !comp.portion_grams) {
          logStep("❌ Refeição rejeitada - componente incompleto", { 
            name: meal.name, 
            component: comp 
          });
          return false;
        }
      }
      
      return true;
    });

    logStep("✅ Validação estrutural completa (apenas JSON válido)", { 
      total: mealsWithMacros.length,
      aprovadas: validatedMeals.length,
      rejeitadas: mealsWithMacros.length - validatedMeals.length,
      motivo: "Apenas rejeita estruturas JSON inválidas"
    });

    // VALIDAR VARIEDADE DE PROTEÍNAS
    const varietyCheck = validateProteinVariety(validatedMeals as any, 3);
    if (!varietyCheck.isValid) {
      logStep("⚠️ Aviso: Baixa variedade de proteínas", {
        proteinCounts: varietyCheck.proteinCounts,
        issues: varietyCheck.issues,
        suggestions: varietyCheck.suggestions
      });
    } else {
      logStep("✅ Variedade de proteínas OK", { proteinCounts: varietyCheck.proteinCounts });
    }

    // Insert into database (upsert to avoid duplicates)
    const inserted: string[] = [];
    const skipped: string[] = [];

    for (const meal of validatedMeals) {
      // Verificar se refeição já existe
      const { data: existing } = await supabase
        .from("meal_combinations")
        .select("id")
        .eq("name", meal.name)
        .eq("meal_type", meal.meal_type)
        .contains("country_codes", [country_code])
        .maybeSingle();
      
      // Se já existe, pular (não adicionar sufixos como v2, v3)
      if (existing) {
        logStep("⏭️ Refeição duplicada - pulando", { name: meal.name });
        skipped.push(meal.name);
        continue;
      }

      const { error: insertError } = await supabase
        .from("meal_combinations")
        .insert(meal);

      if (insertError) {
        logStep("Insert error", { meal: meal.name, error: insertError.message });
        skipped.push(meal.name);
      } else {
        inserted.push(meal.name);
      }
    }

    logStep("Insertion complete", { inserted: inserted.length, skipped: skipped.length });

    // Log AI usage
    await supabase.from("ai_usage_logs").insert({
      function_name: "populate-meal-pool",
      model_used: "google/gemini-2.5-flash",
      items_generated: inserted.length,
      metadata: { country_code, meal_type, quantity, dietary_filter, strategy_key },
    });

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedMeals.length,
        inserted: inserted.length,
        skipped: skipped.length,
        meals: mealsWithMacros.map(m => ({
          name: m.name,
          calories: m.total_calories,
          protein: m.total_protein,
          carbs: m.total_carbs,
          fat: m.total_fat,
          fiber: m.total_fiber,
          confidence: m.macro_confidence,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Fatal error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

