import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCountry, DEFAULT_COUNTRY } from './useUserCountry';

interface LookupFood {
  id: string;
  name: string;
  name_normalized: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sodium_per_100g: number;
  category: string | null;
  source: string;
  is_verified: boolean;
  default_serving_size: number;
  serving_unit: string;
}

interface LookupResult {
  results: LookupFood[];
  source: 'local' | 'alias' | 'usda' | 'none';
  count: number;
  message?: string;
}

// Localized placeholder text for food search input
const SEARCH_PLACEHOLDERS: Record<string, { placeholder: string; hint: string }> = {
  'BR': {
    placeholder: 'Ex: peito de frango grelhado, arroz integral...',
    hint: 'Digite o nome completo do alimento para resultados mais precisos'
  },
  'PT': {
    placeholder: 'Ex: peito de frango grelhado, arroz integral...',
    hint: 'Digite o nome completo do alimento para resultados mais precisos'
  },
  'US': {
    placeholder: 'E.g.: grilled chicken breast, brown rice...',
    hint: 'Type the full food name for more accurate results'
  },
  'GB': {
    placeholder: 'E.g.: grilled chicken breast, brown rice...',
    hint: 'Type the full food name for more accurate results'
  },
  'ES': {
    placeholder: 'Ej: pechuga de pollo a la plancha, arroz integral...',
    hint: 'Escribe el nombre completo del alimento para resultados más precisos'
  },
  'MX': {
    placeholder: 'Ej: pechuga de pollo a la plancha, arroz integral...',
    hint: 'Escribe el nombre completo del alimento para resultados más precisos'
  },
  'AR': {
    placeholder: 'Ej: pechuga de pollo a la plancha, arroz integral...',
    hint: 'Escribí el nombre completo del alimento para resultados más precisos'
  },
  'CO': {
    placeholder: 'Ej: pechuga de pollo a la plancha, arroz integral...',
    hint: 'Escribe el nombre completo del alimento para resultados más precisos'
  },
  'FR': {
    placeholder: 'Ex: blanc de poulet grillé, riz complet...',
    hint: 'Tapez le nom complet de l\'aliment pour des résultats plus précis'
  },
  'IT': {
    placeholder: 'Es: petto di pollo alla griglia, riso integrale...',
    hint: 'Digita il nome completo dell\'alimento per risultati più precisi'
  },
  'DE': {
    placeholder: 'Z.B.: gegrillte Hähnchenbrust, Vollkornreis...',
    hint: 'Geben Sie den vollständigen Namen ein für genauere Ergebnisse'
  },
};

const DEFAULT_PLACEHOLDER = {
  placeholder: 'Search for food...',
  hint: 'Type the full food name for more accurate results'
};

export function useLookupIngredient() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LookupFood[]>([]);
  const [source, setSource] = useState<string | null>(null);
  
  // Usar hook centralizado para obter país do usuário
  const { country: userCountry } = useUserCountry();

  // Get localized placeholder text based on user's country
  const searchPlaceholder = useMemo(() => {
    const country = userCountry || DEFAULT_COUNTRY;
    return SEARCH_PLACEHOLDERS[country] || DEFAULT_PLACEHOLDER;
  }, [userCountry]);

  const lookup = useCallback(async (query: string, limit = 10): Promise<LookupResult | null> => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setSource(null);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('lookup-ingredient', {
        body: { query: query.trim(), limit, country: userCountry || DEFAULT_COUNTRY }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const result = data as LookupResult;
      setResults(result.results || []);
      setSource(result.source);
      return result;
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao buscar ingrediente';
      setError(errorMessage);
      setResults([]);
      setSource(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userCountry]);

  const reset = useCallback(() => {
    setResults([]);
    setSource(null);
    setError(null);
  }, []);

  return {
    lookup,
    reset,
    results,
    source,
    isLoading,
    error,
    userCountry: userCountry || DEFAULT_COUNTRY,
    searchPlaceholder
  };
}
