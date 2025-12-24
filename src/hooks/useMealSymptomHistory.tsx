import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

export interface FoodCorrelation {
  food: string;
  count: number;
  percentage: number;
}

export interface SymptomHistoryFilters {
  days: 7 | 14 | 21 | 30;
  symptomCategory?: string;
  severity?: string;
}

export function useMealSymptomHistory(filters: SymptomHistoryFilters) {
  const [meals, setMeals] = useState<MealWithSymptoms[]>([]);
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

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - filters.days);

      // Fetch symptom logs with meal consumption
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
            consumption_items (
              food_name
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

      // Also fetch meals consumed within 6 hours before symptom logs that don't have direct link
      const mealsWithSymptoms: MealWithSymptoms[] = [];

      for (const log of logs || []) {
        const symptomTime = new Date(log.logged_at);
        
        // If has direct meal link
        if (log.meal_consumption && log.meal_consumption_id) {
          const meal = log.meal_consumption as any;
          const mealTime = new Date(meal.consumed_at);
          const timeDiffHours = (symptomTime.getTime() - mealTime.getTime()) / (1000 * 60 * 60);
          
          mealsWithSymptoms.push({
            mealId: meal.id,
            mealDate: meal.consumed_at,
            foods: meal.consumption_items?.map((item: any) => item.food_name) || [],
            totalCalories: meal.total_calories,
            symptoms: log.symptoms,
            severity: log.severity,
            symptomDate: log.logged_at,
            timeDiffHours: Math.round(timeDiffHours * 10) / 10,
            notes: log.notes,
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
              consumption_items (
                food_name
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
            
            mealsWithSymptoms.push({
              mealId: meal.id,
              mealDate: meal.consumed_at,
              foods: meal.consumption_items?.map((item: any) => item.food_name) || [],
              totalCalories: meal.total_calories,
              symptoms: log.symptoms,
              severity: log.severity,
              symptomDate: log.logged_at,
              timeDiffHours: Math.round(timeDiffHours * 10) / 10,
              notes: log.notes,
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
      meal.foods.forEach((food) => {
        foodCounts[food] = (foodCounts[food] || 0) + 1;
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

  return {
    meals,
    foodCorrelations,
    suspectFoods,
    isLoading,
    error,
    refetch: fetchHistory,
  };
}
