import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { logAIUsage } from "../_shared/logAIUsage.ts";
import {
  calculateNutritionalTargets,
  getMealTarget,
} from "../_shared/nutritionalCalculations.ts";
// Import from shared config
import {
  getRegionalConfig,
  fetchIntoleranceMappings,
  validateFood,
  getRestrictionText,
  getMealPromptRules,
  shouldAddSugarQualifier,
} from "../_shared/mealGenerationConfig.ts";

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
}): string {
  const { mealLabel, targetCalories, targetProtein, targetCarbs, targetFat, restrictions, language, countryCode, optionsCount, addSugarQualifier } = params;

  const restrictionText = getRestrictionText(restrictions, language, addSugarQualifier);
  const promptRules = getMealPromptRules(language);

  let macroDescription = `${targetCalories} kcal`;
  if (targetProtein && targetCarbs && targetFat) {
    macroDescription = `${targetCalories} kcal | ${targetProtein}g proteína | ${targetCarbs}g carboidratos | ${targetFat}g gordura`;
  }

  return `Você é um NUTRICIONISTA CLÍNICO com mais de 20 anos de experiência prática.
REGRA DE OURO: Priorize a NATURALIDADE DOS ALIMENTOS sobre otimização nutricional.

==========================================================
TAREFA: GERAR ${optionsCount} OPÇÕES DE ${mealLabel.toUpperCase()}
==========================================================

PAÍS: ${countryCode}
META NUTRICIONAL: ${macroDescription}

--------------------------------------------------
RESTRIÇÕES OBRIGATÓRIAS (VETO LAYER - CRÍTICO):
--------------------------------------------------
${restrictionText}

⚠️ SEGURANÇA: Verifique TODAS as restrições acima ANTES de gerar qualquer opção.

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
      "protein_g": ${targetProtein || 25},
      "carbs_g": ${targetCarbs || 40},
      "fat_g": ${targetFat || 15}
    }
  ]
}

Gere exatamente ${optionsCount} opções DIFERENTES de ${mealLabel}.
Cada opção deve ter entre 2 e 5 alimentos.`;
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

    // Get regional config from SHARED
    const userCountry = profile.country || 'BR';
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

    // Build prompt using SHARED rules
    const prompt = buildAlternativesPrompt({
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
    });

    logStep("Prompt built", { length: prompt.length });

    // Call Gemini API
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

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
        });
      }
    }

    logStep("Alternatives validated", { raw: rawAlternatives.length, valid: validatedAlternatives.length });

    // Log AI usage
    await logAIUsage({
      functionName: "regenerate-ai-meal-alternatives",
      model: "gemini-2.5-flash-lite",
      promptTokens: Math.ceil(prompt.length / 4),
      completionTokens: Math.ceil(responseText.length / 4),
      totalTokens: Math.ceil((prompt.length + responseText.length) / 4),
      userId,
      itemsGenerated: validatedAlternatives.length,
      metadata: { mealType, targetCalories, executionTimeMs: Date.now() - startTime },
    });

    return new Response(
      JSON.stringify({
        success: true,
        alternatives: validatedAlternatives.length > 0 ? validatedAlternatives : rawAlternatives.slice(0, optionsCount),
        mealType,
        mealLabel,
        targetCalories,
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
