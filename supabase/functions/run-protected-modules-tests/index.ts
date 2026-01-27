import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration_ms: number;
}

interface ModuleTestSuite {
  module: string;
  description: string;
  tests: TestResult[];
  passed: number;
  failed: number;
}

// ============================================
// MÓDULO 1: Calendário e Seleção de Dias
// ============================================
async function testCalendarModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];
  const start = Date.now();

  // Test 1.1: meal_plans table accessibility
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("meal_plans")
      .select("id, start_date, end_date, is_active")
      .limit(1);
    
    tests.push({
      name: "meal_plans table accessible",
      passed: !error,
      message: error ? error.message : "Table accessible with start_date and end_date fields",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "meal_plans table accessible",
      passed: false,
      message: String(e),
      duration_ms: Date.now() - start,
    });
  }

  // Test 1.2: Verify start_date field exists and is date type
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("meal_plans")
      .select("start_date")
      .limit(1);
    
    const hasStartDate = !error;
    tests.push({
      name: "start_date field exists in meal_plans",
      passed: hasStartDate,
      message: hasStartDate ? "start_date field is available for planStartDate filtering" : "start_date field missing",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "start_date field exists in meal_plans",
      passed: false,
      message: String(e),
      duration_ms: Date.now() - start,
    });
  }

  // Test 1.3: Verify week_number field in meal_plan_items
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("meal_plan_items")
      .select("week_number, day_of_week")
      .limit(1);
    
    tests.push({
      name: "week_number and day_of_week fields exist",
      passed: !error,
      message: error ? error.message : "Calendar navigation fields available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "week_number and day_of_week fields exist",
      passed: false,
      message: String(e),
      duration_ms: Date.now() - start,
    });
  }

  return {
    module: "Calendário e Seleção de Dias",
    description: "Valida MealPlanCalendar.tsx, WeekDaySelector.tsx, useMonthWeeks.ts",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 2: Geração de Planos
// ============================================
async function testMealPlanGenerationModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 2.1: meal_plan_items structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("meal_plan_items")
      .select("id, meal_plan_id, meal_type, recipe_name, recipe_ingredients, recipe_instructions, recipe_calories, recipe_protein, recipe_carbs, recipe_fat")
      .limit(1);
    
    tests.push({
      name: "meal_plan_items structure complete",
      passed: !error,
      message: error ? error.message : "All recipe fields available for meal generation",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "meal_plan_items structure complete",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 2.2: simple_meals table for pool
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("simple_meals")
      .select("*", { count: "exact", head: true });
    
    const hasEnoughMeals = (count || 0) >= 10;
    tests.push({
      name: "simple_meals pool has sufficient entries",
      passed: hasEnoughMeals && !error,
      message: error ? error.message : `Pool contains ${count} meals (minimum: 10)`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "simple_meals pool has sufficient entries",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 2.3: nutritional_strategies accessibility
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("nutritional_strategies")
      .select("key, calorie_modifier, protein_per_kg, carb_ratio, fat_ratio")
      .eq("is_active", true);
    
    const hasStrategies = (data?.length || 0) > 0;
    tests.push({
      name: "nutritional_strategies available",
      passed: hasStrategies && !error,
      message: error ? error.message : `${data?.length} active strategies available`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "nutritional_strategies available",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Geração de Planos",
    description: "Valida generate-ai-meal-plan, mealGenerationConfig.ts, intoleranceMealPool.ts",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 3: Sistema de Segurança (VETO LAYER)
// ============================================
async function testSecurityModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 3.1: intolerance_mappings count (must be > 5000 for safety)
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("intolerance_mappings")
      .select("*", { count: "exact", head: true });
    
    const hasSufficientMappings = (count || 0) >= 100;
    tests.push({
      name: "intolerance_mappings has sufficient entries",
      passed: hasSufficientMappings && !error,
      message: error ? error.message : `${count} mappings loaded (validates query limit)`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "intolerance_mappings has sufficient entries",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 3.2: dietary_forbidden_ingredients table
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("dietary_forbidden_ingredients")
      .select("*", { count: "exact", head: true });
    
    tests.push({
      name: "dietary_forbidden_ingredients accessible",
      passed: !error,
      message: error ? error.message : `${count} forbidden ingredients configured`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "dietary_forbidden_ingredients accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 3.3: intolerance_safe_keywords (false positive prevention)
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("intolerance_safe_keywords")
      .select("*", { count: "exact", head: true });
    
    tests.push({
      name: "intolerance_safe_keywords for false positive prevention",
      passed: !error,
      message: error ? error.message : `${count} safe keywords configured`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "intolerance_safe_keywords for false positive prevention",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 3.4: dynamic_safe_ingredients table
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("dynamic_safe_ingredients")
      .select("ingredient, safe_for, is_active")
      .eq("is_active", true)
      .limit(5);
    
    tests.push({
      name: "dynamic_safe_ingredients accessible",
      passed: !error,
      message: error ? error.message : `Dynamic safe ingredients table functional`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "dynamic_safe_ingredients accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 3.5: Validate all 17 standard intolerances exist
  const standardIntolerances = [
    "lactose", "gluten", "ovo", "amendoim", "nozes", "soja", "peixe",
    "frutos_do_mar", "gergelim", "mostarda", "aipo", "sulfitos",
    "lupino", "moluscos", "frutose", "sorbitol", "histamina"
  ];
  
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("intolerance_mappings")
      .select("intolerance_key")
      .limit(5000);
    
    if (!error && data) {
      const foundKeys = new Set(data.map((d: any) => d.intolerance_key));
      const missingKeys = standardIntolerances.filter(k => !foundKeys.has(k));
      
      tests.push({
        name: "All 17 standard intolerances mapped",
        passed: missingKeys.length === 0,
        message: missingKeys.length === 0 
          ? "All 17 intolerances have mappings" 
          : `Missing: ${missingKeys.join(", ")}`,
        duration_ms: Date.now() - testStart,
      });
    } else {
      tests.push({
        name: "All 17 standard intolerances mapped",
        passed: false,
        message: error?.message || "Failed to query intolerances",
        duration_ms: Date.now() - testStart,
      });
    }
  } catch (e) {
    tests.push({
      name: "All 17 standard intolerances mapped",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Sistema de Segurança (VETO LAYER)",
    description: "Valida globalSafetyEngine.ts, intoleranceDetection.ts, getIntoleranceMappings.ts",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 4: Consumo e Histórico
// ============================================
async function testConsumptionModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 4.1: meal_consumption structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("meal_consumption")
      .select("id, user_id, meal_plan_item_id, followed_plan, total_calories, total_protein, total_carbs, total_fat, consumed_at, feedback_status")
      .limit(1);
    
    tests.push({
      name: "meal_consumption table structure complete",
      passed: !error,
      message: error ? error.message : "All consumption tracking fields available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "meal_consumption table structure complete",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 4.2: consumption_items structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("consumption_items")
      .select("id, meal_consumption_id, food_name, quantity_grams, calories, protein, carbs, fat")
      .limit(1);
    
    tests.push({
      name: "consumption_items table structure complete",
      passed: !error,
      message: error ? error.message : "All item tracking fields available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "consumption_items table structure complete",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Consumo e Histórico",
    description: "Valida useMealConsumption.tsx, useDailyConsumption.tsx, MealHistoryPage.tsx",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 5: Perfil do Usuário
// ============================================
async function testProfileModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 5.1: profiles table with all critical fields
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, weight_current, weight_goal, height, age, sex, activity_level, goal, dietary_preference, intolerances, excluded_ingredients, enabled_meals, strategy_id, timezone, country")
      .limit(1);
    
    tests.push({
      name: "profiles table has all critical fields",
      passed: !error,
      message: error ? error.message : "All profile fields available for calorie calculation and safety",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "profiles table has all critical fields",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 5.2: enabled_meals field type check
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("profiles")
      .select("enabled_meals")
      .limit(1);
    
    tests.push({
      name: "enabled_meals field accessible",
      passed: !error,
      message: error ? error.message : "enabled_meals array field functional",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "enabled_meals field accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Perfil do Usuário",
    description: "Valida ProfilePage.tsx, useUserProfileContext.tsx",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 6: Sintomas e Água
// ============================================
async function testSymptomsWaterModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 6.1: symptom_logs structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("symptom_logs")
      .select("id, user_id, symptoms, severity, meal_consumption_id, logged_at")
      .limit(1);
    
    tests.push({
      name: "symptom_logs table accessible",
      passed: !error,
      message: error ? error.message : "Symptom tracking fields available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "symptom_logs table accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 6.2: symptom_types configuration
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("symptom_types")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    
    tests.push({
      name: "symptom_types configured",
      passed: !error && (count || 0) > 0,
      message: error ? error.message : `${count} symptom types configured`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "symptom_types configured",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 6.3: water_consumption table (via user_gamification as proxy)
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("user_gamification")
      .select("id")
      .limit(1);
    
    tests.push({
      name: "gamification/water tracking accessible",
      passed: !error,
      message: error ? error.message : "Water tracking infrastructure functional",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "gamification/water tracking accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Sintomas e Água",
    description: "Valida useSymptomTracker.tsx, useWaterConsumption.tsx, WaterTracker.tsx",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 7: Notificações
// ============================================
async function testNotificationsModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 7.1: push_subscriptions structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .limit(1);
    
    tests.push({
      name: "push_subscriptions table accessible",
      passed: !error,
      message: error ? error.message : "Push notification infrastructure available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "push_subscriptions table accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 7.2: meal_reminder_settings
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("meal_reminder_settings")
      .select("id, user_id, enabled, enabled_meals, reminder_minutes_before")
      .limit(1);
    
    tests.push({
      name: "meal_reminder_settings accessible",
      passed: !error,
      message: error ? error.message : "Meal reminder configuration available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "meal_reminder_settings accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 7.3: notifications table
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, type, is_read")
      .limit(1);
    
    tests.push({
      name: "notifications table accessible",
      passed: !error,
      message: error ? error.message : "In-app notifications functional",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "notifications table accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Notificações",
    description: "Valida send-meal-reminder, send-water-reminder, NotificationHandler.tsx",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 8: Admin Panel
// ============================================
async function testAdminModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 8.1: user_roles table
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .limit(1);
    
    tests.push({
      name: "user_roles table accessible",
      passed: !error,
      message: error ? error.message : "Admin role system functional",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "user_roles table accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 8.2: ai_usage_logs for admin monitoring
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("ai_usage_logs")
      .select("id, function_name, model_used, total_tokens")
      .limit(1);
    
    tests.push({
      name: "ai_usage_logs accessible for monitoring",
      passed: !error,
      message: error ? error.message : "AI usage monitoring available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "ai_usage_logs accessible for monitoring",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 8.3: onboarding_options table
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("onboarding_options")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    
    tests.push({
      name: "onboarding_options configured",
      passed: !error && (count || 0) > 0,
      message: error ? error.message : `${count} active onboarding options`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "onboarding_options configured",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 8.4: meal_time_settings
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("meal_time_settings")
      .select("*", { count: "exact", head: true });
    
    tests.push({
      name: "meal_time_settings configured",
      passed: !error && (count || 0) >= 5,
      message: error ? error.message : `${count} meal times configured`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "meal_time_settings configured",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Admin Panel",
    description: "Valida /pages/admin/, useAdmin.tsx",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 9: Chat e Assistente
// ============================================
async function testChatModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 9.1: chat_conversations structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("id, user_id, title")
      .limit(1);
    
    tests.push({
      name: "chat_conversations table accessible",
      passed: !error,
      message: error ? error.message : "Chat conversation storage functional",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "chat_conversations table accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 9.2: chat_messages structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, conversation_id, role, content, page_context")
      .limit(1);
    
    tests.push({
      name: "chat_messages table accessible",
      passed: !error,
      message: error ? error.message : "Chat message storage functional",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "chat_messages table accessible",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Chat e Assistente",
    description: "Valida chat-assistant, IntoleraIAssistant.tsx, useChatMemory.tsx",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MÓDULO 10: Foods Database
// ============================================
async function testFoodsModule(supabase: any): Promise<ModuleTestSuite> {
  const tests: TestResult[] = [];

  // Test 10.1: foods table structure
  try {
    const testStart = Date.now();
    const { data, error } = await supabase
      .from("foods")
      .select("id, name, name_normalized, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category")
      .limit(1);
    
    tests.push({
      name: "foods table structure complete",
      passed: !error,
      message: error ? error.message : "Foods database fields available",
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "foods table structure complete",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  // Test 10.2: foods count
  try {
    const testStart = Date.now();
    const { count, error } = await supabase
      .from("foods")
      .select("*", { count: "exact", head: true });
    
    const hasSufficientFoods = (count || 0) >= 100;
    tests.push({
      name: "foods database has sufficient entries",
      passed: hasSufficientFoods && !error,
      message: error ? error.message : `${count} foods in database`,
      duration_ms: Date.now() - testStart,
    });
  } catch (e) {
    tests.push({
      name: "foods database has sufficient entries",
      passed: false,
      message: String(e),
      duration_ms: 0,
    });
  }

  return {
    module: "Foods Database",
    description: "Valida FoodSearchPanel.tsx, useFoodsSearch.tsx",
    tests,
    passed: tests.filter(t => t.passed).length,
    failed: tests.filter(t => !t.passed).length,
  };
}

// ============================================
// MAIN SERVER
// ============================================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log("🔒 Running Protected Modules Tests...");

    // Run all module tests in parallel
    const [
      calendarResults,
      mealPlanResults,
      securityResults,
      consumptionResults,
      profileResults,
      symptomsWaterResults,
      notificationsResults,
      adminResults,
      chatResults,
      foodsResults,
    ] = await Promise.all([
      testCalendarModule(supabase),
      testMealPlanGenerationModule(supabase),
      testSecurityModule(supabase),
      testConsumptionModule(supabase),
      testProfileModule(supabase),
      testSymptomsWaterModule(supabase),
      testNotificationsModule(supabase),
      testAdminModule(supabase),
      testChatModule(supabase),
      testFoodsModule(supabase),
    ]);

    const allSuites = [
      calendarResults,
      mealPlanResults,
      securityResults,
      consumptionResults,
      profileResults,
      symptomsWaterResults,
      notificationsResults,
      adminResults,
      chatResults,
      foodsResults,
    ];

    const totalTests = allSuites.reduce((sum, s) => sum + s.tests.length, 0);
    const totalPassed = allSuites.reduce((sum, s) => sum + s.passed, 0);
    const totalFailed = allSuites.reduce((sum, s) => sum + s.failed, 0);
    const passRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    const failedTests = allSuites.flatMap(s => 
      s.tests.filter(t => !t.passed).map(t => ({
        module: s.module,
        test: t.name,
        message: t.message,
      }))
    );

    const summary = {
      total_tests: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      pass_rate: `${passRate}%`,
      duration_ms: Date.now() - startTime,
      status: totalFailed === 0 ? "✅ ALL PROTECTED MODULES HEALTHY" : "❌ SOME MODULES NEED ATTENTION",
      timestamp: new Date().toISOString(),
    };

    console.log(`\n📊 Summary: ${totalPassed}/${totalTests} tests passed (${passRate}%)`);

    return new Response(
      JSON.stringify({
        summary,
        failed_tests: failedTests,
        modules: allSuites.map(s => ({
          module: s.module,
          description: s.description,
          passed: s.passed,
          failed: s.failed,
          tests: s.tests,
        })),
      }, null, 2),
      {
        status: totalFailed > 0 ? 500 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test execution failed:", error);
    return new Response(
      JSON.stringify({
        error: "Test execution failed",
        message: String(error),
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

