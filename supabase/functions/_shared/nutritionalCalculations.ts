// ============================================
// NUTRITIONAL CALCULATIONS - CENTRAL SOURCE OF TRUTH
// ============================================
// Este arquivo é a FONTE ÚNICA para todos os cálculos nutricionais.
// Usado por: generate-ai-meal-plan, regenerate-meal, generate-recipe,
//            analyze-food-photo, analyze-fridge-photo, analyze-label-photo
//
// Fórmulas baseadas em evidências científicas:
// - TMB: Mifflin-St Jeor (1990)
// - TDEE: Multiplicadores de atividade (Harris-Benedict revisado)
// - Macros: Diretrizes de sociedades de nutrição esportiva

// ============================================
// TYPES
// ============================================

export interface UserPhysicalData {
  sex: "male" | "female" | string | null;
  age: number | null;
  height: number | null; // cm
  weight_current: number | null; // kg
  weight_goal?: number | null; // kg
  activity_level: string | null;
}

export interface NutritionalTargets {
  bmr: number; // Basal Metabolic Rate (kcal/day)
  tdee: number; // Total Daily Energy Expenditure (kcal/day)
  targetCalories: number; // After goal adjustment (kcal/day)
  protein: number; // grams/day
  carbs: number; // grams/day
  fat: number; // grams/day
  fiber: number; // grams/day (estimated)
}

export interface MealDistribution {
  mealType: string;
  label: string;
  percentage: number; // 0-1
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  calorieRange: { min: number; max: number };
}

export interface CompatibilityResult {
  score: number; // 0-100
  level: "excellent" | "good" | "moderate" | "poor";
  calorieDeviation: number; // percentage
  proteinDeviation: number; // percentage
  isWithinRange: boolean;
  feedback: string;
}

// ============================================
// ACTIVITY LEVEL MULTIPLIERS
// ============================================

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2, // Little or no exercise
  light: 1.375, // Light exercise 1-3 days/week
  moderate: 1.55, // Moderate exercise 3-5 days/week
  active: 1.725, // Hard exercise 6-7 days/week
  very_active: 1.9, // Very hard exercise, physical job
};

// ============================================
// MEAL DISTRIBUTION PERCENTAGES (English keys)
// ============================================

// Standard 5-meal distribution
const MEAL_PERCENTAGES: Record<string, { percentage: number; label: string }> = {
  breakfast: { percentage: 0.20, label: "Café da Manhã" },
  morning_snack: { percentage: 0.10, label: "Lanche da Manhã" },
  lunch: { percentage: 0.30, label: "Almoço" },
  afternoon_snack: { percentage: 0.15, label: "Lanche da Tarde" },
  dinner: { percentage: 0.25, label: "Jantar" },
  supper: { percentage: 0.05, label: "Ceia" },
};

// Alternative 4-meal distribution (no morning/evening snacks)
// IMPORTANT: must contain ALL possible meals for the filter to work
const MEAL_PERCENTAGES_4: Record<string, { percentage: number; label: string }> = {
  breakfast: { percentage: 0.25, label: "Café da Manhã" },
  morning_snack: { percentage: 0.10, label: "Lanche da Manhã" },
  lunch: { percentage: 0.35, label: "Almoço" },
  afternoon_snack: { percentage: 0.15, label: "Lanche da Tarde" },
  dinner: { percentage: 0.25, label: "Jantar" },
  supper: { percentage: 0.10, label: "Ceia" },
};

// ============================================
// BMR CALCULATION (Mifflin-St Jeor)
// ============================================

/**
 * Calculates Basal Metabolic Rate using Mifflin-St Jeor equation.
 * This is the gold standard for BMR estimation (1990).
 * 
 * Men: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age) + 5
 * Women: BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age) − 161
 * 
 * @returns BMR in kcal/day, or null if insufficient data
 */
export function calculateBMR(data: UserPhysicalData): number | null {
  const { sex, age, height, weight_current } = data;

  if (!age || !height || !weight_current) {
    console.log("[nutritionalCalculations] Missing data for BMR calculation:", { age, height, weight_current });
    return null;
  }

  const isMale = sex === "male" || sex === "masculino" || sex === "m";
  const isFemale = sex === "female" || sex === "feminino" || sex === "f";

  if (!isMale && !isFemale) {
    // Default to average if sex not specified
    const maleBMR = (10 * weight_current) + (6.25 * height) - (5 * age) + 5;
    const femaleBMR = (10 * weight_current) + (6.25 * height) - (5 * age) - 161;
    return Math.round((maleBMR + femaleBMR) / 2);
  }

  const bmr = isMale
    ? (10 * weight_current) + (6.25 * height) - (5 * age) + 5
    : (10 * weight_current) + (6.25 * height) - (5 * age) - 161;

  return Math.round(bmr);
}

