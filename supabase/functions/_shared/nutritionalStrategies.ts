// ============================================
// NUTRITIONAL STRATEGIES - DYNAMIC CONFIGURATION
// ============================================
// This file manages the nutritional strategies from the database
// Replaces hardcoded goal logic with dynamic configurations

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================
// TYPES
// ============================================

export interface NutritionalStrategy {
  id: string;
  key: string;
  label: string;
  description: string | null;
  calorie_modifier: number | null; // -500, 0, +400, etc. NULL for flexible diet
  protein_per_kg: number | null; // 1.6, 2.0, 2.2, etc. NULL for flexible diet
  carb_ratio: number | null; // 0.45 = 45%. NULL for flexible diet
  fat_ratio: number | null; // 0.30 = 30%. NULL for flexible diet
  is_flexible: boolean; // if true, user defines goals manually
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface StrategyContext {
  strategy: NutritionalStrategy | null;
  calorieAdjustment: number;
  proteinMultiplier: number;
  carbRatio: number;
  fatRatio: number;
  isFlexible: boolean;
  recipeStyle: "fitness" | "regular" | "high_calorie";
}

// ============================================
// FALLBACK MAPPING (for users without strategy_id)
// ============================================

const GOAL_TO_STRATEGY_KEY: Record<string, string> = {
  lose_weight: "weight_loss",
  maintain: "maintenance",
  gain_weight: "weight_gain",
  // Legacy fallbacks (Portuguese keys - for migration compatibility)
  emagrecer: "weight_loss",
  manter: "maintenance",
  ganhar_peso: "weight_gain",
};

// Default values per goal (fallback if unable to load from database)
const DEFAULT_STRATEGY_CONFIG: Record<string, Partial<NutritionalStrategy>> = {
  weight_loss: {
    key: "weight_loss",
    calorie_modifier: -500,
    protein_per_kg: 1.8,
    carb_ratio: 0.45,
    fat_ratio: 0.30,
    is_flexible: false,
  },
  cutting: {
    key: "cutting",
    calorie_modifier: -400,
    protein_per_kg: 2.2,
    carb_ratio: 0.40,
    fat_ratio: 0.30,
    is_flexible: false,
  },
  maintenance: {
    key: "maintenance",
    calorie_modifier: 0,
    protein_per_kg: 1.6,
    carb_ratio: 0.50,
    fat_ratio: 0.25,
    is_flexible: false,
  },
  fitness: {
    key: "fitness",
    calorie_modifier: 0,
    protein_per_kg: 2.0,
    carb_ratio: 0.45,
    fat_ratio: 0.30,
    is_flexible: false,
  },
  weight_gain: {
    key: "weight_gain",
    calorie_modifier: 400,
    protein_per_kg: 2.0,
    carb_ratio: 0.50,
    fat_ratio: 0.25,
    is_flexible: false,
  },
  flexible_diet: {
    key: "flexible_diet",
    calorie_modifier: null,
    protein_per_kg: null,
    carb_ratio: null,
    fat_ratio: null,
    is_flexible: true,
  },
};

// ============================================
// LOADING FUNCTIONS
// ============================================

/**
 * Loads a nutritional strategy from the database by ID
 */
export async function getStrategyById(strategyId: string): Promise<NutritionalStrategy | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase configuration missing");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("nutritional_strategies")
    .select("*")
    .eq("id", strategyId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching strategy by ID:", error);
    return null;
  }

  return data as NutritionalStrategy | null;
}

/**
 * Loads a nutritional strategy from the database by key
 */
export async function getStrategyByKey(key: string): Promise<NutritionalStrategy | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase configuration missing");
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("nutritional_strategies")
    .select("*")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching strategy by key:", error);
    return null;
  }

  return data as NutritionalStrategy | null;
}

/**
 * Loads all active nutritional strategies
 */
