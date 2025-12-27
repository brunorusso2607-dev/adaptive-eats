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
        
        recipe = {
          name: poolRecipe.name,
          calories: poolRecipe.calories,
          protein: poolRecipe.protein,
          carbs: poolRecipe.carbs,
          fat: poolRecipe.fat,
          prep_time: poolRecipe.prep_time,
          ingredients: poolRecipe.ingredients,
          instructions: [],
          description: poolRecipe.description || "",
          servings: 2
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

      const systemPrompt = buildRecipeSystemPrompt(promptOptions);
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