// ============================================
// TDEE CALCULATION
// ============================================

/**
 * Calculates Total Daily Energy Expenditure.
 * TDEE = BMR × Activity Multiplier
 * 
 * @returns TDEE in kcal/day, or null if BMR cannot be calculated
 */
export function calculateTDEE(data: UserPhysicalData): number | null {
  const bmr = calculateBMR(data);
  if (!bmr) return null;

  const activityLevel = data.activity_level || "moderate";
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;

  return Math.round(bmr * multiplier);
}

// ============================================
// MACRO CALCULATIONS
// ============================================

interface MacroParams {
  targetCalories: number;
  weight: number; // kg
  proteinPerKg: number; // g/kg
  carbRatio: number; // 0-1 (e.g., 0.45 = 45%)
  fatRatio: number; // 0-1 (e.g., 0.30 = 30%)
}

/**
 * Calculates daily macronutrient targets in grams.
 * 
 * Protein: Based on g/kg body weight (prioritized)
 * Carbs: Percentage of remaining calories
 * Fat: Percentage of remaining calories
 */
export function calculateDailyMacros(params: MacroParams): { protein: number; carbs: number; fat: number; fiber: number } {
  const { targetCalories, weight, proteinPerKg, carbRatio, fatRatio } = params;

  // Protein is calculated based on body weight (g/kg)
  const protein = Math.round(weight * proteinPerKg);
  const proteinCalories = protein * 4; // 4 kcal per gram of protein

  // Remaining calories after protein
  const remainingCalories = Math.max(0, targetCalories - proteinCalories);

  // Normalize ratios for remaining macros
  const totalRatio = carbRatio + fatRatio;
  const normalizedCarbRatio = carbRatio / totalRatio;
  const normalizedFatRatio = fatRatio / totalRatio;

  // Calculate carbs and fat from remaining calories
  const carbCalories = remainingCalories * normalizedCarbRatio;
  const fatCalories = remainingCalories * normalizedFatRatio;

  const carbs = Math.round(carbCalories / 4); // 4 kcal per gram of carb
  const fat = Math.round(fatCalories / 9); // 9 kcal per gram of fat

  // Fiber: approximately 14g per 1000 kcal (IOM recommendation)
  const fiber = Math.round((targetCalories / 1000) * 14);

  return { protein, carbs, fat, fiber };
}

// ============================================
// COMPLETE NUTRITIONAL TARGETS
// ============================================

interface StrategyParams {
  calorieModifier: number; // e.g., -500 for deficit, +400 for surplus
  proteinPerKg: number;
  carbRatio: number;
  fatRatio: number;
}

/**
 * Calculates complete nutritional targets for a user profile.
 * This is the main function to use for getting all nutritional data.
 */
export function calculateNutritionalTargets(
  physicalData: UserPhysicalData,
  strategyParams: StrategyParams
): NutritionalTargets | null {
  const bmr = calculateBMR(physicalData);
  const tdee = calculateTDEE(physicalData);

  if (!bmr || !tdee || !physicalData.weight_current) {
    console.log("[nutritionalCalculations] Cannot calculate targets - missing BMR/TDEE/weight");
    return null;
  }

  const targetCalories = Math.max(1200, tdee + strategyParams.calorieModifier); // Never below 1200 kcal

  const macros = calculateDailyMacros({
    targetCalories,
    weight: physicalData.weight_current,
    proteinPerKg: strategyParams.proteinPerKg,
    carbRatio: strategyParams.carbRatio,
    fatRatio: strategyParams.fatRatio,
  });

  return {
    bmr,
    tdee,
    targetCalories,
    ...macros,
  };
}

// ============================================
// MEAL DISTRIBUTION
// ============================================

/**
 * Calculates calorie and macro targets for each meal type.
 * 
 * @param dailyTargets - The user's daily nutritional targets
 * @param enabledMeals - Array of enabled meal types (e.g., ["cafe_manha", "almoco", "jantar"])
 * @param tolerance - Percentage tolerance for calorie range (default 15%)
 */
