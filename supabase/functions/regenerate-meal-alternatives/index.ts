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
  console.log(`[${timestamp}] [regenerate-meal-alternatives] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= REGIONAL CONFIG (simplified) =============
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

// ============= RESTRICTION TEXT BUILDER =============
function getRestrictionText(restrictions: {
  intolerances: string[];
  dietaryPreference: string;
  excludedIngredients: string[];
  goal: string;
}): string {
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

  // Intolerances
  const intoleranceMap: Record<string, string> = {
    'lactose': 'SEM laticínios',
    'gluten': 'SEM glúten (trigo, massa, pão)',
    'amendoim': 'SEM amendoim',
    'frutos_do_mar': 'SEM frutos do mar',
    'peixe': 'SEM peixe',
    'ovos': 'SEM ovos',
    'soja': 'SEM soja',
    'cafeina': 'SEM cafeína',
    'milho': 'SEM milho',
    'leguminosas': 'SEM leguminosas',
    'acucar': 'SEM açúcar',
    'acucar_diabetes': 'SEM açúcar (diabetes)',
    'acucar_insulina': 'SEM açúcar (resistência insulina)',
  };

  if (restrictions.intolerances.length > 0) {
    const intoleranceTexts = restrictions.intolerances
      .map(i => intoleranceMap[i] || `SEM ${i}`)
      .join(', ');
    parts.push(intoleranceTexts);
  }

  // Excluded ingredients
  if (restrictions.excludedIngredients.length > 0) {
    parts.push(`Evitar: ${restrictions.excludedIngredients.join(', ')}`);
  }

  return parts.join('\n');
}

// ============= PROMPT BUILDER (SAME FORMAT AS generate-ai-meal-plan) =============
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
}): string {
  const { mealType, mealLabel, targetCalories, targetProtein, targetCarbs, targetFat, restrictions, regional, countryCode, optionsCount } = params;

  const restrictionText = getRestrictionText(restrictions);

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
RESTRIÇÕES OBRIGATÓRIAS:
--------------------------------------------------
${restrictionText}

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
    });

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

    // Get dynamic targets based on meal type and strategy
    if (profile.strategy_id) {
      const { data: strategy } = await supabaseClient
        .from("nutritional_strategies")
        .select("*")
        .eq("id", profile.strategy_id)
        .single();

      if (strategy) {
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

    logStep("Target calculated", { targetCalories, targetProtein, targetCarbs, targetFat, mealType });

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
    });

    logStep("Prompt built", { length: prompt.length });

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

    // Transform to expected format for frontend
    const rawAlternatives = parsed.alternatives || parsed || [];
    
    const alternatives = rawAlternatives.map((alt: {
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
      // Transform foods to ingredient format expected by meal_plan_items
      recipe_ingredients: (alt.foods || []).map((food: { name: string; grams: number }) => ({
        item: food.name,
        quantity: String(food.grams),
        unit: "g",
      })),
      recipe_instructions: [], // Simple meals don't have detailed instructions
      is_safe: true,
    }));

    if (alternatives.length === 0) {
      throw new Error("No alternatives generated");
    }

    logStep("Alternatives generated and transformed", { count: alternatives.length });

    // Log AI usage
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(responseText.length / 4);
    await logAIUsage({
      functionName: "regenerate-meal-alternatives",
      model: "gemini-2.5-flash-lite",
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      userId,
      itemsGenerated: alternatives.length,
      metadata: { mealType, targetCalories, executionTimeMs: Date.now() - startTime },
    });

    return new Response(
      JSON.stringify({
        success: true,
        alternatives,
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
