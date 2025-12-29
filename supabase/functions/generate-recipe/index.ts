import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildRecipeSystemPrompt,
  buildRecipeUserPrompt,
  type UserProfile,
  type CategoryContext,
} from "../_shared/recipeConfig.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import {
  searchRecipePool,
  saveRecipeToPool,
  markRecipeAsUsed,
} from "../_shared/recipePool.ts";

import {
  getGlobalNutritionPrompt,
  getNutritionalSource
} from "../_shared/nutritionPrompt.ts";
import {
  calculateNutritionalTargets,
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
  console.log(`[GENERATE-RECIPE] ${step}${detailsStr}`);
};

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

    const GOOGLE_AI_API_KEY = await getGeminiApiKey();
    logStep("Gemini API key fetched from database");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { ingredients, type, categoryContext } = await req.json();
    logStep("Request received", { type, ingredients, categoryContext });

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
      context: profile.context,
      country: profile.country || "BR"
    });

    const isKidsMode = profile.context === "modo_kids";
    const isWeightLossMode = profile.goal === "emagrecer";
    const isWeightGainMode = profile.goal === "ganhar_peso";

    // Calculate nutritional targets using centralized calculations
    const physicalData: UserPhysicalData = {
      sex: profile.sex || "masculino",
      age: profile.age || 30,
      height: profile.height || 170,
      weight_current: profile.weight_current || 70,
      activity_level: profile.activity_level || "moderate",
    };

    const getCalorieModifier = (goal: string | null): number => {
      switch (goal) {
        case "emagrecer": return -500;
        case "ganhar_peso": return 300;
        default: return 0;
      }
    };

    const nutritionalTargets = calculateNutritionalTargets(physicalData, {
      calorieModifier: getCalorieModifier(profile.goal),
      proteinPerKg: 1.6,
      carbRatio: 0.45,
      fatRatio: 0.30,
    });

    const nutritionalContext = nutritionalTargets
      ? buildNutritionalContextForPrompt(nutritionalTargets)
      : null;

    logStep("Nutritional targets calculated", {
      tdee: nutritionalTargets?.tdee,
      targetCalories: nutritionalTargets?.targetCalories,
      hasContext: !!nutritionalContext,
    });

    let recipe: any = null;
    let recipeFromPool = false;

    // STEP 1: Se NÃO tem ingredientes específicos, busca no pool primeiro
    if (!ingredients || ingredients.trim() === "") {
      logStep("No specific ingredients, searching recipe pool first");
      
      // Mapeia tipo de receita para meal_type aproximado
      const typeToMealType: Record<string, string> = {
        "rapida": "lanche",
        "equilibrada": "almoco",
        "elaborada": "jantar",
        "sobremesa": "lanche",
        "bebida": "cafe_manha"
      };
      
      const searchMealType = typeToMealType[type] || "almoco";
      
      const poolRecipes = await searchRecipePool(supabaseClient, {
        mealType: searchMealType,
        countryCode: profile.country || "BR",
        dietaryPreference: profile.dietary_preference,
        intolerances: profile.intolerances || [],
        excludedIngredients: profile.excluded_ingredients || [],
        category: categoryContext?.category,
        limit: 5
      });

      if (poolRecipes.length > 0) {
        // Seleciona uma receita aleatória do pool (para variedade)
        const randomIndex = Math.floor(Math.random() * poolRecipes.length);
        const poolRecipe = poolRecipes[randomIndex];
        
        logStep("Found recipe in pool", { name: poolRecipe.name, id: poolRecipe.id });
        
        // Marca a receita como usada
        await markRecipeAsUsed(supabaseClient, poolRecipe.id);
        
        // Transforma ingredientes do pool para o formato esperado
        const formattedIngredients = Array.isArray(poolRecipe.ingredients) 
          ? poolRecipe.ingredients.map((ing: any) => {
              if (typeof ing === 'string') {
                return { item: ing, quantity: "", unit: "" };
              }
              return ing;
            })
          : [];
        
        recipe = {
          name: poolRecipe.name,
          calories: poolRecipe.calories || 0,
          protein: poolRecipe.protein || 0,
          carbs: poolRecipe.carbs || 0,
          fat: poolRecipe.fat || 0,
          prep_time: poolRecipe.prep_time || 30,
          ingredients: formattedIngredients,
          instructions: [],
          description: poolRecipe.description || "",
          servings: 2,
          complexity: "equilibrada"
        };
        recipeFromPool = true;
      }
    }

    // STEP 2: Se não encontrou no pool ou tem ingredientes específicos, gera via IA
    if (!recipe) {
      logStep("Generating recipe via AI");
      
      const GOOGLE_AI_API_KEY = await getGeminiApiKey();
      logStep("Gemini API key fetched from database");

      // Build prompts using centralized config
      const promptOptions = {
        profile: profile as UserProfile,
        categoryContext: categoryContext as CategoryContext | null,
        ingredients,
        type,
      };

      // Get global nutrition prompt for user's country
      const userCountry = profile.country || "BR";
      const globalNutritionPrompt = getGlobalNutritionPrompt(userCountry);
      const nutritionalSource = getNutritionalSource(userCountry);

      const baseSystemPrompt = buildRecipeSystemPrompt(promptOptions);
      
      // Build enriched prompt with nutritional context
      let systemPrompt = `${globalNutritionPrompt}\n\nUSE ${nutritionalSource.sourceName} AS PRIMARY NUTRITIONAL SOURCE.\n\n${baseSystemPrompt}`;
      
      if (nutritionalContext) {
        systemPrompt += `\n\n${nutritionalContext}\n\n⚠️ IMPORTANTE: A receita gerada deve estar ALINHADA com as metas nutricionais do usuário listadas acima.`;
      }
      
      const userPrompt = buildRecipeUserPrompt(promptOptions);

      logStep("Prompts built", { 
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        category: categoryContext?.category,
        subcategory: categoryContext?.subcategory
      });

      logStep("Calling Google Gemini API");

      // Call Google Gemini API - using gemini-2.5-flash-lite with lower temperature for precision
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt}\n\n${userPrompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2048,
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logStep("Google Gemini error", { status: response.status, error: errorText });
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns minutos e tente novamente." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
      }

      const aiData = await response.json();
      logStep("AI response received");

      // Extract recipe from Google Gemini response format
      const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error("Invalid AI response format");
      }

      // Parse JSON from response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recipe = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        logStep("Parse error", { error: String(parseError), content: content.slice(0, 200) });
        throw new Error("Não foi possível processar a receita. Tente novamente.");
      }

      // Transform instructions if they come in the new structured format
      let instructions = recipe.instructions;
      if (instructions && typeof instructions === 'object' && !Array.isArray(instructions)) {
        // Convert structured instructions to flat array for database compatibility
        const flatInstructions: string[] = [];
        if (instructions.inicio) flatInstructions.push(...instructions.inicio);
        if (instructions.meio) flatInstructions.push(...instructions.meio);
        if (instructions.finalizacao) flatInstructions.push(...instructions.finalizacao);
        instructions = flatInstructions;
      }
      recipe.instructions = instructions;

      logStep("Recipe parsed from AI", { 
        name: recipe.name, 
        calories: recipe.calories,
        category: categoryContext?.category,
        subcategory: categoryContext?.subcategory,
        hasChefTip: !!recipe.chef_tip,
        hasSafetyStatus: !!recipe.safety_status
      });

      // ========== HYBRID MACRO CALCULATION: Use real data from foods table ==========
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        try {
          // Prepare ingredients for real macro calculation
          const foodsForCalculation = recipe.ingredients.map((ing: any) => {
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
          
          const enrichedIngredients = recipe.ingredients.map((ing: any, idx: number) => {
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
          recipe.calories = Math.round(totalCalories);
          recipe.protein = Math.round(totalProtein * 10) / 10;
          recipe.carbs = Math.round(totalCarbs * 10) / 10;
          recipe.fat = Math.round(totalFat * 10) / 10;
          recipe.ingredients = enrichedIngredients;
          
          logStep("✅ Real macros calculated from database", {
            totalCalories: recipe.calories,
            fromDatabase: macroResult.fromDb,
            fromAI: macroResult.fromAi,
            matchRate: `${macroResult.matchRate}%`
          });
        } catch (macroError) {
          logStep("⚠️ Error calculating real macros, using AI estimates", { error: String(macroError) });
        }
      }

      // STEP 3: Salva a receita gerada no pool para reutilização futura
      const mealTypeForSave = categoryContext?.category === "sobremesa" ? "lanche" : 
                             categoryContext?.category === "bebida" ? "cafe_manha" : 
                             type === "rapida" ? "lanche" : "almoco";
      
      const saveResult = await saveRecipeToPool(supabaseClient, {
        name: recipe.name,
        mealType: mealTypeForSave,
        calories: Number(recipe.calories) || 0,
        protein: Number(recipe.protein) || 0,
        carbs: Number(recipe.carbs) || 0,
        fat: Number(recipe.fat) || 0,
        prepTime: Number(recipe.prep_time) || 30,
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
        description: recipe.description || recipe.chef_tip || null,
        countryCode: profile.country || "BR",
        sourceModule: "surpreenda_me",
        compatibleMealTimes: [mealTypeForSave]
      });

      logStep("Recipe saved to pool", { success: saveResult.success, id: saveResult.id });
    }

    return new Response(JSON.stringify({
      success: true,
      recipe: {
        ...recipe,
        input_ingredients: ingredients || null,
        is_kids_mode: isKidsMode,
        is_weight_loss_mode: isWeightLossMode,
        is_weight_gain_mode: isWeightGainMode,
        requested_category: categoryContext?.category || null,
        requested_subcategory: categoryContext?.subcategory || null,
      },
      source: recipeFromPool ? "pool" : "ai"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