export function calculateMealDistribution(
  dailyTargets: NutritionalTargets,
  enabledMeals?: string[],
  tolerance: number = 0.15
): MealDistribution[] {
  const mealConfig = enabledMeals && enabledMeals.length <= 4 
    ? MEAL_PERCENTAGES_4 
    : MEAL_PERCENTAGES;

  const activeMeals = enabledMeals 
    ? Object.entries(mealConfig).filter(([key]) => enabledMeals.includes(key))
    : Object.entries(mealConfig);

  // Normalize percentages if we're using a subset of meals
  const totalPercentage = activeMeals.reduce((sum, [, config]) => sum + config.percentage, 0);

  return activeMeals.map(([mealType, config]) => {
    const normalizedPercentage = config.percentage / totalPercentage;
    const calories = Math.round(dailyTargets.targetCalories * normalizedPercentage);
    
    return {
      mealType,
      label: config.label,
      percentage: normalizedPercentage,
      calories,
      protein: Math.round(dailyTargets.protein * normalizedPercentage),
      carbs: Math.round(dailyTargets.carbs * normalizedPercentage),
      fat: Math.round(dailyTargets.fat * normalizedPercentage),
      calorieRange: {
        min: Math.round(calories * (1 - tolerance)),
        max: Math.round(calories * (1 + tolerance)),
      },
    };
  });
}

/**
 * Gets the target for a specific meal type.
 */
export function getMealTarget(
  dailyTargets: NutritionalTargets,
  mealType: string,
  enabledMeals?: string[]
): MealDistribution | null {
  const distribution = calculateMealDistribution(dailyTargets, enabledMeals);
  return distribution.find(m => m.mealType === mealType) || null;
}

// ============================================
// COMPATIBILITY EVALUATION
// ============================================

/**
 * Evaluates how well a meal/recipe fits the user's nutritional targets.
 * 
 * @param mealCalories - Calories in the meal
 * @param mealProtein - Protein in the meal (grams)
 * @param targetCalories - Target calories for this meal
 * @param targetProtein - Target protein for this meal
 * @returns Compatibility score and feedback
 */
export function evaluateMealCompatibility(
  mealCalories: number,
  mealProtein: number,
  targetCalories: number,
  targetProtein: number,
  tolerance: number = 0.15
): CompatibilityResult {
  const calorieDeviation = Math.abs((mealCalories - targetCalories) / targetCalories);
  const proteinDeviation = targetProtein > 0 
    ? Math.abs((mealProtein - targetProtein) / targetProtein)
    : 0;

  // Weighted score: calories 60%, protein 40%
  const calorieScore = Math.max(0, 100 - (calorieDeviation * 100));
  const proteinScore = Math.max(0, 100 - (proteinDeviation * 100));
  const score = Math.round((calorieScore * 0.6) + (proteinScore * 0.4));

  const isWithinRange = calorieDeviation <= tolerance && proteinDeviation <= tolerance;

  let level: CompatibilityResult["level"];
  if (score >= 85) level = "excellent";
  else if (score >= 70) level = "good";
  else if (score >= 50) level = "moderate";
  else level = "poor";

  let feedback: string;
  if (isWithinRange) {
    feedback = "Refeição dentro das metas nutricionais";
  } else if (mealCalories > targetCalories * (1 + tolerance)) {
    const excess = mealCalories - targetCalories;
    feedback = `${excess} kcal acima do recomendado para esta refeição`;
  } else if (mealCalories < targetCalories * (1 - tolerance)) {
    const deficit = targetCalories - mealCalories;
    feedback = `${deficit} kcal abaixo do recomendado para esta refeição`;
  } else if (mealProtein < targetProtein * (1 - tolerance)) {
    const deficit = Math.round(targetProtein - mealProtein);
    feedback = `Faltam ${deficit}g de proteína para atingir a meta`;
  } else {
    feedback = "Refeição próxima das metas nutricionais";
  }

  return {
    score,
    level,
    calorieDeviation: Math.round(calorieDeviation * 100),
    proteinDeviation: Math.round(proteinDeviation * 100),
    isWithinRange,
    feedback,
  };
}

/**
 * Evaluates a full day of meals against daily targets.
 */
export function evaluateDayCompatibility(
  meals: Array<{ calories: number; protein: number; carbs: number; fat: number }>,
  dailyTargets: NutritionalTargets
): CompatibilityResult {
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);

  return evaluateMealCompatibility(
    totalCalories,
    totalProtein,
    dailyTargets.targetCalories,
    dailyTargets.protein,
    0.10 // Tighter tolerance for full day (10%)
  );
}

