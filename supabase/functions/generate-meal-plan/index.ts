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
import {
  searchRecipePool,
  saveRecipeToPool,
  markRecipeAsUsed,
  type RecipePoolSearchParams,
  type SourceModule,
} from "../_shared/recipePool.ts";
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
      5, // max retries
      2000 // base delay 2s for single meals
    );

    if (!response.ok) {
      logStep(`Failed to generate missing meal ${mealType}`, { status: response.status });
      return null;
    }

    const aiData = await response.json();
    
    // Log AI usage for single meal generation
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
      recipe_prep_time: Math.round(Number(mealData.recipe_prep_time) || 30),
      recipe_ingredients: mealData.recipe_ingredients || [],
      recipe_instructions: mealData.recipe_instructions || [],
    };
  } catch (error) {
    logStep(`Error generating single meal ${mealType}`, { error: String(error) });
    return null;
  }
}

// Normalize meal type to standard internal keys
// Standard keys: cafe_manha, almoco, lanche, jantar, ceia
function normalizeMealType(mealType: string): string {
  if (!mealType) return "cafe_manha";
  
  const normalized = mealType.toLowerCase().trim();
  
  const normalizations: Record<string, string> = {
    // English to standard keys
    "breakfast": "cafe_manha",
    "lunch": "almoco",
    "dinner": "jantar",
    "snack": "lanche",
    "supper": "ceia",
    // Portuguese variations to standard
    "lanche_tarde": "lanche",
    "lanche_da_tarde": "lanche",
    "café_manha": "cafe_manha",
    "cafe_da_manha": "cafe_manha",
    "café_da_manhã": "cafe_manha",
    "almoço": "almoco",
  };
  
  return normalizations[normalized] || normalized;
}

// Extract meal types from customMealTimes (including extras)
interface ExtraMeal {
  id: string;
  name: string;
  time: string;
}

interface CustomMealTimesWithExtras {
  [key: string]: string | ExtraMeal[] | undefined;
  extras?: ExtraMeal[];
}

// Get all meal types from customMealTimes or use defaults
function getMealTypesFromCustomTimes(customMealTimes?: CustomMealTimesWithExtras | null): string[] {
  const defaultMealTypes = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
  
  if (!customMealTimes || typeof customMealTimes !== 'object') {
    return defaultMealTypes;
  }
  
  const mealTypes: string[] = [];
  
  // Add standard meal types that have times defined
  for (const [key, value] of Object.entries(customMealTimes)) {
    if (key === 'extras') continue; // Handle extras separately
    if (typeof value === 'string' && value) {
      mealTypes.push(key);
    }
  }
  
  // If no standard types found, use defaults
  if (mealTypes.length === 0) {
    mealTypes.push(...defaultMealTypes);
  }
  
  // Add extras
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
  const count = mealTypes.length;
  const caloriesPerMeal: Record<string, number> = {};
  
  // Base distribution for standard meals
  const baseDistribution: Record<string, number> = {
    cafe_manha: 0.25,
    almoco: 0.30,
    lanche: 0.15,
    jantar: 0.25,
    ceia: 0.05,
  };
  
  // Calculate how much is already allocated to standard meals
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
  
  // Distribute remaining percentage to extra meals
  const remainingPercentage = Math.max(0, 1 - allocatedPercentage);
  const percentagePerExtra = extraMeals.length > 0 ? remainingPercentage / extraMeals.length : 0;
  
  // If we have extras, we need to rebalance - take a bit from each standard meal
  let rebalanceFactor = 1;
  if (extraMeals.length > 0 && allocatedPercentage >= 1) {
    // Reduce standard meals by 10% each to make room for extras
    const reductionPerMeal = 0.08;
    const totalReduction = standardMeals.length * reductionPerMeal;
    rebalanceFactor = 1 - reductionPerMeal;
    const percentageForExtras = totalReduction / extraMeals.length;
    
    // Assign to standard meals (reduced)
    for (const mealType of standardMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * baseDistribution[mealType] * rebalanceFactor);
    }
    
    // Assign to extra meals
    for (const mealType of extraMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * percentageForExtras);
    }
  } else {
    // No rebalancing needed
    for (const mealType of standardMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * baseDistribution[mealType]);
    }
    
    for (const mealType of extraMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * percentagePerExtra);
    }
  }
  
  logStep("Calculated calories per meal", { count, caloriesPerMeal });
  
  return caloriesPerMeal;
}

