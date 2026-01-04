import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface NutritionalStrategy {
  id: string;
  key: string;
  label: string;
  description: string | null;
  icon: string | null;
  calorie_modifier: number | null;
  protein_per_kg: number | null;
  carb_ratio: number | null;
  fat_ratio: number | null;
  is_flexible: boolean;
  sort_order: number;
}

export function useNutritionalStrategies() {
  return useQuery({
    queryKey: ["nutritional-strategies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutritional_strategies")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as NutritionalStrategy[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutos
  });
}

// Hook para admin: busca TODAS as estratégias (incluindo inativas)
export function useAllNutritionalStrategies() {
  return useQuery({
    queryKey: ["nutritional-strategies-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutritional_strategies")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as (NutritionalStrategy & { is_active: boolean })[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Maps goal to strategy_key for fallback
// Database now stores: "lose_weight" | "maintain" | "gain_weight"
export const GOAL_TO_STRATEGY_KEY: Record<string, string> = {
  lose_weight: "weight_loss",
  maintain: "maintenance",
  gain_weight: "weight_gain",
  // Legacy fallbacks (Portuguese keys - for migration compatibility)
  emagrecer: "weight_loss",
  manter: "maintenance",
  ganhar_peso: "weight_gain",
};

// Returns the recommended strategy based on goal
export function getRecommendedStrategy(
  goal: string | null,
  strategies: NutritionalStrategy[]
): NutritionalStrategy | null {
  if (!goal) return strategies.find(s => s.key === "maintenance") || null;
  
  const strategyKey = GOAL_TO_STRATEGY_KEY[goal];
  return strategies.find(s => s.key === strategyKey) || null;
}

// Derives goal automatically from selected strategy
// Database stores: "lose_weight" | "maintain" | "gain_weight"
export function deriveGoalFromStrategy(strategyKey: string): "lose_weight" | "maintain" | "gain_weight" {
  switch (strategyKey) {
    case "weight_loss":
    case "cutting":
      return "lose_weight";
    case "weight_gain":
      return "gain_weight";
    case "maintenance":
    case "fitness":
    case "flexible_diet":
    default:
      return "maintain";
  }
}

// Groups strategies by goal compatibility
export function getStrategiesForGoal(
  goal: string | null,
  strategies: NutritionalStrategy[]
): { recommended: NutritionalStrategy[]; others: NutritionalStrategy[] } {
  const recommended: NutritionalStrategy[] = [];
  const others: NutritionalStrategy[] = [];

  strategies.forEach(strategy => {
    // Compatible strategies by goal
    // Database stores: "lose_weight" | "maintain" | "gain_weight"
    if (goal === "lose_weight") {
      if (strategy.key === "weight_loss" || strategy.key === "cutting") {
        recommended.push(strategy);
      } else {
        others.push(strategy);
      }
    } else if (goal === "gain_weight") {
      if (strategy.key === "weight_gain" || strategy.key === "fitness") {
        recommended.push(strategy);
      } else {
        others.push(strategy);
      }
    } else {
      // maintain or undefined
      if (strategy.key === "maintenance" || strategy.key === "flexible_diet") {
        recommended.push(strategy);
      } else {
        others.push(strategy);
      }
    }
  });

  return { recommended, others };
}
