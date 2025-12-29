import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { logAIUsage } from "../_shared/logAIUsage.ts";
import {
  calculateNutritionalTargets,
  getMealTarget,
} from "../_shared/nutritionalCalculations.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [regenerate-ai-meal-alternatives] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= REGIONAL CONFIG =============
interface RegionalConfig {
  language: string;
  languageName: string;
  mealLabels: Record<string, string>;
}

const REGIONAL_CONFIGS: Record<string, RegionalConfig> = {
  'BR': {
    language: 'pt-BR',
    languageName: 'Português Brasileiro',
    mealLabels: {
      cafe_manha: "Café da manhã",
      lanche_manha: "Lanche da manhã",
      almoco: "Almoço",
      lanche_tarde: "Lanche da tarde",
      jantar: "Jantar",
      ceia: "Ceia",
    },
  },
  'US': {
    language: 'en-US',
    languageName: 'American English',
    mealLabels: {
      cafe_manha: "Breakfast",
      lanche_manha: "Morning Snack",
      almoco: "Lunch",
      lanche_tarde: "Afternoon Snack",
      jantar: "Dinner",
      ceia: "Late Night Snack",
    },
  },
  'PT': {
    language: 'pt-PT',
    languageName: 'Português Europeu',
    mealLabels: {
      cafe_manha: "Pequeno-almoço",
      lanche_manha: "Lanche da Manhã",
      almoco: "Almoço",
      lanche_tarde: "Lanche da Tarde",
      jantar: "Jantar",
      ceia: "Ceia",
    },
  },
};

const DEFAULT_CONFIG: RegionalConfig = REGIONAL_CONFIGS['BR'];

function getRegionalConfig(countryCode: string): RegionalConfig {
  return REGIONAL_CONFIGS[countryCode?.toUpperCase()] || DEFAULT_CONFIG;
}

// ============= INTOLERANCE MAPPINGS FROM DB =============
interface IntoleranceMapping {
  ingredient: string;
  intolerance_key: string;
}

interface SafeKeyword {
  keyword: string;
  intolerance_key: string;
}

// deno-lint-ignore no-explicit-any
async function fetchIntoleranceMappings(supabaseClient: any): Promise<{
  mappings: IntoleranceMapping[];
  safeKeywords: SafeKeyword[];
}> {
  const [mappingsResult, safeKeywordsResult] = await Promise.all([
    supabaseClient.from('intolerance_mappings').select('ingredient, intolerance_key'),
    supabaseClient.from('intolerance_safe_keywords').select('keyword, intolerance_key'),
  ]);

  return {
    mappings: mappingsResult.data || [],
    safeKeywords: safeKeywordsResult.data || [],
  };
}

