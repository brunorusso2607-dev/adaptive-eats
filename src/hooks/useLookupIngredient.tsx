import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCountry, DEFAULT_COUNTRY } from './useUserCountry';
import { getSearchPlaceholder } from '@/config/countryConfig';

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
  source: 'local' | 'alias' | 'usda' | 'none' | 'ai';
  count: number;
  message?: string;
  needsAiComplement?: boolean;
}

export function useLookupIngredient(searchByCategory = false, originalCalories = 0) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<LookupFood[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [needsAiComplement, setNeedsAiComplement] = useState(false);
  
  // Usar hook centralizado para obter país do usuário
  const { country: userCountry } = useUserCountry();

  // Get localized placeholder text from centralized config
  const searchPlaceholder = useMemo(() => {
    const config = getSearchPlaceholder(userCountry || DEFAULT_COUNTRY);
    return {
      placeholder: config.text,
      hint: config.hint
    };
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
        body: { 
          query: query.trim(), 
          limit, 
          country: userCountry || DEFAULT_COUNTRY,
          searchByCategory,
          originalCalories,
          calorieTolerancePercent: 30
        }
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const result = data as LookupResult;
      setResults(result.results || []);
      setSource(result.source);
      setNeedsAiComplement(result.needsAiComplement || false);
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
  }, [userCountry, searchByCategory, originalCalories]);

  const reset = useCallback(() => {
    setResults([]);
    setSource(null);
    setError(null);
    setNeedsAiComplement(false);
  }, []);

  return {
    lookup,
    reset,
    results,
    source,
    isLoading,
    error,
    userCountry: userCountry || DEFAULT_COUNTRY,
    searchPlaceholder,
    needsAiComplement
  };
}
