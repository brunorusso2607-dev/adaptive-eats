import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Food {
  id: string;
  name: string;
  name_normalized: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sodium_per_100g: number | null;
  category: string | null;
  serving_unit: 'g' | 'ml' | 'un' | 'fatia';
  default_serving_size: number;
  source?: string;
  cuisine_origin?: string;
}

// Mapeamento de país para fontes prioritárias
const COUNTRY_SOURCE_PRIORITY: Record<string, string[]> = {
  'BR': ['TBCA', 'taco', 'curated', 'BAM', 'usda'],
  'MX': ['BAM', 'TBCA', 'curated', 'taco', 'usda'],
  'AR': ['TBCA', 'BAM', 'curated', 'taco', 'usda'], // Argentina - usar TBCA como fallback até LATINFOODS
  'CL': ['TBCA', 'BAM', 'curated', 'taco', 'usda'], // Chile
  'CO': ['TBCA', 'BAM', 'curated', 'taco', 'usda'], // Colômbia
  'PE': ['TBCA', 'BAM', 'curated', 'taco', 'usda'], // Peru
  'US': ['usda', 'curated', 'TBCA', 'BAM', 'taco'],
  // Default para outros países
  'DEFAULT': ['curated', 'TBCA', 'taco', 'BAM', 'usda'],
};

// Mapeamento de país para cuisine_origin prioritário
const COUNTRY_CUISINE_PRIORITY: Record<string, string[]> = {
  'BR': ['brasileira', 'latina'],
  'MX': ['mexicana', 'latina'],
  'AR': ['argentina', 'latina'],
  'CL': ['chilena', 'latina'],
  'CO': ['colombiana', 'latina'],
  'PE': ['peruana', 'latina'],
  'US': ['americana', 'international'],
  'DEFAULT': ['international'],
};

export function useFoodsSearch(userCountry?: string) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchFoods = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setFoods([]);
      return;
    }

    setIsLoading(true);
    try {
      const normalizedQuery = query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      // Buscar todos os resultados
      const { data, error } = await supabase
        .from("foods")
        .select("*")
        .eq("is_recipe", false)
        .or(`name_normalized.ilike.%${normalizedQuery}%,name.ilike.%${query}%`)
        .limit(50); // Buscar mais para depois ordenar

      if (error) throw error;

      if (!data || data.length === 0) {
        setFoods([]);
        return;
      }

      // Aplicar priorização por país
      const country = userCountry || 'DEFAULT';
      const sourcePriority = COUNTRY_SOURCE_PRIORITY[country] || COUNTRY_SOURCE_PRIORITY['DEFAULT'];
      const cuisinePriority = COUNTRY_CUISINE_PRIORITY[country] || COUNTRY_CUISINE_PRIORITY['DEFAULT'];

      // Ordenar resultados por prioridade
      const sortedResults = data.sort((a, b) => {
        // 1. Prioridade por source (fonte do dado)
        const sourceIndexA = sourcePriority.indexOf(a.source || '');
        const sourceIndexB = sourcePriority.indexOf(b.source || '');
        const sourcePriorityA = sourceIndexA === -1 ? 999 : sourceIndexA;
        const sourcePriorityB = sourceIndexB === -1 ? 999 : sourceIndexB;

        if (sourcePriorityA !== sourcePriorityB) {
          return sourcePriorityA - sourcePriorityB;
        }

        // 2. Prioridade por cuisine_origin (origem culinária)
        const cuisineIndexA = cuisinePriority.findIndex(c => 
          a.cuisine_origin?.toLowerCase().includes(c)
        );
        const cuisineIndexB = cuisinePriority.findIndex(c => 
          b.cuisine_origin?.toLowerCase().includes(c)
        );
        const cuisinePriorityA = cuisineIndexA === -1 ? 999 : cuisineIndexA;
        const cuisinePriorityB = cuisineIndexB === -1 ? 999 : cuisineIndexB;

        if (cuisinePriorityA !== cuisinePriorityB) {
          return cuisinePriorityA - cuisinePriorityB;
        }

        // 3. Prioridade por verificação
        if (a.is_verified !== b.is_verified) {
          return a.is_verified ? -1 : 1;
        }

        // 4. Match exato do nome primeiro
        const nameA = a.name_normalized || '';
        const nameB = b.name_normalized || '';
        const startsWithA = nameA.startsWith(normalizedQuery);
        const startsWithB = nameB.startsWith(normalizedQuery);

        if (startsWithA !== startsWithB) {
          return startsWithA ? -1 : 1;
        }

        // 5. Ordenação alfabética
        return a.name.localeCompare(b.name, 'pt-BR');
      });

      setFoods((sortedResults.slice(0, 20) as Food[]) || []);
    } catch (error) {
      console.error("Error searching foods:", error);
      setFoods([]);
    } finally {
      setIsLoading(false);
    }
  }, [userCountry]);

  const clearFoods = useCallback(() => {
    setFoods([]);
  }, []);

  return { foods, isLoading, searchFoods, clearFoods };
}
