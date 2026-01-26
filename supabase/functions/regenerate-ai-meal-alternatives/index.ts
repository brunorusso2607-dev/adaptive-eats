import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { logAIUsage } from "../_shared/logAIUsage.ts";
import {
  calculateNutritionalTargets,
  getMealTarget,
  getMealMacroTargets,
  buildMealMacroTargetsForPrompt,
} from "../_shared/nutritionalCalculations.ts";
// Import from shared config
import {
  getRegionalConfig,
  fetchIntoleranceMappings,
  validateFood,
  getRestrictionText,
  getMealPromptRules,
  shouldAddSugarQualifier,
  getStrategyPromptRules,
} from "../_shared/mealGenerationConfig.ts";
import { getNutritionalTablePrompt } from "../_shared/nutritionalTableInjection.ts";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [regenerate-ai-meal-alternatives] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= PROMPT BUILDER (USES SHARED CONFIG) =============
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
  language: string;
  countryCode: string;
  optionsCount: number;
  addSugarQualifier: boolean;
  strategyKey?: string;
  isFlexibleOption?: boolean; // Flag para gerar comfort foods
  sex?: string; // Para Motor de Decisão Nutricional
  activityLevel?: string; // Para Motor de Decisão Nutricional
}): string {
  const { mealType, mealLabel, targetCalories, targetProtein, targetCarbs, targetFat, restrictions, language, countryCode, optionsCount, addSugarQualifier, strategyKey, isFlexibleOption, sex, activityLevel } = params;

  const restrictionText = getRestrictionText(restrictions, language, addSugarQualifier);
  const promptRules = getMealPromptRules(language);
  
  // Para opções flexíveis, usar persona da dieta_flexivel
  // Para opções comuns, usar persona de emagrecer
  const effectiveStrategyKey = isFlexibleOption ? 'dieta_flexivel' : (strategyKey === 'dieta_flexivel' ? 'emagrecer' : strategyKey);
  const strategyRules = effectiveStrategyKey ? getStrategyPromptRules(effectiveStrategyKey, language, {
    dietaryPreference: restrictions.dietaryPreference,
    intolerances: restrictions.intolerances,
    goal: restrictions.goal, // Passar objetivo (emagrecer, manter, ganhar_peso)
  }) : '';

  // ============= MOTOR DE DECISÃO NUTRICIONAL =============
  // Obter targets específicos para esta refeição baseado no perfil
  const macroTargets = getMealMacroTargets(
    restrictions.goal || 'maintain',
    sex || 'male',
    activityLevel || 'moderate',
    mealType
  );
  
  // Usar targets do Motor se não foram passados explicitamente
  const finalProtein = targetProtein || macroTargets.protein;
  const finalCarbs = targetCarbs || macroTargets.carbs;
  const finalFat = targetFat || macroTargets.fat;

  let macroDescription = `${targetCalories} kcal`;
  if (finalProtein && finalCarbs && finalFat) {
    macroDescription = `${targetCalories} kcal | ${finalProtein}g proteína | ${finalCarbs}g carboidratos | ${finalFat}g gordura`;
  }

  // Contexto adicional para opções flexíveis
  const flexibleContext = isFlexibleOption ? `
🍔🍕 MODO COMFORT FOOD ATIVO:
- Gere opções de "comfort food" que são SABOROSAS e INDULGENTES
- Exemplos: hambúrgueres, pizzas, massas cremosas, sobremesas, fast food gourmet
- O usuário está em DIETA FLEXÍVEL - pode comer o que quiser se couber nos macros
- Foque em pratos que trazem PRAZER e SATISFAÇÃO
- Não precisa ser "fit" ou "light" - pode ser a versão tradicional do prato
` : '';

  return `Você é um NUTRICIONISTA CLÍNICO com mais de 20 anos de experiência prática.
REGRA DE OURO: Priorize a NATURALIDADE DOS ALIMENTOS sobre otimização nutricional.

==========================================================
TAREFA: GERAR ${optionsCount} OPÇÕES DE ${mealLabel.toUpperCase()}${isFlexibleOption ? ' (COMFORT FOODS)' : ''}
==========================================================

PAÍS: ${countryCode}
META NUTRICIONAL: ${macroDescription}

--------------------------------------------------
RESTRIÇÕES OBRIGATÓRIAS (VETO LAYER - CRÍTICO):
--------------------------------------------------
${restrictionText}

⚠️ SEGURANÇA: Verifique TODAS as restrições acima ANTES de gerar qualquer opção.

${flexibleContext}

${strategyRules ? `
==========================================================
🎯 ESTRATÉGIA NUTRICIONAL DO USUÁRIO (CRÍTICO):
==========================================================
${strategyRules}
` : ''}

--------------------------------------------------
INSTRUÇÕES CRÍTICAS:
--------------------------------------------------
${promptRules}

--------------------------------------------------
RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO:
--------------------------------------------------
{
  "alternatives": [
    {
      "title": "Nome descritivo da refeição",
      "foods": [{"name": "1 filé médio de frango grelhado", "grams": 120}],
      "calories_kcal": ${targetCalories},
      "protein_g": ${finalProtein},
      "carbs_g": ${finalCarbs},
      "fat_g": ${finalFat}
    }
  ]
}

Gere exatamente ${optionsCount} opções DIFERENTES de ${mealLabel}.
Cada opção deve ter entre 2 e 5 alimentos.`;
}

