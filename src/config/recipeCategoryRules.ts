/**
 * Configuração centralizada de regras para categorias de receitas
 * 
 * Este arquivo define quais subcategorias são compatíveis com cada perfil de usuário.
 * Para adicionar novas regras, basta adicionar entradas neste arquivo.
 * 
 * Regras:
 * - compatibleGoals: objetivos compatíveis (emagrecer, manter, ganhar_peso, cutting, fitness, dieta_flexivel)
 * - incompatibleGoals: objetivos incompatíveis
 * - requiredDietaryPreference: requer preferência alimentar específica
 * - incompatibleDietaryPreference: incompatível com preferência alimentar
 * - excludedForContext: contextos onde não deve aparecer (familia, modo_kids)
 * - excludedIntolerances: se usuário tiver essas intolerâncias, não mostrar
 */

import type { Database } from "@/integrations/supabase/types";

// Tipo expandido para incluir novas estratégias nutricionais
// Mantemos compatibilidade com o ENUM antigo (emagrecer, manter, ganhar_peso)
// e adicionamos as novas estratégias (cutting, fitness, dieta_flexivel)
type BaseUserGoal = Database["public"]["Enums"]["user_goal"];
type ExtendedUserGoal = BaseUserGoal | "cutting" | "fitness" | "dieta_flexivel";
type UserGoal = ExtendedUserGoal;

type DietaryPreference = Database["public"]["Enums"]["dietary_preference"];
type UserContext = Database["public"]["Enums"]["user_context"];

/**
 * Mapeia estratégias novas para goals compatíveis (para filtros de categoria)
 * Isso permite que categorias definidas com goals antigos funcionem com novas estratégias
 */
export const STRATEGY_TO_COMPATIBLE_GOALS: Record<string, BaseUserGoal[]> = {
  emagrecer: ["lose_weight"],
  lose_weight: ["lose_weight"],
  cutting: ["lose_weight"], // Cutting é compatível com categorias de lose_weight
  manter: ["maintain"],
  maintain: ["maintain"],
  fitness: ["maintain"], // Fitness é compatível com categorias de maintain
  ganhar_peso: ["gain_weight"],
  gain_weight: ["gain_weight"],
  dieta_flexivel: ["lose_weight", "maintain", "gain_weight"], // Flexível é compatível com todas
};

export interface SubcategoryRule {
  name: string;
  compatibleGoals?: UserGoal[];
  incompatibleGoals?: UserGoal[];
  requiredDietaryPreference?: DietaryPreference[];
  incompatibleDietaryPreference?: DietaryPreference[];
  excludedForContext?: UserContext[];
  /** Tags de ingredientes que essa categoria pode conter - se usuário tem intolerância, será filtrada */
  containsIngredientTags?: string[];
  /** Se true, sempre aparece independente do perfil */
  alwaysShow?: boolean;
}

export interface CategoryConfig {
  id: string;
  name: string;
  emoji: string;
  subcategories: SubcategoryRule[];
}

/**
 * Mapeamento de intolerâncias para tags de ingredientes
 * Quando usuário tem uma intolerância, categorias com essas tags serão filtradas
 */
export const INTOLERANCE_INGREDIENT_MAP: Record<string, string[]> = {
  // Frutos do mar
  "camarão": ["frutos_do_mar", "camarão"],
  "camarao": ["frutos_do_mar", "camarão"],
  "frutos do mar": ["frutos_do_mar"],
  "peixe": ["peixe", "frutos_do_mar"],
  "mariscos": ["frutos_do_mar", "mariscos"],
  
  // Laticínios
  "lactose": ["laticínios", "leite", "queijo"],
  "leite": ["laticínios", "leite"],
  "queijo": ["queijo", "laticínios"],
  
  // Glúten
  "glúten": ["glúten", "trigo", "massas"],
  "gluten": ["glúten", "trigo", "massas"],
  "trigo": ["trigo", "glúten"],
  
  // Oleaginosas
  "amendoim": ["amendoim", "oleaginosas"],
  "nozes": ["nozes", "oleaginosas"],
  "castanhas": ["castanhas", "oleaginosas"],
  
  // Ovos
  "ovo": ["ovos"],
  "ovos": ["ovos"],
  
  // Soja
  "soja": ["soja"],
  
  // Outros
  "açúcar": ["açúcar"],
  "acucar": ["açúcar"],
};

/**
 * Configuração completa das categorias e subcategorias
 */
