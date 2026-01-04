import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingOption = {
  id: string;
  category: string;
  option_id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  icon_name: string | null;
  is_active: boolean;
  sort_order: number;
};

export type OnboardingCategory = {
  id: string;
  category_key: string;
  label: string;
  icon_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type OnboardingOptionsMap = {
  intolerances: OnboardingOption[];
  allergies: OnboardingOption[];
  sensitivities: OnboardingOption[];
  excluded_ingredients: OnboardingOption[];
  dietary_preferences: OnboardingOption[];
  goals: OnboardingOption[];
};

// Fallback hardcoded para caso o banco esteja vazio
const FALLBACK_OPTIONS: OnboardingOptionsMap = {
  intolerances: [
    { id: "1", category: "intolerances", option_id: "gluten", label: "Glúten", description: "Trigo, cevada, centeio", emoji: "🌾", icon_name: "wheat", is_active: true, sort_order: 1 },
    { id: "2", category: "intolerances", option_id: "lactose", label: "Lactose", description: "Leite e derivados", emoji: "🥛", icon_name: "milk", is_active: true, sort_order: 2 },
    { id: "3", category: "intolerances", option_id: "fodmap", label: "FODMAP", description: "Carboidratos fermentáveis", emoji: "🫘", icon_name: "bean", is_active: true, sort_order: 3 },
    { id: "4", category: "intolerances", option_id: "none", label: "Nenhuma", description: "Não tenho restrições", emoji: "✅", icon_name: "check", is_active: true, sort_order: 99 },
  ],
  allergies: [
    { id: "5", category: "allergies", option_id: "peanut", label: "Amendoim", description: "Alergia a amendoim", emoji: "🥜", icon_name: "nut", is_active: true, sort_order: 1 },
    { id: "6", category: "allergies", option_id: "nuts", label: "Oleaginosas", description: "Castanhas, nozes, amêndoas", emoji: "🌰", icon_name: "acorn", is_active: true, sort_order: 2 },
    { id: "7", category: "allergies", option_id: "seafood", label: "Frutos do mar", description: "Crustáceos e moluscos", emoji: "🦐", icon_name: "fish", is_active: true, sort_order: 3 },
    { id: "8", category: "allergies", option_id: "fish", label: "Peixe", description: "Todos os tipos de peixe", emoji: "🐟", icon_name: "fish", is_active: true, sort_order: 4 },
    { id: "9", category: "allergies", option_id: "eggs", label: "Ovos", description: "Ovos e derivados", emoji: "🥚", icon_name: "egg", is_active: true, sort_order: 5 },
    { id: "10", category: "allergies", option_id: "soy", label: "Soja", description: "Soja e derivados", emoji: "🫘", icon_name: "bean", is_active: true, sort_order: 6 },
  ],
  sensitivities: [
    { id: "11", category: "sensitivities", option_id: "acucar", label: "Açúcar", description: "Restrição ao açúcar", emoji: "🍬", icon_name: "candy", is_active: true, sort_order: 1 },
    { id: "12", category: "sensitivities", option_id: "cafeina", label: "Cafeína", description: "Sensibilidade à cafeína", emoji: "☕", icon_name: "coffee", is_active: true, sort_order: 2 },
    { id: "13", category: "sensitivities", option_id: "histamina", label: "Histamina", description: "Sensibilidade à histamina", emoji: "🧪", icon_name: "flask", is_active: true, sort_order: 3 },
  ],
  excluded_ingredients: [
    { id: "21", category: "excluded_ingredients", option_id: "carne_porco", label: "Carne de porco", description: "Inclui bacon, presunto, linguiça de porco", emoji: null, icon_name: "ban", is_active: true, sort_order: 1 },
    { id: "22", category: "excluded_ingredients", option_id: "figado", label: "Fígado", description: "Fígado bovino, de frango ou outros", emoji: null, icon_name: "ban", is_active: true, sort_order: 2 },
    { id: "23", category: "excluded_ingredients", option_id: "frutos_mar", label: "Frutos do mar", description: "Camarão, lula, polvo, mexilhão", emoji: null, icon_name: "fish", is_active: true, sort_order: 3 },
  ],
  dietary_preferences: [
    { id: "31", category: "dietary_preferences", option_id: "omnivore", label: "Comum", description: "Como de tudo sem restrições", emoji: "🍽️", icon_name: "utensils", is_active: true, sort_order: 1 },
    { id: "32", category: "dietary_preferences", option_id: "vegetarian", label: "Vegetariana", description: "Não como carnes", emoji: "🥗", icon_name: "salad", is_active: true, sort_order: 2 },
    { id: "33", category: "dietary_preferences", option_id: "vegan", label: "Vegana", description: "Não como nada de origem animal", emoji: "🌱", icon_name: "leaf", is_active: true, sort_order: 3 },
    { id: "34", category: "dietary_preferences", option_id: "low_carb", label: "Low Carb", description: "Reduzo carboidratos", emoji: "🥩", icon_name: "beef", is_active: true, sort_order: 4 },
    { id: "35", category: "dietary_preferences", option_id: "pescatarian", label: "Pescetariana", description: "Como peixes e frutos do mar, sem carnes", emoji: "🐟", icon_name: "fish", is_active: true, sort_order: 5 },
    { id: "36", category: "dietary_preferences", option_id: "ketogenic", label: "Cetogênica", description: "Baixo carboidrato, alta gordura", emoji: "🥑", icon_name: "flame", is_active: true, sort_order: 6 },
    { id: "37", category: "dietary_preferences", option_id: "flexitarian", label: "Flexitariana", description: "Vegetariana com carne ocasional", emoji: "🌱", icon_name: "leaf", is_active: true, sort_order: 7 },
  ],
  goals: [
    { id: "41", category: "goals", option_id: "lose_weight", label: "Emagrecer", description: "Quero perder peso", emoji: "⬇️", icon_name: "trending-down", is_active: true, sort_order: 1 },
    { id: "42", category: "goals", option_id: "maintain", label: "Manter peso", description: "Quero manter meu peso atual", emoji: "⚖️", icon_name: "scale", is_active: true, sort_order: 2 },
    { id: "43", category: "goals", option_id: "gain_weight", label: "Ganhar peso", description: "Quero ganhar massa", emoji: "⬆️", icon_name: "trending-up", is_active: true, sort_order: 3 },
  ],
};

const FALLBACK_RESTRICTION_CATEGORIES: OnboardingCategory[] = [
  { id: "1", category_key: "intolerances", label: "Intolerâncias", icon_name: "alert-triangle", description: "digestivas", sort_order: 1, is_active: true },
  { id: "2", category_key: "allergies", label: "Alergias", icon_name: "alert-circle", description: "reações imunológicas", sort_order: 2, is_active: true },
  { id: "3", category_key: "sensitivities", label: "Sensibilidades", icon_name: "activity", description: "metabólicas", sort_order: 3, is_active: true },
];

export function useOnboardingOptions() {
  return useQuery({
    queryKey: ["onboarding-options-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_options")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching onboarding options:", error);
        return FALLBACK_OPTIONS;
      }

      if (!data || data.length === 0) {
        return FALLBACK_OPTIONS;
      }

      // Organize by category
      const organized: OnboardingOptionsMap = {
        intolerances: [],
        allergies: [],
        sensitivities: [],
        excluded_ingredients: [],
        dietary_preferences: [],
        goals: [],
      };

      data.forEach((option) => {
        const category = option.category as keyof OnboardingOptionsMap;
        if (organized[category]) {
          organized[category].push(option as OnboardingOption);
        }
      });

      // Use fallback for any empty category
      (Object.keys(organized) as Array<keyof OnboardingOptionsMap>).forEach((key) => {
        if (organized[key].length === 0) {
          organized[key] = FALLBACK_OPTIONS[key];
        }
      });

      return organized;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook para buscar categorias de restrições ordenadas (intolerances, allergies, sensitivities)
export function useRestrictionCategories() {
  return useQuery({
    queryKey: ["restriction-categories-ordered"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_categories")
        .select("*")
        .in("category_key", ["intolerances", "allergies", "sensitivities"])
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching restriction categories:", error);
        return FALLBACK_RESTRICTION_CATEGORIES;
      }

      if (!data || data.length === 0) {
        return FALLBACK_RESTRICTION_CATEGORIES;
      }

      return data as OnboardingCategory[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Helper function to get label by option_id
export function getOptionLabel(
  options: OnboardingOptionsMap | undefined,
  category: keyof OnboardingOptionsMap,
  optionId: string | null
): string {
  if (!optionId) return "Não definido";
  if (!options) {
    // Fallback to hardcoded
    const fallbackOption = FALLBACK_OPTIONS[category]?.find(o => o.option_id === optionId);
    return fallbackOption?.label || optionId;
  }
  const option = options[category]?.find(o => o.option_id === optionId);
  return option?.label || optionId;
}

// Helper to get multiple labels (for intolerances)
export function getOptionLabels(
  options: OnboardingOptionsMap | undefined,
  category: keyof OnboardingOptionsMap,
  optionIds: string[] | null
): string[] {
  if (!optionIds || optionIds.length === 0) return [];
  return optionIds.map(id => getOptionLabel(options, category, id));
}
