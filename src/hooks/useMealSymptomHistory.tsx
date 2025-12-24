import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RecipeIngredient {
  item: string;
  quantity: string | number;
  unit: string;
}

export interface MealWithSymptoms {
  mealId: string;
  mealDate: string;
  foods: string[];
  totalCalories: number;
  symptoms: string[];
  severity: string;
  symptomDate: string;
  timeDiffHours: number;
  notes: string | null;
  recipeName: string | null;
  recipeIngredients: RecipeIngredient[];
}

export interface FoodCorrelation {
  food: string;
  count: number;
  percentage: number;
}

export interface UserProfile {
  intolerances: string[];
  excludedIngredients: string[];
}

export interface SymptomHistoryFilters {
  days: 0 | 7 | 14 | 21 | 30; // 0 = today
  symptomCategory?: string;
  severity?: string;
}

export function useMealSymptomHistory(filters: SymptomHistoryFilters) {
  const [meals, setMeals] = useState<MealWithSymptoms[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ intolerances: [], excludedIngredients: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Usuário não autenticado");
        setIsLoading(false);
        return;
      }

      // Fetch user profile for intolerances
      const { data: profile } = await supabase
        .from("profiles")
        .select("intolerances, excluded_ingredients")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUserProfile({
          intolerances: profile.intolerances || [],
          excludedIngredients: profile.excluded_ingredients || [],
        });
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      
      if (filters.days === 0) {
        // Today only - start of today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - filters.days);
      }

      // Fetch symptom logs with meal consumption and recipe details
      let query = supabase
        .from("symptom_logs")
        .select(`
          id,
          symptoms,
          severity,
          logged_at,
          notes,
          meal_consumption_id,
          meal_consumption (
            id,
            consumed_at,
            total_calories,
            meal_plan_item_id,
            consumption_items (
              food_name,
              quantity_grams,
              calories
            ),
            meal_plan_items:meal_plan_item_id (
              recipe_name,
              recipe_ingredients,
              recipe_calories
            )
          )
        `)
        .gte("logged_at", startDate.toISOString())
        .order("logged_at", { ascending: false });

      if (filters.severity) {
        query = query.eq("severity", filters.severity);
      }

      const { data: logs, error: logsError } = await query;

      if (logsError) {
        console.error("Error fetching symptom history:", logsError);
        setError(logsError.message);
        return;
      }

      const mealsWithSymptoms: MealWithSymptoms[] = [];

      for (const log of logs || []) {
        const symptomTime = new Date(log.logged_at);
        
        if (log.meal_consumption && log.meal_consumption_id) {
          const meal = log.meal_consumption as any;
          const mealTime = new Date(meal.consumed_at);
          const timeDiffHours = (symptomTime.getTime() - mealTime.getTime()) / (1000 * 60 * 60);
          
          // Get recipe info if available
          const recipeInfo = meal.meal_plan_items;
          let recipeIngredients: RecipeIngredient[] = [];
          
          if (recipeInfo?.recipe_ingredients) {
            recipeIngredients = Array.isArray(recipeInfo.recipe_ingredients) 
              ? recipeInfo.recipe_ingredients 
              : [];
          }
          
          mealsWithSymptoms.push({
            mealId: meal.id,
            mealDate: meal.consumed_at,
            foods: meal.consumption_items?.map((item: any) => item.food_name) || [],
            totalCalories: meal.total_calories || recipeInfo?.recipe_calories || 0,
            symptoms: log.symptoms,
            severity: log.severity,
            symptomDate: log.logged_at,
            timeDiffHours: Math.round(timeDiffHours * 10) / 10,
            notes: log.notes,
            recipeName: recipeInfo?.recipe_name || null,
            recipeIngredients,
          });
        } else {
          // Look for meals within 6 hours before the symptom
          const sixHoursBefore = new Date(symptomTime.getTime() - 6 * 60 * 60 * 1000);
          
          const { data: nearbyMeals } = await supabase
            .from("meal_consumption")
            .select(`
              id,
              consumed_at,
              total_calories,
              meal_plan_item_id,
              consumption_items (
                food_name,
                quantity_grams,
                calories
              ),
              meal_plan_items:meal_plan_item_id (
                recipe_name,
                recipe_ingredients,
                recipe_calories
              )
            `)
            .eq("user_id", session.user.id)
            .gte("consumed_at", sixHoursBefore.toISOString())
            .lte("consumed_at", symptomTime.toISOString())
            .order("consumed_at", { ascending: false })
            .limit(3);

          for (const meal of nearbyMeals || []) {
            const mealTime = new Date(meal.consumed_at);
            const timeDiffHours = (symptomTime.getTime() - mealTime.getTime()) / (1000 * 60 * 60);
            
            const recipeInfo = (meal as any).meal_plan_items;
            let recipeIngredients: RecipeIngredient[] = [];
            
            if (recipeInfo?.recipe_ingredients) {
              recipeIngredients = Array.isArray(recipeInfo.recipe_ingredients) 
                ? recipeInfo.recipe_ingredients 
                : [];
            }
            
            mealsWithSymptoms.push({
              mealId: meal.id,
              mealDate: meal.consumed_at,
              foods: meal.consumption_items?.map((item: any) => item.food_name) || [],
              totalCalories: meal.total_calories || recipeInfo?.recipe_calories || 0,
              symptoms: log.symptoms,
              severity: log.severity,
              symptomDate: log.logged_at,
              timeDiffHours: Math.round(timeDiffHours * 10) / 10,
              notes: log.notes,
              recipeName: recipeInfo?.recipe_name || null,
              recipeIngredients,
            });
          }
        }
      }

      setMeals(mealsWithSymptoms);
    } catch (err) {
      console.error("Error in meal symptom history:", err);
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setIsLoading(false);
    }
  }, [filters.days, filters.severity]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Calculate food correlations
  const foodCorrelations = useMemo<FoodCorrelation[]>(() => {
    const foodCounts: Record<string, number> = {};
    
    meals.forEach((meal) => {
      // Count from consumed foods
      meal.foods.forEach((food) => {
        foodCounts[food] = (foodCounts[food] || 0) + 1;
      });
      
      // Also count from recipe ingredients
      meal.recipeIngredients.forEach((ingredient) => {
        if (ingredient.item && !meal.foods.includes(ingredient.item)) {
          foodCounts[ingredient.item] = (foodCounts[ingredient.item] || 0) + 1;
        }
      });
    });

    const totalOccurrences = meals.length || 1;
    
    return Object.entries(foodCounts)
      .map(([food, count]) => ({
        food,
        count,
        percentage: Math.round((count / totalOccurrences) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [meals]);

  // Get top suspect foods (appear in >30% of symptom cases)
  const suspectFoods = useMemo(() => {
    return foodCorrelations.filter((f) => f.percentage >= 30);
  }, [foodCorrelations]);

  // Comprehensive mapping of intolerances to related ingredients
  const INTOLERANCE_INGREDIENTS: Record<string, string[]> = {
    lactose: [
      "leite", "queijo", "iogurte", "manteiga", "creme de leite", "nata", 
      "requeijão", "cream cheese", "ricota", "mussarela", "muçarela", "parmesão", 
      "gorgonzola", "provolone", "coalho", "cottage", "mascarpone", "brie", 
      "camembert", "emmental", "gruyère", "gouda", "cheddar", "feta",
      "chantilly", "doce de leite", "sorvete", "milk", "cheese", "butter",
      "whey", "soro de leite", "lactose", "caseína", "caseinato"
    ],
    gluten: [
      "trigo", "farinha de trigo", "pão", "macarrão", "massa", "biscoito", 
      "bolacha", "bolo", "cerveja", "cevada", "centeio", "malte", "semolina",
      "bulgur", "cuscuz", "couscous", "seitan", "wheat", "bread", "pasta",
      "torrada", "croissant", "pizza", "empada", "empanada", "lasanha"
    ],
    ovo: [
      "ovo", "ovos", "gema", "clara", "egg", "albumina", "maionese", "mayonnaise"
    ],
    soja: [
      "soja", "tofu", "edamame", "missô", "miso", "shoyu", "molho de soja",
      "lecitina de soja", "proteína de soja", "soy"
    ],
    amendoim: [
      "amendoim", "pasta de amendoim", "peanut", "paçoca"
    ],
    castanhas: [
      "castanha", "noz", "nozes", "amêndoa", "avelã", "pistache", "macadâmia",
      "pecã", "cashew", "almond", "walnut", "hazelnut"
    ],
    frutos_do_mar: [
      "camarão", "lagosta", "caranguejo", "siri", "mexilhão", "ostra", 
      "lula", "polvo", "marisco", "shrimp", "lobster", "crab"
    ],
    peixe: [
      "peixe", "salmão", "atum", "bacalhau", "tilápia", "sardinha", "anchova",
      "fish", "salmon", "tuna"
    ]
  };

  // Keywords that neutralize suspicion (e.g., "sem lactose" means it's lactose-free)
  const SAFE_KEYWORDS: Record<string, string[]> = {
    lactose: ["sem lactose", "zero lactose", "lactose free", "vegano", "vegan", "vegetal"],
    gluten: ["sem glúten", "gluten free", "zero glúten"]
  };

  // Check if food has safe keywords that neutralize the intolerance concern
  const hasSafeKeyword = useCallback((food: string, intolerance: string): boolean => {
    const foodLower = food.toLowerCase();
    const safeWords = SAFE_KEYWORDS[intolerance.toLowerCase()] || [];
    return safeWords.some(safe => foodLower.includes(safe));
  }, []);

  // Check if food is related to user's intolerances (intelligent matching)
  const isIntoleranceFood = useCallback((food: string): boolean => {
    const foodLower = food.toLowerCase();
    
    return userProfile.intolerances.some(intolerance => {
      const intLower = intolerance.toLowerCase();
      
      // First check if food has safe keywords that neutralize concern
      if (hasSafeKeyword(food, intLower)) {
        return false;
      }
      
      // Get the list of related ingredients for this intolerance
      const relatedIngredients = INTOLERANCE_INGREDIENTS[intLower] || [];
      
      // Check if the food matches any related ingredient
      const matchesIntolerance = relatedIngredients.some(ingredient => 
        foodLower.includes(ingredient.toLowerCase())
      );
      
      // Also do a generic check for the intolerance name itself
      const genericMatch = foodLower.includes(intLower) && !hasSafeKeyword(food, intLower);
      
      return matchesIntolerance || genericMatch;
    });
  }, [userProfile.intolerances, hasSafeKeyword]);

  // Check if food is excluded by user
  const isExcludedFood = useCallback((food: string): boolean => {
    const foodLower = food.toLowerCase();
    return userProfile.excludedIngredients.some(excluded => 
      foodLower.includes(excluded.toLowerCase())
    );
  }, [userProfile.excludedIngredients]);
  
  // Check if food is truly suspect (related to intolerances OR manually excluded)
  const isTrulySuspect = useCallback((food: string): boolean => {
    return isIntoleranceFood(food) || isExcludedFood(food);
  }, [isIntoleranceFood, isExcludedFood]);

  return {
    meals,
    foodCorrelations,
    suspectFoods,
    userProfile,
    isLoading,
    error,
    refetch: fetchHistory,
    isIntoleranceFood,
    isExcludedFood,
    isTrulySuspect,
  };
}
