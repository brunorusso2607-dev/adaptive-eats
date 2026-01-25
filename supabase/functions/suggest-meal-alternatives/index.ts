import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  getRegionalConfig,
  validateFood,
  fetchIntoleranceMappings,
  getRestrictionText,
  getMealPromptRules,
  shouldAddSugarQualifier,
} from "../_shared/mealGenerationConfig.ts";
import { logAIUsage } from "../_shared/logAIUsage.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import {
  calculateNutritionalTargets,
  getMealTarget,
  getMealMacroTargets,
  buildMealMacroTargetsForPrompt,
} from "../_shared/nutritionalCalculations.ts";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";
import { getNutritionalTablePrompt } from "../_shared/nutritionalTableInjection.ts";

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
      strategy_id: profile.strategy_id,
    });

    // Fetch intolerance mappings from database (CRITICAL FIX)
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    logStep("Intolerance mappings fetched", { 
      mappingsCount: dbMappings.length, 
      safeKeywordsCount: dbSafeKeywords.length 
    });

    // Get strategy from database if available
    let strategyKey: string | undefined;
    let calorieModifier = 0;
    let proteinPerKg = 1.6;
    let carbRatio = 0.5;
    let fatRatio = 0.3;

    if (profile.strategy_id) {
      const { data: strategy } = await supabaseClient
        .from("nutritional_strategies")
        .select("*")
        .eq("id", profile.strategy_id)
        .single();

      if (strategy) {
        strategyKey = strategy.key;
        calorieModifier = strategy.calorie_modifier || 0;
        proteinPerKg = strategy.protein_per_kg || 1.6;
        carbRatio = strategy.carb_ratio || 0.5;
        fatRatio = strategy.fat_ratio || 0.3;
        logStep("Strategy loaded", { key: strategy.key, calorieModifier });
      }
    }

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

    const targets = calculateNutritionalTargets(physicalData, {
      calorieModifier,
      proteinPerKg,
      carbRatio,
      fatRatio,
    });

    if (targets) {
      const mealTarget = getMealTarget(targets, mealType, profile.enabled_meals || undefined);
      if (mealTarget) {
        targetCalories = Math.round(mealTarget.calories);
      }
    }

    logStep("Target calculated", { targetCalories, mealType });

    // Get regional config
    const regional = getRegionalConfig(profile.country || 'BR');
    const mealLabel = regional.mealLabels[mealType] || mealType;

    // Build restriction text using unified function
    const addSugarQualifier = shouldAddSugarQualifier(
      profile.intolerances || [],
      strategyKey,
      profile.dietary_preference
    );

    const restrictionText = getRestrictionText(
      {
        intolerances: profile.intolerances || [],
        dietaryPreference: profile.dietary_preference || 'comum',
        excludedIngredients: profile.excluded_ingredients || [],
        goal: profile.goal || 'manter',
      },
      regional.language,
      addSugarQualifier
    );

    // Get format rules from shared config
    const formatRules = getMealPromptRules(regional.language);

    // ============= INJEÇÃO DE TABELA NUTRICIONAL (CASCATA CAMADA 1) =============
    const nutritionalTablePrompt = await getNutritionalTablePrompt(supabaseClient, profile.country || 'BR');
    logStep("Nutritional table loaded for prompt injection");

    // Build macro targets from Motor de Decisão Nutricional
    const macroTargetsPrompt = buildMealMacroTargetsForPrompt(
      profile.goal || 'maintain',
      profile.sex || 'male',
      profile.activity_level || 'moderate',
      [mealType]
    );

    // Build prompt for alternatives
    const basePrompt = buildAlternativesPrompt(
      mealLabel,
      targetCalories,
      5,
      restrictionText,
      formatRules,
      profile.kids_mode === true,
      regional.language,
      macroTargetsPrompt
    );
    
    // Inject nutritional table BEFORE the alternatives prompt
    const prompt = `${nutritionalTablePrompt}\n\n${basePrompt}`;

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

    // CRITICAL: Validate alternatives using validateFood()
    const rawAlternatives = alternatives.alternatives || alternatives || [];
    const validAlternatives: typeof rawAlternatives = [];
    
    for (const alt of rawAlternatives) {
      // First check AI's is_safe flag
      if (alt.is_safe === false) {
        logStep("Alternative flagged unsafe by AI", { name: alt.recipe_name });
        continue;
      }
      
      // Then validate each ingredient
      let allIngredientsValid = true;
      const ingredients = alt.recipe_ingredients || [];
      
      for (const ing of ingredients) {
        const ingName = typeof ing === 'string' ? ing : (ing.item || ing.name || '');
        const validation = validateFood(
          ingName,
          {
            intolerances: profile.intolerances || [],
            dietaryPreference: profile.dietary_preference || 'comum',
            excludedIngredients: profile.excluded_ingredients || [],
          },
          dbMappings,
          dbSafeKeywords
        );
        
        if (!validation.isValid) {
          logStep("Alternative ingredient invalid", { 
            name: alt.recipe_name, 
            ingredient: ingName,
            reason: validation.reason 
          });
          allIngredientsValid = false;
          break;
        }
      }
      
      if (allIngredientsValid) {
        validAlternatives.push(alt);
      }
    }

    logStep("Alternatives validated", { 
      raw: rawAlternatives.length, 
      valid: validAlternatives.length 
    });

    if (validAlternatives.length === 0) {
      throw new Error("No valid alternatives generated");
    }

    // CRITICAL FIX: Calibrate macros using calculateRealMacros for database consistency
    const calibratedAlternatives = [];
    for (const alt of validAlternatives) {
      try {
        // Convert ingredients to FoodItem format for calculateRealMacrosForFoods
        const ingredients = alt.recipe_ingredients || [];
        const foodItems = ingredients.map((ing: { item?: string; name?: string; quantity?: string | number }) => {
          const ingName = typeof ing === 'string' ? ing : (ing.item || ing.name || '');
          const grams = typeof ing === 'string' ? 100 : (parseFloat(String(ing.quantity)) || 100);
          return {
            name: ingName,
            grams,
            // Preserve AI estimates as fallback
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          };
        });

        if (foodItems.length > 0) {
          const { items: calculatedItems } = await calculateRealMacrosForFoods(
            supabaseClient,
            foodItems,
            profile.country || 'BR'
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
            // Keep AI estimates if no database data
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

    logStep("Calibration complete", { 
      total: calibratedAlternatives.length 
    });

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
        alternatives: calibratedAlternatives.slice(0, 5),
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
 * Builds prompt for generating meal alternatives using shared format rules
 * Now includes Motor de Decisão Nutricional targets
 */
function buildAlternativesPrompt(
  mealLabel: string,
  targetCalories: number,
  count: number,
  restrictionText: string,
  formatRules: string,
  isKidsMode: boolean,
  language: string,
  macroTargetsPrompt?: string // Novo: contexto do Motor de Decisão
): string {
  const isPortuguese = language.startsWith('pt');
  const isSpanish = language.startsWith('es');
  
  const kidsNote = isKidsMode 
    ? (isPortuguese ? " 🧒 Alimentos kid-friendly." : isSpanish ? " 🧒 Alimentos para niños." : " 🧒 Kid-friendly foods.")
    : "";

  // Calorie range (±15%)
  const minCal = Math.round(targetCalories * 0.85);
  const maxCal = Math.round(targetCalories * 1.15);

  // Incluir targets de macros se disponíveis
  const macroContext = macroTargetsPrompt || '';

  if (isPortuguese) {
    return `🥗 NUTRICIONISTA - Gerar ${count} OPÇÕES de ${mealLabel}
🎯 Meta: ${minCal}-${maxCal} kcal${kidsNote}

⛔ RESTRIÇÕES ALIMENTARES (NUNCA incluir):
${restrictionText}

🔒 Dúvida sobre ingrediente → is_safe: false
${macroContext}

📋 GERAR ${count} OPÇÕES DIFERENTES de ${mealLabel}:
• Cada opção deve ser uma refeição COMPLETA e DIFERENTE
• Variedade de sabores e preparações
• Todas respeitando as mesmas restrições
• Calorias entre ${minCal} e ${maxCal} kcal

${formatRules}

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

  if (isSpanish) {
    return `🥗 NUTRICIONISTA - Generar ${count} OPCIONES de ${mealLabel}
🎯 Meta: ${minCal}-${maxCal} kcal${kidsNote}

⛔ RESTRICCIONES ALIMENTARIAS (NUNCA incluir):
${restrictionText}

🔒 Duda sobre ingrediente → is_safe: false
${macroContext}

📋 GENERAR ${count} OPCIONES DIFERENTES de ${mealLabel}

${formatRules}

Responda SOLO JSON válido con ${count} opciones.`;
  }

  // English default
  return `🥗 NUTRITIONIST - Generate ${count} OPTIONS for ${mealLabel}
🎯 Target: ${minCal}-${maxCal} kcal${kidsNote}

⛔ DIETARY RESTRICTIONS (NEVER include):
${restrictionText}

🔒 Doubt about ingredient → is_safe: false
${macroContext}

📋 GENERATE ${count} DIFFERENT OPTIONS for ${mealLabel}

${formatRules}

Reply with ONLY valid JSON with ${count} options.`;
}

