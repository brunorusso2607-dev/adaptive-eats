import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
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

// ARCHITECTURE: Import globalSafetyEngine for post-generation validation
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredientList,
  type UserRestrictions,
  type SafetyDatabase,
} from "../_shared/globalSafetyEngine.ts";

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
    // Database now stores: "lose_weight" | "maintain" | "gain_weight"
    const isWeightLossMode = profile.goal === "lose_weight";
    const isWeightGainMode = profile.goal === "gain_weight";

    // Calculate nutritional targets using centralized calculations
    // Database stores: sex = "male" | "female", activity_level = "sedentary" | "light" | "moderate" | "active" | "very_active"
    const physicalData: UserPhysicalData = {
      sex: profile.sex || "male",
      age: profile.age || 30,
      height: profile.height || 170,
      weight_current: profile.weight_current || 70,
      activity_level: profile.activity_level || "moderate",
    };

    // Get calorie modifier from strategy or fallback to goal-based
    let calorieModifier = 0;
    let proteinPerKg = 1.6;
    let carbRatio = 0.45;
    let fatRatio = 0.30;
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
        carbRatio = strategy.carb_ratio || 0.45;
        fatRatio = strategy.fat_ratio || 0.30;
        logStep("Strategy loaded from database", { key: strategy.key, calorieModifier });
      }
    } else {
      // Fallback to goal-based modifiers
      // Database now stores: "lose_weight" | "maintain" | "gain_weight"
      switch (profile.goal) {
        case "lose_weight": calorieModifier = -500; break;
        case "gain_weight": calorieModifier = 300; break;
        default: calorieModifier = 0;
      }
    }

    const nutritionalTargets = calculateNutritionalTargets(physicalData, {
      calorieModifier,
      proteinPerKg,
      carbRatio,
      fatRatio,
    });

    const nutritionalContext = nutritionalTargets
      ? buildNutritionalContextForPrompt(nutritionalTargets)
      : null;

    logStep("Nutritional targets calculated", {
      tdee: nutritionalTargets?.tdee,
      targetCalories: nutritionalTargets?.targetCalories,
      hasContext: !!nutritionalContext,
      strategyKey: strategyKey || 'fallback',
    });

    let recipe: any = null;
    let recipeFromPool = false;

    // STEP 1: Se NÃO tem ingredientes específicos, busca no pool primeiro
    if (!ingredients || ingredients.trim() === "") {
      logStep("No specific ingredients, searching recipe pool first");
      
      // Mapeia tipo de receita para meal_type aproximado
      const typeToMealType: Record<string, string> = {
        "rapida": "afternoon_snack",
        "equilibrada": "lunch",
        "elaborada": "dinner",
        "sobremesa": "afternoon_snack",
        "bebida": "breakfast"
      };
      
      const searchMealType = typeToMealType[type] || "lunch";
      
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

      // Country-specific language and cultural context
      const COUNTRY_RECIPE_CONFIG: Record<string, { lang: string; culture: string; examples: string }> = {
        'BR': { lang: 'português brasileiro', culture: 'culinária brasileira', examples: 'Feijoada, Pão de Queijo, Moqueca' },
        'PT': { lang: 'português europeu', culture: 'culinária portuguesa', examples: 'Bacalhau à Brás, Caldo Verde, Francesinha' },
        'US': { lang: 'American English', culture: 'American cuisine', examples: 'Burgers, Mac and Cheese, BBQ Ribs' },
        'GB': { lang: 'British English', culture: 'British cuisine', examples: 'Fish and Chips, Shepherd\'s Pie, Sunday Roast' },
        'MX': { lang: 'español mexicano', culture: 'cocina mexicana', examples: 'Tacos, Enchiladas, Pozole' },
        'ES': { lang: 'español', culture: 'cocina española', examples: 'Paella, Tortilla Española, Gazpacho' },
        'FR': { lang: 'français', culture: 'cuisine française', examples: 'Coq au Vin, Ratatouille, Quiche Lorraine' },
        'DE': { lang: 'Deutsch', culture: 'deutsche Küche', examples: 'Schnitzel, Bratwurst, Spätzle' },
        'IT': { lang: 'italiano', culture: 'cucina italiana', examples: 'Pasta Carbonara, Risotto, Lasagna' },
        'AR': { lang: 'español argentino', culture: 'cocina argentina', examples: 'Asado, Empanadas, Milanesa' },
        'CO': { lang: 'español colombiano', culture: 'cocina colombiana', examples: 'Bandeja Paisa, Arepas, Sancocho' },
      };
      
      const recipeConfig = COUNTRY_RECIPE_CONFIG[userCountry] || COUNTRY_RECIPE_CONFIG['BR'];

      const baseSystemPrompt = buildRecipeSystemPrompt(promptOptions);
      
      // Build enriched prompt with nutritional context AND cultural localization
      let systemPrompt = `${globalNutritionPrompt}\n\nUSE ${nutritionalSource.sourceName} AS PRIMARY NUTRITIONAL SOURCE.

=== CULTURAL LOCALIZATION ===
- Output language: ${recipeConfig.lang}
- Culinary culture: ${recipeConfig.culture}
- Typical dishes from this region: ${recipeConfig.examples}
- PRIORITIZE local ingredients and cooking techniques
- All recipe names, ingredients, and instructions MUST be in ${recipeConfig.lang}

${baseSystemPrompt}`;
      
      if (nutritionalContext) {
        systemPrompt += `\n\n${nutritionalContext}\n\n⚠️ IMPORTANT: The generated recipe must be ALIGNED with the user's nutritional goals listed above.`;
      }
      
      const userPrompt = buildRecipeUserPrompt(promptOptions);

      logStep("Prompts built", { 
        systemPromptLength: systemPrompt.length,
        userPromptLength: userPrompt.length,
        category: categoryContext?.category,
        subcategory: categoryContext?.subcategory,
        country: userCountry,
        language: recipeConfig.lang
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

      // ========== POST-AI SAFETY VALIDATION USING GLOBAL SAFETY ENGINE ==========
      // This ensures consistent validation with all other modules
      // CRITICAL: Recipes with safety conflicts are BLOCKED to protect users with intolerances
      try {
        const safetyDatabase: SafetyDatabase = await loadSafetyDatabase();
        const normalizedIntolerances = normalizeUserIntolerances(profile.intolerances || [], safetyDatabase);
        
        const userRestrictions: UserRestrictions = {
          intolerances: normalizedIntolerances,
          dietaryPreference: profile.dietary_preference || null,
          excludedIngredients: profile.excluded_ingredients || [],
        };

        // Extract ingredient names for validation
        const ingredientNames = recipe.ingredients.map((ing: any) => 
          typeof ing === 'string' ? ing : (ing.item || ing.name || '')
        ).filter((name: string) => name.length > 0);

        const validationResult = validateIngredientList(ingredientNames, userRestrictions, safetyDatabase);
        
        logStep("Post-AI safety validation", {
          isSafe: validationResult.isSafe,
          conflicts: validationResult.conflicts.length,
          warnings: validationResult.warnings.length
        });

        // Add safety metadata to recipe
        recipe.safety_validated = true;
        recipe.safety_is_safe = validationResult.isSafe;
        recipe.safety_conflicts = validationResult.conflicts.map(c => ({
          ingredient: c.originalIngredient,
          matchedTerm: c.matchedIngredient,
          restriction: c.key,
          label: c.label,
          type: c.type
        }));
        recipe.safety_warnings = validationResult.warnings.map(w => ({
          ingredient: w.originalIngredient,
          matchedTerm: w.matchedIngredient,
          restriction: w.key,
          label: w.label,
          type: w.type
        }));

        // CRITICAL: BLOCK recipes with safety conflicts - do not allow unsafe recipes
        if (!validationResult.isSafe && validationResult.conflicts.length > 0) {
          const conflictDetails = validationResult.conflicts.map(c => 
            `"${c.originalIngredient}" conflita com ${c.label}`
          ).join(', ');
          
          logStep("🚫 BLOCKED: Recipe has safety conflicts", {
            recipeName: recipe.name,
            conflicts: validationResult.conflicts
          });
          
          return new Response(JSON.stringify({ 
            error: `Receita bloqueada por segurança alimentar: ${conflictDetails}. Gerando nova receita...`,
            safety_blocked: true,
            conflicts: validationResult.conflicts,
            should_retry: true
          }), {
            status: 422, // Unprocessable Entity - recipe violates user restrictions
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (safetyError) {
        logStep("⚠️ Error in safety validation, proceeding without validation", { error: String(safetyError) });
        recipe.safety_validated = false;
      }

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
          
          let canonicalMatches = 0;
          const enrichedIngredients = recipe.ingredients.map((ing: any, idx: number) => {
            const calc = calculatedItems[idx];
            if (calc) {
              totalCalories += calc.calories;
              totalProtein += calc.protein;
              totalCarbs += calc.carbs;
              totalFat += calc.fat;
              
              // Track canonical matches for logging
              if (calc.source === 'canonical') {
                canonicalMatches++;
              }
              
              return {
                ...ing,
                calculated_calories: Math.round(calc.calories),
                calculated_protein: Math.round(calc.protein * 10) / 10,
                calculated_carbs: Math.round(calc.carbs * 10) / 10,
                calculated_fat: Math.round(calc.fat * 10) / 10,
                macro_source: calc.source,
                food_id: calc.food_id || null,
                canonical_id: calc.canonical_id || null,
                intolerance_flags: calc.intolerance_flags || null,
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
            fromCanonical: canonicalMatches,
            matchRate: `${macroResult.matchRate}%`
          });
        } catch (macroError) {
          logStep("⚠️ Error calculating real macros, using AI estimates", { error: String(macroError) });
        }
      }

      // STEP 3: Salva a receita gerada no pool para reutilização futura
      const mealTypeForSave = categoryContext?.category === "sobremesa" ? "afternoon_snack" : 
                             categoryContext?.category === "bebida" ? "breakfast" : 
                             type === "rapida" ? "afternoon_snack" : "lunch";
      
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