// Get label for meal type (for prompts)
function getMealTypeLabel(mealType: string, customMealTimes?: CustomMealTimesWithExtras | null): string {
  const standardLabels: Record<string, string> = {
    cafe_manha: "Café da Manhã",
    almoco: "Almoço",
    lanche: "Lanche",
    jantar: "Jantar",
    ceia: "Ceia",
  };
  
  // Check if it's an extra meal
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
  // Use provided meal types or defaults
  const mealTypes = expectedMealTypes || ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];

  // Calculate calories dynamically based on meal count
  const caloriesPerMeal = calculateCaloriesPerMeal(macros.dailyCalories, mealTypes);

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
    // Only normalize standard types, leave extras as-is
    const standardTypes = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
    day.meals = day.meals.map((meal: any) => {
      const normalized = normalizeMealType(meal.meal_type);
      // Only apply normalization if it's a standard type
      if (standardTypes.includes(normalized) || mealTypes.includes(meal.meal_type)) {
        return { ...meal, meal_type: normalized };
      }
      return meal;
    });

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
    const missingMealTypes = mealTypes.filter(
      (mealType) => !existingMealTypes.includes(mealType)
    );

    if (missingMealTypes.length > 0) {
      logStep(`Day ${dayIndex} missing meals`, { missingMealTypes, existing: existingMealTypes });
      missingMealsCount += missingMealTypes.length;

      // Generate missing meals sequentially (one at a time to respect rate limits)
      for (const mealType of missingMealTypes) {
        const mealLabel = getMealTypeLabel(mealType, customMealTimes);
        const meal = await generateSingleMeal(profile, mealType, caloriesPerMeal[mealType] || 400, apiKey, userId);
        
        if (meal) {
          // Use proper label for recipe naming if it's an extra
          if (!standardTypes.includes(mealType) && mealLabel) {
            meal.recipe_name = meal.recipe_name || `${mealLabel} Leve`;
          }
          day.meals.push(meal);
          completedMealsCount++;
          logStep(`Completed missing meal`, { dayIndex, mealType: meal.meal_type, label: mealLabel });
        }
        
        // Delay between each meal generation to avoid rate limits
        await wait(1500);
      }
    }

    // Sort meals by meal type order (standard first, then extras by time)
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

