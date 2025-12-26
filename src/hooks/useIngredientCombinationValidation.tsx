import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ValidationResult = {
  isValid: boolean;
  confidence: 'alta' | 'media' | 'baixa';
  message: string | null;
  problematicPair: [string, string] | null;
  suggestions: string[];
};

export type ValidationState = {
  isValidating: boolean;
  result: ValidationResult | null;
  error: string | null;
};

export function useIngredientCombinationValidation() {
  const [state, setState] = useState<ValidationState>({
    isValidating: false,
    result: null,
    error: null,
  });
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cache de validações para evitar chamadas repetidas
  const validationCacheRef = useRef<Map<string, ValidationResult>>(new Map());

  const getCacheKey = (ingredients: string[]) => {
    return [...ingredients].sort().join('|');
  };

  const validateIngredients = useCallback(async (
    ingredients: string[],
    newIngredient?: string
  ): Promise<ValidationResult | null> => {
    // Não validar se tiver menos de 2 ingredientes
    const allIngredients = newIngredient 
      ? [...ingredients, newIngredient] 
      : ingredients;
    
    if (allIngredients.length < 2) {
      setState({ isValidating: false, result: null, error: null });
      return null;
    }

    // Verificar cache
    const cacheKey = getCacheKey(allIngredients);
    const cached = validationCacheRef.current.get(cacheKey);
    if (cached) {
      setState({ isValidating: false, result: cached, error: null });
      return cached;
    }

    setState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('validate-ingredients', {
        body: { ingredients, newIngredient },
      });

      if (error) {
        throw error;
      }

      const result: ValidationResult = {
        isValid: data.isValid ?? true,
        confidence: data.confidence ?? 'media',
        message: data.message || null,
        problematicPair: data.problematicPair || null,
        suggestions: data.suggestions || [],
      };

      // Salvar no cache
      validationCacheRef.current.set(cacheKey, result);

      setState({ isValidating: false, result, error: null });
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao validar';
      setState({ isValidating: false, result: null, error: errorMessage });
      return null;
    }
  }, []);

  // Versão com debounce para uso em tempo real
  const validateWithDebounce = useCallback((
    ingredients: string[],
    newIngredient?: string,
    delayMs: number = 500
  ) => {
    // Cancelar timer anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      validateIngredients(ingredients, newIngredient);
    }, delayMs);
  }, [validateIngredients]);

  const clearValidation = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setState({ isValidating: false, result: null, error: null });
  }, []);

  const clearCache = useCallback(() => {
    validationCacheRef.current.clear();
  }, []);

  return {
    ...state,
    validateIngredients,
    validateWithDebounce,
    clearValidation,
    clearCache,
  };
}
