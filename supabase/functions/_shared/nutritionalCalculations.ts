// ============================================
// NUTRITIONAL CALCULATIONS - CENTRAL SOURCE OF TRUTH
// ============================================
// Este arquivo é a FONTE ÚNICA para todos os cálculos nutricionais.
// Usado por: generate-ai-meal-plan, regenerate-meal, generate-recipe,
//            analyze-food-photo, analyze-fridge-photo, analyze-label-photo,
//            regenerate-ai-meal-alternatives, suggest-meal-alternatives,
//            suggest-smart-substitutes
//
// Fórmulas baseadas em evidências científicas:
// - TMB: Mifflin-St Jeor (1990)
// - TDEE: Multiplicadores de atividade (Harris-Benedict revisado)
// - Macros: Diretrizes de sociedades de nutrição esportiva
// - MEAL_MACRO_TARGETS: Motor de Decisão Nutricional Determinístico (2025)
//   Tabela de macros por refeição calibrada por nutricionistas

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
// MEAL MACRO TARGETS - MOTOR DE DECISÃO NUTRICIONAL
// ============================================
// Tabela determinística de macros por refeição
// Calibrada por nutricionistas para cada combinação de:
// - Objetivo (lose_weight, maintain, gain_weight)
// - Sexo (male, female)
// - Nível de atividade (sedentary, light, moderate, active, very_active)
// 
// Valores em GRAMAS (proteína, carboidrato, gordura)
// Regras nutricionais:
// - Proteína presente em 100% das refeições
// - Ceia com carbo zero/baixo para emagrecimento
// - Carbo escala com nível de atividade
// - Homens têm valores absolutos maiores que mulheres

export interface MealMacroTarget {
  protein: number; // gramas
  carbs: number;   // gramas
  fat: number;     // gramas
}

export interface MealMacroTargetSet {
  breakfast: MealMacroTarget;
  morning_snack: MealMacroTarget;
  lunch: MealMacroTarget;
  afternoon_snack: MealMacroTarget;
  dinner: MealMacroTarget;
  supper: MealMacroTarget;
}

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Sex = 'male' | 'female';
type Goal = 'lose_weight' | 'maintain' | 'gain_weight';

