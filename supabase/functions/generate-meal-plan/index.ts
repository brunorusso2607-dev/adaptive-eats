import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildSingleDayPrompt,
  buildRegenerateMealPrompt,
  calculateMacroTargets,
  MEAL_TYPE_LABELS,
  validateMealPlan,
  type UserProfile,
  type RecipeValidationSummary,
} from "../_shared/recipeConfig.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MEAL-PLAN] ${step}${detailsStr}`);
};

// Helper function to wait with exponential backoff
async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry wrapper with exponential backoff for API calls
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 5,
  baseDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If we get a rate limit error (429), wait and retry
      if (response.status === 429) {
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = baseDelay * Math.pow(2, attempt);
          logStep(`Rate limited (429), retrying in ${delay}ms`, { attempt: attempt + 1, maxRetries });
          await wait(delay);
          continue;
        }
        logStep(`Rate limited (429), max retries exceeded`, { attempts: attempt + 1 });
        return response; // Return the 429 response after all retries
      }
      
      // For other errors that might be transient (5xx), also retry
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logStep(`Server error (${response.status}), retrying in ${delay}ms`, { attempt: attempt + 1, maxRetries });
        await wait(delay);
        continue;
      }
      
      return response; // Return successful response or non-retryable error
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logStep(`Network error, retrying in ${delay}ms`, { attempt: attempt + 1, error: String(error) });
        await wait(delay);
        continue;
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError || new Error('All retry attempts failed');
}

// Helper function to generate a single missing meal
async function generateSingleMeal(
  profile: UserProfile,
  mealType: string,
  targetCalories: number,
  apiKey: string
): Promise<any | null> {
  try {
    const prompt = buildRegenerateMealPrompt(profile, mealType, targetCalories);
    
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 4000,
          }
        }),
      },
      5, // max retries
      2000 // base delay 2s for single meals
    );

    if (!response.ok) {
      logStep(`Failed to generate missing meal ${mealType}`, { status: response.status });
      return null;
    }

    const aiData = await response.json();
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textContent) return null;

    let cleanedJson = textContent.trim();
    if (cleanedJson.startsWith("```json")) cleanedJson = cleanedJson.slice(7);
    else if (cleanedJson.startsWith("```")) cleanedJson = cleanedJson.slice(3);
    if (cleanedJson.endsWith("```")) cleanedJson = cleanedJson.slice(0, -3);
    cleanedJson = cleanedJson.trim();

    const mealData = JSON.parse(cleanedJson);
    return {
      meal_type: mealType,
      recipe_name: mealData.recipe_name || `${MEAL_TYPE_LABELS[mealType]} Padrão`,
      recipe_calories: Math.round(Number(mealData.recipe_calories) || targetCalories),
      recipe_protein: Number(mealData.recipe_protein) || 20,
      recipe_carbs: Number(mealData.recipe_carbs) || 30,
      recipe_fat: Number(mealData.recipe_fat) || 15,
      recipe_prep_time: Math.round(Number(mealData.recipe_prep_time) || 30),
      recipe_ingredients: mealData.recipe_ingredients || [],
      recipe_instructions: mealData.recipe_instructions || [],
    };
  } catch (error) {
    logStep(`Error generating single meal ${mealType}`, { error: String(error) });
    return null;
  }
}

// Normalize meal type to expected format (Portuguese)
function normalizeMealType(mealType: string): string {
  if (!mealType) return "cafe_manha";
  
  const normalized = mealType.toLowerCase().trim();
  
  const normalizations: Record<string, string> = {
    // English to Portuguese
    "breakfast": "cafe_manha",
    "lunch": "almoco",
    "dinner": "jantar",
    "snack": "lanche_tarde",
    "supper": "ceia",
    // Portuguese variations
    "lanche": "lanche_tarde",
    "lanche_da_tarde": "lanche_tarde",
    "café_manha": "cafe_manha",
    "cafe_da_manha": "cafe_manha",
    "café_da_manhã": "cafe_manha",
    "almoço": "almoco",
  };
  
  return normalizations[normalized] || normalized;
}

