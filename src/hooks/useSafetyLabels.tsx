import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  FALLBACK_INTOLERANCE_LABELS, 
  FALLBACK_DIETARY_LABELS 
} from '@/lib/safetyFallbacks';

/**
 * Hook centralizado para buscar todos os labels de segurança do database
 * Substitui as listas hardcoded nos componentes do frontend
 */

interface SafetyLabels {
  intoleranceLabels: Record<string, string>;
  dietaryLabels: Record<string, string>;
  isLoading: boolean;
  getIntoleranceLabel: (key: string) => string;
  getDietaryLabel: (key: string) => string;
  getRestrictionLabel: (key: string, type?: 'intolerance' | 'dietary' | 'excluded') => string;
}

let cachedLabels: {
  intoleranceLabels: Record<string, string>;
  dietaryLabels: Record<string, string>;
} | null = null;

export function useSafetyLabels(): SafetyLabels {
  const [intoleranceLabels, setIntoleranceLabels] = useState<Record<string, string>>(
    cachedLabels?.intoleranceLabels || FALLBACK_INTOLERANCE_LABELS
  );
  const [dietaryLabels, setDietaryLabels] = useState<Record<string, string>>(
    cachedLabels?.dietaryLabels || FALLBACK_DIETARY_LABELS
  );
  const [isLoading, setIsLoading] = useState(!cachedLabels);

  useEffect(() => {
    // Se já temos cache, não precisa buscar novamente
    if (cachedLabels) {
      setIntoleranceLabels(cachedLabels.intoleranceLabels);
      setDietaryLabels(cachedLabels.dietaryLabels);
      setIsLoading(false);
      return;
    }

    const fetchLabels = async () => {
      try {
        // Buscar intolerâncias do onboarding_options
        const [intolerancesResult, dietaryResult, keyNormResult] = await Promise.all([
          supabase
            .from('onboarding_options')
            .select('option_id, label, description')
            .eq('category', 'intolerances')
            .eq('is_active', true),
          supabase
            .from('dietary_profiles')
            .select('key, name, description')
            .eq('is_active', true),
          supabase
            .from('intolerance_key_normalization')
            .select('onboarding_key, database_key, label')
        ]);

        const newIntoleranceLabels: Record<string, string> = { ...FALLBACK_INTOLERANCE_LABELS };
        const newDietaryLabels: Record<string, string> = { ...FALLBACK_DIETARY_LABELS };

        // Processar intolerâncias do onboarding
        if (intolerancesResult.data) {
          for (const opt of intolerancesResult.data) {
            if (opt.option_id && opt.option_id !== 'none' && opt.option_id !== 'nenhuma') {
              newIntoleranceLabels[opt.option_id.toLowerCase()] = opt.label;
            }
          }
        }

        // Processar normalização de chaves (adiciona aliases)
        if (keyNormResult.data) {
          for (const norm of keyNormResult.data) {
            if (norm.onboarding_key && norm.label) {
              newIntoleranceLabels[norm.onboarding_key.toLowerCase()] = norm.label;
              if (norm.database_key) {
                newIntoleranceLabels[norm.database_key.toLowerCase()] = norm.label;
              }
            }
          }
        }

        // Processar perfis dietéticos
        if (dietaryResult.data) {
          for (const profile of dietaryResult.data) {
            if (profile.key) {
              newDietaryLabels[profile.key.toLowerCase()] = profile.name;
            }
          }
        }

        // Atualizar cache
        cachedLabels = {
          intoleranceLabels: newIntoleranceLabels,
          dietaryLabels: newDietaryLabels,
        };

        setIntoleranceLabels(newIntoleranceLabels);
        setDietaryLabels(newDietaryLabels);
      } catch (error) {
        console.error('[useSafetyLabels] Error fetching labels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLabels();
  }, []);

  const getIntoleranceLabel = useCallback((key: string): string => {
    if (!key) return '';
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
    return intoleranceLabels[normalizedKey] || key;
  }, [intoleranceLabels]);

  const getDietaryLabel = useCallback((key: string): string => {
    if (!key) return '';
    const normalizedKey = key.toLowerCase();
    return dietaryLabels[normalizedKey] || key;
  }, [dietaryLabels]);

  const getRestrictionLabel = useCallback((
    key: string, 
    type: 'intolerance' | 'dietary' | 'excluded' = 'intolerance'
  ): string => {
    if (!key) return '';
    
    if (type === 'dietary') {
      return getDietaryLabel(key);
    }
    
    if (type === 'excluded') {
      // Para ingredientes excluídos, apenas capitaliza
      return key.charAt(0).toUpperCase() + key.slice(1);
    }
    
    return getIntoleranceLabel(key);
  }, [getIntoleranceLabel, getDietaryLabel]);

  return {
    intoleranceLabels,
    dietaryLabels,
    isLoading,
    getIntoleranceLabel,
    getDietaryLabel,
    getRestrictionLabel,
  };
}

/**
 * Função utilitária para invalidar o cache (útil após atualizações no admin)
 */
export function invalidateSafetyLabelsCache() {
  cachedLabels = null;
}
