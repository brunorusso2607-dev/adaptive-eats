import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// TIPOS DO SISTEMA CENTRALIZADO DE PERFIL
// ============================================

export type GoalIntensity = "light" | "moderate" | "aggressive";
export type RecipeStyle = "fitness" | "regular" | "high_calorie";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
// Database stores: "lose_weight" | "maintain" | "gain_weight"
export type UserGoal = "lose_weight" | "maintain" | "gain_weight";

export interface CalorieRange {
  min: number;
  max: number;
}

export interface MealCalorieRanges {
  breakfast: CalorieRange;
  lunch: CalorieRange;
  afternoon_snack: CalorieRange;
  dinner: CalorieRange;
  supper: CalorieRange;
}

export interface MacroTargets {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  mode: "lose" | "gain" | "maintain";
}

export interface UserProfileContext {
  // Dados brutos do perfil
  id: string;
  sex: string | null;
  age: number | null;
  height: number | null;
  weight_current: number | null;
  weight_goal: number | null;
  activity_level: string | null;
  goal: UserGoal | null;
  dietary_preference: string | null;
  intolerances: string[] | null;
  excluded_ingredients: string[] | null;
  country: string | null;
  kids_mode: boolean | null;

  // Dados calculados automaticamente
  goalIntensity: GoalIntensity;
  recipeStyle: RecipeStyle;
  macroTargets: MacroTargets;
  mealCalorieRanges: MealCalorieRanges;
  weightDifference: number;
  bmi: number | null;
  bmiCategory: string | null;
  isObese: boolean;
  isUnderweight: boolean;

  // Helpers
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
}

// ============================================
// CONSTANTES E FATORES
// ============================================

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Distribuição de calorias por refeição (% do total diário)
const CALORIE_DISTRIBUTION: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  afternoon_snack: 0.10,
  dinner: 0.25,
  supper: 0.05,
};

// ============================================
// FUNÇÕES UTILITÁRIAS (exportadas para uso externo)
// ============================================

/**
 * Calcula a intensidade do objetivo baseado na diferença de peso
 */
export function calculateGoalIntensity(
  goal: UserGoal | null,
  weightCurrent: number | null,
  weightGoal: number | null
): GoalIntensity {
  if (!goal || !weightCurrent || !weightGoal) {
    return "moderate";
  }

  const difference = Math.abs(weightCurrent - weightGoal);

  // Database stores: "lose_weight" | "maintain" | "gain_weight"
  if (goal === "lose_weight") {
    if (difference <= 5) return "light";
    if (difference <= 15) return "moderate";
    return "aggressive";
  }

  if (goal === "gain_weight") {
    if (difference <= 5) return "light";
    if (difference <= 10) return "moderate";
    return "aggressive";
  }

  return "moderate"; // maintain
}

/**
 * Determina o estilo de receita baseado no objetivo e intensidade
 */
export function calculateRecipeStyle(
  goal: UserGoal | null,
  intensity: GoalIntensity
): RecipeStyle {
  // Database stores: "lose_weight" | "maintain" | "gain_weight"
  if (!goal || goal === "maintain") {
    return "regular";
  }

  if (goal === "lose_weight") {
    return "fitness";
  }

  if (goal === "gain_weight") {
    return "high_calorie";
  }

  return "regular";
}

/**
 * Calcula IMC e categoria
 */
export function calculateBMI(
  weightKg: number | null,
  heightCm: number | null
): { bmi: number | null; category: string | null } {
  if (!weightKg || !heightCm) {
    return { bmi: null, category: null };
  }

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  let category: string;
  if (bmi < 18.5) {
    category = "abaixo_peso";
  } else if (bmi < 25) {
    category = "normal";
  } else if (bmi < 30) {
    category = "sobrepeso";
  } else if (bmi < 35) {
    category = "obesidade_1";
  } else if (bmi < 40) {
    category = "obesidade_2";
  } else {
    category = "obesidade_3";
  }

  return { bmi: Math.round(bmi * 10) / 10, category };
}

/**
 * Calcula macros diários usando fórmula Mifflin-St Jeor
 */