export async function getAllActiveStrategies(): Promise<NutritionalStrategy[]> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Supabase configuration missing");
    return [];
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("nutritional_strategies")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching all strategies:", error);
    return [];
  }

  return (data || []) as NutritionalStrategy[];
}

// ============================================
// MAIN FUNCTION: GET STRATEGY CONTEXT
// ============================================

interface UserProfileForStrategy {
  strategy_id?: string | null;
  goal?: string | null;
  weight_current?: number | null;
  weight_goal?: number | null;
}

/**
 * Gets the complete nutritional strategy context for a user profile.
 * 
 * Priority:
 * 1. If profile.strategy_id exists, load strategy from database
 * 2. If not, use profile.goal to map to a strategy
 * 3. If fails, use default values (maintenance)
 */
export async function getStrategyContext(profile: UserProfileForStrategy): Promise<StrategyContext> {
  let strategy: NutritionalStrategy | null = null;

  // Try to load by strategy_id first
  if (profile.strategy_id) {
    strategy = await getStrategyById(profile.strategy_id);
  }

  // Fallback: use goal to find strategy
  if (!strategy && profile.goal) {
    const strategyKey = GOAL_TO_STRATEGY_KEY[profile.goal] || profile.goal;
    strategy = await getStrategyByKey(strategyKey);
  }

  // If still not found, use hardcoded fallback
  if (!strategy) {
    const fallbackKey = profile.goal ? (GOAL_TO_STRATEGY_KEY[profile.goal] || "maintenance") : "maintenance";
    const fallbackConfig = DEFAULT_STRATEGY_CONFIG[fallbackKey] || DEFAULT_STRATEGY_CONFIG["maintenance"];
    
    return {
      strategy: null,
      calorieAdjustment: fallbackConfig.calorie_modifier || 0,
      proteinMultiplier: fallbackConfig.protein_per_kg || 1.6,
      carbRatio: fallbackConfig.carb_ratio || 0.50,
      fatRatio: fallbackConfig.fat_ratio || 0.25,
      isFlexible: fallbackConfig.is_flexible || false,
      recipeStyle: determineRecipeStyle(fallbackKey),
    };
  }

  // Calcular ajuste de calorias baseado na intensidade (para estratégias com déficit/superávit)
  const intensityMultiplier = calculateIntensityMultiplier(
    strategy.key,
    profile.weight_current,
    profile.weight_goal
  );

  const baseCalorieModifier = strategy.calorie_modifier || 0;
  const adjustedCalorieModifier = Math.round(baseCalorieModifier * intensityMultiplier);

  return {
    strategy,
    calorieAdjustment: adjustedCalorieModifier,
    proteinMultiplier: strategy.protein_per_kg || 1.6,
    carbRatio: strategy.carb_ratio || 0.50,
    fatRatio: strategy.fat_ratio || 0.25,
    isFlexible: strategy.is_flexible,
    recipeStyle: determineRecipeStyle(strategy.key),
  };
}

/**
 * Calculates intensity multiplier based on weight difference
 */
function calculateIntensityMultiplier(
  strategyKey: string,
  weightCurrent: number | null | undefined,
  weightGoal: number | null | undefined
): number {
  if (!weightCurrent || !weightGoal) {
    return 1.0; // default intensity
  }

  const difference = Math.abs(weightCurrent - weightGoal);

  // Deficit strategies (weight_loss, cutting)
  if (strategyKey === "weight_loss" || strategyKey === "cutting") {
    if (difference <= 5) return 0.6; // light: -300 instead of -500
    if (difference <= 15) return 1.0; // moderate: default value
    return 1.4; // aggressive: -700 instead of -500
  }

  // Surplus strategies (weight_gain, bulk)
  if (strategyKey === "weight_gain") {
    if (difference <= 5) return 0.625; // light: +250 instead of +400
    if (difference <= 10) return 1.0; // moderate: default value
    return 1.5; // aggressive: +600 instead of +400
  }

  return 1.0; // maintenance, fitness, flexible_diet
}