// ============= INTERFACE PARA ALTERNATIVAS =============
interface MealAlternative {
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: Array<{ item: string; quantity: string; unit: string }>;
  recipe_instructions: never[];
  is_safe: boolean;
  is_flexible?: boolean; // Flag para identificar comfort foods
}

// ============= FUNÇÃO PARA GERAR ALTERNATIVAS =============
async function generateAlternatives(
  prompt: string,
  targetCalories: number,
  targetProtein: number | undefined,
  targetCarbs: number | undefined,
  targetFat: number | undefined,
  // deno-lint-ignore no-explicit-any
  restrictions: any,
  // deno-lint-ignore no-explicit-any
  dbMappings: any[],
  // deno-lint-ignore no-explicit-any
  dbSafeKeywords: any[],
  isFlexible: boolean,
  GOOGLE_AI_API_KEY: string
): Promise<{ alternatives: MealAlternative[]; responseText: string }> {
  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 4096, responseMimeType: "application/json" },
      }),
    }
  );

  if (!geminiResponse.ok) throw new Error(`Gemini API error: ${geminiResponse.status}`);

  const geminiData = await geminiResponse.json();
  const responseText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) throw new Error("Empty response from Gemini");

  // Parse response
  const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = JSON.parse(cleaned);
  const rawAlternatives = parsed.alternatives || parsed || [];

  // Validate using SHARED validateFood
  const validatedAlternatives: MealAlternative[] = [];

  for (const alt of rawAlternatives) {
    const foods = alt.foods || [];
    let hasViolation = false;
    const validatedFoods: Array<{ item: string; quantity: string; unit: string }> = [];

    for (const food of foods) {
      const validation = validateFood(food.name, restrictions, dbMappings, dbSafeKeywords);
      if (!validation.isValid) {
        logStep("Food violation", { food: food.name, reason: validation.reason });
        hasViolation = true;
        break;
      }
      validatedFoods.push({ item: food.name, quantity: String(food.grams), unit: "g" });
    }

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
        is_flexible: isFlexible, // Marca se é comfort food
      });
    }
  }

  return { alternatives: validatedAlternatives, responseText };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let userId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("User not authenticated");
    userId = user.id;
    logStep("User authenticated", { userId });

    const body = await req.json();
    const { mealType, currentCalories, optionsCount = 5 } = body;
    if (!mealType) throw new Error("mealType is required");

    logStep("Request received", { mealType, currentCalories, optionsCount });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError || !profile) throw new Error("Profile not found");

    // Fetch intolerance mappings from SHARED config
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    logStep("Intolerance mappings loaded", { mappingsCount: dbMappings.length, safeKeywordsCount: dbSafeKeywords.length });

    // ============= INJEÇÃO DE TABELA NUTRICIONAL (CASCATA CAMADA 1) =============
    const userCountry = profile.country || 'BR';
    const nutritionalTablePrompt = await getNutritionalTablePrompt(supabaseClient, userCountry);
    logStep("Nutritional table loaded for prompt injection");

    // Get regional config from SHARED
    const regional = getRegionalConfig(userCountry);
    const mealLabel = regional.mealLabels[mealType] || mealType;

    // Calculate nutritional targets
    let targetCalories = currentCalories || 400;
    let targetProtein: number | undefined;
    let targetCarbs: number | undefined;
    let targetFat: number | undefined;
    let strategyKey: string | undefined;

    if (profile.strategy_id) {
      const { data: strategy } = await supabaseClient
        .from("nutritional_strategies")
        .select("*")
        .eq("id", profile.strategy_id)
        .single();

      if (strategy) {
        strategyKey = strategy.key;
        const targets = calculateNutritionalTargets({
          weight_current: profile.weight_current,
          weight_goal: profile.weight_goal,
          height: profile.height,
          age: profile.age,
          sex: profile.sex,
          activity_level: profile.activity_level,
        }, {
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

    // Use SHARED helper for sugar qualifier
    const addSugarQualifier = shouldAddSugarQualifier(
      profile.intolerances || [],
      strategyKey,
      profile.dietary_preference
    );

    const restrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || 'comum',
      excludedIngredients: profile.excluded_ingredients || [],
      goal: profile.goal || 'manter',
    };

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

    let allAlternatives: MealAlternative[] = [];
    let totalResponseLength = 0;
    let totalPromptLength = 0;

    // ============= LÓGICA ESPECIAL PARA DIETA FLEXÍVEL =============
    // Gera 3 opções saudáveis + 2 comfort foods
    if (strategyKey === 'dieta_flexivel') {
      logStep("🍽️ Dieta Flexível detectada: gerando 3 saudáveis + 2 comfort foods");

      // Gerar 3 alternativas saudáveis (usando pool de emagrecer)
      const healthyBasePrompt = buildAlternativesPrompt({
        mealType,
        mealLabel,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        restrictions,
        language: regional.language,
        countryCode: userCountry,
        optionsCount: 3, // 3 saudáveis
        addSugarQualifier,
        strategyKey: 'emagrecer', // Usa pool de emagrecimento
        isFlexibleOption: false,
        sex: profile.sex,
        activityLevel: profile.activity_level,
      });
      
      // Inject nutritional table (CASCATA CAMADA 1)
      const healthyPrompt = `${nutritionalTablePrompt}\n\n${healthyBasePrompt}`;

      totalPromptLength += healthyPrompt.length;
      logStep("Building healthy alternatives prompt", { length: healthyPrompt.length });

      const healthyResult = await generateAlternatives(
        healthyPrompt,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        restrictions,
        dbMappings,
        dbSafeKeywords,
        false,
        GOOGLE_AI_API_KEY
      );

      totalResponseLength += healthyResult.responseText.length;
      logStep("Healthy alternatives generated", { count: healthyResult.alternatives.length });

      // Gerar 2 alternativas de comfort food
      const flexibleBasePrompt = buildAlternativesPrompt({
        mealType,
        mealLabel,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        restrictions,
        language: regional.language,
        countryCode: userCountry,
        optionsCount: 2, // 2 comfort foods
        addSugarQualifier,
        strategyKey: 'dieta_flexivel',
        isFlexibleOption: true, // Flag para gerar comfort foods
        sex: profile.sex,
        activityLevel: profile.activity_level,
      });
      
      // Inject nutritional table (CASCATA CAMADA 1)
      const flexiblePrompt = `${nutritionalTablePrompt}\n\n${flexibleBasePrompt}`;

      totalPromptLength += flexiblePrompt.length;
      logStep("Building flexible alternatives prompt", { length: flexiblePrompt.length });

      const flexibleResult = await generateAlternatives(
        flexiblePrompt,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        restrictions,
        dbMappings,
        dbSafeKeywords,
        true, // Marca como flexível
        GOOGLE_AI_API_KEY
      );

      totalResponseLength += flexibleResult.responseText.length;
      logStep("Flexible alternatives generated", { count: flexibleResult.alternatives.length });

      // Combina: primeiro as saudáveis, depois as flexíveis
      allAlternatives = [...healthyResult.alternatives, ...flexibleResult.alternatives];

    } else {
      // ============= LÓGICA PADRÃO: 5 OPÇÕES DO MESMO TIPO =============
      const basePrompt = buildAlternativesPrompt({
        mealType,
        mealLabel,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        restrictions,
        language: regional.language,
        countryCode: userCountry,
        optionsCount,
        addSugarQualifier,
        strategyKey,
        isFlexibleOption: false,
        sex: profile.sex,
        activityLevel: profile.activity_level,
      });
      
      // Inject nutritional table (CASCATA CAMADA 1)
      const prompt = `${nutritionalTablePrompt}\n\n${basePrompt}`;

      totalPromptLength = prompt.length;
      logStep("Prompt built with nutritional table", { length: prompt.length });

      const result = await generateAlternatives(
        prompt,
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        restrictions,
        dbMappings,
        dbSafeKeywords,
        false,
        GOOGLE_AI_API_KEY
      );

      totalResponseLength = result.responseText.length;
      allAlternatives = result.alternatives;
    }

    logStep("All alternatives validated", { total: allAlternatives.length });

    // ============= CALIBRAÇÃO DE MACROS PÓS-GERAÇÃO (CASCATA CAMADA 2) =============
    const calibratedAlternatives = [];
    for (const alt of allAlternatives) {
      try {
        // Convert ingredients to FoodItem format
        const ingredients = alt.recipe_ingredients || [];
        const foodItems = ingredients.map((ing: { item?: string; quantity?: string }) => ({
          name: ing.item || '',
          grams: parseFloat(ing.quantity || '100') || 100,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }));

        if (foodItems.length > 0) {
          const { items: calculatedItems } = await calculateRealMacrosForFoods(
            supabaseClient,
            foodItems,
            userCountry
          );

          // Sum up calibrated macros
          let totalCalories = 0;
          let totalProtein = 0;
          let totalCarbs = 0;
          let totalFat = 0;

          for (const item of calculatedItems) {
            totalCalories += item.calories || 0;
            totalProtein += item.protein || 0;
            totalCarbs += item.carbs || 0;
            totalFat += item.fat || 0;
          }

          // Only override if we got valid data from database
          const hasDbData = calculatedItems.some(item => item.source === 'database' || item.source === 'database_global');
          
          if (hasDbData && totalCalories > 0) {
            logStep("Macros calibrated from database", { 
              recipe: alt.recipe_name,
              original: { cal: alt.recipe_calories, p: alt.recipe_protein, c: alt.recipe_carbs, f: alt.recipe_fat },
              calibrated: { cal: Math.round(totalCalories), p: Math.round(totalProtein), c: Math.round(totalCarbs), f: Math.round(totalFat) }
            });
            
            calibratedAlternatives.push({
              ...alt,
              recipe_calories: Math.round(totalCalories),
              recipe_protein: Math.round(totalProtein * 10) / 10,
              recipe_carbs: Math.round(totalCarbs * 10) / 10,
              recipe_fat: Math.round(totalFat * 10) / 10,
            });
          } else {
            calibratedAlternatives.push(alt);
          }
        } else {
          calibratedAlternatives.push(alt);
        }
      } catch (calibrationError) {
        logStep("Calibration error, keeping AI values", { recipe: alt.recipe_name, error: String(calibrationError) });
        calibratedAlternatives.push(alt);
      }
    }

    logStep("Calibration complete", { total: calibratedAlternatives.length });

    // Log AI usage
    await logAIUsage({
      functionName: "regenerate-ai-meal-alternatives",
      model: "gemini-2.5-flash-lite",
      promptTokens: Math.ceil(totalPromptLength / 4),
      completionTokens: Math.ceil(totalResponseLength / 4),
      totalTokens: Math.ceil((totalPromptLength + totalResponseLength) / 4),
      userId,
      itemsGenerated: allAlternatives.length,
      metadata: { 
        mealType, 
        targetCalories, 
        executionTimeMs: Date.now() - startTime,
        isDietaFlexivel: strategyKey === 'dieta_flexivel',
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        alternatives: calibratedAlternatives,
        mealType,
        mealLabel,
        targetCalories,
        isDietaFlexivel: strategyKey === 'dieta_flexivel', // Informa o frontend
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Error", { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error", alternatives: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
