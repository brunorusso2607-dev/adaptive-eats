import { useCallback, useMemo } from 'react';
import { useUserProfileContext } from './useUserProfileContext';
import { useSafetyLabels } from './useSafetyLabels';

/**
 * ============================================
 * HOOK DE COMPATIBILIDADE DIETÉTICA - MODO REFLETOR
 * ============================================
 * 
 * IMPORTANTE: Este hook NÃO faz validação própria.
 * Ele apenas:
 * 1. Verifica se o usuário tem restrições configuradas
 * 2. Fornece labels amigáveis para exibição
 * 3. REFLETE os resultados que vêm do backend (globalSafetyEngine)
 * 
 * A validação real é feita EXCLUSIVAMENTE pelo globalSafetyEngine no backend.
 * Os módulos de análise (analyze-label-photo, analyze-food-photo, etc) 
 * retornam os alertas_personalizados já prontos para exibição.
 * 
 * Este hook existe para:
 * - Componentes que precisam saber SE o usuário tem restrições
 * - Exibir labels amigáveis das restrições do usuário
 * - Processar resultados que JÁ VIERAM do backend
 */

export interface BackendAlertResult {
  restricao: string;
  status: 'seguro' | 'risco_potencial' | 'contem';
  ingrediente?: string;
  mensagem?: string;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    type: 'intolerance' | 'dietary' | 'excluded';
    key: string;
    label: string;
    ingredient: string;
    matchedTerm: string;
  }>;
  isSafe: boolean;
}

