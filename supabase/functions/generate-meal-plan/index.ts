import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { calculateMacroTargets, type UserProfile } from "../_shared/recipeConfig.ts";

const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MEAL-PLAN] ${step}${detailsStr}`);
};

// ============= INTERFACES =============
interface NutritionistFood {
  id: string;
  name: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  default_portion_grams: number;
  compatible_meals: string[];
  dietary_tags: string[];
}

interface MealIngredient {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface GeneratedMeal {
  meal_type: string;
  recipe_name: string;
  recipe_calories: number;
  recipe_protein: number;
  recipe_carbs: number;
  recipe_fat: number;
  recipe_prep_time: number;
  recipe_ingredients: MealIngredient[];
  recipe_instructions: string[];
}

interface ExtraMeal {
  id: string;
  name: string;
  time: string;
}

interface CustomMealTimesWithExtras {
  [key: string]: string | ExtraMeal[] | undefined;
  extras?: ExtraMeal[];
}

// ============= MEAL COMPOSITION RULES =============
const MEAL_COMPOSITION: Record<string, { categories: string[]; description: string }> = {
  cafe_manha: {
    categories: ["cafe", "fruta"],
    description: "Café da Manhã"
  },
  almoco: {
    categories: ["carb", "protein", "legume", "vegetal"],
    description: "Almoço"
  },
  lanche: {
    categories: ["lanche"],
    description: "Lanche"
  },
  lanche_manha: {
    categories: ["lanche", "fruta"],
    description: "Lanche da Manhã"
  },
  lanche_tarde: {
    categories: ["lanche", "fruta"],
    description: "Lanche da Tarde"
  },
  jantar: {
    categories: ["carb", "protein", "vegetal"],
    description: "Jantar"
  },
  ceia: {
    categories: ["ceia", "fruta"],
    description: "Ceia"
  }
};

// Calorie distribution per meal type (percentage of daily calories)
const CALORIE_DISTRIBUTION: Record<string, number> = {
  cafe_manha: 0.25,
  almoco: 0.30,
  lanche: 0.10,
  lanche_manha: 0.08,
  lanche_tarde: 0.08,
  jantar: 0.22,
  ceia: 0.05,
};

// ============= HELPER FUNCTIONS =============

function normalizeMealType(mealType: string): string {
  if (!mealType) return "cafe_manha";
  
  const normalized = mealType.toLowerCase().trim();
  
  const normalizations: Record<string, string> = {
    "breakfast": "cafe_manha",
    "lunch": "almoco",
    "dinner": "jantar",
    "snack": "lanche",
    "supper": "ceia",
    "lanche_da_tarde": "lanche_tarde",
    "café_manha": "cafe_manha",
    "cafe_da_manha": "cafe_manha",
    "café_da_manhã": "cafe_manha",
    "almoço": "almoco",
  };
  
  return normalizations[normalized] || normalized;
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
  
  return mealTypes;
}

function getMealTypeLabel(mealType: string, customMealTimes?: CustomMealTimesWithExtras | null): string {
  const composition = MEAL_COMPOSITION[mealType];
  if (composition) {
    return composition.description;
  }
  
  if (customMealTimes?.extras && Array.isArray(customMealTimes.extras)) {
    const extra = customMealTimes.extras.find((e: ExtraMeal) => e.id === mealType);
    if (extra) {
      return extra.name;
    }
  }
  
  return mealType;
}

function calculateCaloriesPerMeal(dailyCalories: number, mealTypes: string[]): Record<string, number> {
  const caloriesPerMeal: Record<string, number> = {};
  
  let totalPercentage = 0;
  const standardMeals: string[] = [];
  const extraMeals: string[] = [];
  
  for (const mealType of mealTypes) {
    if (CALORIE_DISTRIBUTION[mealType] !== undefined) {
      standardMeals.push(mealType);
      totalPercentage += CALORIE_DISTRIBUTION[mealType];
    } else {
      extraMeals.push(mealType);
    }
  }
  
  // Redistribute if we have extras
  if (extraMeals.length > 0) {
    const reductionFactor = 0.92; // Reduce standard meals by 8%
    const extraPercentage = (standardMeals.length * 0.08 * CALORIE_DISTRIBUTION.lanche) / extraMeals.length;
    
    for (const mealType of standardMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * CALORIE_DISTRIBUTION[mealType] * reductionFactor);
    }
    
    for (const mealType of extraMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * extraPercentage);
    }
  } else {
    for (const mealType of standardMeals) {
      caloriesPerMeal[mealType] = Math.round(dailyCalories * CALORIE_DISTRIBUTION[mealType]);
    }
  }
  
  return caloriesPerMeal;
}

// Filter foods based on user's dietary restrictions
function filterFoodsForUser(foods: NutritionistFood[], profile: UserProfile): NutritionistFood[] {
  const intolerances = profile.intolerances || [];
  const dietaryPref = profile.dietary_preference || 'comum';
  const excludedIngredients = (profile.excluded_ingredients || []).map(i => i.toLowerCase());
  
  return foods.filter(food => {
    // Check excluded ingredients
    const foodNameLower = food.name.toLowerCase();
    if (excludedIngredients.some(excluded => foodNameLower.includes(excluded))) {
      return false;
    }
    
    // Check dietary preference
    if (dietaryPref === 'vegana' && !food.dietary_tags.includes('vegano')) {
      return false;
    }
    if (dietaryPref === 'vegetariana' && !food.dietary_tags.includes('vegetariano') && !food.dietary_tags.includes('vegano')) {
      return false;
    }
    if (dietaryPref === 'low_carb' && !food.dietary_tags.includes('low_carb')) {
      // For low_carb, prefer low_carb tagged foods but don't exclude others with reasonable carbs
      if (food.carbs_per_100g > 30) return false;
    }
    
    // Check intolerances
    for (const intolerance of intolerances) {
      const tag = `sem_${intolerance.toLowerCase().replace('intolerancia_', '')}`;
      if (intolerance.includes('gluten') && !food.dietary_tags.includes('sem_gluten')) {
        return false;
      }
      if (intolerance.includes('lactose') && !food.dietary_tags.includes('sem_lactose')) {
        return false;
      }
    }
    
    return true;
  });
}

// Pick a random food from a category that's compatible with the meal type
function pickRandomFood(
  foods: NutritionistFood[],
  category: string,
  mealType: string,
  usedFoodsToday: Set<string>
): NutritionistFood | null {
  const compatible = foods.filter(f => 
    f.category === category && 
    f.compatible_meals.includes(mealType) &&
    !usedFoodsToday.has(f.id)
  );
  
  if (compatible.length === 0) {
    // Fallback: allow used foods if no fresh options
    const fallback = foods.filter(f => 
      f.category === category && 
      f.compatible_meals.includes(mealType)
    );
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  
  return compatible[Math.floor(Math.random() * compatible.length)];
}

// Adjust portion to meet calorie target
function adjustPortion(food: NutritionistFood, targetCalories: number, maxPortion: number = 300): number {
  const caloriesPer100g = food.calories_per_100g || 100;
  const calculatedPortion = (targetCalories / caloriesPer100g) * 100;
  
  // Clamp between min and max reasonable portions
  const minPortion = 30;
  return Math.round(Math.max(minPortion, Math.min(calculatedPortion, maxPortion)));
}

// Generate a single meal using component-based approach
function generateMealFromComponents(
  mealType: string,
  targetCalories: number,
  filteredFoods: NutritionistFood[],
  usedFoodsToday: Set<string>,
  customMealTimes?: CustomMealTimesWithExtras | null
): GeneratedMeal {
  const composition = MEAL_COMPOSITION[mealType] || MEAL_COMPOSITION.lanche;
  const categories = composition.categories;
  const label = getMealTypeLabel(mealType, customMealTimes);
  
  const ingredients: MealIngredient[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  
  // Distribute calories across components
  const caloriesPerComponent = Math.round(targetCalories / categories.length);
  
  for (const category of categories) {
    const food = pickRandomFood(filteredFoods, category, mealType, usedFoodsToday);
    
    if (food) {
      usedFoodsToday.add(food.id);
      
      // For simpler meals (lanches), use default portion
      // For main meals, adjust to meet calorie target
      let portion: number;
      if (mealType.includes('lanche') || mealType === 'ceia') {
        portion = food.default_portion_grams;
      } else {
        portion = adjustPortion(food, caloriesPerComponent);
      }
      
      const factor = portion / 100;
      const ingredientCalories = Math.round(food.calories_per_100g * factor);
      const ingredientProtein = Math.round(food.protein_per_100g * factor * 10) / 10;
      const ingredientCarbs = Math.round(food.carbs_per_100g * factor * 10) / 10;
      const ingredientFat = Math.round(food.fat_per_100g * factor * 10) / 10;
      
      ingredients.push({
        name: food.name,
        quantity: `${portion}g`,
        calories: ingredientCalories,
        protein: ingredientProtein,
        carbs: ingredientCarbs,
        fat: ingredientFat
      });
      
      totalCalories += ingredientCalories;
      totalProtein += ingredientProtein;
      totalCarbs += ingredientCarbs;
      totalFat += ingredientFat;
    }
  }
  
  // Generate recipe name from ingredients
  const recipeName = ingredients.length > 0 
    ? `${label}: ${ingredients.map(i => i.name).join(', ')}`
    : `${label} Simples`;
  
  return {
    meal_type: mealType,
    recipe_name: recipeName,
    recipe_calories: Math.round(totalCalories),
    recipe_protein: Math.round(totalProtein * 10) / 10,
    recipe_carbs: Math.round(totalCarbs * 10) / 10,
    recipe_fat: Math.round(totalFat * 10) / 10,
    recipe_prep_time: 15,
    recipe_ingredients: ingredients,
    recipe_instructions: [] // Always empty in nutritionist mode
  };
}

// Generate all meals for a single day
function generateDayMeals(
  dayIndex: number,
  mealTypes: string[],
  caloriesPerMeal: Record<string, number>,
  filteredFoods: NutritionistFood[],
  previousDayFoods: Set<string>,
  customMealTimes?: CustomMealTimesWithExtras | null
): { meals: GeneratedMeal[]; usedFoods: Set<string> } {
  const usedFoodsToday = new Set<string>();
  const meals: GeneratedMeal[] = [];
  
  for (const mealType of mealTypes) {
    const targetCalories = caloriesPerMeal[mealType] || 300;
    
    const meal = generateMealFromComponents(
      mealType,
      targetCalories,
      filteredFoods,
      usedFoodsToday,
      customMealTimes
    );
    
    if (meal.recipe_ingredients.length > 0) {
      meals.push(meal);
      logStep(`Generated meal`, { 
        dayIndex, 
        mealType, 
        recipeName: meal.recipe_name,
        calories: meal.recipe_calories,
        ingredients: meal.recipe_ingredients.length
      });
    }
  }
  
  return { meals, usedFoods: usedFoodsToday };
}

// ============= MAIN SERVER =============

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
    logStep("Function started - Component-Based Nutritionist Mode");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request
    const requestBody = await req.json();
    const daysCount = Math.min(requestBody.daysCount || 7, 7);
    let { planName, startDate, existingPlanId, weekNumber, customMealTimes } = requestBody;
    logStep("Request received", { planName, startDate, daysCount, existingPlanId, weekNumber });

    // Fetch nutritionist foods from database
    const { data: allFoods, error: foodsError } = await supabaseClient
      .from("nutritionist_foods")
      .select("*")
      .eq("is_active", true);

    if (foodsError) throw new Error(`Error fetching nutritionist foods: ${foodsError.message}`);
    if (!allFoods || allFoods.length === 0) throw new Error("No nutritionist foods configured");
    
    logStep("Nutritionist foods fetched", { count: allFoods.length });

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
        .select(`id, name, start_date, end_date, created_at, meal_plan_items(count)`)
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
          for (const duplicatePlan of plansWithCounts.filter(p => p.id !== existingPlan.id)) {
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
      goal: profile.goal
    });

    // Filter foods based on user restrictions
    const filteredFoods = filterFoodsForUser(allFoods, profile as UserProfile);
    logStep("Foods filtered for user", { 
      original: allFoods.length, 
      filtered: filteredFoods.length 
    });

    if (filteredFoods.length < 10) {
      throw new Error("Poucos alimentos disponíveis para suas restrições. Por favor, contate o suporte.");
    }

    // Calculate personalized macros
    const macros = calculateMacroTargets(profile as UserProfile);
    logStep("Macros calculated", macros);

    // Extract meal types
    const mealTypesToGenerate = getMealTypesFromCustomTimes(customMealTimes as CustomMealTimesWithExtras | null);
    logStep("Meal types to generate", { mealTypes: mealTypesToGenerate });
    
    // Calculate calories per meal
    const caloriesPerMeal = calculateCaloriesPerMeal(macros.dailyCalories, mealTypesToGenerate);
    logStep("Calories per meal", caloriesPerMeal);

    // Generate days
    const allDays: { day_index: number; day_name: string; meals: GeneratedMeal[] }[] = [];
    const targetWeekNum = weekNumber || 1;
    let skippedDays = 0;
    let previousDayFoods = new Set<string>();
    
    for (let i = 0; i < daysCount; i++) {
      const dayKey = `${targetWeekNum}-${i}`;
      if (existingDays.has(dayKey)) {
        logStep(`Skipping day ${i + 1}/${daysCount} - already exists`, { dayKey });
        skippedDays++;
        continue;
      }
      
      logStep(`Generating day ${i + 1}/${daysCount} (${DAY_NAMES[i % 7]})`);
      
      const { meals, usedFoods } = generateDayMeals(
        i,
        mealTypesToGenerate,
        caloriesPerMeal,
        filteredFoods,
        previousDayFoods,
        customMealTimes as CustomMealTimesWithExtras | null
      );
      
      allDays.push({
        day_index: i,
        day_name: DAY_NAMES[i % 7],
        meals
      });
      
      // Use this day's foods to avoid in next day (for variety)
      previousDayFoods = usedFoods;
    }
    
    logStep("All days generated", { 
      daysGenerated: allDays.length, 
      daysSkipped: skippedDays,
      totalMeals: allDays.reduce((sum, d) => sum + d.meals.length, 0)
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
    const items = allDays.flatMap((day) =>
      day.meals.map((meal) => ({
        meal_plan_id: mealPlanIdToUse,
        day_of_week: day.day_index,
        meal_type: normalizeMealType(meal.meal_type),
        recipe_name: meal.recipe_name,
        recipe_calories: meal.recipe_calories,
        recipe_protein: meal.recipe_protein,
        recipe_carbs: meal.recipe_carbs,
        recipe_fat: meal.recipe_fat,
        recipe_prep_time: meal.recipe_prep_time,
        recipe_ingredients: meal.recipe_ingredients,
        recipe_instructions: [],
        week_number: weekNumber || 1
      }))
    );

    logStep("Final meals distribution", allDays.map((day) => ({
      day: day.day_index,
      mealsCount: day.meals.length,
      mealTypes: day.meals.map((m) => m.meal_type)
    })));

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
      },
      stats: {
        daysGenerated: allDays.length,
        totalMeals: items.length,
        skippedDays
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