// Try to get meals from the recipe pool first
// CRITICAL: Now receives usedRecipes to exclude already-used recipes and ensure variation
// ALSO validates each recipe against user profile to ensure 0% incompatibility
async function getMealsFromPool(
  supabase: any,
  profile: UserProfile,
  mealTypes: string[],
  usedRecipes: string[] = [] // NEW: List of recipes already used in this plan
): Promise<{ meals: Map<string, any>; incompatibleMealTypes: string[] }> {
  const results = new Map<string, any>();
  const incompatibleMealTypes: string[] = []; // Track meal types where pool had only incompatible recipes
  
  // Convert usedRecipes to lowercase for case-insensitive comparison
  const usedRecipesLower = usedRecipes.map(r => r.toLowerCase().trim());
  
  for (const mealType of mealTypes) {
    const poolRecipes = await searchRecipePool(supabase, {
      mealType,
      countryCode: profile.country || "BR",
      dietaryPreference: profile.dietary_preference || undefined,
      intolerances: profile.intolerances || [],
      excludedIngredients: profile.excluded_ingredients || [],
      limit: 30 // Fetch more to have options after filtering
    });

    if (poolRecipes.length > 0) {
      // CRITICAL: Filter out recipes that have already been used
      const availableRecipes = poolRecipes.filter(recipe => 
        !usedRecipesLower.includes(recipe.name.toLowerCase().trim())
      );
      
      if (availableRecipes.length > 0) {
        // CRITICAL POST-POOL VALIDATION: Check each recipe against user profile
        // Try multiple recipes until we find one that's compatible
        let foundCompatible = false;
        const shuffled = [...availableRecipes].sort(() => Math.random() - 0.5); // Randomize order
        
        for (const recipe of shuffled) {
          // Validate this recipe against user's restrictions
          const validation = validateRecipe(
            {
              recipe_name: recipe.name,
              recipe_ingredients: recipe.ingredients || []
            },
            profile
          );
          
          if (validation.isValid) {
            // Recipe is safe for this user!
            await markRecipeAsUsed(supabase, recipe.id);
            
            results.set(mealType, {
              meal_type: mealType,
              recipe_name: recipe.name,
              recipe_calories: recipe.calories,
              recipe_protein: recipe.protein,
              recipe_carbs: recipe.carbs,
              recipe_fat: recipe.fat,
              recipe_prep_time: recipe.prep_time,
              recipe_ingredients: recipe.ingredients,
              recipe_instructions: [],
              from_pool: true
            });
            
            logStep(`✅ VALIDATED meal from pool`, { 
              mealType, 
              recipeName: recipe.name, 
              availableCount: availableRecipes.length 
            });
            foundCompatible = true;
            break; // Found a valid recipe, stop searching
          } else {
            logStep(`⚠️ Pool recipe INCOMPATIBLE, trying next`, { 
              mealType, 
              recipeName: recipe.name, 
              reason: validation.reason 
            });
          }
        }
        
        if (!foundCompatible) {
          // All available recipes were incompatible - need AI for this meal type
          logStep(`❌ All pool recipes incompatible for ${mealType} - will use AI`, { 
            totalChecked: shuffled.length 
          });
          incompatibleMealTypes.push(mealType);
        }
      } else {
        logStep(`All pool recipes already used for ${mealType}`, { 
          totalInPool: poolRecipes.length, 
          usedCount: usedRecipesLower.length 
        });
      }
    }
  }
  
  return { meals: results, incompatibleMealTypes };
}

// Save generated meals to the pool for future reuse
async function saveMealsToPool(
  supabase: any,
  meals: any[],
  profile: UserProfile
): Promise<void> {
  for (const meal of meals) {
    if (meal.from_pool) continue; // Já está no pool
    
    await saveRecipeToPool(supabase, {
      name: meal.recipe_name,
      mealType: meal.meal_type,
      calories: meal.recipe_calories || 0,
      protein: meal.recipe_protein || 0,
      carbs: meal.recipe_carbs || 0,
      fat: meal.recipe_fat || 0,
      prepTime: meal.recipe_prep_time || 30,
      ingredients: meal.recipe_ingredients || [],
      instructions: meal.recipe_instructions || [],
      countryCode: profile.country || "BR",
      languageCode: "pt-BR",
      sourceModule: "plano_ia" as SourceModule,
      compatibleMealTimes: [meal.meal_type]
    });
  }
}

// MINIMUM pool recipes needed per meal type to consider pool as primary source
const MIN_POOL_RECIPES_FOR_VARIATION = 5;