export const CATEGORY_RULES: CategoryConfig[] = [
  {
    id: "entradas",
    name: "Entradas & Leves",
    emoji: "🥗",
    subcategories: [
      { name: "Saladas", alwaysShow: true },
      { name: "Molhos para salada", alwaysShow: true },
      { name: "Pastas e patês", alwaysShow: true },
      { name: "Antepastos", alwaysShow: true },
      { name: "Sopas leves", compatibleGoals: ["lose_weight", "maintain"] },
      { name: "Caldos", alwaysShow: true },
      { name: "Cremes frios", alwaysShow: true },
    ],
  },
  {
    id: "principais",
    name: "Pratos Principais",
    emoji: "🍽️",
    subcategories: [
      { name: "Prato principal tradicional", alwaysShow: true },
      { 
        name: "Pratos fitness", 
        compatibleGoals: ["lose_weight", "maintain"],
        incompatibleGoals: ["gain_weight"],
      },
      { 
        name: "Pratos low carb", 
        compatibleGoals: ["lose_weight"],
        incompatibleGoals: ["gain_weight"],
        incompatibleDietaryPreference: ["vegan"], // Low carb geralmente usa proteínas animais
      },
      { 
        name: "Pratos vegetarianos", 
        requiredDietaryPreference: ["vegetarian", "vegan"],
      },
      { 
        name: "Pratos veganos", 
        requiredDietaryPreference: ["vegan"],
      },
      { 
        name: "Pratos proteicos (high protein)", 
        alwaysShow: true, // Bom para todos os objetivos
      },
      { 
        name: "Pratos elaborados / gourmet", 
        alwaysShow: true,
        excludedForContext: ["modo_kids"], // Kids preferem coisas simples
      },
      { 
        name: "Pratos para bulking", 
        compatibleGoals: ["gain_weight"],
        incompatibleGoals: ["lose_weight"],
      },
      { 
        name: "Pratos calóricos", 
        compatibleGoals: ["gain_weight"],
        incompatibleGoals: ["lose_weight"],
      },
    ],
  },
  {
    id: "acompanhamentos",
    name: "Acompanhamentos",
    emoji: "🍚",
    subcategories: [
      { name: "Arroz e grãos", alwaysShow: true },
      { name: "Legumes refogados", alwaysShow: true },
      { name: "Purês", alwaysShow: true, containsIngredientTags: ["laticínios"] },
      { name: "Farofas", alwaysShow: true },
      { name: "Massas", alwaysShow: true, containsIngredientTags: ["glúten"] },
      { name: "Cuscuz", alwaysShow: true },
      { name: "Quinoa e derivados", alwaysShow: true },
    ],
  },
  {
    id: "cafe_lanches",
    name: "Café da Manhã & Lanches",
    emoji: "🍳",
    subcategories: [
      { name: "Café da manhã", alwaysShow: true },
      { 
        name: "Lanches fitness", 
        compatibleGoals: ["lose_weight", "maintain"],
      },
      { 
        name: "Lanches calóricos", 
        compatibleGoals: ["gain_weight"],
        incompatibleGoals: ["lose_weight"],
      },
      { name: "Panquecas", alwaysShow: true, containsIngredientTags: ["ovos", "glúten"] },
      { name: "Ovos e omeletes", alwaysShow: true, containsIngredientTags: ["ovos"] },
      { name: "Sanduíches", alwaysShow: true, containsIngredientTags: ["glúten"] },
      { name: "Tapiocas", alwaysShow: true },
    ],
  },
  {
    id: "sobremesas",
    name: "Sobremesas",
    emoji: "🍰",
    subcategories: [
      { 
        name: "Sobremesas tradicionais", 
        alwaysShow: true,
        excludedForContext: ["modo_kids"], // Kids só fitness/sem açúcar
      },
      { 
        name: "Sobremesas fitness", 
        compatibleGoals: ["lose_weight", "maintain"],
      },
      { 
        name: "Sobremesas low carb", 
        compatibleGoals: ["lose_weight"],
        incompatibleGoals: ["gain_weight"],
      },
      { name: "Sobremesas sem açúcar", alwaysShow: true },
      { 
        name: "Sobremesas veganas", 
        requiredDietaryPreference: ["vegan"],
      },
      { name: "Bolos", alwaysShow: true, containsIngredientTags: ["glúten", "ovos"] },
      { name: "Tortas doces", alwaysShow: true, containsIngredientTags: ["glúten"] },
      { name: "Doces gelados", alwaysShow: true },
    ],
  },
  {
    id: "bebidas",
    name: "Bebidas",
    emoji: "🧃",
    subcategories: [
      { name: "Sucos naturais", alwaysShow: true },
      { name: "Vitaminas e smoothies", alwaysShow: true, containsIngredientTags: ["laticínios"] },
      { 
        name: "Shakes proteicos", 
        alwaysShow: true,
      },
      { 
        name: "Shakes para ganho de massa", 
        compatibleGoals: ["gain_weight"],
        incompatibleGoals: ["lose_weight"],
      },
      { name: "Chás", alwaysShow: true },
      { 
        name: "Bebidas funcionais", 
        compatibleGoals: ["lose_weight", "maintain"],
      },
      { 
        name: "Bebidas detox", 
        compatibleGoals: ["lose_weight"],
        incompatibleGoals: ["gain_weight"],
      },
    ],
  },
  {
    id: "snacks",
    name: "Snacks & Petiscos",
    emoji: "🍟",
    subcategories: [
      { 
        name: "Snacks saudáveis", 
        compatibleGoals: ["lose_weight", "maintain"],
      },
      { 
        name: "Snacks low carb", 
        compatibleGoals: ["lose_weight"],
        incompatibleGoals: ["gain_weight"],
      },
      { 
        name: "Snacks calóricos", 
        compatibleGoals: ["gain_weight"],
        incompatibleGoals: ["lose_weight"],
      },
      { name: "Petiscos de forno", alwaysShow: true },
      { name: "Petiscos de airfryer", alwaysShow: true },
      { name: "Finger foods", alwaysShow: true },
    ],
  },
];

