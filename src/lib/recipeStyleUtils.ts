import { Flame, TrendingUp, type LucideIcon } from "lucide-react";
import type { RecipeStyle } from "@/hooks/useUserProfileContext";

export interface RecipeStyleBadgeConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

export interface RecipeStyleBadgeResult {
  config: RecipeStyleBadgeConfig | null;
  isRecommended: boolean;
  mealStyle: RecipeStyle;
}

/**
 * Classifica uma refeição com base nas calorias e retorna a configuração do badge.
 * 
 * @param calories - Calorias da refeição
 * @param userRecipeStyle - Estilo de receita do usuário baseado no objetivo (fitness, regular, high_calorie)
 * @returns Configuração do badge e se é recomendado para o usuário
 */
export function getRecipeStyleBadge(calories: number, userRecipeStyle: RecipeStyle): RecipeStyleBadgeResult {
  // Classificar a refeição com base nas calorias
  let mealStyle: RecipeStyle;
  if (calories <= 350) {
    mealStyle = "fitness";
  } else if (calories >= 500) {
    mealStyle = "high_calorie";
  } else {
    mealStyle = "regular";
  }

  // Configurações de badge por estilo
  const configs: Record<RecipeStyle, RecipeStyleBadgeConfig | null> = {
    fitness: { 
      label: "Fitness", 
      icon: Flame, 
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" 
    },
    regular: null, // Não mostrar badge para regular
    high_calorie: { 
      label: "Alta Caloria", 
      icon: TrendingUp, 
      className: "bg-amber-500/10 text-amber-600 border-amber-500/30" 
    }
  };

  // Mostrar badge apenas se a refeição combina com o objetivo do usuário
  const isRecommended = mealStyle === userRecipeStyle;
  
  return {
    config: configs[mealStyle],
    isRecommended,
    mealStyle
  };
}
