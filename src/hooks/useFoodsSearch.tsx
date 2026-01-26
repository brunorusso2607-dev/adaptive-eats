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
  'AR': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Argentina - USDA como fallback (sem fonte nativa)
  'CL': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Chile - USDA como fallback
  'CO': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Colômbia - USDA como fallback
  'PE': ['usda', 'curated', 'TBCA', 'BAM', 'taco'], // Peru - USDA como fallback
  'US': ['usda', 'curated', 'TBCA', 'BAM', 'taco'],
  // Default para outros países - USDA como fallback universal
  'DEFAULT': ['usda', 'curated', 'TBCA', 'taco', 'BAM'],
};

// Mapping of country to priority cuisine_origin
const COUNTRY_CUISINE_PRIORITY: Record<string, string[]> = {
  'BR': ['brazilian', 'latin'],
  'MX': ['mexican', 'latin'],
  'AR': ['argentinian', 'latin'],
  'CL': ['chilean', 'latin'],
  'CO': ['colombian', 'latin'],
  'PE': ['peruvian', 'latin'],
  'US': ['american', 'international'],
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

      // Ordenar resultados por prioridade inteligente
      const sortedResults = data.sort((a, b) => {
        const nameA = (a.name_normalized || a.name.toLowerCase()).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const nameB = (b.name_normalized || b.name.toLowerCase()).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // 1. MATCH EXATO primeiro (ex: "farofa" === "farofa")
        const isExactA = nameA === normalizedQuery;
        const isExactB = nameB === normalizedQuery;
        if (isExactA !== isExactB) {
          return isExactA ? -1 : 1;
        }
        
        // 2. Começa com a query
        const startsWithA = nameA.startsWith(normalizedQuery);
        const startsWithB = nameB.startsWith(normalizedQuery);
        if (startsWithA !== startsWithB) {
          return startsWithA ? -1 : 1;
        }
        
        // 3. Se ambos começam com a query, priorizar nomes mais curtos (mais simples/puros)
        // Ex: "Farofa" (6 chars) antes de "Farofa de Cebola" (16 chars)
        if (startsWithA && startsWithB) {
          const lengthDiff = a.name.length - b.name.length;
          if (lengthDiff !== 0) {
            return lengthDiff;
          }
        }
        
        // 4. Prioridade por source (fonte do dado)
        const sourceIndexA = sourcePriority.indexOf(a.source || '');
        const sourceIndexB = sourcePriority.indexOf(b.source || '');
        const sourcePriorityA = sourceIndexA === -1 ? 999 : sourceIndexA;
        const sourcePriorityB = sourceIndexB === -1 ? 999 : sourceIndexB;

        if (sourcePriorityA !== sourcePriorityB) {
          return sourcePriorityA - sourcePriorityB;
        }

        // 5. Prioridade por cuisine_origin (origem culinária)
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

        // 6. Prioridade por verificação
        if (a.is_verified !== b.is_verified) {
          return a.is_verified ? -1 : 1;
        }

        // 7. Ordenação alfabética como último critério
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
