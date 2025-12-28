import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildSingleDayPrompt,
  buildRegenerateMealPrompt,
  calculateMacroTargets,
  MEAL_TYPE_LABELS,
  validateMealPlan,
  validateRecipe,
  type UserProfile,
  type RecipeValidationSummary,
} from "../_shared/recipeConfig.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { extractUsageFromGeminiResponse, logAIUsage } from "../_shared/logAIUsage.ts";

const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MEAL-PLAN] ${step}${detailsStr}`);
};

// Helper function to wait
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
      
      if (response.status === 429) {
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          logStep(`Rate limited (429), retrying in ${delay}ms`, { attempt: attempt + 1, maxRetries });
          await wait(delay);
          continue;
        }
        return response;
      }
      
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        logStep(`Server error (${response.status}), retrying in ${delay}ms`, { attempt: attempt + 1, maxRetries });
        await wait(delay);
        continue;
      }
      
      return response;
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
  
  throw lastError || new Error('All retry attempts failed');
}

// Helper function to generate a single missing meal
async function generateSingleMeal(
  profile: UserProfile,
  mealType: string,
  targetCalories: number,
  apiKey: string,
  userId?: string
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
      5,
      2000
    );

    if (!response.ok) {
      logStep(`Failed to generate missing meal ${mealType}`, { status: response.status });
      return null;
    }

    const aiData = await response.json();
    
    const usage = extractUsageFromGeminiResponse(aiData);
    await logAIUsage({
      functionName: "generate-meal-plan",
      model: "gemini-2.5-flash-lite",
      ...usage,
      userId,
      metadata: { type: "single_meal", mealType }
    });
    
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
      recipe_prep_time: Math.round(Number(mealData.recipe_prep_time) || 15),
      recipe_ingredients: mealData.recipe_ingredients || [],
      recipe_instructions: [], // Sempre vazio no modo nutricionista
    };
  } catch (error) {
    logStep(`Error generating single meal ${mealType}`, { error: String(error) });
    return null;
  }
}

// Normalize meal type to standard internal keys
function normalizeMealType(mealType: string): string {
  if (!mealType) return "cafe_manha";
  
  const normalized = mealType.toLowerCase().trim();
  
  const normalizations: Record<string, string> = {
    "breakfast": "cafe_manha",
    "lunch": "almoco",
    "dinner": "jantar",
    "snack": "lanche",
    "supper": "ceia",
    "lanche_tarde": "lanche",
    "lanche_da_tarde": "lanche",
    "café_manha": "cafe_manha",
    "cafe_da_manha": "cafe_manha",
    "café_da_manhã": "cafe_manha",
    "almoço": "almoco",
  };
  
  return normalizations[normalized] || normalized;
}

// Extract meal types from customMealTimes
interface ExtraMeal {
  id: string;
  name: string;
  time: string;
}

interface CustomMealTimesWithExtras {
  [key: string]: string | ExtraMeal[] | undefined;
  extras?: ExtraMeal[];
}

function getMealTypesFromCustomTimes(customMealTimes?: CustomMealTimesWithExtras | null): string[] {
  const defaultMealTypes = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
  
  if (!customMealTimes || typeof customMealTimes !== 'object') {
    return defaultMealTypes;
  }
  
  const mealTypes: string[] = [];
  
  for (const [key, value] of Object.entries(customMealTimes)) {
    if (key === 'extras') continue;
    if (typeof value === 'string' && value) {
      mealTypes.push(key);
    }
  }
  
  if (mealTypes.length === 0) {
    mealTypes.push(...defaultMealTypes);
  }
  
  const extras = customMealTimes.extras;
  if (Array.isArray(extras)) {
    for (const extra of extras) {
      if (extra.id && extra.time) {
        mealTypes.push(extra.id);
      }
    }
  }
  
  logStep("Extracted meal types from customMealTimes", { mealTypes, hasExtras: Array.isArray(extras) && extras.length > 0 });
  
  return mealTypes;
}

// Calculate calories per meal dynamically based on meal count
function calculateCaloriesPerMeal(dailyCalories: number, mealTypes: string[]): Record<string, number> {
  const caloriesPerMeal: Record<string, number> = {};
  
  const baseDistribution: Record<string, number> = {
    cafe_manha: 0.25,
    almoco: 0.30,
    lanche: 0.15,
    jantar: 0.25,
    ceia: 0.05,
  };
  
  let allocatedPercentage = 0;
  const standardMeals: string[] = [];
  const extraMeals: string[] = [];
  
  for (const mealType of mealTypes) {
    if (baseDistribution[mealType] !== undefined) {
      standardMeals.push(mealType);
      allocatedPercentage += baseDistribution[mealType];
    } else {
      extraMeals.push(mealType);
    }
  }
  
  let rebalanceFactor = 1;
  if (extraMeals.length > 0 && allocatedPercentage >= 1) {
    const reductionPerMeal = 0.08;
    rebalanceFactor = 1 - reductionPerMeal;
    const percentageForExtras = (standardMeals.length * reductionPerMeal) / extraMeals.length;
    
    for (const mealType of standardMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * baseDistribution[mealType] * rebalanceFactor);
    }
    
    for (const mealType of extraMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * percentageForExtras);
    }
  } else {
    const remainingPercentage = Math.max(0, 1 - allocatedPercentage);
    const percentagePerExtra = extraMeals.length > 0 ? remainingPercentage / extraMeals.length : 0;
    
    for (const mealType of standardMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * baseDistribution[mealType]);
    }
    
    for (const mealType of extraMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * percentagePerExtra);
    }
  }
  
  logStep("Calculated calories per meal", { mealTypes, caloriesPerMeal });
  
  return caloriesPerMeal;
}

// Get label for meal type
function getMealTypeLabel(mealType: string, customMealTimes?: CustomMealTimesWithExtras | null): string {
  const standardLabels: Record<string, string> = {
    cafe_manha: "Café da Manhã",
    almoco: "Almoço",
    lanche: "Lanche",
    jantar: "Jantar",
    ceia: "Ceia",
  };
  
  if (customMealTimes?.extras && Array.isArray(customMealTimes.extras)) {
    const extra = customMealTimes.extras.find((e: ExtraMeal) => e.id === mealType);
    if (extra) {
      return extra.name;
    }
  }
  
  return standardLabels[mealType] || mealType;
}

// Function to validate and complete missing meals
async function validateAndCompleteMeals(
  mealPlanData: any,
  profile: UserProfile,
  macros: { dailyCalories: number },
  daysCount: number,
  apiKey: string,
  userId?: string,
  expectedMealTypes?: string[],
  customMealTimes?: CustomMealTimesWithExtras | null
): Promise<any> {
  const mealTypes = expectedMealTypes || ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
  const caloriesPerMeal = calculateCaloriesPerMeal(macros.dailyCalories, mealTypes);

  let missingMealsCount = 0;
  let completedMealsCount = 0;

  while (mealPlanData.days.length < daysCount) {
    mealPlanData.days.push({
      day_index: mealPlanData.days.length,
      day_name: DAY_NAMES[mealPlanData.days.length % 7],
      meals: []
    });
    logStep(`Added missing day ${mealPlanData.days.length}`);
  }

  for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
    const day = mealPlanData.days[dayIndex];
    if (!day) continue;

    if (!day.meals) day.meals = [];

    const standardTypes = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
    day.meals = day.meals.map((meal: any) => {
      const normalized = normalizeMealType(meal.meal_type);
      if (standardTypes.includes(normalized) || mealTypes.includes(meal.meal_type)) {
        return { ...meal, meal_type: normalized };
      }
      return meal;
    });

    const seenMealTypes = new Set<string>();
    day.meals = day.meals.filter((meal: any) => {
      if (seenMealTypes.has(meal.meal_type)) {
        return false;
      }
      seenMealTypes.add(meal.meal_type);
      return true;
    });

    const existingMealTypes = day.meals.map((m: any) => m.meal_type);
    const missingMealTypes = mealTypes.filter(
      (mealType) => !existingMealTypes.includes(mealType)
    );

    if (missingMealTypes.length > 0) {
      logStep(`Day ${dayIndex} missing meals`, { missingMealTypes, existing: existingMealTypes });
      missingMealsCount += missingMealTypes.length;

      for (const mealType of missingMealTypes) {
        const mealLabel = getMealTypeLabel(mealType, customMealTimes);
        const meal = await generateSingleMeal(profile, mealType, caloriesPerMeal[mealType] || 400, apiKey, userId);
        
        if (meal) {
          if (!standardTypes.includes(mealType) && mealLabel) {
            meal.recipe_name = meal.recipe_name || `${mealLabel} Leve`;
          }
          day.meals.push(meal);
          completedMealsCount++;
          logStep(`Completed missing meal`, { dayIndex, mealType: meal.meal_type, label: mealLabel });
        }
        
        await wait(1500);
      }
    }

    day.meals.sort((a: any, b: any) => {
      const orderA = mealTypes.indexOf(a.meal_type);
      const orderB = mealTypes.indexOf(b.meal_type);
      if (orderA === -1 && orderB === -1) return 0;
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      return orderA - orderB;
    });
  }

  logStep("Validation complete", { 
    totalMissing: missingMealsCount, 
    completed: completedMealsCount,
    stillMissing: missingMealsCount - completedMealsCount,
    expectedMealTypes: mealTypes
  });

  return mealPlanData;
}

// Generate a single day's meals using AI
async function generateSingleDay(
  profile: UserProfile,
  dayIndex: number,
  macros: { dailyCalories: number; dailyProtein: number },
  previousRecipes: string[],
  apiKey: string,
  userId?: string,
  mealTypes?: string[],
  customMealTimes?: CustomMealTimesWithExtras | null
): Promise<any | null> {
  const dayName = DAY_NAMES[dayIndex % 7];
  const targetMealTypes = mealTypes || ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
  
  logStep(`Generating day ${dayIndex} (${dayName}) via AI`, {
    mealTypes: targetMealTypes,
    avoidingPreviousRecipes: previousRecipes.length
  });
  
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
            temperature: 0.8,
            topP: 0.95,
            maxOutputTokens: 8192,
          }
        }),
      },
      5,
      3000
    );

    if (!response.ok) {
      logStep(`AI API error for day ${dayIndex}`, { status: response.status });
      return null;
    }

    const aiData = await response.json();
    
    const dayUsage = extractUsageFromGeminiResponse(aiData);
    await logAIUsage({
      functionName: "generate-meal-plan",
      model: "gemini-2.5-flash-lite",
      ...dayUsage,
      userId,
      metadata: { type: "full_day", dayIndex, mealTypesCount: targetMealTypes.length }
    });
    
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      logStep(`No content from AI for day ${dayIndex}`);
      return null;
    }

    let cleanedJson = textContent.trim();
    if (cleanedJson.startsWith("```json")) cleanedJson = cleanedJson.slice(7);
    else if (cleanedJson.startsWith("```")) cleanedJson = cleanedJson.slice(3);
    if (cleanedJson.endsWith("```")) cleanedJson = cleanedJson.slice(0, -3);
    cleanedJson = cleanedJson.trim();

    const dayData = JSON.parse(cleanedJson);
    const meals = dayData.meals || [];
    
    // Validate each meal and filter out unsafe ones
    const validMeals: any[] = [];
    for (const meal of meals) {
      // Check if AI flagged as unsafe
      if (meal.is_safe === false) {
        logStep(`⚠️ AI flagged meal as UNSAFE`, { mealType: meal.meal_type, recipeName: meal.recipe_name });
        continue;
      }
      
      // Validate against user restrictions
      const validation = validateRecipe(
        {
          recipe_name: meal.recipe_name || "",
          recipe_ingredients: meal.recipe_ingredients || []
        },
        profile
      );
      
      if (!validation.isValid) {
        logStep(`🚫 Meal FAILED validation`, { 
          mealType: meal.meal_type,
          recipeName: meal.recipe_name,
          invalidIngredients: validation.invalidIngredients
        });
        continue;
      }
      
      // Ensure recipe_instructions is always empty array (nutritionist mode)
      validMeals.push({
        ...meal,
        meal_type: normalizeMealType(meal.meal_type),
        recipe_instructions: []
      });
      
      logStep(`✅ Valid meal`, { mealType: meal.meal_type, recipeName: meal.recipe_name });
    }
    
    logStep(`Day ${dayIndex} complete`, { 
      totalMeals: validMeals.length,
      mealTypes: validMeals.map(m => m.meal_type)
    });
    
    return {
      day_index: dayIndex,
      day_name: dayName,
      meals: validMeals
    };
    
  } catch (error) {
    logStep(`AI generation error for day ${dayIndex}`, { error: String(error) });
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
    logStep("Function started - Nutritionist Mode");

    const GOOGLE_AI_API_KEY = await getGeminiApiKey();
    logStep("Gemini API key fetched");

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
    let { planName, startDate, existingPlanId, weekNumber, customMealTimes } = requestBody;
    logStep("Request received", { planName, startDate, daysCount, existingPlanId, weekNumber, hasCustomMealTimes: !!customMealTimes });

    // Check for existing plan in the same month
    let reusingExistingPlan = false;
    let existingDays: Set<string> = new Set();
    
    if (!existingPlanId) {
      const start = startDate ? new Date(startDate) : new Date();
      const targetMonth = start.getMonth();
      const targetYear = start.getFullYear();
      
      const monthStart = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0];
      const monthEnd = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0];
      
      const { data: existingPlans, error: checkError } = await supabaseClient
        .from("meal_plans")
        .select(`
          id, 
          name, 
          start_date, 
          end_date,
          created_at,
          meal_plan_items(count)
        `)
        .eq("user_id", user.id)
        .gte("end_date", monthStart)
        .lte("start_date", monthEnd)
        .order("created_at", { ascending: false });
      
      if (!checkError && existingPlans && existingPlans.length > 0) {
        const plansWithCounts = existingPlans.map(plan => ({
          ...plan,
          itemCount: (plan.meal_plan_items as any)?.[0]?.count || 0
        }));
        
        plansWithCounts.sort((a, b) => {
          if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const existingPlan = plansWithCounts[0];
        
        logStep("Found existing plan for this month", { 
          existingPlanId: existingPlan.id, 
          existingItemCount: existingPlan.itemCount
        });
        
        // Delete duplicates
        if (plansWithCounts.length > 1) {
          const duplicatePlans = plansWithCounts.filter(p => p.id !== existingPlan.id);
          for (const duplicatePlan of duplicatePlans) {
            await supabaseClient.from("meal_plan_items").delete().eq("meal_plan_id", duplicatePlan.id);
            await supabaseClient.from("meal_plans").delete().eq("id", duplicatePlan.id).eq("user_id", user.id);
            logStep("Deleted duplicate plan", { planId: duplicatePlan.id });
          }
        }
        
        const { data: existingItems } = await supabaseClient
          .from("meal_plan_items")
          .select("day_of_week, week_number")
          .eq("meal_plan_id", existingPlan.id);
        
        if (existingItems && existingItems.length > 0) {
          existingItems.forEach(item => {
            existingDays.add(`${item.week_number}-${item.day_of_week}`);
          });
          
          existingPlanId = existingPlan.id;
          reusingExistingPlan = true;
          logStep("Will add missing days to existing plan", { 
            existingDaysCount: existingDays.size, 
            planId: existingPlanId 
          });
        }
      }
    }

    // Fetch previous week's recipes to avoid repetition
    let previousRecipes: string[] = [];
    if (existingPlanId) {
      const { data: recentItems } = await supabaseClient
        .from("meal_plan_items")
        .select("recipe_name")
        .eq("meal_plan_id", existingPlanId)
        .order("created_at", { ascending: false })
        .limit(35);
      
      if (recentItems && recentItems.length > 0) {
        previousRecipes = [...new Set(recentItems.map(item => item.recipe_name))];
        logStep("Previous recipes fetched", { count: previousRecipes.length });
      }
    } else {
      const { data: recentPlans } = await supabaseClient
        .from("meal_plans")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (recentPlans && recentPlans.length > 0) {
        const { data: lastWeekItems } = await supabaseClient
          .from("meal_plan_items")
          .select("recipe_name")
          .eq("meal_plan_id", recentPlans[0].id)
          .order("week_number", { ascending: false })
          .limit(35);
        
        if (lastWeekItems && lastWeekItems.length > 0) {
          previousRecipes = [...new Set(lastWeekItems.map(item => item.recipe_name))];
          logStep("Last plan recipes fetched", { count: previousRecipes.length });
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
      country: profile.country || "BR"
    });

    // Calculate personalized macros
    const macros = calculateMacroTargets(profile as UserProfile);
    logStep("Macros calculated", macros);

    // Extract meal types
    const mealTypesToGenerate = getMealTypesFromCustomTimes(customMealTimes as CustomMealTimesWithExtras | null);
    logStep("Meal types to generate", { mealTypes: mealTypesToGenerate });
    
    // Generate days one by one
    logStep("Generating days via AI (Nutritionist Mode)");
    
    const allDays: any[] = [];
    const usedRecipes = [...previousRecipes];
    const targetWeekNum = weekNumber || 1;
    let skippedDays = 0;
    
    for (let i = 0; i < daysCount; i++) {
      const dayKey = `${targetWeekNum}-${i}`;
      if (existingDays.has(dayKey)) {
        logStep(`Skipping day ${i + 1}/${daysCount} - already exists`, { dayKey });
        skippedDays++;
        continue;
      }
      
      logStep(`Generating day ${i + 1}/${daysCount}`);
      
      const dayData = await generateSingleDay(
        profile as UserProfile,
        i,
        macros,
        usedRecipes,
        GOOGLE_AI_API_KEY,
        user.id,
        mealTypesToGenerate,
        customMealTimes as CustomMealTimesWithExtras | null
      );
      
      if (dayData && dayData.meals) {
        allDays.push(dayData);
        dayData.meals.forEach((meal: any) => {
          if (meal.recipe_name) usedRecipes.push(meal.recipe_name);
        });
      } else {
        allDays.push({
          day_index: i,
          day_name: DAY_NAMES[i % 7],
          meals: []
        });
      }
      
      if (i < daysCount - 1) {
        await wait(2000);
      }
    }
    
    let mealPlanData: any = { days: allDays };
    logStep("All days generated", { 
      daysGenerated: allDays.length, 
      daysSkipped: skippedDays
    });
    
    // If all days were skipped
    if (allDays.length === 0 && skippedDays > 0) {
      logStep("All requested days already exist");
      return new Response(JSON.stringify({
        success: true,
        message: "Todos os dias solicitados já existem no plano",
        mealPlan: { id: existingPlanId },
        skippedDays
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    if (allDays.length === 0) {
      throw new Error("Não foi possível gerar nenhuma refeição. Tente novamente.");
    }

    // Validate and complete missing meals
    mealPlanData = await validateAndCompleteMeals(
      mealPlanData,
      profile as UserProfile,
      macros,
      daysCount,
      GOOGLE_AI_API_KEY,
      user.id,
      mealTypesToGenerate,
      customMealTimes as CustomMealTimesWithExtras | null
    );

    logStep("Meal plan validated and completed");

    // Post-generation validation
    const validationSummary: RecipeValidationSummary = validateMealPlan(mealPlanData, profile as UserProfile);
    
    logStep("Post-generation validation", {
      totalMeals: validationSummary.totalMeals,
      validMeals: validationSummary.validMeals,
      invalidMeals: validationSummary.invalidMeals
    });
    
    // Regenerate problematic meals
    if (validationSummary.issues.length > 0 && validationSummary.issues.length <= 5) {
      logStep("Regenerating invalid meals", { count: validationSummary.issues.length });
      
      const caloriesPerMealMap = calculateCaloriesPerMeal(macros.dailyCalories, mealTypesToGenerate);
      
      for (const issue of validationSummary.issues) {
        const day = mealPlanData.days[issue.dayIndex];
        if (!day) continue;
        
        const mealIndex = day.meals.findIndex((m: any) => 
          m.meal_type === issue.mealType && m.recipe_name === issue.recipeName
        );
        
        if (mealIndex === -1) continue;
        
        const newMeal = await generateSingleMeal(
          profile as UserProfile,
          issue.mealType,
          caloriesPerMealMap[issue.mealType] || 400,
          GOOGLE_AI_API_KEY,
          user.id
        );
        
        if (newMeal) {
          day.meals[mealIndex] = newMeal;
          logStep("Regenerated invalid meal", { 
            mealType: issue.mealType,
            newRecipe: newMeal.recipe_name 
          });
        }
        
        await wait(1500);
      }
    }
    
    // Final validation
    const totalMealsGenerated = mealPlanData.days.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0);
    const minMealsRequired = allDays.length * Math.max(1, mealTypesToGenerate.length - 1);
    
    if (totalMealsGenerated < minMealsRequired) {
      throw new Error(`Geração incompleta: apenas ${totalMealsGenerated} refeições foram geradas. Tente novamente.`);
    }
    
    logStep("All meals generated, persisting to database", {
      totalMeals: totalMealsGenerated,
      daysCount: allDays.length
    });

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date();
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + daysCount - 1);

    let mealPlanIdToUse = existingPlanId;
    let mealPlan;

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
      
      const updateData: any = { 
        updated_at: new Date().toISOString(),
        custom_meal_times: customMealTimes || existingPlan.custom_meal_times || null
      };
      
      if (newEndDate > existingPlan.end_date) {
        updateData.end_date = newEndDate;
      }
      
      await supabaseClient
        .from("meal_plans")
        .update(updateData)
        .eq("id", existingPlanId);
      
      mealPlan = { ...existingPlan, custom_meal_times: customMealTimes || existingPlan.custom_meal_times };
      mealPlanIdToUse = existingPlan.id;
      logStep("Updated existing meal plan", { planId: mealPlanIdToUse });
    } else {
      const { data: newPlan, error: planError } = await supabaseClient
        .from("meal_plans")
        .insert({
          user_id: user.id,
          name: planName || `Plano ${start.toLocaleDateString('pt-BR')}`,
          start_date: start.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_active: true,
          custom_meal_times: customMealTimes || null
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
    const items = mealPlanData.days.flatMap((day: any, dayIndexInBatch: number) =>
      day.meals.map((meal: any) => ({
        meal_plan_id: mealPlanIdToUse,
        day_of_week: dayIndexInBatch,
        meal_type: normalizeMealType(meal.meal_type),
        recipe_name: meal.recipe_name,
        recipe_calories: Math.round(Number(meal.recipe_calories) || 0),
        recipe_protein: Number(meal.recipe_protein) || 0,
        recipe_carbs: Number(meal.recipe_carbs) || 0,
        recipe_fat: Number(meal.recipe_fat) || 0,
        recipe_prep_time: Math.round(Number(meal.recipe_prep_time) || 15),
        recipe_ingredients: meal.recipe_ingredients || [],
        recipe_instructions: [], // Always empty in nutritionist mode
        week_number: weekNumber || 1
      }))
    );

    logStep("Final meals distribution", mealPlanData.days.map((day: any, i: number) => ({
      day: i,
      mealsCount: day.meals?.length || 0,
      mealTypes: day.meals?.map((m: any) => m.meal_type) || []
    })));

    const { error: itemsError } = await supabaseClient
      .from("meal_plan_items")
      .insert(items);

    if (itemsError) throw new Error(`Error creating meal plan items: ${itemsError.message}`);
    logStep("Meal plan items created", { count: items.length });

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