export const MEAL_MACRO_TARGETS: Record<Goal, Record<Sex, Record<ActivityLevel, MealMacroTargetSet>>> = {
  // =============================================
  // OBJETIVO: EMAGRECER (lose_weight)
  // =============================================
  lose_weight: {
    male: {
      sedentary: {
        breakfast: { protein: 30, carbs: 25, fat: 10 },
        morning_snack: { protein: 20, carbs: 10, fat: 5 },
        lunch: { protein: 40, carbs: 40, fat: 15 },
        afternoon_snack: { protein: 25, carbs: 15, fat: 5 },
        dinner: { protein: 40, carbs: 20, fat: 10 },
        supper: { protein: 20, carbs: 0, fat: 5 },
      },
      light: {
        breakfast: { protein: 30, carbs: 30, fat: 10 },
        morning_snack: { protein: 20, carbs: 15, fat: 5 },
        lunch: { protein: 40, carbs: 50, fat: 15 },
        afternoon_snack: { protein: 25, carbs: 20, fat: 5 },
        dinner: { protein: 40, carbs: 25, fat: 10 },
        supper: { protein: 20, carbs: 0, fat: 5 },
      },
      moderate: {
        breakfast: { protein: 35, carbs: 35, fat: 10 },
        morning_snack: { protein: 25, carbs: 20, fat: 5 },
        lunch: { protein: 45, carbs: 60, fat: 15 },
        afternoon_snack: { protein: 30, carbs: 25, fat: 5 },
        dinner: { protein: 45, carbs: 30, fat: 10 },
        supper: { protein: 25, carbs: 0, fat: 5 },
      },
      active: {
        breakfast: { protein: 35, carbs: 40, fat: 10 },
        morning_snack: { protein: 25, carbs: 25, fat: 5 },
        lunch: { protein: 45, carbs: 70, fat: 15 },
        afternoon_snack: { protein: 30, carbs: 30, fat: 5 },
        dinner: { protein: 45, carbs: 35, fat: 10 },
        supper: { protein: 25, carbs: 0, fat: 5 },
      },
      very_active: {
        breakfast: { protein: 40, carbs: 45, fat: 10 },
        morning_snack: { protein: 30, carbs: 30, fat: 5 },
        lunch: { protein: 50, carbs: 80, fat: 15 },
        afternoon_snack: { protein: 35, carbs: 35, fat: 5 },
        dinner: { protein: 50, carbs: 40, fat: 10 },
        supper: { protein: 30, carbs: 0, fat: 5 },
      },
    },
    female: {
      sedentary: {
        breakfast: { protein: 25, carbs: 20, fat: 10 },
        morning_snack: { protein: 15, carbs: 10, fat: 5 },
        lunch: { protein: 30, carbs: 30, fat: 12 },
        afternoon_snack: { protein: 20, carbs: 15, fat: 5 },
        dinner: { protein: 30, carbs: 20, fat: 10 },
        supper: { protein: 15, carbs: 0, fat: 5 },
      },
      light: {
        breakfast: { protein: 25, carbs: 25, fat: 10 },
        morning_snack: { protein: 15, carbs: 15, fat: 5 },
        lunch: { protein: 30, carbs: 40, fat: 12 },
        afternoon_snack: { protein: 20, carbs: 20, fat: 5 },
        dinner: { protein: 30, carbs: 25, fat: 10 },
        supper: { protein: 15, carbs: 0, fat: 5 },
      },
      moderate: {
        breakfast: { protein: 30, carbs: 30, fat: 10 },
        morning_snack: { protein: 20, carbs: 20, fat: 5 },
        lunch: { protein: 35, carbs: 50, fat: 12 },
        afternoon_snack: { protein: 25, carbs: 25, fat: 5 },
        dinner: { protein: 35, carbs: 30, fat: 10 },
        supper: { protein: 20, carbs: 0, fat: 5 },
      },
      active: {
        breakfast: { protein: 30, carbs: 35, fat: 10 },
        morning_snack: { protein: 20, carbs: 25, fat: 5 },
        lunch: { protein: 35, carbs: 60, fat: 12 },
        afternoon_snack: { protein: 25, carbs: 30, fat: 5 },
        dinner: { protein: 35, carbs: 35, fat: 10 },
        supper: { protein: 20, carbs: 0, fat: 5 },
      },
      very_active: {
        breakfast: { protein: 35, carbs: 40, fat: 10 },
        morning_snack: { protein: 25, carbs: 30, fat: 5 },
        lunch: { protein: 40, carbs: 70, fat: 12 },
        afternoon_snack: { protein: 30, carbs: 35, fat: 5 },
        dinner: { protein: 40, carbs: 40, fat: 10 },
        supper: { protein: 25, carbs: 0, fat: 5 },
      },
    },
  },
  
  // =============================================
  // OBJETIVO: MANTER PESO (maintain)
  // Valores médios das faixas do prompt determinístico
  // =============================================
  maintain: {
    male: {
      sedentary: {
        breakfast: { protein: 32, carbs: 45, fat: 12 },
        morning_snack: { protein: 22, carbs: 25, fat: 6 },
        lunch: { protein: 42, carbs: 70, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 35, fat: 6 },
        dinner: { protein: 42, carbs: 50, fat: 12 },
        supper: { protein: 22, carbs: 15, fat: 6 },
      },
      light: {
        breakfast: { protein: 32, carbs: 45, fat: 12 },
        morning_snack: { protein: 22, carbs: 25, fat: 6 },
        lunch: { protein: 42, carbs: 70, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 35, fat: 6 },
        dinner: { protein: 42, carbs: 50, fat: 12 },
        supper: { protein: 22, carbs: 15, fat: 6 },
      },
      moderate: {
        breakfast: { protein: 32, carbs: 45, fat: 12 },
        morning_snack: { protein: 22, carbs: 25, fat: 6 },
        lunch: { protein: 42, carbs: 70, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 35, fat: 6 },
        dinner: { protein: 42, carbs: 50, fat: 12 },
        supper: { protein: 22, carbs: 15, fat: 6 },
      },
      active: {
        breakfast: { protein: 32, carbs: 45, fat: 12 },
        morning_snack: { protein: 22, carbs: 25, fat: 6 },
        lunch: { protein: 42, carbs: 70, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 35, fat: 6 },
        dinner: { protein: 42, carbs: 50, fat: 12 },
        supper: { protein: 22, carbs: 15, fat: 6 },
      },
      very_active: {
        breakfast: { protein: 32, carbs: 45, fat: 12 },
        morning_snack: { protein: 22, carbs: 25, fat: 6 },
        lunch: { protein: 42, carbs: 70, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 35, fat: 6 },
        dinner: { protein: 42, carbs: 50, fat: 12 },
        supper: { protein: 22, carbs: 15, fat: 6 },
      },
    },
    female: {
      sedentary: {
        breakfast: { protein: 27, carbs: 40, fat: 12 },
        morning_snack: { protein: 17, carbs: 22, fat: 6 },
        lunch: { protein: 32, carbs: 57, fat: 12 },
        afternoon_snack: { protein: 22, carbs: 30, fat: 6 },
        dinner: { protein: 32, carbs: 42, fat: 12 },
        supper: { protein: 17, carbs: 15, fat: 6 },
      },
      light: {
        breakfast: { protein: 27, carbs: 40, fat: 12 },
        morning_snack: { protein: 17, carbs: 22, fat: 6 },
        lunch: { protein: 32, carbs: 57, fat: 12 },
        afternoon_snack: { protein: 22, carbs: 30, fat: 6 },
        dinner: { protein: 32, carbs: 42, fat: 12 },
        supper: { protein: 17, carbs: 15, fat: 6 },
      },
      moderate: {
        breakfast: { protein: 27, carbs: 40, fat: 12 },
        morning_snack: { protein: 17, carbs: 22, fat: 6 },
        lunch: { protein: 32, carbs: 57, fat: 12 },
        afternoon_snack: { protein: 22, carbs: 30, fat: 6 },
        dinner: { protein: 32, carbs: 42, fat: 12 },
        supper: { protein: 17, carbs: 15, fat: 6 },
      },
      active: {
        breakfast: { protein: 27, carbs: 40, fat: 12 },
        morning_snack: { protein: 17, carbs: 22, fat: 6 },
        lunch: { protein: 32, carbs: 57, fat: 12 },
        afternoon_snack: { protein: 22, carbs: 30, fat: 6 },
        dinner: { protein: 32, carbs: 42, fat: 12 },
        supper: { protein: 17, carbs: 15, fat: 6 },
      },
      very_active: {
        breakfast: { protein: 27, carbs: 40, fat: 12 },
        morning_snack: { protein: 17, carbs: 22, fat: 6 },
        lunch: { protein: 32, carbs: 57, fat: 12 },
        afternoon_snack: { protein: 22, carbs: 30, fat: 6 },
        dinner: { protein: 32, carbs: 42, fat: 12 },
        supper: { protein: 17, carbs: 15, fat: 6 },
      },
    },
  },
  
  // =============================================
  // OBJETIVO: GANHAR PESO (gain_weight)
  // Valores médios das faixas do prompt determinístico
  // =============================================
  gain_weight: {
    male: {
      sedentary: {
        breakfast: { protein: 40, carbs: 80, fat: 15 },
        morning_snack: { protein: 30, carbs: 55, fat: 10 },
        lunch: { protein: 47, carbs: 105, fat: 20 },
        afternoon_snack: { protein: 37, carbs: 80, fat: 10 },
        dinner: { protein: 47, carbs: 80, fat: 15 },
        supper: { protein: 30, carbs: 35, fat: 10 },
      },
      light: {
        breakfast: { protein: 40, carbs: 80, fat: 15 },
        morning_snack: { protein: 30, carbs: 55, fat: 10 },
        lunch: { protein: 47, carbs: 105, fat: 20 },
        afternoon_snack: { protein: 37, carbs: 80, fat: 10 },
        dinner: { protein: 47, carbs: 80, fat: 15 },
        supper: { protein: 30, carbs: 35, fat: 10 },
      },
      moderate: {
        breakfast: { protein: 40, carbs: 80, fat: 15 },
        morning_snack: { protein: 30, carbs: 55, fat: 10 },
        lunch: { protein: 47, carbs: 105, fat: 20 },
        afternoon_snack: { protein: 37, carbs: 80, fat: 10 },
        dinner: { protein: 47, carbs: 80, fat: 15 },
        supper: { protein: 30, carbs: 35, fat: 10 },
      },
      active: {
        breakfast: { protein: 40, carbs: 80, fat: 15 },
        morning_snack: { protein: 30, carbs: 55, fat: 10 },
        lunch: { protein: 47, carbs: 105, fat: 20 },
        afternoon_snack: { protein: 37, carbs: 80, fat: 10 },
        dinner: { protein: 47, carbs: 80, fat: 15 },
        supper: { protein: 30, carbs: 35, fat: 10 },
      },
      very_active: {
        breakfast: { protein: 40, carbs: 80, fat: 15 },
        morning_snack: { protein: 30, carbs: 55, fat: 10 },
        lunch: { protein: 47, carbs: 105, fat: 20 },
        afternoon_snack: { protein: 37, carbs: 80, fat: 10 },
        dinner: { protein: 47, carbs: 80, fat: 15 },
        supper: { protein: 30, carbs: 35, fat: 10 },
      },
    },
    female: {
      sedentary: {
        breakfast: { protein: 32, carbs: 67, fat: 15 },
        morning_snack: { protein: 22, carbs: 45, fat: 10 },
        lunch: { protein: 37, carbs: 90, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 67, fat: 10 },
        dinner: { protein: 37, carbs: 67, fat: 15 },
        supper: { protein: 22, carbs: 30, fat: 10 },
      },
      light: {
        breakfast: { protein: 32, carbs: 67, fat: 15 },
        morning_snack: { protein: 22, carbs: 45, fat: 10 },
        lunch: { protein: 37, carbs: 90, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 67, fat: 10 },
        dinner: { protein: 37, carbs: 67, fat: 15 },
        supper: { protein: 22, carbs: 30, fat: 10 },
      },
      moderate: {
        breakfast: { protein: 32, carbs: 67, fat: 15 },
        morning_snack: { protein: 22, carbs: 45, fat: 10 },
        lunch: { protein: 37, carbs: 90, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 67, fat: 10 },
        dinner: { protein: 37, carbs: 67, fat: 15 },
        supper: { protein: 22, carbs: 30, fat: 10 },
      },
      active: {
        breakfast: { protein: 32, carbs: 67, fat: 15 },
        morning_snack: { protein: 22, carbs: 45, fat: 10 },
        lunch: { protein: 37, carbs: 90, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 67, fat: 10 },
        dinner: { protein: 37, carbs: 67, fat: 15 },
        supper: { protein: 22, carbs: 30, fat: 10 },
      },
      very_active: {
        breakfast: { protein: 32, carbs: 67, fat: 15 },
        morning_snack: { protein: 22, carbs: 45, fat: 10 },
        lunch: { protein: 37, carbs: 90, fat: 15 },
        afternoon_snack: { protein: 27, carbs: 67, fat: 10 },
        dinner: { protein: 37, carbs: 67, fat: 15 },
        supper: { protein: 22, carbs: 30, fat: 10 },
      },
    },
  },
};