// Function to validate and complete missing meals
async function validateAndCompleteMeals(
  mealPlanData: any,
  profile: UserProfile,
  macros: { dailyCalories: number },
  daysCount: number,
  apiKey: string
): Promise<any> {
  // Always expect 5 meals with correct Portuguese names
  const expectedMealTypes = ["cafe_manha", "almoco", "lanche_tarde", "jantar", "ceia"];

  // Target calories per meal
  const caloriesPerMeal: Record<string, number> = {
    cafe_manha: Math.round(macros.dailyCalories * 0.25),
    almoco: Math.round(macros.dailyCalories * 0.30),
    lanche_tarde: Math.round(macros.dailyCalories * 0.15),
    jantar: Math.round(macros.dailyCalories * 0.25),
    ceia: Math.round(macros.dailyCalories * 0.05),
  };

  let missingMealsCount = 0;
  let completedMealsCount = 0;

  // Ensure we have the expected number of days
  while (mealPlanData.days.length < daysCount) {
    mealPlanData.days.push({
      day_index: mealPlanData.days.length,
      day_name: DAY_NAMES[mealPlanData.days.length % 7],
      meals: []
    });
    logStep(`Added missing day ${mealPlanData.days.length}`);
  }

  // Check each day for missing meals
  for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
    const day = mealPlanData.days[dayIndex];
    if (!day) continue;

    // Ensure meals array exists
    if (!day.meals) day.meals = [];

    // Normalize meal types first (fix AI inconsistencies like lanche_tarde -> lanche)
    day.meals = day.meals.map((meal: any) => ({
      ...meal,
      meal_type: normalizeMealType(meal.meal_type)
    }));

    // Remove duplicate meal types (keep first occurrence)
    const seenMealTypes = new Set<string>();
    day.meals = day.meals.filter((meal: any) => {
      if (seenMealTypes.has(meal.meal_type)) {
        return false;
      }
      seenMealTypes.add(meal.meal_type);
      return true;
    });

    // Get existing meal types for this day (after normalization)
    const existingMealTypes = day.meals.map((m: any) => m.meal_type);

    // Find missing meal types
    const missingMealTypes = expectedMealTypes.filter(
      (mealType) => !existingMealTypes.includes(mealType)
    );

    if (missingMealTypes.length > 0) {
      logStep(`Day ${dayIndex} missing meals`, { missingMealTypes, existing: existingMealTypes });
      missingMealsCount += missingMealTypes.length;

      // Generate missing meals sequentially (one at a time to respect rate limits)
      for (const mealType of missingMealTypes) {
        const meal = await generateSingleMeal(profile, mealType, caloriesPerMeal[mealType] || 400, apiKey);
        
        if (meal) {
          day.meals.push(meal);
          completedMealsCount++;
          logStep(`Completed missing meal`, { dayIndex, mealType: meal.meal_type });
        }
        
        // Delay between each meal generation to avoid rate limits
        await wait(1500);
      }
    }

    // Sort meals by meal type order
    const mealOrder = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
    day.meals.sort((a: any, b: any) => {
      return mealOrder.indexOf(a.meal_type) - mealOrder.indexOf(b.meal_type);
    });
  }

  logStep("Validation complete", { 
    totalMissing: missingMealsCount, 
    completed: completedMealsCount,
    stillMissing: missingMealsCount - completedMealsCount
  });

  return mealPlanData;
}