// ============= FORBIDDEN INGREDIENTS (SAME AS generate-ai-meal-plan) =============
const FORBIDDEN_INGREDIENTS: Record<string, string[]> = {
  // Intolerâncias básicas
  lactose: ['leite', 'queijo', 'iogurte', 'manteiga', 'requeijao', 'creme de leite', 'nata', 'coalho', 'mussarela', 'parmesao', 'ricota', 'cottage', 'cream cheese', 'chantilly', 'leite condensado', 'doce de leite', 'milk', 'cheese', 'yogurt', 'butter', 'cream'],
  gluten: ['trigo', 'farinha de trigo', 'cevada', 'centeio', 'wheat', 'bread', 'pasta', 'cake', 'cookie', 'biscuit', 'flour', 'barley', 'rye'],
  amendoim: ['amendoim', 'pasta de amendoim', 'peanut', 'cacahuete', 'mani'],
  frutos_do_mar: ['camarao', 'lagosta', 'caranguejo', 'siri', 'marisco', 'lula', 'polvo', 'ostra', 'mexilhao', 'shrimp', 'lobster', 'crab', 'oyster', 'squid', 'octopus'],
  peixe: ['peixe', 'salmao', 'atum', 'tilapia', 'bacalhau', 'sardinha', 'pescada', 'robalo', 'fish', 'salmon', 'tuna', 'cod', 'sardine'],
  ovos: ['ovo', 'ovos', 'gema', 'clara de ovo', 'omelete', 'egg', 'eggs', 'omelette'],
  soja: ['soja', 'tofu', 'edamame', 'leite de soja', 'molho de soja', 'shoyu', 'soy', 'soya'],
  cafeina: ['cafe ', ' cafe', 'coffee', 'cha preto', 'cha verde', 'cha mate', 'green tea', 'black tea', 'guarana', 'chocolate', 'cacau'],
  milho: ['milho', 'fuba', 'polenta', 'pipoca', 'corn', 'maize', 'popcorn'],
  leguminosas: ['feijao', 'lentilha', 'grao de bico', 'ervilha seca', 'fava', 'beans', 'lentils', 'chickpeas'],
  // Intolerâncias adicionais (17 padronizadas)
  sulfitos: ['vinho', 'vinagre', 'frutas secas', 'conservas', 'wine', 'vinegar', 'dried fruits'],
  castanhas: ['castanha', 'noz', 'amêndoa', 'avelã', 'macadâmia', 'pistache', 'nuts', 'almonds', 'walnuts', 'hazelnuts', 'cashews'],
  sesamo: ['gergelim', 'tahine', 'sesame', 'tahini'],
  tremoco: ['tremoço', 'lupin', 'lupine'],
  mostarda: ['mostarda', 'mustard'],
  aipo: ['aipo', 'salsao', 'celery'],
  moluscos: ['ostra', 'mexilhao', 'vieira', 'lula', 'polvo', 'oyster', 'mussel', 'clam', 'squid', 'octopus'],
  fodmap: ['cebola', 'alho', 'maca', 'pera', 'mel', 'trigo', 'onion', 'garlic', 'apple', 'pear', 'honey', 'wheat'],
  histamina: ['queijo curado', 'vinho', 'cerveja', 'embutidos', 'fermentados', 'aged cheese', 'wine', 'beer', 'cured meats', 'fermented'],
  salicilatos: ['tomate', 'pimentao', 'berinjela', 'curry', 'tomato', 'pepper', 'eggplant'],
  niquel: ['chocolate', 'cacau', 'aveia', 'lentilha', 'soja', 'cocoa', 'oats', 'lentils', 'soy'],
  // Açúcar (3 variantes)
  acucar: ['acucar', 'mel', 'xarope', 'rapadura', 'melado', 'sugar', 'honey', 'syrup', 'molasses'],
  acucar_diabetes: ['acucar', 'mel', 'xarope', 'rapadura', 'melado', 'sugar', 'honey', 'syrup', 'molasses'],
  acucar_insulina: ['acucar', 'mel', 'xarope', 'rapadura', 'melado', 'sugar', 'honey', 'syrup', 'molasses'],
};

// Ingredientes de origem animal
const ANIMAL_INGREDIENTS = ['carne', 'frango', 'porco', 'boi', 'peru', 'pato', 'bacon', 'presunto', 'salsicha', 'linguica', 'mortadela', 'salame', 'peito de frango', 'file', 'costela', 'picanha', 'alcatra', 'patinho', 'acém', 'maminha', 'coxa', 'sobrecoxa', 'asa', 'meat', 'chicken', 'pork', 'beef', 'turkey', 'duck', 'ham', 'sausage'];
const DAIRY_AND_EGGS = ['leite', 'queijo', 'iogurte', 'ovo', 'ovos', 'manteiga', 'creme de leite', 'requeijao', 'milk', 'cheese', 'yogurt', 'egg', 'eggs', 'butter', 'cream', 'mel', 'honey'];
const FISH_INGREDIENTS = ['peixe', 'salmao', 'atum', 'tilapia', 'bacalhau', 'sardinha', 'pescada', 'fish', 'salmon', 'tuna', 'cod', 'sardine'];

