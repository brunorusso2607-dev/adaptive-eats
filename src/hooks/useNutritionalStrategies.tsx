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

// Mapeia goal para strategy_key para fallback
// Database now stores: "lose_weight" | "maintain" | "gain_weight"
export const GOAL_TO_STRATEGY_KEY: Record<string, string> = {
  lose_weight: "emagrecer",
  maintain: "manter",
  gain_weight: "ganhar_peso",
  // Legacy fallbacks
  emagrecer: "emagrecer",
  manter: "manter",
  ganhar_peso: "ganhar_peso",
};

// Retorna a strategy recomendada baseada no goal
export function getRecommendedStrategy(
  goal: string | null,
  strategies: NutritionalStrategy[]
): NutritionalStrategy | null {
  if (!goal) return strategies.find(s => s.key === "manter") || null;
  
  const strategyKey = GOAL_TO_STRATEGY_KEY[goal];
  return strategies.find(s => s.key === strategyKey) || null;
}

// Deriva o goal automaticamente a partir da estratégia selecionada
// Database stores: "lose_weight" | "maintain" | "gain_weight"
export function deriveGoalFromStrategy(strategyKey: string): "lose_weight" | "maintain" | "gain_weight" {
  switch (strategyKey) {
    case "emagrecer":
    case "cutting":
      return "lose_weight";
    case "ganhar_peso":
      return "gain_weight";
    case "manter":
    case "fitness":
    case "dieta_flexivel":
    default:
      return "maintain";
  }
}

// Agrupa strategies por compatibilidade com goal
export function getStrategiesForGoal(
  goal: string | null,
  strategies: NutritionalStrategy[]
): { recommended: NutritionalStrategy[]; others: NutritionalStrategy[] } {
  const recommended: NutritionalStrategy[] = [];
  const others: NutritionalStrategy[] = [];

  strategies.forEach(strategy => {
    // Estratégias compatíveis por goal
    // Database stores: "lose_weight" | "maintain" | "gain_weight"
    if (goal === "lose_weight") {
      if (strategy.key === "emagrecer" || strategy.key === "cutting") {
        recommended.push(strategy);
      } else {
        others.push(strategy);
      }
    } else if (goal === "gain_weight") {
      if (strategy.key === "ganhar_peso" || strategy.key === "fitness") {
        recommended.push(strategy);
      } else {
        others.push(strategy);
      }
    } else {
      // maintain ou undefined
      if (strategy.key === "manter" || strategy.key === "dieta_flexivel") {
        recommended.push(strategy);
      } else {
        others.push(strategy);
      }
    }
  });

  return { recommended, others };
}
