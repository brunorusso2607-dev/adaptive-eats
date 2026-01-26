import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ValidationResult = {
  isValid: boolean;
  confidence: 'alta' | 'media' | 'baixa';
  message: string | null;
  problematicPair: [string, string] | null;
  suggestions: string[];
  validationId?: string; // ID da validação no banco para feedback
};

export type FeedbackType = 'helpful' | 'not_helpful';

export type ValidationState = {
  isValidating: boolean;
  result: ValidationResult | null;
  error: string | null;
  feedbackSent: boolean;
};

export function useIngredientCombinationValidation() {
  const [state, setState] = useState<ValidationState>({
    isValidating: false,
    result: null,
    error: null,
    feedbackSent: false,
  });
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cache de validações para evitar chamadas repetidas
  const validationCacheRef = useRef<Map<string, ValidationResult>>(new Map());
  
  // ID da última validação para feedback
  const lastValidationIdRef = useRef<string | null>(null);

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
      setState({ isValidating: false, result: null, error: null, feedbackSent: false });
      return null;
    }

    // Verificar cache
    const cacheKey = getCacheKey(allIngredients);
    const cached = validationCacheRef.current.get(cacheKey);
    if (cached) {
      lastValidationIdRef.current = cached.validationId || null;
      setState({ isValidating: false, result: cached, error: null, feedbackSent: false });
      return cached;
    }

    setState(prev => ({ ...prev, isValidating: true, error: null, feedbackSent: false }));

    try {
      const { data, error } = await supabase.functions.invoke('validate-ingredients', {
        body: { ingredients, newIngredient },
      });

      if (error) {
        // Handle specific HTTP errors from edge function
        const errorBody = error.message || '';
        if (errorBody.includes('402') || errorBody.includes('Créditos insuficientes')) {
          toast.error('Créditos de IA insuficientes. Tente novamente mais tarde.');
          setState({ isValidating: false, result: null, error: null, feedbackSent: false });
          return null;
        }
        if (errorBody.includes('429') || errorBody.includes('Muitas requisições')) {
          toast.error('Muitas requisições. Aguarde um momento.');
          setState({ isValidating: false, result: null, error: null, feedbackSent: false });
          return null;
        }
        throw error;
      }

      // Check for error in data response (when status codes aren't thrown as errors)
      if (data?.error) {
        if (data.error.includes('Créditos insuficientes') || data.error.includes('402')) {
          toast.error('Créditos de IA insuficientes. Tente novamente mais tarde.');
          setState({ isValidating: false, result: null, error: null, feedbackSent: false });
          return null;
        }
        if (data.error.includes('Muitas requisições') || data.error.includes('429')) {
          toast.error('Muitas requisições. Aguarde um momento.');
          setState({ isValidating: false, result: null, error: null, feedbackSent: false });
          return null;
        }
      }

      const result: ValidationResult = {
        isValid: data.isValid ?? true,
        confidence: data.confidence ?? 'media',
        message: data.message || null,
        problematicPair: data.problematicPair || null,
        suggestions: data.suggestions || [],
        validationId: data.validationId || null,
      };

      // Salvar no cache
      validationCacheRef.current.set(cacheKey, result);
      lastValidationIdRef.current = result.validationId || null;

      setState({ isValidating: false, result, error: null, feedbackSent: false });
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao validar';
      console.error('[useIngredientCombinationValidation] Error:', errorMessage);
      // Don't show toast for validation errors, just silently fail
      setState({ isValidating: false, result: null, error: null, feedbackSent: false });
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

  // Função para enviar feedback
  const sendFeedback = useCallback(async (feedback: FeedbackType): Promise<boolean> => {
    const validationId = lastValidationIdRef.current || state.result?.validationId;
    
    if (!validationId) {
      console.warn('No validation ID available for feedback');
      return false;
    }

    try {
      const { error } = await supabase
        .from('ingredient_validation_history')
        .update({
          user_feedback: feedback,
          feedback_at: new Date().toISOString(),
        })
        .eq('id', validationId);

      if (error) {
        console.error('Error sending feedback:', error);
        return false;
      }

      setState(prev => ({ ...prev, feedbackSent: true }));
      return true;
    } catch (err) {
      console.error('Error sending feedback:', err);
      return false;
    }
  }, [state.result?.validationId]);

  const clearValidation = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    lastValidationIdRef.current = null;
    setState({ isValidating: false, result: null, error: null, feedbackSent: false });
  }, []);

  const clearCache = useCallback(() => {
    validationCacheRef.current.clear();
  }, []);

  return {
    ...state,
    validateIngredients,
    validateWithDebounce,
    sendFeedback,
    clearValidation,
    clearCache,
  };
}