// ============= VALIDATION FUNCTIONS =============
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function validateFood(
  food: string,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  dbMappings: IntoleranceMapping[],
  dbSafeKeywords: SafeKeyword[]
): { isValid: boolean; reason?: string; restriction?: string } {
  const normalizedFood = normalizeText(food);
  
  // 1. Verificar ingredientes excluídos pelo usuário
  for (const excluded of restrictions.excludedIngredients) {
    if (normalizedFood.includes(normalizeText(excluded))) {
      return {
        isValid: false,
        reason: `Contém ingrediente excluído: ${excluded}`,
        restriction: 'excluded_ingredient',
      };
    }
  }
  
  // 2. Verificar intolerâncias
  for (const intolerance of restrictions.intolerances) {
    // Safe keywords para esta intolerância
    const safeForIntolerance = dbSafeKeywords
      .filter(sk => sk.intolerance_key === intolerance)
      .map(sk => sk.keyword);
    
    // Primeiro verifica se é seguro
    let isSafe = false;
    for (const safe of safeForIntolerance) {
      if (normalizedFood.includes(normalizeText(safe))) {
        isSafe = true;
        break;
      }
    }
    
    if (!isSafe) {
      // Verifica mapeamentos do banco
      const dbForbidden = dbMappings
        .filter(m => m.intolerance_key === intolerance)
        .map(m => m.ingredient);
      
      for (const forbidden of dbForbidden) {
        if (normalizedFood.includes(normalizeText(forbidden))) {
          return {
            isValid: false,
            reason: `Contém ${forbidden} (intolerância: ${intolerance})`,
            restriction: `intolerance_${intolerance}`,
          };
        }
      }
      
      // Verifica lista hardcoded
      const hardcodedForbidden = FORBIDDEN_INGREDIENTS[intolerance] || [];
      for (const forbidden of hardcodedForbidden) {
        if (normalizedFood.includes(normalizeText(forbidden))) {
          return {
            isValid: false,
            reason: `Contém ${forbidden} (intolerância: ${intolerance})`,
            restriction: `intolerance_${intolerance}`,
          };
        }
      }
    }
  }
  
  // 3. Verificar preferência dietética
  const diet = restrictions.dietaryPreference;
  
  if (diet === 'vegana') {
    const allAnimal = [...ANIMAL_INGREDIENTS, ...DAIRY_AND_EGGS, ...FISH_INGREDIENTS];
    for (const animal of allAnimal) {
      if (normalizedFood.includes(normalizeText(animal))) {
        return {
          isValid: false,
          reason: `Contém ingrediente animal: ${animal}`,
          restriction: 'dietary_vegan',
        };
      }
    }
  } else if (diet === 'vegetariana') {
    const meatAndFish = [...ANIMAL_INGREDIENTS, ...FISH_INGREDIENTS];
    for (const item of meatAndFish) {
      if (normalizedFood.includes(normalizeText(item))) {
        return {
          isValid: false,
          reason: `Contém carne/peixe: ${item}`,
          restriction: 'dietary_vegetarian',
        };
      }
    }
  } else if (diet === 'pescetariana') {
    for (const meat of ANIMAL_INGREDIENTS) {
      if (normalizedFood.includes(normalizeText(meat))) {
        return {
          isValid: false,
          reason: `Contém carne: ${meat}`,
          restriction: 'dietary_pescatarian',
        };
      }
    }
  }
  
  return { isValid: true };
}

