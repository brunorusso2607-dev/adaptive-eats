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
  component_type: string;
  portion_label: string;
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
  item: string;
  quantity: string;
  unit: string;
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

// Custom meal times type (simplified - no extras)
interface CustomMealTimes {
  [key: string]: string | undefined;
}

// ============= MEAL COMPOSITION RULES (based on nutritionist standards) =============
// Each meal type has required component_types
const MEAL_COMPOSITION: Record<string, { components: string[]; description: string }> = {
  cafe_manha: {
    components: ["beverage", "breakfast_carb", "breakfast_protein", "breakfast_fruit"],
    description: "Café da Manhã"
  },
  almoco: {
    components: ["main_protein", "rice", "beans", "vegetable"],
    description: "Almoço"
  },
  lanche_manha: {
    components: ["snack_main"],
    description: "Lanche da Manhã"
  },
  lanche_tarde: {
    components: ["snack_main", "snack_complement"],
    description: "Lanche da Tarde"
  },
  lanche: {
    components: ["snack_main", "snack_complement"],
    description: "Lanche"
  },
  jantar: {
    components: ["light_dinner"],
    description: "Jantar"
  },
  ceia: {
    components: ["supper"],
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

function getMealTypesFromCustomTimes(customMealTimes?: CustomMealTimes | null): string[] {
  // Default now includes lanche_manha
  const defaultMealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
  
  if (!customMealTimes || typeof customMealTimes !== 'object') {
    return defaultMealTypes;
  }
  
  const mealTypes: string[] = [];
  
  for (const [key, value] of Object.entries(customMealTimes)) {
    if (typeof value === 'string' && value) {
      mealTypes.push(key);
    }
  }
  
  if (mealTypes.length === 0) {
    mealTypes.push(...defaultMealTypes);
  }
  
  return mealTypes;
}

function getMealTypeLabel(mealType: string): string {
  const composition = MEAL_COMPOSITION[mealType];
  if (composition) {
    return composition.description;
  }
  return mealType;
}

function calculateCaloriesPerMeal(dailyCalories: number, mealTypes: string[]): Record<string, number> {
  const caloriesPerMeal: Record<string, number> = {};
  
  const standardMeals: string[] = [];
  const extraMeals: string[] = [];
  
  for (const mealType of mealTypes) {
    if (CALORIE_DISTRIBUTION[mealType] !== undefined) {
      standardMeals.push(mealType);
    } else {
      extraMeals.push(mealType);
    }
  }
  
  if (extraMeals.length > 0) {
    const reductionFactor = 0.92;
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
    const foodNameLower = food.name.toLowerCase();
    const tags = food.dietary_tags || [];
    
    // Check excluded ingredients
    if (excludedIngredients.some(excluded => foodNameLower.includes(excluded))) {
      return false;
    }
    
    // Check dietary preference - be more permissive
    if (dietaryPref === 'vegana') {
      if (!tags.includes('vegana')) return false;
    } else if (dietaryPref === 'vegetariana') {
      // Vegetarian can eat: vegetariana, vegana, or comum (if no meat)
      const isVegetarianFriendly = tags.includes('vegetariana') || tags.includes('vegana');
      if (!isVegetarianFriendly) return false;
    } else if (dietaryPref === 'low_carb') {
      if (!tags.includes('low_carb') && food.carbs_per_100g > 25) return false;
    } else if (dietaryPref === 'pescetariana') {
      const isAllowed = tags.includes('vegetariana') || tags.includes('vegana') || tags.includes('pescetariana');
      if (!isAllowed) return false;
    }
    // 'comum' accepts all foods
    
    // Check intolerances - must have sem_X tag or not contain problematic ingredients
    for (const intolerance of intolerances) {
      if (intolerance.includes('lactose')) {
        const hasDairyKeyword = ['leite', 'queijo', 'iogurte', 'ricota', 'cottage', 'requeijão', 'nata', 'creme']
          .some(dairy => foodNameLower.includes(dairy));
        if (hasDairyKeyword && !tags.includes('sem_lactose')) {
          return false;
        }
      }
      if (intolerance.includes('gluten')) {
        const hasGlutenKeyword = ['pão', 'aveia', 'bolo', 'biscoito', 'torrada', 'cuscuz', 'macarrão', 'massa', 'trigo']
          .some(gluten => foodNameLower.includes(gluten));
        if (hasGlutenKeyword && !tags.includes('sem_gluten')) {
          return false;
        }
      }
      if (intolerance.includes('amendoim')) {
        if (foodNameLower.includes('amendoim') || foodNameLower.includes('pasta de amendoim')) {
          return false;
        }
      }
    }
    
    return true;
  });
}

// Pick a random food by component_type
function pickRandomByComponentType(
  foods: NutritionistFood[],
  componentType: string,
  mealType: string,
  usedFoodsToday: Set<string>
): NutritionistFood | null {
  const compatible = foods.filter(f => 
    f.component_type === componentType && 
    f.compatible_meals.includes(mealType) &&
    !usedFoodsToday.has(f.id)
  );
  
  if (compatible.length === 0) {
    // Fallback: allow used foods
    const fallback = foods.filter(f => 
      f.component_type === componentType && 
      f.compatible_meals.includes(mealType)
    );
    if (fallback.length === 0) return null;
    return fallback[Math.floor(Math.random() * fallback.length)];
  }
  
  return compatible[Math.floor(Math.random() * compatible.length)];
}

// Generate a single meal using component-based approach
function generateMealFromComponents(
  mealType: string,
  filteredFoods: NutritionistFood[],
  usedFoodsToday: Set<string>
): GeneratedMeal {
  const composition = MEAL_COMPOSITION[mealType] || MEAL_COMPOSITION.lanche;
  const componentTypes = composition.components;
  const label = getMealTypeLabel(mealType);
  
  const ingredients: MealIngredient[] = [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  
  for (const componentType of componentTypes) {
    const food = pickRandomByComponentType(filteredFoods, componentType, mealType, usedFoodsToday);
    
    if (food) {
      usedFoodsToday.add(food.id);
      
      // Use default portion and portion_label (nutritionist format)
      const portion = food.default_portion_grams;
      const factor = portion / 100;
      
      // Add ingredient with nutritionist-style format
      ingredients.push({
        item: food.name,
        quantity: food.portion_label, // "1 fatia", "3 colheres de sopa", etc.
        unit: ""
      });
      
      totalCalories += Math.round(food.calories_per_100g * factor);
      totalProtein += food.protein_per_100g * factor;
      totalCarbs += food.carbs_per_100g * factor;
      totalFat += food.fat_per_100g * factor;
    }
  }
  
  return {
    meal_type: mealType,
    recipe_name: label, // Just the meal type label, e.g., "Café da Manhã"
    recipe_calories: Math.round(totalCalories),
    recipe_protein: Math.round(totalProtein * 10) / 10,
    recipe_carbs: Math.round(totalCarbs * 10) / 10,
    recipe_fat: Math.round(totalFat * 10) / 10,
    recipe_prep_time: 15,
    recipe_ingredients: ingredients,
    recipe_instructions: []
  };
}

// Generate all meals for a single day
function generateDayMeals(
  dayIndex: number,
  mealTypes: string[],
  filteredFoods: NutritionistFood[],
  previousDayFoods: Set<string>
): { meals: GeneratedMeal[]; usedFoods: Set<string> } {
  const usedFoodsToday = new Set<string>();
  const meals: GeneratedMeal[] = [];
  
  for (const mealType of mealTypes) {
    const meal = generateMealFromComponents(
      mealType,
      filteredFoods,
      usedFoodsToday
    );
    
    if (meal.recipe_ingredients.length > 0) {
      meals.push(meal);
      logStep(`Generated meal`, { 
        dayIndex, 
        mealType, 
        ingredients: meal.recipe_ingredients.map(i => `${i.quantity} de ${i.item}`)
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
    logStep("Function started - Component-Based Nutritionist Mode v2");

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
    const filteredFoods = filterFoodsForUser(allFoods as NutritionistFood[], profile as UserProfile);
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
    const mealTypesToGenerate = getMealTypesFromCustomTimes(customMealTimes as CustomMealTimes | null);
    logStep("Meal types to generate", { mealTypes: mealTypesToGenerate });

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
        filteredFoods,
        previousDayFoods
      );
      
      allDays.push({
        day_index: i,
        day_name: DAY_NAMES[i % 7],
        meals
      });
      
      previousDayFoods = usedFoods;
    }
    
    logStep("All days generated", { 
      daysGenerated: allDays.length, 
      daysSkipped: skippedDays,
      totalMeals: allDays.reduce((sum, d) => sum + d.meals.length, 0)
    });
    
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