export function useDynamicDietaryCompatibility() {
  const profileContext = useUserProfileContext();
  const { getIntoleranceLabel, getDietaryLabel, isLoading: labelsLoading } = useSafetyLabels();

  // Verifica se o usuário tem restrições configuradas
  const hasRestrictions = useMemo(() => {
    const hasIntolerances = (profileContext.intolerances?.length ?? 0) > 0 && 
      !profileContext.intolerances?.includes("nenhuma");
    const hasExcluded = (profileContext.excluded_ingredients?.length ?? 0) > 0;
    const hasDietaryRestriction = profileContext.dietary_preference && 
      profileContext.dietary_preference !== "omnivore" &&
      profileContext.dietary_preference !== "comum" &&
      profileContext.dietary_preference !== "flexitarian" &&
      profileContext.dietary_preference !== "flexitariana";
    return hasIntolerances || hasExcluded || hasDietaryRestriction;
  }, [profileContext.intolerances, profileContext.excluded_ingredients, profileContext.dietary_preference]);

  // Retorna as restrições do usuário com labels amigáveis
  const getUserRestrictions = useCallback(() => {
    const restrictions: Array<{ key: string; label: string; type: 'intolerance' | 'dietary' | 'excluded' }> = [];

    // Intolerâncias
    const userIntolerances = profileContext.intolerances || [];
    for (const intolerance of userIntolerances) {
      if (intolerance === "nenhuma" || !intolerance) continue;
      restrictions.push({
        key: intolerance,
        label: getIntoleranceLabel(intolerance),
        type: 'intolerance'
      });
    }

    // Preferência dietética
    const dietaryPref = profileContext.dietary_preference;
    if (dietaryPref && dietaryPref !== "omnivore" && dietaryPref !== "comum") {
      restrictions.push({
        key: dietaryPref,
        label: getDietaryLabel(dietaryPref),
        type: 'dietary'
      });
    }

    // Ingredientes excluídos manualmente
    const excludedList = profileContext.excluded_ingredients || [];
    for (const excluded of excludedList) {
      restrictions.push({
        key: `excluded_${excluded}`,
        label: excluded,
        type: 'excluded'
      });
    }

    return restrictions;
  }, [profileContext.intolerances, profileContext.dietary_preference, profileContext.excluded_ingredients, getIntoleranceLabel, getDietaryLabel]);

  /**
   * Converte alertas do backend para o formato ConflictResult.
   * Esta função REFLETE o que o backend já decidiu, não faz nova validação.
   */
  const processBackendAlerts = useCallback((backendAlerts: BackendAlertResult[]): ConflictResult => {
    if (!backendAlerts || backendAlerts.length === 0) {
      return { hasConflict: false, conflicts: [], isSafe: hasRestrictions };
    }

    const conflicts: ConflictResult['conflicts'] = [];
    
    for (const alert of backendAlerts) {
      if (alert.status === 'contem' || alert.status === 'risco_potencial') {
        // Determinar o tipo baseado no contexto
        const isIntolerance = (profileContext.intolerances || []).some(i => 
          alert.restricao.toLowerCase().includes(i.toLowerCase()) ||
          getIntoleranceLabel(i).toLowerCase() === alert.restricao.toLowerCase()
        );
        
        const isDietary = profileContext.dietary_preference && 
          (alert.restricao.toLowerCase().includes(profileContext.dietary_preference.toLowerCase()) ||
           getDietaryLabel(profileContext.dietary_preference).toLowerCase() === alert.restricao.toLowerCase());

        conflicts.push({
          type: isIntolerance ? 'intolerance' : isDietary ? 'dietary' : 'excluded',
          key: alert.restricao,
          label: alert.restricao,
          ingredient: alert.ingrediente || '',
          matchedTerm: alert.ingrediente || alert.restricao
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      isSafe: hasRestrictions && conflicts.length === 0
    };
  }, [hasRestrictions, profileContext.intolerances, profileContext.dietary_preference, getIntoleranceLabel, getDietaryLabel]);

  /**
   * DEPRECATED: Esta função existe apenas para compatibilidade.
   * Novos componentes devem usar processBackendAlerts() com os dados do backend.
   * 
   * Para validação de receitas/refeições geradas, os módulos de geração
   * já usam o globalSafetyEngine no backend.
   */
  const checkMealConflicts = useCallback((_ingredients: unknown): ConflictResult => {
    console.warn('[useDynamicDietaryCompatibility] checkMealConflicts é DEPRECATED. Use processBackendAlerts() com dados do backend.');
    return { hasConflict: false, conflicts: [], isSafe: false };
  }, []);

  /**
   * Classifica a compatibilidade baseado nos alertas do backend.
   */
  const getMealCompatibilityFromAlerts = useCallback((backendAlerts: BackendAlertResult[]): 'good' | 'moderate' | 'incompatible' | 'unknown' => {
    if (!hasRestrictions) return 'unknown';
    if (!backendAlerts || backendAlerts.length === 0) return 'unknown';

    const hasBlock = backendAlerts.some(a => a.status === 'contem');
    const hasWarning = backendAlerts.some(a => a.status === 'risco_potencial');
    const allSafe = backendAlerts.every(a => a.status === 'seguro');

    if (hasBlock) return 'incompatible';
    if (hasWarning) return 'moderate';
    if (allSafe) return 'good';
    return 'unknown';
  }, [hasRestrictions]);

  /**
   * DEPRECATED: Use getMealCompatibilityFromAlerts() com dados do backend.
   */
  const getMealCompatibility = useCallback((_ingredients: unknown): 'good' | 'moderate' | 'incompatible' | 'unknown' => {
    console.warn('[useDynamicDietaryCompatibility] getMealCompatibility é DEPRECATED. Use getMealCompatibilityFromAlerts() com dados do backend.');
    return 'unknown';
  }, []);

  return {
    // Funções novas (modo refletor)
    getUserRestrictions,
    processBackendAlerts,
    getMealCompatibilityFromAlerts,
    
    // Funções deprecated (mantidas para compatibilidade)
    checkMealConflicts,
    getMealCompatibility,
    
    // Estado
    hasRestrictions,
    isLoading: profileContext.isLoading || labelsLoading,
    hasProfile: hasRestrictions
  };
}
