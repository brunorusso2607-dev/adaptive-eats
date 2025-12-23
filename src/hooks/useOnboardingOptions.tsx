import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type OnboardingOption = {
  id: string;
  category: string;
  option_id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  is_active: boolean;
  sort_order: number;
};

export type OnboardingOptionsMap = {
  intolerances: OnboardingOption[];
  dietary_preferences: OnboardingOption[];
  goals: OnboardingOption[];
  calorie_goals: OnboardingOption[];
  complexity: OnboardingOption[];
  context: OnboardingOption[];
};

// Fallback hardcoded para caso o banco esteja vazio
const FALLBACK_OPTIONS: OnboardingOptionsMap = {
  intolerances: [
    { id: "1", category: "intolerances", option_id: "gluten", label: "Glúten", description: "Trigo, cevada, centeio", emoji: "🌾", is_active: true, sort_order: 1 },
    { id: "2", category: "intolerances", option_id: "lactose", label: "Lactose", description: "Leite e derivados", emoji: "🥛", is_active: true, sort_order: 2 },
    { id: "3", category: "intolerances", option_id: "none", label: "Nenhuma", description: "Não tenho intolerâncias", emoji: "✅", is_active: true, sort_order: 7 },
  ],
  dietary_preferences: [
    { id: "4", category: "dietary_preferences", option_id: "comum", label: "Comum", description: "Como de tudo sem restrições", emoji: "🍽️", is_active: true, sort_order: 1 },
    { id: "5", category: "dietary_preferences", option_id: "vegetariana", label: "Vegetariana", description: "Não como carnes", emoji: "🥗", is_active: true, sort_order: 2 },
    { id: "6", category: "dietary_preferences", option_id: "vegana", label: "Vegana", description: "Não como nada de origem animal", emoji: "🌱", is_active: true, sort_order: 3 },
    { id: "7", category: "dietary_preferences", option_id: "low_carb", label: "Low Carb", description: "Reduzo carboidratos", emoji: "🥩", is_active: true, sort_order: 4 },
  ],
  goals: [
    { id: "8", category: "goals", option_id: "emagrecer", label: "Emagrecer", description: "Quero perder peso", emoji: "⬇️", is_active: true, sort_order: 1 },
    { id: "9", category: "goals", option_id: "manter", label: "Manter peso", description: "Quero manter meu peso atual", emoji: "⚖️", is_active: true, sort_order: 2 },
    { id: "10", category: "goals", option_id: "ganhar_peso", label: "Ganhar peso", description: "Quero ganhar massa", emoji: "⬆️", is_active: true, sort_order: 3 },
  ],
  calorie_goals: [
    { id: "11", category: "calorie_goals", option_id: "reduzir", label: "Reduzir", description: "Consumir menos calorias", emoji: "📉", is_active: true, sort_order: 1 },
    { id: "12", category: "calorie_goals", option_id: "manter", label: "Manter", description: "Manter consumo atual", emoji: "📊", is_active: true, sort_order: 2 },
    { id: "13", category: "calorie_goals", option_id: "aumentar", label: "Aumentar", description: "Consumir mais calorias", emoji: "📈", is_active: true, sort_order: 3 },
    { id: "14", category: "calorie_goals", option_id: "definir_depois", label: "Definir depois", description: "Vou decidir mais tarde", emoji: "⏳", is_active: true, sort_order: 4 },
  ],
  complexity: [
    { id: "15", category: "complexity", option_id: "rapida", label: "Rápidas", description: "Receitas de até 20 minutos", emoji: "⚡", is_active: true, sort_order: 1 },
    { id: "16", category: "complexity", option_id: "equilibrada", label: "Equilibradas", description: "Receitas de 20-40 minutos", emoji: "⏱️", is_active: true, sort_order: 2 },
    { id: "17", category: "complexity", option_id: "elaborada", label: "Elaboradas", description: "Receitas mais complexas", emoji: "👨‍🍳", is_active: true, sort_order: 3 },
  ],
  context: [
    { id: "18", category: "context", option_id: "individual", label: "Individual", description: "Cozinho só para mim", emoji: "👤", is_active: true, sort_order: 1 },
    { id: "19", category: "context", option_id: "familia", label: "Família", description: "Cozinho para a família", emoji: "👨‍👩‍👧‍👦", is_active: true, sort_order: 2 },
    { id: "20", category: "context", option_id: "modo_kids", label: "Modo Kids", description: "Receitas para crianças", emoji: "👶", is_active: true, sort_order: 3 },
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
        dietary_preferences: [],
        goals: [],
        calorie_goals: [],
        complexity: [],
        context: [],
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