// ============================================
// FUNCTION TO GET MACRO TARGETS PER MEAL
// ============================================

/**
 * Gets the macro targets for a specific meal based on
 * user's goal, sex, and activity level.
 * 
 * This is the main function of the Deterministic Nutritional Decision Engine.
 * 
 * @param goal - Goal: 'lose_weight' | 'maintain' | 'gain_weight'
 * @param sex - Sex: 'male' | 'female' 
 * @param activityLevel - Activity level
 * @param mealType - Meal type
 * @returns MealMacroTarget with protein, carbs, and fat in grams
 */
export function getMealMacroTargets(
  goal: string,
  sex: string,
  activityLevel: string,
  mealType: string
): MealMacroTarget {
  // Normalize goal
  const normalizedGoal: Goal = 
    goal === 'weight_loss' || goal === 'lose_weight' || goal === 'emagrecer' ? 'lose_weight' :
    goal === 'weight_gain' || goal === 'gain_weight' || goal === 'gain_muscle' || goal === 'ganhar' ? 'gain_weight' :
    'maintain';
  
  // Normalize sex
  const normalizedSex: Sex = 
    sex === 'male' || sex === 'masculino' || sex === 'm' ? 'male' : 'female';
  
  // Normalize activity level (default: moderate)
  const normalizedActivity: ActivityLevel =
    activityLevel === 'sedentary' || activityLevel === 'sedentario' ? 'sedentary' :
    activityLevel === 'light' || activityLevel === 'leve' ? 'light' :
    activityLevel === 'active' || activityLevel === 'ativo' ? 'active' :
    activityLevel === 'very_active' || activityLevel === 'muito_ativo' ? 'very_active' :
    'moderate';
  
  // Normalize meal type
  const normalizedMeal = 
    mealType === 'cafe_manha' || mealType === 'café_manhã' || mealType === 'cafe_da_manha' ? 'breakfast' :
    mealType === 'lanche_manha' || mealType === 'lanche_manhã' ? 'morning_snack' :
    mealType === 'almoco' || mealType === 'almoço' ? 'lunch' :
    mealType === 'lanche_tarde' || mealType === 'lanche' ? 'afternoon_snack' :
    mealType === 'jantar' ? 'dinner' :
    mealType === 'ceia' ? 'supper' :
    mealType as keyof MealMacroTargetSet;
  
  // Lookup in table
  const goalData = MEAL_MACRO_TARGETS[normalizedGoal];
  if (!goalData) {
    console.warn(`[getMealMacroTargets] Goal not found: ${goal}, using maintain`);
    return MEAL_MACRO_TARGETS.maintain.male.moderate.lunch;
  }
  
  const sexData = goalData[normalizedSex];
  if (!sexData) {
    console.warn(`[getMealMacroTargets] Sex not found: ${sex}, using male`);
    return MEAL_MACRO_TARGETS[normalizedGoal].male.moderate.lunch;
  }
  
  const activityData = sexData[normalizedActivity];
  if (!activityData) {
    console.warn(`[getMealMacroTargets] Activity not found: ${activityLevel}, using moderate`);
    return sexData.moderate.lunch;
  }
  
  const mealData = activityData[normalizedMeal as keyof MealMacroTargetSet];
  if (!mealData) {
    console.warn(`[getMealMacroTargets] Meal not found: ${mealType}, using lunch`);
    return activityData.lunch;
  }
  
  return mealData;
}