// Generate a single day's meals
async function generateSingleDay(
  profile: UserProfile,
  dayIndex: number,
  macros: { dailyCalories: number; dailyProtein: number },
  previousRecipes: string[],
  apiKey: string
): Promise<any | null> {
  const dayName = DAY_NAMES[dayIndex % 7];
  const prompt = buildSingleDayPrompt(profile, dayIndex, dayName, macros as any, previousRecipes);
  
  try {
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 8192,
          }
        }),
      },
      5, // max retries
      3000 // base delay 3s for full day generation
    );

    if (!response.ok) {
      logStep(`Day ${dayIndex} API error`, { status: response.status });
      return null;
    }

    const aiData = await response.json();
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) return null;

    let cleanedJson = textContent.trim();
    if (cleanedJson.startsWith("```json")) cleanedJson = cleanedJson.slice(7);
    else if (cleanedJson.startsWith("```")) cleanedJson = cleanedJson.slice(3);
    if (cleanedJson.endsWith("```")) cleanedJson = cleanedJson.slice(0, -3);
    cleanedJson = cleanedJson.trim();

    const dayData = JSON.parse(cleanedJson);
    logStep(`Day ${dayIndex} generated`, { meals: dayData.meals?.length || 0 });
    return dayData;
  } catch (error) {
    logStep(`Day ${dayIndex} error`, { error: String(error) });
    return null;
  }
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
      context: profile.context,
      country: profile.country || "BR"
    });

    // Calculate personalized macros using centralized function
    const macros = calculateMacroTargets(profile as UserProfile);
    logStep("Macros calculated", macros);

    // ========================================
    // GERAR DIAS UM A UM PARA EVITAR TRUNCAMENTO
    // ========================================
    logStep("Generating days one by one with Flash-Lite");
    
    const allDays: any[] = [];
    const usedRecipes = [...previousRecipes];
    
    for (let i = 0; i < daysCount; i++) {
      logStep(`Generating day ${i + 1}/${daysCount}`);
      
      const dayData = await generateSingleDay(
        profile as UserProfile,
        i,
        macros,
        usedRecipes,
        GOOGLE_AI_API_KEY
      );
      
      if (dayData && dayData.meals) {
        allDays.push(dayData);
        // Add recipes to avoid list
        dayData.meals.forEach((meal: any) => {
          if (meal.recipe_name) usedRecipes.push(meal.recipe_name);
        });
      } else {
        // Create empty day to be filled later by validation
        allDays.push({
          day_index: i,
          day_name: DAY_NAMES[i % 7],
          meals: []
        });
      }
      
      // Increased delay between requests to avoid rate limits
      if (i < daysCount - 1) {
        await wait(2000);
      }
    }
    
    let mealPlanData: any = { days: allDays };
    logStep("All days generated", { daysCount: allDays.length });

    // ========================================
    // VALIDAÇÃO E COMPLETAÇÃO DE REFEIÇÕES FALTANTES
    // ========================================
    mealPlanData = await validateAndCompleteMeals(
      mealPlanData,
      profile as UserProfile,
      macros,
      daysCount,
      GOOGLE_AI_API_KEY
    );

    logStep("Meal plan validated and completed");

    // ========================================
    // VALIDAÇÃO PÓS-GERAÇÃO - VERIFICAR INGREDIENTES
    // ========================================
    const validationSummary: RecipeValidationSummary = validateMealPlan(mealPlanData, profile as UserProfile);
    
    logStep("Post-generation validation complete", {
      totalMeals: validationSummary.totalMeals,
      validMeals: validationSummary.validMeals,
      invalidMeals: validationSummary.invalidMeals,
      issues: validationSummary.issues.length > 0 
        ? validationSummary.issues.map(i => `${i.recipeName}: ${i.invalidIngredients.join(", ")}`)
        : "none"
    });

    // Se houver receitas inválidas, tenta regenerá-las
    if (validationSummary.issues.length > 0) {
      logStep("Attempting to regenerate invalid meals", { count: validationSummary.issues.length });
      
      for (const issue of validationSummary.issues) {
        // Encontra o dia e a refeição correspondente
        const day = mealPlanData.days[issue.dayIndex];
        if (!day) continue;
        
        const mealIndex = day.meals.findIndex((m: any) => 
          m.meal_type === issue.mealType && m.recipe_name === issue.recipeName
        );
        
        if (mealIndex === -1) continue;
        
        // Regenera a refeição
        const caloriesPerMeal: Record<string, number> = {
          cafe_manha: Math.round(macros.dailyCalories * 0.25),
          almoco: Math.round(macros.dailyCalories * 0.30),
          lanche: Math.round(macros.dailyCalories * 0.15),
          jantar: Math.round(macros.dailyCalories * 0.25),
          ceia: Math.round(macros.dailyCalories * 0.05),
        };
        
        const newMeal = await generateSingleMeal(
          profile as UserProfile,
          issue.mealType,
          caloriesPerMeal[issue.mealType] || 400,
          GOOGLE_AI_API_KEY
        );
        
        if (newMeal) {
          day.meals[mealIndex] = newMeal;
          logStep("Regenerated invalid meal", { 
            dayIndex: issue.dayIndex, 
            mealType: issue.mealType,
            oldRecipe: issue.recipeName,
            newRecipe: newMeal.recipe_name 
          });
        }
        
        // Delay entre regenerações
        await wait(1500);
      }
      
      // Revalidar após regeneração
      const finalValidation = validateMealPlan(mealPlanData, profile as UserProfile);
      logStep("Final validation after regeneration", {
        validMeals: finalValidation.validMeals,
        invalidMeals: finalValidation.invalidMeals,
        remainingIssues: finalValidation.issues.length
      });
    }

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
    // day_of_week is the index within the batch (0-6)
    // week_number is the batch number (1, 2, 3...) representing weeks since plan start
    const items = mealPlanData.days.flatMap((day: any, dayIndexInBatch: number) =>
      day.meals.map((meal: any) => ({
        meal_plan_id: mealPlanIdToUse,
        day_of_week: dayIndexInBatch, // Use index within batch, not day.day_index from AI
        meal_type: normalizeMealType(meal.meal_type), // Ensure normalized
        recipe_name: meal.recipe_name,
        recipe_calories: Math.round(Number(meal.recipe_calories) || 0),
        recipe_protein: Number(meal.recipe_protein) || 0,
        recipe_carbs: Number(meal.recipe_carbs) || 0,
        recipe_fat: Number(meal.recipe_fat) || 0,
        recipe_prep_time: Math.round(Number(meal.recipe_prep_time) || 30),
        recipe_ingredients: meal.recipe_ingredients || [],
        recipe_instructions: meal.recipe_instructions || [],
        week_number: weekNumber || 1 // Batch number as week number
      }))
    );

    // Log final count per day for debugging
    const mealsPerDayLog = mealPlanData.days.map((day: any, i: number) => ({
      day: i,
      mealsCount: day.meals?.length || 0,
      mealTypes: day.meals?.map((m: any) => m.meal_type) || []
    }));
    logStep("Final meals distribution", mealsPerDayLog);

    const { error: itemsError } = await supabaseClient
      .from("meal_plan_items")
      .insert(items);

    if (itemsError) throw new Error(`Error creating meal plan items: ${itemsError.message}`);
    logStep("Meal plan items created", { count: items.length });

    // Validação final para incluir na resposta
    const finalValidationResult = validateMealPlan(mealPlanData, profile as UserProfile);

    return new Response(JSON.stringify({
      success: true,
      mealPlan: {
        id: mealPlanIdToUse,
        ...mealPlan,
        items: items
      },
      validation: {
        totalMeals: finalValidationResult.totalMeals,
        validMeals: finalValidationResult.validMeals,
        invalidMeals: finalValidationResult.invalidMeals,
        issues: finalValidationResult.issues
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