export function calculateMacroTargets(
  sex: string | null,
  age: number | null,
  height: number | null,
  weightCurrent: number | null,
  weightGoal: number | null,
  activityLevel: string | null,
  goal: UserGoal | null,
  intensity: GoalIntensity
): MacroTargets {
  // Valores padrão
  let dailyCalories = 2000;
  let dailyProtein = 60;
  let dailyCarbs = 250;
  let dailyFat = 65;
  let mode: "lose" | "gain" | "maintain" = "maintain";

  if (weightCurrent && height && age && sex) {
    let tmb: number;

    // Fórmula de Mifflin-St Jeor
    if (sex === "male") {
      tmb = 10 * weightCurrent + 6.25 * height - 5 * age + 5;
    } else {
      tmb = 10 * weightCurrent + 6.25 * height - 5 * age - 161;
    }

    const factor = ACTIVITY_FACTORS[activityLevel || "moderate"] || 1.55;
    const tdee = Math.round(tmb * factor);

    // Ajuste baseado no objetivo E intensidade
    // Database stores: "lose_weight" | "maintain" | "gain_weight"
    if (goal === "lose_weight") {
      const calorieDeficit = intensity === "light" ? 300 : intensity === "moderate" ? 500 : 700;
      const minCalories = sex === "male" ? 1500 : 1200;
      dailyCalories = Math.max(tdee - calorieDeficit, minCalories);
      
      // Proteína mais alta para preservar massa muscular
      const proteinMultiplier = intensity === "aggressive" ? 2.2 : intensity === "moderate" ? 2.0 : 1.8;
      dailyProtein = Math.round((weightGoal || weightCurrent) * proteinMultiplier);
      
      mode = "lose";
    } else if (goal === "gain_weight") {
      const calorieSurplus = intensity === "light" ? 250 : intensity === "moderate" ? 400 : 600;
      dailyCalories = tdee + calorieSurplus;
      
      // Proteína alta para ganho de massa
      const proteinMultiplier = intensity === "aggressive" ? 2.4 : intensity === "moderate" ? 2.2 : 2.0;
      dailyProtein = Math.round((weightGoal || weightCurrent) * proteinMultiplier);
      
      mode = "gain";
    } else {
      dailyCalories = tdee;
      dailyProtein = Math.round(weightCurrent * 1.6);
      mode = "maintain";
    }

    // Calcular carboidratos e gorduras baseado nas calorias restantes
    const proteinCalories = dailyProtein * 4;
    const remainingCalories = dailyCalories - proteinCalories;

    if (goal === "lose_weight") {
      // Low carb para emagrecimento: 30% carbs, 70% gordura das calorias restantes
      dailyCarbs = Math.round((remainingCalories * 0.4) / 4);
      dailyFat = Math.round((remainingCalories * 0.6) / 9);
    } else if (goal === "gain_weight") {
      // Mais carbs para energia: 60% carbs, 40% gordura
      dailyCarbs = Math.round((remainingCalories * 0.6) / 4);
      dailyFat = Math.round((remainingCalories * 0.4) / 9);
    } else {
      // Balanceado: 50% carbs, 50% gordura
      dailyCarbs = Math.round((remainingCalories * 0.5) / 4);
      dailyFat = Math.round((remainingCalories * 0.5) / 9);
    }
  }

  return { dailyCalories, dailyProtein, dailyCarbs, dailyFat, mode };
}

/**
 * Calcula faixas de calorias por refeição
 */
export function calculateMealCalorieRanges(
  dailyCalories: number,
  recipeStyle: RecipeStyle,
  intensity: GoalIntensity
): MealCalorieRanges {
  // Margem de variação baseada no estilo
  const variationPercent = recipeStyle === "fitness" ? 0.15 : recipeStyle === "high_calorie" ? 0.20 : 0.18;

  const calculateRange = (mealType: keyof typeof CALORIE_DISTRIBUTION): CalorieRange => {
    const baseCal = Math.round(dailyCalories * CALORIE_DISTRIBUTION[mealType]);
    const variation = Math.round(baseCal * variationPercent);

    return {
      min: Math.max(baseCal - variation, 50),
      max: baseCal + variation,
    };
  };

  return {
    breakfast: calculateRange("breakfast"),
    lunch: calculateRange("lunch"),
    afternoon_snack: calculateRange("afternoon_snack"),
    dinner: calculateRange("dinner"),
    supper: calculateRange("supper"),
  };
}

/**
 * Verifica se uma refeição está dentro da faixa de calorias
 */
export function isMealInCalorieRange(
  mealCalories: number,
  mealType: string,
  ranges: MealCalorieRanges
): boolean {
  const range = ranges[mealType as keyof MealCalorieRanges];
  if (!range) return true;
  return mealCalories >= range.min && mealCalories <= range.max;
}

/**
 * Filtra refeições por faixa de calorias do objetivo
 */