export type UserProfile = {
  goal?: UserGoal | null;
  dietary_preference?: DietaryPreference | null;
  context?: UserContext | null;
  intolerances?: string[] | null;
  excluded_ingredients?: string[] | null;
};

/**
 * Função que filtra as categorias baseado no perfil do usuário
 */
export function filterCategoriesForProfile(profile: UserProfile | null): CategoryConfig[] {
  if (!profile) {
    // Se não há perfil, retorna todas as categorias com todas subcategorias
    return CATEGORY_RULES;
  }

  const { goal, dietary_preference, context, intolerances } = profile;

  // Converte intolerâncias para tags de ingredientes
  const userIntoleranceTags = new Set<string>();
  if (intolerances && intolerances.length > 0) {
    intolerances.forEach(intolerance => {
      const normalizedIntolerance = intolerance.toLowerCase().trim();
      const tags = INTOLERANCE_INGREDIENT_MAP[normalizedIntolerance];
      if (tags) {
        tags.forEach(tag => userIntoleranceTags.add(tag));
      }
      // Também adiciona a própria intolerância como tag
      userIntoleranceTags.add(normalizedIntolerance);
    });
  }

  return CATEGORY_RULES.map(category => {
    const filteredSubcategories = category.subcategories.filter(sub => {
      // Se sempre mostrar e não tem restrições de ingredientes conflitantes
      if (sub.alwaysShow) {
        // Verifica se tem ingredientes que o usuário não pode comer
        if (sub.containsIngredientTags && userIntoleranceTags.size > 0) {
          const hasConflict = sub.containsIngredientTags.some(tag => 
            userIntoleranceTags.has(tag)
          );
          if (hasConflict) return false;
        }
        return true;
      }

      // Verifica objetivos incompatíveis
      if (sub.incompatibleGoals && goal && sub.incompatibleGoals.includes(goal)) {
        return false;
      }

      // Verifica objetivos compatíveis (se definidos, objetivo deve estar na lista)
      if (sub.compatibleGoals && goal) {
        if (!sub.compatibleGoals.includes(goal)) {
          return false;
        }
      }

      // Verifica preferência alimentar requerida
      if (sub.requiredDietaryPreference && dietary_preference) {
        if (!sub.requiredDietaryPreference.includes(dietary_preference)) {
          return false;
        }
      }

      // Verifica preferência alimentar incompatível
      if (sub.incompatibleDietaryPreference && dietary_preference) {
        if (sub.incompatibleDietaryPreference.includes(dietary_preference)) {
          return false;
        }
      }

      // Verifica contexto excluído
      if (sub.excludedForContext && context) {
        if (sub.excludedForContext.includes(context)) {
          return false;
        }
      }

      // Verifica intolerâncias
      if (sub.containsIngredientTags && userIntoleranceTags.size > 0) {
        const hasConflict = sub.containsIngredientTags.some(tag => 
          userIntoleranceTags.has(tag)
        );
        if (hasConflict) return false;
      }

      return true;
    });

    return {
      ...category,
      subcategories: filteredSubcategories,
    };
  }).filter(category => category.subcategories.length > 0); // Remove categorias vazias
}
