import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildIntolerancesString,
  buildExcludedIngredientsString,
  buildForbiddenIngredientsListWithDiet,
  buildDietaryRestrictionBlock,
  MEAL_TYPE_LABELS,
  getCountryConfig,
  type UserProfile,
} from "../_shared/recipeConfig.ts";
import { logAIUsage } from "../_shared/logAIUsage.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
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
  console.log(`[${timestamp}] [suggest-meal-alternatives] ${step}`, details ? JSON.stringify(details) : "");
};

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
    const { mealType, currentCalories } = body;

    if (!mealType) {
      throw new Error("mealType is required");
    }

    logStep("Request received", { mealType, currentCalories });

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
    });

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

    // Get dynamic targets based on meal type if possible
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
          }
        }
      }
    }

    logStep("Target calculated", { targetCalories, mealType });

    // Build user profile for prompt functions
    const userProfileForPrompt: UserProfile = {
      id: userId,
      dietary_preference: profile.dietary_preference,
      intolerances: profile.intolerances,
      excluded_ingredients: profile.excluded_ingredients,
      goal: profile.goal,
      country: profile.country,
      kids_mode: profile.kids_mode,
    };

    // Build prompt for alternatives
    const prompt = buildAlternativesPrompt(
      userProfileForPrompt,
      mealType,
      targetCalories,
      5 // number of alternatives
    );

    // Call Gemini
    const geminiKey = await getGeminiApiKey();
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiKey}`,
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
    let alternatives;
    try {
      const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      alternatives = JSON.parse(cleaned);
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), response: responseText.substring(0, 500) });
      throw new Error("Failed to parse AI response");
    }

    // Validate alternatives
    const validAlternatives = (alternatives.alternatives || alternatives || [])
      .filter((alt: { is_safe?: boolean }) => alt.is_safe !== false)
      .slice(0, 5);

    if (validAlternatives.length === 0) {
      throw new Error("No valid alternatives generated");
    }

    logStep("Alternatives generated", { count: validAlternatives.length });

    // Log AI usage
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(responseText.length / 4);
    await logAIUsage({
      functionName: "suggest-meal-alternatives",
      model: "gemini-2.5-flash-lite",
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      userId,
      itemsGenerated: validAlternatives.length,
      metadata: { mealType, targetCalories },
    });

    return new Response(
      JSON.stringify({
        success: true,
        alternatives: validAlternatives,
        mealType,
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

/**
 * Builds prompt for generating meal alternatives
 */
function buildAlternativesPrompt(
  profile: UserProfile,
  mealType: string,
  targetCalories: number,
  count: number
): string {
  const intolerancesStr = buildIntolerancesString(profile);
  const excludedStr = buildExcludedIngredientsString(profile);
  const forbiddenList = buildForbiddenIngredientsListWithDiet(profile);
  const dietaryBlock = buildDietaryRestrictionBlock(profile);
  const countryConfig = getCountryConfig(profile.country);
  const mealLabel = countryConfig.mealTypeLabels[mealType] || MEAL_TYPE_LABELS[mealType] || mealType;
  
  const isKidsMode = profile.kids_mode === true;
  const kidsNote = isKidsMode ? " 🧒 Alimentos kid-friendly." : "";

  const excludedConstraint = excludedStr ? `\n❌ Excluídos: ${excludedStr}` : "";
  const forbiddenBlock = forbiddenList ? `\n🚫 Proibidos: ${forbiddenList}` : "";

  // Calorie range (±15%)
  const minCal = Math.round(targetCalories * 0.85);
  const maxCal = Math.round(targetCalories * 1.15);

  return `🥗 NUTRICIONISTA - Gerar ${count} OPÇÕES de ${mealLabel}
🌍 ${countryConfig.name} | 🎯 Meta: ${minCal}-${maxCal} kcal${kidsNote}

${dietaryBlock}

⛔ RESTRIÇÕES (NUNCA incluir):
${intolerancesStr}${excludedConstraint}${forbiddenBlock}

🔒 Dúvida sobre ingrediente → is_safe: false

📋 GERAR ${count} OPÇÕES DIFERENTES de ${mealLabel}:
• Cada opção deve ser uma refeição COMPLETA e DIFERENTE
• Variedade de sabores e preparações
• Todas respeitando as mesmas restrições
• Calorias entre ${minCal} e ${maxCal} kcal

📐 FORMATO DOS INGREDIENTES (OBRIGATÓRIO):
Cada item: {"item": "QUANTIDADE + ALIMENTO", "quantity": "NÚMERO", "unit": "g"}
- O campo "item" DEVE incluir medida caseira (1 fatia de pão, 2 colheres de arroz)
- NUNCA inclua números de gramas no campo "item"
- O campo "quantity" DEVE ser o valor numérico em gramas
- O campo "unit" DEVE ser sempre "g"

Exemplos CORRETOS:
• {"item": "2 colheres de sopa de arroz integral", "quantity": "100", "unit": "g"}
• {"item": "1 filé médio de frango grelhado", "quantity": "120", "unit": "g"}
• {"item": "1 banana média", "quantity": "90", "unit": "g"}
• {"item": "2 fatias de pão integral", "quantity": "50", "unit": "g"}

🔴 REGRA DE CONSISTÊNCIA NOME-INGREDIENTES:
O nome da refeição DEVE refletir EXATAMENTE os ingredientes listados.

🔧 JSON (responda APENAS isto):
{
  "alternatives": [
    {
      "recipe_name": "Nome descritivo da opção 1",
      "is_safe": true,
      "recipe_calories": ${targetCalories},
      "recipe_protein": 25,
      "recipe_carbs": 35,
      "recipe_fat": 12,
      "recipe_prep_time": 15,
      "recipe_ingredients": [
        {"item": "1 filé médio de frango grelhado", "quantity": "120", "unit": "g"},
        {"item": "2 colheres de sopa de arroz integral", "quantity": "100", "unit": "g"}
      ],
      "recipe_instructions": []
    },
    ... (mais ${count - 1} opções diferentes)
  ]
}

Responda APENAS JSON válido com ${count} opções.`;
}
