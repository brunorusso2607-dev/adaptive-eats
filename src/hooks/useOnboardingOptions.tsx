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

export type OnboardingOptionsMap = {
  intolerances: OnboardingOption[];
  excluded_ingredients: OnboardingOption[];
  dietary_preferences: OnboardingOption[];
  goals: OnboardingOption[];
};

// Fallback hardcoded para caso o banco esteja vazio
const FALLBACK_OPTIONS: OnboardingOptionsMap = {
  intolerances: [
    { id: "1", category: "intolerances", option_id: "gluten", label: "Glúten", description: "Trigo, cevada, centeio", emoji: "🌾", icon_name: "wheat", is_active: true, sort_order: 1 },
    { id: "2", category: "intolerances", option_id: "lactose", label: "Lactose", description: "Leite e derivados", emoji: "🥛", icon_name: "milk", is_active: true, sort_order: 2 },
    { id: "3", category: "intolerances", option_id: "none", label: "Nenhuma", description: "Não tenho intolerâncias", emoji: "✅", icon_name: "check", is_active: true, sort_order: 7 },
  ],
  excluded_ingredients: [
    { id: "11", category: "excluded_ingredients", option_id: "carne_porco", label: "Carne de porco", description: "Inclui bacon, presunto, linguiça de porco", emoji: null, icon_name: "ban", is_active: true, sort_order: 1 },
    { id: "12", category: "excluded_ingredients", option_id: "figado", label: "Fígado", description: "Fígado bovino, de frango ou outros", emoji: null, icon_name: "ban", is_active: true, sort_order: 2 },
    { id: "13", category: "excluded_ingredients", option_id: "frutos_mar", label: "Frutos do mar", description: "Camarão, lula, polvo, mexilhão", emoji: null, icon_name: "fish", is_active: true, sort_order: 3 },
  ],
  dietary_preferences: [
    { id: "4", category: "dietary_preferences", option_id: "comum", label: "Comum", description: "Como de tudo sem restrições", emoji: "🍽️", icon_name: "utensils", is_active: true, sort_order: 1 },
    { id: "5", category: "dietary_preferences", option_id: "vegetariana", label: "Vegetariana", description: "Não como carnes", emoji: "🥗", icon_name: "salad", is_active: true, sort_order: 2 },
    { id: "6", category: "dietary_preferences", option_id: "vegana", label: "Vegana", description: "Não como nada de origem animal", emoji: "🌱", icon_name: "leaf", is_active: true, sort_order: 3 },
    { id: "7", category: "dietary_preferences", option_id: "low_carb", label: "Low Carb", description: "Reduzo carboidratos", emoji: "🥩", icon_name: "beef", is_active: true, sort_order: 4 },
  ],
  goals: [
    { id: "8", category: "goals", option_id: "emagrecer", label: "Emagrecer", description: "Quero perder peso", emoji: "⬇️", icon_name: "trending-down", is_active: true, sort_order: 1 },
    { id: "9", category: "goals", option_id: "manter", label: "Manter peso", description: "Quero manter meu peso atual", emoji: "⚖️", icon_name: "scale", is_active: true, sort_order: 2 },
    { id: "10", category: "goals", option_id: "ganhar_peso", label: "Ganhar peso", description: "Quero ganhar massa", emoji: "⬆️", icon_name: "trending-up", is_active: true, sort_order: 3 },
  ],
};

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