export function filterMealsByGoal<T extends { calories: number; meal_type: string }>(
  meals: T[],
  ranges: MealCalorieRanges,
  recipeStyle: RecipeStyle
): T[] {
  return meals.filter((meal) => {
    const range = ranges[meal.meal_type as keyof MealCalorieRanges];
    if (!range) return true;

    // Para fitness, prioriza refeições com calorias mais baixas
    if (recipeStyle === "fitness") {
      return meal.calories <= range.max;
    }

    // Para high_calorie, prioriza refeições com calorias mais altas
    if (recipeStyle === "high_calorie") {
      return meal.calories >= range.min;
    }

    // Regular: aceita dentro da faixa
    return meal.calories >= range.min && meal.calories <= range.max;
  });
}

/**
 * Ordena refeições por adequação ao objetivo
 */
export function sortMealsByGoal<T extends { calories: number }>(
  meals: T[],
  recipeStyle: RecipeStyle,
  targetCalories: number
): T[] {
  return [...meals].sort((a, b) => {
    if (recipeStyle === "fitness") {
      // Fitness: menor caloria primeiro, mas não muito abaixo do target
      const aDiff = a.calories <= targetCalories ? targetCalories - a.calories : (a.calories - targetCalories) * 2;
      const bDiff = b.calories <= targetCalories ? targetCalories - b.calories : (b.calories - targetCalories) * 2;
      return aDiff - bDiff;
    }

    if (recipeStyle === "high_calorie") {
      // High calorie: maior caloria primeiro, mas não muito acima do target
      const aDiff = a.calories >= targetCalories ? a.calories - targetCalories : (targetCalories - a.calories) * 2;
      const bDiff = b.calories >= targetCalories ? b.calories - targetCalories : (targetCalories - b.calories) * 2;
      return aDiff - bDiff;
    }

    // Regular: mais próximo do target
    return Math.abs(a.calories - targetCalories) - Math.abs(b.calories - targetCalories);
  });
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useUserProfileContext(): UserProfileContext {
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthenticated(false);
        setProfile(null);
        return;
      }

      setIsAuthenticated(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Cálculos derivados
  const computed = useMemo(() => {
    const goal = profile?.goal as UserGoal | null;
    const weightCurrent = profile?.weight_current;
    const weightGoal = profile?.weight_goal;
    const height = profile?.height;
    const age = profile?.age;
    const sex = profile?.sex;
    const activityLevel = profile?.activity_level;

    // Intensidade do objetivo
    const goalIntensity = calculateGoalIntensity(goal, weightCurrent, weightGoal);

    // Estilo de receita
    const recipeStyle = calculateRecipeStyle(goal, goalIntensity);

    // Diferença de peso
    const weightDifference = weightCurrent && weightGoal 
      ? Math.abs(weightCurrent - weightGoal) 
      : 0;

    // IMC
    const { bmi, category: bmiCategory } = calculateBMI(weightCurrent, height);
    const isObese = bmiCategory ? bmiCategory.startsWith("obesidade") : false;
    const isUnderweight = bmiCategory === "abaixo_peso";

    // Macros
    const macroTargets = calculateMacroTargets(
      sex,
      age,
      height,
      weightCurrent,
      weightGoal,
      activityLevel,
      goal,
      goalIntensity
    );

    // Faixas de calorias por refeição
    const mealCalorieRanges = calculateMealCalorieRanges(
      macroTargets.dailyCalories,
      recipeStyle,
      goalIntensity
    );

    return {
      goalIntensity,
      recipeStyle,
      weightDifference,
      bmi,
      bmiCategory,
      isObese,
      isUnderweight,
      macroTargets,
      mealCalorieRanges,
    };
  }, [profile]);

  return {
    // Dados brutos
    id: profile?.id || "",
    sex: profile?.sex || null,
    age: profile?.age || null,
    height: profile?.height || null,
    weight_current: profile?.weight_current || null,
    weight_goal: profile?.weight_goal || null,
    activity_level: profile?.activity_level || null,
    goal: profile?.goal || null,
    dietary_preference: profile?.dietary_preference || null,
    intolerances: profile?.intolerances || null,
    excluded_ingredients: profile?.excluded_ingredients || null,
    country: profile?.country || null,
    kids_mode: profile?.kids_mode || null,

    // Dados calculados
    ...computed,

    // Helpers
    isLoading,
    isAuthenticated,
    refetch: fetchProfile,
  };
}

export default useUserProfileContext;
