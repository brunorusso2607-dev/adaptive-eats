import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfileContext } from '@/hooks/useUserProfileContext';

interface DecompositionResult {
  success: boolean;
  foodName: string;
  ingredients: string[];
  isProcessedFood: boolean;
  confidence: 'high' | 'medium' | 'low';
  hasConflict: boolean;
  conflicts: { ingredient: string; intolerance: string }[];
  safeToConsume: boolean;
  error?: string;
}

/**
 * Hook para decompor alimentos em ingredientes base e validar segurança
 * 
 * Usado para validar entradas manuais de texto contra intolerâncias do usuário.
 * Exemplo: "pão" → ["trigo", "fermento"] → detecta conflito com intolerância a glúten
 */
export function useFoodDecomposition() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<DecompositionResult | null>(null);
  const { intolerances, dietary_preference } = useUserProfileContext();

  const decompose = useCallback(async (foodName: string): Promise<DecompositionResult> => {
    if (!foodName || foodName.trim().length < 2) {
      return {
        success: false,
        foodName,
        ingredients: [],
        isProcessedFood: false,
        confidence: 'low',
        hasConflict: false,
        conflicts: [],
        safeToConsume: true,
        error: 'Nome do alimento muito curto'
      };
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('decompose-food-for-safety', {
        body: {
          foodName: foodName.trim(),
          userIntolerances: intolerances || [],
          dietaryPreference: dietary_preference || null
        }
      });

      if (error) {
        console.error('[useFoodDecomposition] Erro na função:', error);
        throw new Error(error.message);
      }

      const result: DecompositionResult = {
        success: data.success ?? false,
        foodName: data.foodName ?? foodName,
        ingredients: data.ingredients ?? [],
        isProcessedFood: data.isProcessedFood ?? false,
        confidence: data.confidence ?? 'medium',
        hasConflict: data.hasConflict ?? false,
        conflicts: data.conflicts ?? [],
        safeToConsume: data.safeToConsume ?? true,
        error: data.error
      };

      setLastResult(result);
      return result;

    } catch (error) {
      console.error('[useFoodDecomposition] Erro:', error);
      const errorResult: DecompositionResult = {
        success: false,
        foodName,
        ingredients: [],
        isProcessedFood: false,
        confidence: 'low',
        hasConflict: false,
        conflicts: [],
        safeToConsume: true, // Em caso de erro, não bloqueia o usuário
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      setLastResult(errorResult);
      return errorResult;
    } finally {
      setIsLoading(false);
    }
  }, [intolerances, dietary_preference]);

  const reset = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    decompose,
    isLoading,
    lastResult,
    reset,
    hasIntolerances: (intolerances?.length ?? 0) > 0
  };
}