// ============= RESTRICTION TEXT BUILDER (EXPANDED 17 INTOLERANCES) =============
function getRestrictionText(restrictions: {
  intolerances: string[];
  dietaryPreference: string;
  excludedIngredients: string[];
  goal: string;
}, shouldAddSugarQualifier: boolean): string {
  const parts: string[] = [];

  // Dietary preference
  const dietaryMap: Record<string, string> = {
    'comum': 'Onívoro - todos os alimentos permitidos',
    'vegetariana': 'VEGETARIANO - SEM carnes',
    'vegana': 'VEGANO - SEM carnes, ovos, laticínios',
    'low_carb': 'LOW CARB - evitar arroz, pão, massa',
    'pescetariana': 'PESCETARIANO - SEM carnes vermelhas, apenas peixe',
    'cetogenica': 'CETOGÊNICO - muito baixo em carboidratos',
    'flexitariana': 'FLEXITARIANO - predominantemente vegetariano',
  };
  parts.push(dietaryMap[restrictions.dietaryPreference] || dietaryMap['comum']);

  // Goal
  const goalMap: Record<string, string> = {
    'emagrecer': 'OBJETIVO: Emagrecimento - priorizar proteínas magras e vegetais',
    'manter': 'OBJETIVO: Manutenção - dieta equilibrada',
    'ganhar_peso': 'OBJETIVO: Ganho de peso - incluir alimentos calóricos',
  };
  parts.push(goalMap[restrictions.goal] || goalMap['manter']);

  // Intolerances - Lista completa de 17
  const intoleranceMap: Record<string, string> = {
    'lactose': 'SEM laticínios (leite, queijo, iogurte, manteiga)',
    'gluten': 'SEM glúten (trigo, massa, pão, cevada, centeio)',
    'amendoim': 'SEM amendoim e derivados',
    'frutos_do_mar': 'SEM frutos do mar (camarão, lagosta, caranguejo)',
    'peixe': 'SEM peixe',
    'ovos': 'SEM ovos',
    'soja': 'SEM soja (tofu, shoyu, leite de soja)',
    'sulfitos': 'SEM sulfitos (vinho, vinagre, frutas secas)',
    'castanhas': 'SEM castanhas e nozes (amêndoa, noz, avelã, castanha)',
    'sesamo': 'SEM gergelim/sésamo',
    'tremoco': 'SEM tremoço',
    'mostarda': 'SEM mostarda',
    'aipo': 'SEM aipo/salsão',
    'moluscos': 'SEM moluscos (ostra, mexilhão, lula, polvo)',
    'fodmap': 'SEM FODMAP (cebola, alho, maçã, trigo, mel)',
    'histamina': 'SEM histamina (queijo curado, vinho, embutidos)',
    'salicilatos': 'SEM salicilatos (tomate, pimentão, curry)',
    'niquel': 'SEM níquel (chocolate, aveia, lentilha)',
    // Açúcar - 3 variantes
    'acucar': 'SEM açúcar (açúcar, mel, xarope, rapadura)',
    'acucar_diabetes': 'SEM açúcar (diabetes - controle glicêmico)',
    'acucar_insulina': 'SEM açúcar (resistência à insulina)',
    // Legados
    'cafeina': 'SEM cafeína',
    'milho': 'SEM milho',
    'leguminosas': 'SEM leguminosas (feijão, lentilha, grão de bico)',
  };

  if (restrictions.intolerances.length > 0) {
    const intoleranceTexts = restrictions.intolerances
      .map(i => intoleranceMap[i] || `SEM ${i}`)
      .join('\n');
    parts.push(intoleranceTexts);
  }

  // Excluded ingredients
  if (restrictions.excludedIngredients.length > 0) {
    parts.push(`EVITAR (preferência pessoal): ${restrictions.excludedIngredients.join(', ')}`);
  }

  // Regra de qualificadores de bebidas
  if (shouldAddSugarQualifier) {
    parts.push(`
⚠️ REGRA DE QUALIFICADORES DE BEBIDAS:
- Adicionar "(sem açúcar)" a chás, cafés e sucos quando aplicável
- Exemplo: "1 copo de suco de laranja (sem açúcar)", "1 xícara de chá verde (sem açúcar)"`);
  }

  return parts.join('\n');
}