/**
 * Gets ALL macro targets for a user profile.
 * Returns targets for all 6 meals.
 */
export function getAllMealMacroTargets(
  goal: string,
  sex: string,
  activityLevel: string
): MealMacroTargetSet {
  const meals: (keyof MealMacroTargetSet)[] = [
    'breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper'
  ];
  
  const result: Partial<MealMacroTargetSet> = {};
  
  for (const meal of meals) {
    result[meal] = getMealMacroTargets(goal, sex, activityLevel, meal);
  }
  
  return result as MealMacroTargetSet;
}

/**
 * Generates a string with macro targets for AI prompt injection.
 * Format optimized for Gemini to understand per-meal goals.
 */
export function buildMealMacroTargetsForPrompt(
  goal: string,
  sex: string,
  activityLevel: string,
  enabledMeals?: string[]
): string {
  const allTargets = getAllMealMacroTargets(goal, sex, activityLevel);
  
  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    morning_snack: 'Morning Snack',
    lunch: 'Lunch',
    afternoon_snack: 'Afternoon Snack',
    dinner: 'Dinner',
    supper: 'Supper',
  };
  
  let prompt = `
=== DETERMINISTIC NUTRITIONAL DECISION ENGINE ===
MANDATORY MACRO TARGETS PER MEAL (±15% tolerance):
`;

  const mealsToShow = enabledMeals || Object.keys(mealLabels);
  
  for (const [mealKey, targets] of Object.entries(allTargets)) {
    // Normalize enabledMeals for comparison
    const normalizedEnabledMeals = mealsToShow.map(m => {
      if (m === 'cafe_manha' || m === 'café_manhã' || m === 'cafe_da_manha') return 'breakfast';
      if (m === 'lanche_manha' || m === 'lanche_manhã') return 'morning_snack';
      if (m === 'almoco' || m === 'almoço') return 'lunch';
      if (m === 'lanche_tarde' || m === 'lanche') return 'afternoon_snack';
      if (m === 'jantar') return 'dinner';
      if (m === 'ceia') return 'supper';
      return m;
    });
    
    if (normalizedEnabledMeals.includes(mealKey)) {
      const label = mealLabels[mealKey] || mealKey;
      const calories = (targets.protein * 4) + (targets.carbs * 4) + (targets.fat * 9);
      prompt += `
- ${label}: P${targets.protein}g C${targets.carbs}g F${targets.fat}g (~${Math.round(calories)}kcal)`;
    }
  }
  
  // Add goal-specific rules
  const normalizedGoal = 
    goal === 'weight_loss' || goal === 'lose_weight' || goal === 'emagrecer' ? 'lose_weight' :
    goal === 'weight_gain' || goal === 'gain_weight' || goal === 'gain_muscle' || goal === 'ganhar' ? 'gain_weight' :
    'maintain';
  
  if (normalizedGoal === 'lose_weight') {
    prompt += `

RULES FOR WEIGHT LOSS:
- Supper MUST have ZERO or very low carbs
- HIGH protein in all meals to preserve muscle mass
- Reduced carbs especially at night`;
  } else if (normalizedGoal === 'gain_weight') {
    prompt += `

RULES FOR WEIGHT GAIN:
- HIGH carbs especially at breakfast and lunch
- HIGH protein for muscle building
- Supper can have moderate carbs`;
  }
  
  prompt += `

IMPORTANT: These are exact targets calibrated by nutritionists. Do not deviate.
==============================================`;
  
  return prompt;
}

