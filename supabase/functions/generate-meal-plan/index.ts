import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildMealPlanPrompt,
  calculateMacroTargets,
  MEAL_TYPE_LABELS,
  type UserProfile,
} from "../_shared/recipeConfig.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MEAL-PLAN] ${step}${detailsStr}`);
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

    const requestBody = await req.json();
    const daysCount = Math.min(requestBody.daysCount || 7, 7);
    const { planName, startDate, existingPlanId, weekNumber } = requestBody;
    logStep("Request received", { planName, startDate, daysCount, existingPlanId, weekNumber });

    // Fetch previous week's recipes to avoid repetition
    let previousRecipes: string[] = [];
    const targetWeekNumber = weekNumber || 1;
    
    if (existingPlanId && targetWeekNumber > 1) {
      const { data: prevItems } = await supabaseClient
        .from("meal_plan_items")
        .select("recipe_name")
        .eq("meal_plan_id", existingPlanId)
        .eq("week_number", targetWeekNumber - 1);
      
      if (prevItems && prevItems.length > 0) {
        previousRecipes = [...new Set(prevItems.map(item => item.recipe_name))];
        logStep("Previous week recipes fetched", { count: previousRecipes.length });
      }
    } else {
      const { data: recentPlan } = await supabaseClient
        .from("meal_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (recentPlan) {
        const { data: maxWeekData } = await supabaseClient
          .from("meal_plan_items")
          .select("week_number")
          .eq("meal_plan_id", recentPlan.id)
          .order("week_number", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (maxWeekData) {
          const { data: lastWeekItems } = await supabaseClient
            .from("meal_plan_items")
            .select("recipe_name")
            .eq("meal_plan_id", recentPlan.id)
            .eq("week_number", maxWeekData.week_number);
          
          if (lastWeekItems && lastWeekItems.length > 0) {
            previousRecipes = [...new Set(lastWeekItems.map(item => item.recipe_name))];
            logStep("Last plan recipes fetched", { count: previousRecipes.length });
          }
        }
      }
    }

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
      complexity: profile.recipe_complexity,
      context: profile.context
    });

    // Calculate personalized macros using centralized function
    const macros = calculateMacroTargets(profile as UserProfile);
    logStep("Macros calculated", macros);

    // Build prompt using centralized config
    const prompt = buildMealPlanPrompt(
      profile as UserProfile,
      daysCount,
      macros,
      previousRecipes
    );

    logStep("Calling Google Gemini 2.5 Flash-Lite");

    // Call Google Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 32000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Gemini API error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns minutos e tente novamente." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    logStep("Gemini response received");

    // Extract text from Gemini response
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      logStep("No text in response", { aiData: JSON.stringify(aiData).slice(0, 500) });
      throw new Error("A IA não retornou uma resposta válida. Tente novamente.");
    }

    // Clean and parse the JSON response
    let cleanedJson = textContent.trim();
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.slice(7);
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.slice(3);
    }
    if (cleanedJson.endsWith("```")) {
      cleanedJson = cleanedJson.slice(0, -3);
    }
    cleanedJson = cleanedJson.trim();

    let mealPlanData;
    try {
      mealPlanData = JSON.parse(cleanedJson);
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), text: cleanedJson.slice(0, 500) });
      throw new Error("Não foi possível processar o plano alimentar. Tente novamente.");
    }

    if (!mealPlanData || !mealPlanData.days || !Array.isArray(mealPlanData.days)) {
      const dataPreview = mealPlanData ? JSON.stringify(mealPlanData).slice(0, 200) : "undefined";
      logStep("Invalid meal plan data structure", { dataPreview });
      throw new Error("A IA não retornou um plano alimentar válido. Por favor, tente novamente.");
    }

    logStep("Meal plan parsed", { daysCount: mealPlanData.days?.length });

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date();
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + daysCount - 1);

    let mealPlanIdToUse = existingPlanId;
    let mealPlan;

    // Use existing plan or create a new one
    if (existingPlanId) {
      const { data: existingPlan, error: fetchError } = await supabaseClient
        .from("meal_plans")
        .select("*")
        .eq("id", existingPlanId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !existingPlan) {
        throw new Error("Plano alimentar não encontrado");
      }

      const newEndDate = endDate.toISOString().split('T')[0];
      if (newEndDate > existingPlan.end_date) {
        await supabaseClient
          .from("meal_plans")
          .update({ end_date: newEndDate, updated_at: new Date().toISOString() })
          .eq("id", existingPlanId);
      }

      mealPlan = existingPlan;
      mealPlanIdToUse = existingPlan.id;
      logStep("Using existing meal plan", { planId: mealPlanIdToUse });
    } else {
      const { data: newPlan, error: planError } = await supabaseClient
        .from("meal_plans")
        .insert({
          user_id: user.id,
          name: planName || `Plano ${start.toLocaleDateString('pt-BR')}`,
          start_date: start.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_active: true
        })
        .select()
        .single();

      if (planError) throw new Error(`Error creating meal plan: ${planError.message}`);
      
      mealPlan = newPlan;
      mealPlanIdToUse = newPlan.id;
      logStep("Meal plan created", { planId: mealPlanIdToUse });

      await supabaseClient
        .from("meal_plans")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .neq("id", mealPlanIdToUse);
    }

    // Insert meal plan items
    const items = mealPlanData.days.flatMap((day: any) =>
      day.meals.map((meal: any) => ({
        meal_plan_id: mealPlanIdToUse,
        day_of_week: Math.round(Number(day.day_index) || 0),
        meal_type: meal.meal_type,
        recipe_name: meal.recipe_name,
        recipe_calories: Math.round(Number(meal.recipe_calories) || 0),
        recipe_protein: Number(meal.recipe_protein) || 0,
        recipe_carbs: Number(meal.recipe_carbs) || 0,
        recipe_fat: Number(meal.recipe_fat) || 0,
        recipe_prep_time: Math.round(Number(meal.recipe_prep_time) || 30),
        recipe_ingredients: meal.recipe_ingredients || [],
        recipe_instructions: meal.recipe_instructions || [],
        week_number: weekNumber || 1
      }))
    );

    const { error: itemsError } = await supabaseClient
      .from("meal_plan_items")
      .insert(items);

    if (itemsError) throw new Error(`Error creating meal plan items: ${itemsError.message}`);
    logStep("Meal plan items created", { count: items.length });

    return new Response(JSON.stringify({
      success: true,
      mealPlan: {
        id: mealPlanIdToUse,
        ...mealPlan,
        items: items
      }
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