// ============================================
// PROMPT ENRICHMENT (for AI functions)
// ============================================

/**
 * Generates a nutritional context string for AI prompts.
 * This enriches the AI with precise calculations for the user.
 */
export function buildNutritionalContextForPrompt(
  targets: NutritionalTargets,
  mealType?: string,
  enabledMeals?: string[]
): string {
  let context = `
📊 PERFIL NUTRICIONAL DO USUÁRIO:
- Taxa Metabólica Basal (TMB): ${targets.bmr} kcal/dia
- Gasto Energético Total (TDEE): ${targets.tdee} kcal/dia
- Meta Calórica Diária: ${targets.targetCalories} kcal/dia

📈 METAS DE MACRONUTRIENTES DIÁRIOS:
- Proteína: ${targets.protein}g (${Math.round((targets.protein * 4 / targets.targetCalories) * 100)}% das calorias)
- Carboidratos: ${targets.carbs}g (${Math.round((targets.carbs * 4 / targets.targetCalories) * 100)}% das calorias)
- Gorduras: ${targets.fat}g (${Math.round((targets.fat * 9 / targets.targetCalories) * 100)}% das calorias)
- Fibras: ~${targets.fiber}g`;

  if (mealType) {
    const mealTarget = getMealTarget(targets, mealType, enabledMeals);
    if (mealTarget) {
      context += `

🍽️ METAS PARA ${mealTarget.label.toUpperCase()}:
- Calorias: ${mealTarget.calorieRange.min}-${mealTarget.calorieRange.max} kcal (ideal: ${mealTarget.calories} kcal)
- Proteína: ~${mealTarget.protein}g
- Carboidratos: ~${mealTarget.carbs}g
- Gorduras: ~${mealTarget.fat}g`;
    }
  }

  return context;
}

/**
 * Generates meal distribution summary for AI prompts (meal plan generation).
 */
export function buildMealDistributionForPrompt(
  targets: NutritionalTargets,
  enabledMeals?: string[]
): string {
  const distribution = calculateMealDistribution(targets, enabledMeals);
  
  let summary = `
📅 DISTRIBUIÇÃO CALÓRICA POR REFEIÇÃO:`;

  distribution.forEach(meal => {
    summary += `
- ${meal.label}: ${meal.calorieRange.min}-${meal.calorieRange.max} kcal | ~${meal.protein}g prot | ~${meal.carbs}g carb | ~${meal.fat}g gord`;
  });

  return summary;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Estimates weekly weight change based on calorie modifier.
 * 7700 kcal = ~1kg of body weight
 */
export function estimateWeeklyWeightChange(dailyCalorieModifier: number): number {
  const weeklyCalories = dailyCalorieModifier * 7;
  return Math.round((weeklyCalories / 7700) * 10) / 10; // kg, 1 decimal
}

/**
 * Estimates time to reach goal weight.
 */
export function estimateTimeToGoal(
  currentWeight: number,
  goalWeight: number,
  dailyCalorieModifier: number
): { weeks: number; months: number } | null {
  if (!dailyCalorieModifier || dailyCalorieModifier === 0) return null;

  const weightDifference = Math.abs(currentWeight - goalWeight);
  const weeklyChange = Math.abs(estimateWeeklyWeightChange(dailyCalorieModifier));

  if (weeklyChange === 0) return null;

  const weeks = Math.ceil(weightDifference / weeklyChange);
  const months = Math.round((weeks / 4.33) * 10) / 10;

  return { weeks, months };
}

/**
 * Validates if targets are within healthy ranges.
 */
export function validateTargetsHealth(targets: NutritionalTargets): { isHealthy: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (targets.targetCalories < 1200) {
    warnings.push("Meta calórica muito baixa (< 1200 kcal). Pode ser prejudicial à saúde.");
  }

  if (targets.targetCalories > 4000) {
    warnings.push("Meta calórica muito alta (> 4000 kcal). Verificar se está correto.");
  }

  if (targets.protein < 50) {
    warnings.push("Proteína diária baixa (< 50g). Pode comprometer massa muscular.");
  }

  if (targets.fat < 30) {
    warnings.push("Gordura diária muito baixa (< 30g). Pode afetar hormônios.");
  }

  return {
    isHealthy: warnings.length === 0,
    warnings,
  };
}