// ============================================
// MEAL DISTRIBUTION PERCENTAGES (English keys)
// ============================================

// Standard 5-meal distribution
const MEAL_PERCENTAGES: Record<string, { percentage: number; label: string }> = {
  breakfast: { percentage: 0.22, label: "Café da Manhã" },
  morning_snack: { percentage: 0.08, label: "Lanche da Manhã" },
  lunch: { percentage: 0.30, label: "Almoço" },
  afternoon_snack: { percentage: 0.10, label: "Lanche da Tarde" },
  dinner: { percentage: 0.22, label: "Jantar" },
  supper: { percentage: 0.08, label: "Ceia" },
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
    feedback = "Meal within nutritional targets";
  } else if (mealCalories > targetCalories * (1 + tolerance)) {
    const excess = mealCalories - targetCalories;
    feedback = `${excess} kcal above recommended for this meal`;
  } else if (mealCalories < targetCalories * (1 - tolerance)) {
    const deficit = targetCalories - mealCalories;
    feedback = `${deficit} kcal below recommended for this meal`;
  } else if (mealProtein < targetProtein * (1 - tolerance)) {
    const deficit = Math.round(targetProtein - mealProtein);
    feedback = `Missing ${deficit}g of protein to reach target`;
  } else {
    feedback = "Meal close to nutritional targets";
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
USER NUTRITIONAL PROFILE:
- Basal Metabolic Rate (BMR): ${targets.bmr} kcal/day
- Total Daily Energy Expenditure (TDEE): ${targets.tdee} kcal/day
- Daily Calorie Target: ${targets.targetCalories} kcal/day

DAILY MACRONUTRIENT TARGETS:
- Protein: ${targets.protein}g (${Math.round((targets.protein * 4 / targets.targetCalories) * 100)}% of calories)
- Carbs: ${targets.carbs}g (${Math.round((targets.carbs * 4 / targets.targetCalories) * 100)}% of calories)
- Fat: ${targets.fat}g (${Math.round((targets.fat * 9 / targets.targetCalories) * 100)}% of calories)
- Fiber: ~${targets.fiber}g`;

  if (mealType) {
    const mealTarget = getMealTarget(targets, mealType, enabledMeals);
    if (mealTarget) {
      context += `

TARGETS FOR ${mealTarget.label.toUpperCase()}:
- Calories: ${mealTarget.calorieRange.min}-${mealTarget.calorieRange.max} kcal (ideal: ${mealTarget.calories} kcal)
- Protein: ~${mealTarget.protein}g
- Carbs: ~${mealTarget.carbs}g
- Fat: ~${mealTarget.fat}g`;
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
CALORIE DISTRIBUTION PER MEAL:`;

  distribution.forEach(meal => {
    summary += `
- ${meal.label}: ${meal.calorieRange.min}-${meal.calorieRange.max} kcal | ~${meal.protein}g prot | ~${meal.carbs}g carb | ~${meal.fat}g fat`;
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
    warnings.push("Calorie target too low (< 1200 kcal). May be harmful to health.");
  }

  if (targets.targetCalories > 4000) {
    warnings.push("Calorie target too high (> 4000 kcal). Verify if correct.");
  }

  if (targets.protein < 50) {
    warnings.push("Daily protein low (< 50g). May compromise muscle mass.");
  }

  if (targets.fat < 30) {
    warnings.push("Daily fat too low (< 30g). May affect hormones.");
  }

  return {
    isHealthy: warnings.length === 0,
    warnings,
  };
}