// Check if pool has enough varied recipes for a meal type
async function checkPoolSufficiency(
  supabase: any,
  profile: UserProfile,
  mealType: string,
  usedRecipes: string[]
): Promise<{ sufficient: boolean; availableCount: number }> {
  const poolRecipes = await searchRecipePool(supabase, {
    mealType,
    countryCode: profile.country || "BR",
    dietaryPreference: profile.dietary_preference || undefined,
    intolerances: profile.intolerances || [],
    excludedIngredients: profile.excluded_ingredients || [],
    limit: 50 // Fetch more to check availability
  });
  
  const usedRecipesLower = usedRecipes.map(r => r.toLowerCase().trim());
  const availableRecipes = poolRecipes.filter(recipe => 
    !usedRecipesLower.includes(recipe.name.toLowerCase().trim())
  );
  
  return {
    sufficient: availableRecipes.length >= MIN_POOL_RECIPES_FOR_VARIATION,
    availableCount: availableRecipes.length
  };
}

// Generate a single day's meals with SMART STRATEGY:
// 1. Pool FIRST when we have enough varied recipes
// 2. AI as FALLBACK when pool insufficient
// CRITICAL: Ensures real variation and uses common ingredients
async function generateSingleDay(
  profile: UserProfile,
  dayIndex: number,
  macros: { dailyCalories: number; dailyProtein: number },
  previousRecipes: string[],
  apiKey: string,
  supabase?: any,
  userId?: string,
  mealTypes?: string[],
  customMealTimes?: CustomMealTimesWithExtras | null
): Promise<any | null> {
  const dayName = DAY_NAMES[dayIndex % 7];
  const targetMealTypes = mealTypes || ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
  
  // Calculate calories dynamically
  const caloriesPerMeal = calculateCaloriesPerMeal(macros.dailyCalories, targetMealTypes);
  
  const standardTypes = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
  const extraMealTypes = targetMealTypes.filter(t => !standardTypes.includes(t));
  
  // Log what recipes we're trying to avoid
  logStep(`Day ${dayIndex} - avoiding ${previousRecipes.length} previous recipes`, {
    sample: previousRecipes.slice(0, 5)
  });
  
  const finalMeals: any[] = [];
  const mealsFromPool: string[] = [];
  const mealsNeedingAI: string[] = [];
  
  // ========================================
  // STEP 1: CHECK POOL SUFFICIENCY FOR EACH MEAL TYPE
  // ========================================
  if (supabase) {
    for (const mealType of targetMealTypes.filter(t => standardTypes.includes(t))) {
      const { sufficient, availableCount } = await checkPoolSufficiency(
        supabase, 
        profile, 
        mealType, 
        previousRecipes
      );
      
      if (sufficient) {
        mealsFromPool.push(mealType);
        logStep(`Pool SUFFICIENT for ${mealType}`, { availableCount, threshold: MIN_POOL_RECIPES_FOR_VARIATION });
      } else {
        mealsNeedingAI.push(mealType);
        logStep(`Pool INSUFFICIENT for ${mealType} - will use AI`, { availableCount, threshold: MIN_POOL_RECIPES_FOR_VARIATION });
      }
    }
    
    // Extra meals always need AI (they're custom)
    mealsNeedingAI.push(...extraMealTypes);
  } else {
    // No supabase client, all meals need AI
    mealsNeedingAI.push(...targetMealTypes);
  }
  
  // ========================================
  // STEP 2: GET MEALS FROM POOL (when sufficient)
  // ========================================
  if (supabase && mealsFromPool.length > 0) {
    const poolResult = await getMealsFromPool(supabase, profile, mealsFromPool, previousRecipes);
    poolResult.meals.forEach((meal, mealType) => {
      finalMeals.push(meal);
      logStep(`Got ${mealType} from pool`, { recipeName: meal.recipe_name });
    });
    
    // Add incompatible meal types to AI queue (these had no safe recipes in pool)
    if (poolResult.incompatibleMealTypes.length > 0) {
      mealsNeedingAI.push(...poolResult.incompatibleMealTypes);
      logStep(`Pool had incompatible recipes for some meal types`, { 
        incompatible: poolResult.incompatibleMealTypes 
      });
    }
    
    // Check if any pool meals failed - add them to AI list
    for (const mealType of mealsFromPool) {
      if (!poolResult.meals.has(mealType) && !poolResult.incompatibleMealTypes.includes(mealType)) {
        mealsNeedingAI.push(mealType);
        logStep(`Pool failed for ${mealType}, adding to AI queue`);
      }
    }
  }
  
  // ========================================
  // STEP 3: GENERATE VIA AI (for meals pool couldn't provide)
  // ========================================
  if (mealsNeedingAI.length > 0) {
    // Build list of recipes to avoid (previous + just got from pool)
    const allUsedRecipes = [
      ...previousRecipes,
      ...finalMeals.map(m => m.recipe_name)
    ];
    
    const prompt = buildSingleDayPrompt(profile, dayIndex, dayName, macros as any, allUsedRecipes);
    
    try {
      const response = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.8, // Slightly higher for more variation
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          }),
        },
        5,
        3000
      );

      if (response.ok) {
        const aiData = await response.json();
        
        // Log AI usage
        const dayUsage = extractUsageFromGeminiResponse(aiData);
        await logAIUsage({
          functionName: "generate-meal-plan",
          model: "gemini-2.5-flash-lite",
          ...dayUsage,
          userId,
          metadata: { type: "full_day", dayIndex, mealTypesCount: mealsNeedingAI.length }
        });
        
        const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          let cleanedJson = textContent.trim();
          if (cleanedJson.startsWith("```json")) cleanedJson = cleanedJson.slice(7);
          else if (cleanedJson.startsWith("```")) cleanedJson = cleanedJson.slice(3);
          if (cleanedJson.endsWith("```")) cleanedJson = cleanedJson.slice(0, -3);
          cleanedJson = cleanedJson.trim();

          const dayData = JSON.parse(cleanedJson);
          const aiMeals = dayData.meals || [];
          
          // Only add meals we actually needed from AI
          for (const mealType of mealsNeedingAI) {
            const aiMeal = aiMeals.find((m: any) => 
              m.meal_type === mealType || 
              normalizeMealType(m.meal_type) === mealType
            );
            
            if (aiMeal) {
              // Check it's not a duplicate of something we already have
              const isDuplicate = finalMeals.some(m => 
                m.recipe_name.toLowerCase().trim() === aiMeal.recipe_name?.toLowerCase().trim()
              );
              
              if (!isDuplicate) {
                finalMeals.push({ ...aiMeal, meal_type: mealType, from_pool: false });
                logStep(`AI generated ${mealType}`, { recipeName: aiMeal.recipe_name });
              } else {
                logStep(`AI returned duplicate for ${mealType}, skipping`, { recipeName: aiMeal.recipe_name });
              }
            }
          }
          
          // Save new AI-generated meals to pool for future users
          const newMeals = finalMeals.filter(m => !m.from_pool && standardTypes.includes(m.meal_type));
          if (newMeals.length > 0 && supabase) {
            await saveMealsToPool(supabase, newMeals, profile);
            logStep(`Saved ${newMeals.length} new AI meals to pool for future users`);
          }
        }
      } else {
        logStep(`AI API error for day ${dayIndex}`, { status: response.status });
      }
    } catch (error) {
      logStep(`AI generation error for day ${dayIndex}`, { error: String(error) });
    }
  }
  
  // ========================================
  // STEP 4: FINAL VALIDATION
  // ========================================
  logStep(`Day ${dayIndex} complete`, { 
    totalMeals: finalMeals.length,
    fromPool: finalMeals.filter(m => m.from_pool).length,
    fromAI: finalMeals.filter(m => !m.from_pool).length,
    recipes: finalMeals.map(m => `${m.meal_type}: ${m.recipe_name}`)
  });
  
  if (finalMeals.length === 0) {
    logStep(`Day ${dayIndex} has no meals - returning null`);
    return null;
  }
  
  return {
    day_index: dayIndex,
    day_name: dayName,
    meals: finalMeals
  };
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
    let { planName, startDate, existingPlanId, weekNumber, customMealTimes } = requestBody;
    logStep("Request received", { planName, startDate, daysCount, existingPlanId, weekNumber, hasCustomMealTimes: !!customMealTimes });

    // ========================================
    // VALIDAÇÃO DE DUPLICAÇÃO - REUTILIZAR PLANO EXISTENTE DO MESMO MÊS
    // ========================================
    let reusingExistingPlan = false;
    let existingDays: Set<string> = new Set(); // Track existing day+week combinations
    
    if (!existingPlanId) {
      const start = startDate ? new Date(startDate) : new Date();
      const targetMonth = start.getMonth();
      const targetYear = start.getFullYear();
      
      // Calculate first and last day of the target month
      const monthStart = new Date(targetYear, targetMonth, 1).toISOString().split('T')[0];
      const monthEnd = new Date(targetYear, targetMonth + 1, 0).toISOString().split('T')[0];
      
      // Check if there's already a plan that overlaps with this month
      // Order by number of items to prefer plans with more recipes
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
      
      if (checkError) {
        logStep("Error checking existing plans", { error: checkError.message });
      } else if (existingPlans && existingPlans.length > 0) {
        // Prefer plan with most items, or most recent if all have same count
        const plansWithCounts = existingPlans.map(plan => ({
          ...plan,
          itemCount: (plan.meal_plan_items as any)?.[0]?.count || 0
        }));
        
        // Sort by item count descending, then by created_at descending
        plansWithCounts.sort((a, b) => {
          if (b.itemCount !== a.itemCount) return b.itemCount - a.itemCount;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        const existingPlan = plansWithCounts[0];
        
        logStep("Found existing plan for this month - will add missing days only", { 
          existingPlanId: existingPlan.id, 
          existingPlanName: existingPlan.name,
          existingItemCount: existingPlan.itemCount,
          targetMonth: `${targetYear}-${targetMonth + 1}`,
          totalPlansFound: existingPlans.length
        });
        
        // CRITICAL: Delete ALL duplicate plans (including those with items if they have less than the best one)
        if (plansWithCounts.length > 1) {
          const duplicatePlans = plansWithCounts.filter(p => p.id !== existingPlan.id);
          logStep("Found duplicate plans to cleanup", { 
            count: duplicatePlans.length,
            duplicateIds: duplicatePlans.map(p => p.id),
            duplicateItemCounts: duplicatePlans.map(p => p.itemCount)
          });
          
          for (const duplicatePlan of duplicatePlans) {
            // First delete items, then delete plan
            await supabaseClient
              .from("meal_plan_items")
              .delete()
              .eq("meal_plan_id", duplicatePlan.id);
              
            await supabaseClient
              .from("meal_plans")
              .delete()
              .eq("id", duplicatePlan.id)
              .eq("user_id", user.id);
              
            logStep("Deleted duplicate plan", { 
              planId: duplicatePlan.id, 
              hadItems: duplicatePlan.itemCount 
            });
          }
          logStep("Cleaned up all duplicate plans");
        }
        
        // Fetch existing items to know which days already have recipes
        const { data: existingItems, error: fetchItemsError } = await supabaseClient
          .from("meal_plan_items")
          .select("day_of_week, week_number")
          .eq("meal_plan_id", existingPlan.id);
        
        if (fetchItemsError) {
          logStep("Error fetching existing items", { error: fetchItemsError.message });
        } else if (existingItems && existingItems.length > 0) {
          // Create a set of existing day+week combinations
          existingItems.forEach(item => {
            existingDays.add(`${item.week_number}-${item.day_of_week}`);
          });
          logStep("Existing days found", { 
            count: existingDays.size,
            days: Array.from(existingDays)
          });
        }
        
        // Reutilizar o plano existente SEM deletar items
        existingPlanId = existingPlan.id;
        reusingExistingPlan = true;
      } else {
        logStep("No existing plan found, proceeding with new creation");
      }
    }

    // Fetch previous week's recipes to avoid repetition
    let previousRecipes: string[] = [];
    const targetWeekNumber = weekNumber || 1;
    
    if (existingPlanId && targetWeekNumber > 1 && !reusingExistingPlan) {
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
    // EXTRACT MEAL TYPES FROM CUSTOM MEAL TIMES
    // ========================================
    const mealTypesToGenerate = getMealTypesFromCustomTimes(customMealTimes as CustomMealTimesWithExtras | null);
    logStep("Meal types to generate", { mealTypes: mealTypesToGenerate, count: mealTypesToGenerate.length });
    
    // ========================================
    // GERAR DIAS UM A UM PARA EVITAR TRUNCAMENTO
    // ========================================
    logStep("Generating days one by one with Flash-Lite");
    
    const allDays: any[] = [];
    const usedRecipes = [...previousRecipes];
    const targetWeekNum = weekNumber || 1;
    let skippedDays = 0;
    
    for (let i = 0; i < daysCount; i++) {
      // Check if this day already exists in the plan
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
        supabaseClient, // Passa o cliente para buscar do pool
        user.id, // Passa o userId para logging
        mealTypesToGenerate, // Pass dynamic meal types
        customMealTimes as CustomMealTimesWithExtras | null
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
    logStep("All days generated", { 
      daysGenerated: allDays.length, 
      daysSkipped: skippedDays,
      totalRequested: daysCount 
    });
    
    // If all days were skipped, return early with success
    if (allDays.length === 0 && skippedDays > 0) {
      logStep("All requested days already exist - nothing to generate");
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
    
    // If no days were generated and none were skipped, there's an error - don't create empty plan
    if (allDays.length === 0) {
      logStep("No days generated and none skipped - returning error to avoid empty plan");
      throw new Error("Não foi possível gerar nenhuma refeição. Tente novamente.");
    }

    // ========================================
    // VALIDAÇÃO E COMPLETAÇÃO DE REFEIÇÕES FALTANTES
    // ========================================
    mealPlanData = await validateAndCompleteMeals(
      mealPlanData,
      profile as UserProfile,
      macros,
      daysCount,
      GOOGLE_AI_API_KEY,
      user.id,
      mealTypesToGenerate, // Pass dynamic meal types
      customMealTimes as CustomMealTimesWithExtras | null
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
      issuesCount: validationSummary.issues.length
    });
    
    // Regenerar receitas com problemas
    if (validationSummary.issues.length > 0 && validationSummary.issues.length <= 5) {
      logStep("Regenerating invalid meals", { count: validationSummary.issues.length });
      
      // Calcular calorias por tipo de refeição
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
    
    // ========================================
    // VALIDAÇÃO FINAL - GARANTIR QUE TEMOS REFEIÇÕES SUFICIENTES
    // ========================================
    const totalMealsGenerated = mealPlanData.days.reduce((sum: number, day: any) => sum + (day.meals?.length || 0), 0);
    const minMealsRequired = allDays.length * Math.max(1, mealTypesToGenerate.length - 1); // At least N-1 meals per day
    
    if (totalMealsGenerated < minMealsRequired) {
      logStep("Insufficient meals generated - aborting to prevent incomplete plan", {
        totalMealsGenerated,
        minMealsRequired,
        daysGenerated: allDays.length
      });
      throw new Error(`Geração incompleta: apenas ${totalMealsGenerated} refeições foram geradas. Tente novamente.`);
    }
    
    logStep("TRANSACTIONAL: All meals generated successfully, now persisting to database", {
      totalMeals: totalMealsGenerated,
      daysCount: allDays.length
    });

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
      
      // Always update custom_meal_times and end_date if needed
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
      
      logStep("Updated existing meal plan with custom_meal_times", { 
        planId: existingPlanId, 
        hasCustomTimes: !!customMealTimes 
      });

      mealPlan = { ...existingPlan, custom_meal_times: customMealTimes || existingPlan.custom_meal_times };
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
