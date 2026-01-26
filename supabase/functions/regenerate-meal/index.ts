import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  buildRegenerateMealPrompt,
  validateRecipeAsync,
  type UserProfile,
} from "../_shared/recipeConfig.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import {
  searchRecipePool,
  saveRecipeToPool,
  markRecipeAsUsed,
} from "../_shared/recipePool.ts";

import {
  calculateNutritionalTargets,
  calculateMealDistribution,
  getMealTarget,
  buildNutritionalContextForPrompt,
  type UserPhysicalData,
} from "../_shared/nutritionalCalculations.ts";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REGENERATE-MEAL] ${step}${detailsStr}`);
};

// Helper function to call Gemini API with retry logic
async function callGeminiWithRetry(
  apiKey: string,
  body: any,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logStep(`API call attempt ${attempt}/${maxRetries}`);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    if (response.ok) {
      return response;
    }

    if (response.status === 429) {
      const errorText = await response.text();
      logStep(`Rate limit hit on attempt ${attempt}`, { status: 429 });
      
      let retryDelay = 30;
      const retryMatch = errorText.match(/retry in (\d+\.?\d*)/i);
      if (retryMatch) {
        retryDelay = Math.ceil(parseFloat(retryMatch[1]));
      }
      
      if (attempt < maxRetries) {
        logStep(`Waiting ${retryDelay} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay * 1000));
        continue;
      }
      
      lastError = new Error(`Rate limit exceeded after ${maxRetries} attempts`);
    } else {
      const errorText = await response.text();
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
    }
  }
  
  throw lastError || new Error("Unknown error during API call");
}

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
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const requestBody = await req.json();
    const { mealItemId, ingredients, mode } = requestBody;
    logStep("Request received", { mealItemId, ingredients, mode });

    if (!mealItemId) throw new Error("mealItemId is required");

    // Fetch the existing meal item
    const { data: mealItem, error: mealError } = await supabaseClient
      .from("meal_plan_items")
      .select("*, meal_plans!inner(user_id)")
      .eq("id", mealItemId)
      .single();

    if (mealError || !mealItem) throw new Error("Refeição não encontrada");
    if (mealItem.meal_plans.user_id !== user.id) throw new Error("Não autorizado");

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    logStep("Profile fetched", {
      intolerances: profile.intolerances,
      dietary: profile.dietary_preference,
      goal: profile.goal,
      country: profile.country || "BR"
    });

    // Build physical data for centralized calculations
    // Database stores: sex = "male" | "female", activity_level = "sedentary" | "light" | "moderate" | "active" | "very_active"
    const physicalData: UserPhysicalData = {
      sex: profile.sex || "male",
      age: profile.age || 30,
      height: profile.height || 170,
      weight_current: profile.weight_current || 70,
      weight_goal: profile.weight_goal,
      activity_level: profile.activity_level || "moderate",
    };

    // Get calorie modifier from strategy or fallback to goal-based
    let calorieModifier = 0;
    let proteinPerKg = 1.6;
    let carbRatio = 0.5;
    let fatRatio = 0.25;
    let strategyKey: string | undefined;

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
        fatRatio = strategy.fat_ratio || 0.25;
        logStep("Strategy loaded from database", { key: strategy.key, calorieModifier });
      }
    } else {
      // Fallback to goal-based modifiers
      // Database now stores: "lose_weight" | "maintain" | "gain_weight"
      switch (profile.goal) {
        case "lose_weight": calorieModifier = -500; break;
        case "gain_weight": calorieModifier = 400; break;
        default: calorieModifier = 0;
      }
    }

    // Calculate nutritional targets using centralized module
    const enabledMeals = profile.enabled_meals || ["breakfast", "lunch", "afternoon_snack", "dinner", "supper"];
    const nutritionalTargets = calculateNutritionalTargets(physicalData, {
      calorieModifier,
      proteinPerKg,
      carbRatio,
      fatRatio,
    });

    const mealType = mealItem.meal_type;
    let targetCalories: number;
    let mealTarget: any = null;

    if (nutritionalTargets) {
      mealTarget = getMealTarget(nutritionalTargets, mealType, enabledMeals);
      targetCalories = mealTarget?.calories || Math.round(nutritionalTargets.targetCalories * 0.2);
      
      logStep("Nutritional targets calculated (centralized)", {
        bmr: nutritionalTargets.bmr,
        tdee: nutritionalTargets.tdee,
        dailyCalories: nutritionalTargets.targetCalories,
        mealType,
        mealCalories: targetCalories,
        mealProtein: mealTarget?.protein,
      });
    } else {
      // Fallback to simple calculation
      const fallbackDailyCalories = 2000;
      const calorieDistribution: Record<string, number> = {
        breakfast: 0.20,
        lunch: 0.30,
        afternoon_snack: 0.10,
        dinner: 0.30,
        supper: 0.10,
      };
      targetCalories = Math.round(fallbackDailyCalories * (calorieDistribution[mealType] || 0.20));
      logStep("Using fallback calorie calculation", { mealType, targetCalories });
    }

    // Build nutritional context for AI prompt enrichment
    const nutritionalContext = nutritionalTargets 
      ? buildNutritionalContextForPrompt(nutritionalTargets, mealType, enabledMeals)
      : "";

    let recipeData: any = null;
    let recipeFromPool = false;

    // STEP 1: Se não for modo com ingredientes específicos, busca no pool primeiro
    if (mode !== "with_ingredients") {
      logStep("Searching recipe pool first");
      
      const poolRecipes = await searchRecipePool(supabaseClient, {
        mealType: mealType,
        countryCode: profile.country || "BR",
        dietaryPreference: profile.dietary_preference,
        intolerances: profile.intolerances || [],
        excludedIngredients: profile.excluded_ingredients || [],
        limit: 10 // Increased to have more options for validation
      });

      if (poolRecipes.length > 0) {
        // CRITICAL: Validate each recipe before using
        const shuffled = [...poolRecipes].sort(() => Math.random() - 0.5);
        
        for (const poolRecipe of shuffled) {
          // Validate recipe against user restrictions using globalSafetyEngine
          const validation = await validateRecipeAsync(
            {
              recipe_name: poolRecipe.name,
              recipe_ingredients: poolRecipe.ingredients || []
            },
            profile as UserProfile
          );
          
          if (validation.isValid) {
            logStep("✅ Found SAFE recipe in pool", { name: poolRecipe.name, id: poolRecipe.id });
            
            // Mark as used
            await markRecipeAsUsed(supabaseClient, poolRecipe.id);
            
            recipeData = {
              recipe_name: poolRecipe.name,
              recipe_calories: poolRecipe.calories,
              recipe_protein: poolRecipe.protein,
              recipe_carbs: poolRecipe.carbs,
              recipe_fat: poolRecipe.fat,
              recipe_prep_time: poolRecipe.prep_time,
              recipe_ingredients: poolRecipe.ingredients,
              recipe_instructions: []
            };
            recipeFromPool = true;
            break; // Found a valid recipe
          } else {
            logStep("⚠️ Pool recipe INCOMPATIBLE", { 
              name: poolRecipe.name, 
              reason: validation.reason 
            });
          }
        }
        
        if (!recipeData) {
          logStep("❌ All pool recipes incompatible - will generate via AI");
        }
      }
    }

    // STEP 2: Se não encontrou no pool ou é modo com ingredientes, gera via IA
    // With retry logic for safety validation
    const MAX_AI_RETRIES = 3;
    let aiAttempt = 0;
    
    while (!recipeData && aiAttempt < MAX_AI_RETRIES) {
      aiAttempt++;
      logStep(`Generating recipe via AI (attempt ${aiAttempt}/${MAX_AI_RETRIES})`);
      
      const GOOGLE_AI_API_KEY = await getGeminiApiKey();
      
      // Build prompt using centralized config with nutritional context
      const ingredientsToUse = mode === "with_ingredients" ? ingredients : undefined;
      const prompt = buildRegenerateMealPrompt(
        profile as UserProfile,
        mealType,
        targetCalories,
        ingredientsToUse,
        nutritionalContext,
        strategyKey // Passa a estratégia nutricional para aplicar persona culinária
      );

      logStep("Calling Google Gemini API with retry logic");

      // Call Google Gemini API with retry
      const response = await callGeminiWithRetry(GOOGLE_AI_API_KEY, {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4 + (aiAttempt * 0.1), // Increase temperature on retries for variation
          maxOutputTokens: 2048,
        }
      });

      const aiData = await response.json();
      logStep("AI response received");

      // Extract content from Google Gemini response format
      const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        logStep(`AI returned empty response on attempt ${aiAttempt}`);
        continue;
      }

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedRecipe = JSON.parse(jsonMatch[0]);
          
          // CRITICAL: Check if AI flagged the recipe as unsafe
          if (parsedRecipe.is_safe === false) {
            logStep(`⚠️ AI flagged recipe as UNSAFE on attempt ${aiAttempt}`, { 
              recipeName: parsedRecipe.recipe_name,
              reason: "AI indicated uncertainty about ingredients"
            });
            continue; // Try again
          }
          
          // CRITICAL: Validate recipe against user restrictions using globalSafetyEngine
          const validation = await validateRecipeAsync(
            {
              recipe_name: parsedRecipe.recipe_name || "",
              recipe_ingredients: parsedRecipe.recipe_ingredients || []
            },
            profile as UserProfile
          );
          
          if (!validation.isValid) {
            logStep(`🚫 AI recipe FAILED validation on attempt ${aiAttempt}`, { 
              recipeName: parsedRecipe.recipe_name,
              invalidIngredients: validation.invalidIngredients,
              reason: validation.reason
            });
            continue; // Try again
          }
          
          // Recipe passed all validations!
          recipeData = parsedRecipe;
          
          // ========== HYBRID MACRO CALCULATION: Use real data from foods table ==========
          if (recipeData.recipe_ingredients && Array.isArray(recipeData.recipe_ingredients)) {
            try {
              // Prepare ingredients for real macro calculation
              const foodsForCalculation = recipeData.recipe_ingredients.map((ing: any) => {
                const name = typeof ing === 'string' ? ing : (ing.item || ing.name || '');
                let grams = 100;
                
                if (typeof ing === 'object') {
                  if (ing.grams) grams = ing.grams;
                  else if (ing.quantity) {
                    const numMatch = String(ing.quantity).match(/(\d+)/);
                    grams = numMatch ? parseInt(numMatch[1]) : 100;
                  }
                }
                
                return {
                  name,
                  grams,
                  aiEstimate: {
                    calories: ing.calories || 0,
                    protein: ing.protein || 0,
                    carbs: ing.carbs || 0,
                    fat: ing.fat || 0,
                  }
                };
              });
              
              // Calculate real macros from database
              const macroResult = await calculateRealMacrosForFoods(supabaseClient, foodsForCalculation);
              const calculatedItems = macroResult.items;
              
              // Aggregate totals
              let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFat = 0;
              
              const enrichedIngredients = recipeData.recipe_ingredients.map((ing: any, idx: number) => {
                const calc = calculatedItems[idx];
                if (calc) {
                  totalCalories += calc.calories;
                  totalProtein += calc.protein;
                  totalCarbs += calc.carbs;
                  totalFat += calc.fat;
                  
                  return {
                    ...ing,
                    calculated_calories: Math.round(calc.calories),
                    calculated_protein: Math.round(calc.protein * 10) / 10,
                    calculated_carbs: Math.round(calc.carbs * 10) / 10,
                    calculated_fat: Math.round(calc.fat * 10) / 10,
                    macro_source: calc.source,
                    food_id: calc.food_id || null,
                  };
                }
                return ing;
              });
              
              // Update recipe with real macros
              recipeData.recipe_calories = Math.round(totalCalories);
              recipeData.recipe_protein = Math.round(totalProtein * 10) / 10;
              recipeData.recipe_carbs = Math.round(totalCarbs * 10) / 10;
              recipeData.recipe_fat = Math.round(totalFat * 10) / 10;
              recipeData.recipe_ingredients = enrichedIngredients;
              
              logStep("✅ Real macros calculated from database", {
                totalCalories: recipeData.recipe_calories,
                fromDatabase: macroResult.fromDb,
                fromAI: macroResult.fromAi,
                matchRate: `${macroResult.matchRate}%`
              });
            } catch (macroError) {
              logStep("⚠️ Error calculating real macros, using AI estimates", { error: String(macroError) });
            }
          }
          
          logStep(`✅ AI generated SAFE recipe on attempt ${aiAttempt}`, { 
            name: recipeData.recipe_name,
            calories: recipeData.recipe_calories
          });
          
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        logStep("Parse error", { error: String(parseError), attempt: aiAttempt });
        continue;
      }
    }
    
    // If we exhausted all retries
    if (!recipeData) {
      throw new Error("Não foi possível gerar uma receita segura após múltiplas tentativas. O sistema detectou que todas as opções continham ingredientes incompatíveis com suas restrições.");
    }

    // STEP 3: Salva a receita gerada no pool para reutilização futura (only if from AI and validated)
    if (!recipeFromPool && recipeData.recipe_name) {
      const saveResult = await saveRecipeToPool(supabaseClient, {
        name: recipeData.recipe_name,
        mealType: mealType,
        calories: Number(recipeData.recipe_calories) || targetCalories,
        protein: Number(recipeData.recipe_protein) || 0,
        carbs: Number(recipeData.recipe_carbs) || 0,
        fat: Number(recipeData.recipe_fat) || 0,
        prepTime: Number(recipeData.recipe_prep_time) || 30,
        ingredients: recipeData.recipe_ingredients || [],
        instructions: recipeData.recipe_instructions || [],
        description: recipeData.chef_tip || null,
        countryCode: profile.country || "BR",
        sourceModule: "regenerate_meal",
        compatibleMealTimes: [mealType]
      });

      logStep("VALIDATED recipe saved to pool", { success: saveResult.success, id: saveResult.id });
    }

    // Update the meal item
    const { data: updatedMeal, error: updateError } = await supabaseClient
      .from("meal_plan_items")
      .update({
        recipe_name: recipeData.recipe_name,
        recipe_calories: Math.round(Number(recipeData.recipe_calories) || targetCalories),
        recipe_protein: Number(recipeData.recipe_protein) || 0,
        recipe_carbs: Number(recipeData.recipe_carbs) || 0,
        recipe_fat: Number(recipeData.recipe_fat) || 0,
        recipe_prep_time: Math.round(Number(recipeData.recipe_prep_time) || 30),
        recipe_ingredients: recipeData.recipe_ingredients || [],
        recipe_instructions: recipeData.recipe_instructions || [],
      })
      .eq("id", mealItemId)
      .select()
      .single();

    if (updateError) throw new Error(`Error updating meal: ${updateError.message}`);
    logStep("Meal updated successfully", { mealId: mealItemId, source: recipeFromPool ? "pool" : "ai" });

    return new Response(JSON.stringify({
      success: true,
      meal: updatedMeal,
      source: recipeFromPool ? "pool" : "ai"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    if (errorMessage.includes("Rate limit exceeded")) {
      return new Response(JSON.stringify({ 
        error: "Limite de requisições atingido. Por favor, aguarde 1 minuto e tente novamente." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 429,
      });
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