// ============= PROMPT BUILDER =============
function buildAlternativesPrompt(params: {
  mealType: string;
  mealLabel: string;
  targetCalories: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  };
  regional: RegionalConfig;
  countryCode: string;
  optionsCount: number;
  shouldAddSugarQualifier: boolean;
}): string {
  const { mealType, mealLabel, targetCalories, targetProtein, targetCarbs, targetFat, restrictions, regional, countryCode, optionsCount, shouldAddSugarQualifier } = params;

  const restrictionText = getRestrictionText(restrictions, shouldAddSugarQualifier);

  // Macro targets description
  let macroDescription = `${targetCalories} kcal`;
  if (targetProtein && targetCarbs && targetFat) {
    macroDescription = `${targetCalories} kcal | ${targetProtein}g proteína | ${targetCarbs}g carboidratos | ${targetFat}g gordura`;
  }

  return `Você é um NUTRICIONISTA CLÍNICO com mais de 20 anos de experiência prática.
Você cria refeições como um profissional humano criaria para si mesmo, sua família ou seus pacientes reais.
REGRA DE OURO: Priorize a NATURALIDADE DOS ALIMENTOS sobre otimização nutricional.

==========================================================
TAREFA: GERAR ${optionsCount} OPÇÕES DE ${mealLabel.toUpperCase()}
==========================================================

IDIOMA: ${regional.languageName}
PAÍS: ${countryCode}

META NUTRICIONAL: ${macroDescription}

--------------------------------------------------
RESTRIÇÕES OBRIGATÓRIAS (VETO LAYER - CRÍTICO):
--------------------------------------------------
${restrictionText}

⚠️ SEGURANÇA: Verifique TODAS as restrições acima ANTES de gerar qualquer opção.
Se um ingrediente viola qualquer restrição, NÃO o inclua.

--------------------------------------------------
REGRA DE COMPLETUDE CULINÁRIA:
--------------------------------------------------
Gere refeições PRONTAS e COMPLETAS, não ingredientes isolados.
- ERRADO: "3 claras de ovo" (ingrediente cru) ❌
- CERTO: "Omelete de claras com ervas" ✓
- ERRADO: "2 fatias de pão" (incompleto) ❌
- CERTO: "Sanduíche de pão integral com queijo e tomate" ✓

--------------------------------------------------
INSTRUÇÕES CRÍTICAS:
--------------------------------------------------

📐 FORMATO DOS ALIMENTOS (foods):
Cada item: {"name": "QUANTIDADE + ALIMENTO", "grams": NÚMERO}
- O campo "name" DEVE incluir APENAS medida caseira qualitativa (NUNCA números de gramas)
- O campo "grams" DEVE ser um NÚMERO PURO (sem "g"): 120, 150, 100

🚫 REGRA ANTI-DUPLICAÇÃO DE GRAMAGEM (CRÍTICO):
- NUNCA inclua números de gramas no campo "name" - a gramagem já aparece no campo "grams"
- ERRADO: "100g de atum em conserva" ❌
- CERTO: "1 porção de atum em conserva" ✓

🥪 REGRA DE ALIMENTOS-VEÍCULO (wraps, pães, tortillas):
- Wraps, pães e tortillas são "veículos" que PRECISAM de recheio
- SEMPRE apresentar como item COMPOSTO incluindo o recheio principal
- ERRADO: listar "1 wrap integral" separado do recheio ❌
- CERTO: "1 wrap integral recheado com atum e alface" ✓

⚠️ REGRA DE MEDIDAS CASEIRAS (OBRIGATÓRIO):
- LÍQUIDOS (água, sucos, chás, leite): usar "xícara", "copo", "ml"
- PROTEÍNAS (carnes, peixes, frango): usar "filé", "pedaço", "porção"
- OVOS: usar "unidade" (ex: "2 ovos cozidos")
- GRÃOS/ARROZ/MASSAS: usar "colher de sopa", "colher de servir", "porção"
- VEGETAIS SÓLIDOS: usar "porção", "folhas", "floretes" (NUNCA "xícara")
- FRUTAS: usar "unidade" + tamanho (ex: "1 banana média")

Exemplos CORRETOS:
{"name": "1 filé médio de frango grelhado", "grams": 120}
{"name": "2 colheres de sopa de arroz integral", "grams": 150}
{"name": "1 porção de brócolis cozido", "grams": 100}
{"name": "1 banana média", "grams": 120}
{"name": "1 wrap integral recheado com atum e alface", "grams": 200}

🔴 REGRA DE CONSISTÊNCIA NOME-INGREDIENTES:
O campo "title" DEVE ser um nome descritivo que reflete os ingredientes (ex: "Frango grelhado com arroz e salada")
NUNCA use nomes genéricos como "Opção 1", "Opção 2", etc.

--------------------------------------------------
RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO:
--------------------------------------------------
{
  "alternatives": [
    {
      "title": "Nome descritivo da refeição 1",
      "foods": [
        {"name": "1 filé médio de frango grelhado", "grams": 120},
        {"name": "2 colheres de sopa de arroz integral", "grams": 150}
      ],
      "calories_kcal": ${targetCalories},
      "protein_g": ${targetProtein || 25},
      "carbs_g": ${targetCarbs || 40},
      "fat_g": ${targetFat || 15}
    }
  ]
}

Gere exatamente ${optionsCount} opções DIFERENTES de ${mealLabel}, todas respeitando as restrições acima.
Cada opção deve ter entre 2 e 5 alimentos.
Varie os ingredientes entre as opções para dar mais escolha ao usuário.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }
    userId = user.id;
    logStep("User authenticated", { userId });

    const body = await req.json();
    const { mealType, currentCalories, optionsCount = 5 } = body;

    if (!mealType) {
      throw new Error("mealType is required");
    }

    logStep("Request received", { mealType, currentCalories, optionsCount });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    logStep("Profile loaded", { 
      dietary: profile.dietary_preference,
      intolerances: profile.intolerances?.length || 0,
      excluded: profile.excluded_ingredients?.length || 0,
      country: profile.country,
      strategyId: profile.strategy_id,
    });

    // Fetch intolerance mappings from database (SAME AS generate-ai-meal-plan)
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    logStep("Intolerance mappings loaded", { mappingsCount: dbMappings.length, safeKeywordsCount: dbSafeKeywords.length });

    // Get regional config
    const userCountry = profile.country || 'BR';
    const regional = getRegionalConfig(userCountry);
    const mealLabel = regional.mealLabels[mealType] || mealType;

    // Calculate nutritional targets
    const physicalData = {
      weight_current: profile.weight_current,
      weight_goal: profile.weight_goal,
      height: profile.height,
      age: profile.age,
      sex: profile.sex,
      activity_level: profile.activity_level,
    };

    let targetCalories = currentCalories || 400;
    let targetProtein: number | undefined;
    let targetCarbs: number | undefined;
    let targetFat: number | undefined;
    let strategyKey: string | undefined;

    // Get dynamic targets based on meal type and strategy
    if (profile.strategy_id) {
      const { data: strategy } = await supabaseClient
        .from("nutritional_strategies")
        .select("*")
        .eq("id", profile.strategy_id)
        .single();

      if (strategy) {
        strategyKey = strategy.key;
        const targets = calculateNutritionalTargets(physicalData, {
          calorieModifier: strategy.calorie_modifier || 0,
          proteinPerKg: strategy.protein_per_kg || 1.6,
          carbRatio: strategy.carb_ratio || 0.5,
          fatRatio: strategy.fat_ratio || 0.3,
        });

        if (targets) {
          const mealTarget = getMealTarget(targets, mealType, profile.enabled_meals || undefined);
          if (mealTarget) {
            targetCalories = Math.round(mealTarget.calories);
            targetProtein = Math.round(mealTarget.protein);
            targetCarbs = Math.round(mealTarget.carbs);
            targetFat = Math.round(mealTarget.fat);
          }
        }
      }
    }

    logStep("Target calculated", { targetCalories, targetProtein, targetCarbs, targetFat, mealType, strategyKey });

    // Determine if should add sugar qualifiers to beverages
    const hasSugarRestriction = (profile.intolerances || []).some((i: string) => 
      i.includes('acucar') || i === 'acucar_diabetes' || i === 'acucar_insulina'
    );
    const hasWeightLossStrategy = strategyKey === 'emagrecimento' || strategyKey === 'cutting';
    const hasKetoStrategy = profile.dietary_preference === 'cetogenica';
    const shouldAddSugarQualifier = hasSugarRestriction || hasWeightLossStrategy || hasKetoStrategy;

    // Build restrictions
    const restrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || 'comum',
      excludedIngredients: profile.excluded_ingredients || [],
      goal: profile.goal || 'manter',
    };

    // Build prompt using the SAME format as generate-ai-meal-plan
    const prompt = buildAlternativesPrompt({
      mealType,
      mealLabel,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      restrictions,
      regional,
      countryCode: userCountry,
      optionsCount,
      shouldAddSugarQualifier,
    });

    logStep("Prompt built", { length: prompt.length, shouldAddSugarQualifier });

    // Call Gemini API
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      logStep("Gemini error", { status: geminiResponse.status, error: errorText });
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    logStep("Gemini response received", { length: responseText.length });

    // Parse response
    let parsed;
    try {
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), response: responseText.substring(0, 500) });
      throw new Error("Failed to parse AI response");
    }

    // Transform and VALIDATE alternatives (POST-GENERATION VALIDATION)
    const rawAlternatives = parsed.alternatives || parsed || [];
    
    const validatedAlternatives: Array<{
      recipe_name: string;
      recipe_calories: number;
      recipe_protein: number;
      recipe_carbs: number;
      recipe_fat: number;
      recipe_prep_time: number;
      recipe_ingredients: Array<{ item: string; quantity: string; unit: string }>;
      recipe_instructions: never[];
      is_safe: boolean;
    }> = [];

    for (const alt of rawAlternatives) {
      const foods = alt.foods || [];
      let hasViolation = false;
      const validatedFoods: Array<{ item: string; quantity: string; unit: string }> = [];

      for (const food of foods) {
        const validation = validateFood(
          food.name,
          restrictions,
          dbMappings,
          dbSafeKeywords
        );

        if (!validation.isValid) {
          logStep("Food violation detected", { food: food.name, reason: validation.reason });
          hasViolation = true;
          break;
        }

        validatedFoods.push({
          item: food.name,
          quantity: String(food.grams),
          unit: "g",
        });
      }

      // Only include alternatives that pass ALL validations
      if (!hasViolation && validatedFoods.length > 0) {
        validatedAlternatives.push({
          recipe_name: alt.title || "Refeição",
          recipe_calories: alt.calories_kcal || targetCalories,
          recipe_protein: alt.protein_g || targetProtein || 25,
          recipe_carbs: alt.carbs_g || targetCarbs || 35,
          recipe_fat: alt.fat_g || targetFat || 12,
          recipe_prep_time: 15,
          recipe_ingredients: validatedFoods,
          recipe_instructions: [],
          is_safe: true,
        });
      }
    }

    if (validatedAlternatives.length === 0) {
      logStep("All alternatives failed validation, returning raw with warning");
      // Fallback: return raw alternatives with is_safe = false
      const fallbackAlternatives = rawAlternatives.slice(0, optionsCount).map((alt: {
        title?: string;
        foods?: Array<{ name: string; grams: number }>;
        calories_kcal?: number;
        protein_g?: number;
        carbs_g?: number;
        fat_g?: number;
      }) => ({
        recipe_name: alt.title || "Refeição",
        recipe_calories: alt.calories_kcal || targetCalories,
        recipe_protein: alt.protein_g || targetProtein || 25,
        recipe_carbs: alt.carbs_g || targetCarbs || 35,
        recipe_fat: alt.fat_g || targetFat || 12,
        recipe_prep_time: 15,
        recipe_ingredients: (alt.foods || []).map((food: { name: string; grams: number }) => ({
          item: food.name,
          quantity: String(food.grams),
          unit: "g",
        })),
        recipe_instructions: [],
        is_safe: false,
      }));

      return new Response(
        JSON.stringify({
          success: true,
          alternatives: fallbackAlternatives,
          mealType,
          mealLabel,
          targetCalories,
          validationWarning: "Some alternatives may contain restricted ingredients",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logStep("Alternatives generated and validated", { 
      rawCount: rawAlternatives.length, 
      validatedCount: validatedAlternatives.length 
    });

    // Log AI usage
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(responseText.length / 4);
    await logAIUsage({
      functionName: "regenerate-ai-meal-alternatives",
      model: "gemini-2.5-flash-lite",
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      userId,
      itemsGenerated: validatedAlternatives.length,
      metadata: { mealType, targetCalories, executionTimeMs: Date.now() - startTime },
    });

    return new Response(
      JSON.stringify({
        success: true,
        alternatives: validatedAlternatives,
        mealType,
        mealLabel,
        targetCalories,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Error", { error: error instanceof Error ? error.message : String(error) });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        alternatives: [],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