/**
 * Determines recipe style based on strategy key
 */
function determineRecipeStyle(strategyKey: string): "fitness" | "regular" | "high_calorie" {
  switch (strategyKey) {
    case "weight_loss":
    case "cutting":
    case "fitness":
      return "fitness";
    case "weight_gain":
      return "high_calorie";
    default:
      return "regular";
  }
}

/**
 * Generates instructions for AI prompt based on strategy
 */
export function buildStrategyInstructions(context: StrategyContext, weightDifference: number): string {
  if (!context.strategy) {
    return `
🎯 GOAL: BALANCED NUTRITION
- Balanced and nutritious recipes
- Standard macronutrient ratio`;
  }

  const strategy = context.strategy;

  if (strategy.is_flexible) {
    return `
🎯 GOAL: FLEXIBLE DIET
- User defines their own caloric goals
- Respect macronutrient ratios defined by user
- Flexibility in food choices`;
  }

  const calorieText = context.calorieAdjustment < 0 
    ? `Caloric deficit: ${Math.abs(context.calorieAdjustment)} kcal/day`
    : context.calorieAdjustment > 0 
      ? `Caloric surplus: +${context.calorieAdjustment} kcal/day`
      : `Balanced calories for maintenance`;

  const macroText = `
- Protein: ${context.proteinMultiplier}g per kg of body weight
- Carbohydrates: ${Math.round(context.carbRatio * 100)}% of calories
- Fats: ${Math.round(context.fatRatio * 100)}% of calories`;

  let styleInstructions = "";
  switch (strategy.key) {
    case "weight_loss":
      styleInstructions = `
- PRIORITIZE: Voluminous vegetables, lean proteins, fiber
- AVOID: Refined carbs, sugars, fried foods
- PREFER: Grilled, baked, steamed
- STYLE: FITNESS RECIPES - low calorie, high nutritional value`;
      break;
    case "cutting":
      styleInstructions = `
- PRIORITIZE: High quality proteins, fibrous vegetables
- FOCUS: Muscle preservation during deficit
- AVOID: Refined carbs, sugars
- STYLE: CUTTING RECIPES - high protein, low calorie`;
      break;
    case "fitness":
      styleInstructions = `
- PRIORITIZE: Lean proteins, complex carbs
- FOCUS: Body recomposition, lean mass
- INCLUDE: Functional foods, high protein value
- STYLE: FITNESS RECIPES - balanced, protein-rich`;
      break;
    case "weight_gain":
      styleInstructions = `
- PRIORITIZE: Quality proteins, complex carbs, healthy fats
- INCLUDE: Generous portions, nutrient-dense foods
- PREFER: Nutritious caloric combinations
- STYLE: MASS GAIN RECIPES - caloric and nutritious`;
      break;
    default:
      styleInstructions = `
- Balanced and varied recipes
- Balanced macronutrient ratio`;
  }

  return `
${strategy.icon || "🎯"} GOAL: ${strategy.label?.toUpperCase() || strategy.key.toUpperCase()}
${strategy.description ? `- ${strategy.description}` : ""}
- Weight goal: ${weightDifference > 0 ? `${weightDifference}kg` : "maintenance"}
- ${calorieText}
${macroText}
${styleInstructions}`;
}

/**
 * Checks if a strategy is compatible with category filters
 * Maps new strategies to old goals for compatibility
 */
export function getCompatibleGoalKeys(strategyKey: string): string[] {
  switch (strategyKey) {
    case "weight_loss":
    case "cutting":
      return ["lose_weight"];
    case "maintenance":
    case "fitness":
      return ["maintain"];
    case "weight_gain":
      return ["gain_weight"];
    case "flexible_diet":
      return ["lose_weight", "maintain", "gain_weight"]; // compatible with all
    default:
      return ["maintain"];
  }
}

