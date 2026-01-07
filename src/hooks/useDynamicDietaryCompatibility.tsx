import { useCallback, useMemo, useEffect, useState } from 'react';
import { useUserProfileContext } from './useUserProfileContext';
import { useSafetyLabels } from './useSafetyLabels';
import { supabase } from '@/integrations/supabase/client';

/**
 * ============================================
 * HOOK DE COMPATIBILIDADE DIETÉTICA
 * ============================================
 * 
 * Este hook faz validação LOCAL de ingredientes contra as restrições do usuário,
 * usando os mapeamentos do banco de dados (intolerance_mappings e dietary_forbidden_ingredients).
 * 
 * Para análises mais complexas (fotos, etc), o backend globalSafetyEngine é usado.
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

// Cache global para mapeamentos
let cachedIntoleranceMappings: Map<string, Set<string>> | null = null;
let cachedDietaryForbidden: Map<string, Set<string>> | null = null;
let cachedSafeKeywords: Map<string, Set<string>> | null = null;

export function useDynamicDietaryCompatibility() {
  const profileContext = useUserProfileContext();
  const { getIntoleranceLabel, getDietaryLabel, isLoading: labelsLoading } = useSafetyLabels();
  const [mappingsLoaded, setMappingsLoaded] = useState(!!cachedIntoleranceMappings);

  // Get user restrictions for filtered queries
  const userIntolerances = profileContext.intolerances?.filter(i => i && i !== 'nenhuma') || [];
  const userDietaryPref = profileContext.dietary_preference;
  
  // Carrega os mapeamentos do banco de dados - OTIMIZADO: filtra por restrições do usuário
  useEffect(() => {
    // Se já temos cache E o cache tem dados para as restrições do usuário, não recarrega
    if (cachedIntoleranceMappings && cachedDietaryForbidden && cachedSafeKeywords) {
      setMappingsLoaded(true);
      return;
    }

    const loadMappings = async () => {
      try {
        // OPTIMIZED: Load all 3 queries in parallel
        const [intoleranceResult, dietaryResult, safeResult] = await Promise.all([
          // Carregar mapeamentos de intolerância - FILTRADO por user intolerances
          userIntolerances.length > 0
            ? supabase
                .from('intolerance_mappings')
                .select('intolerance_key, ingredient')
                .eq('language', 'pt')
                .in('intolerance_key', userIntolerances)
            : Promise.resolve({ data: [] }),
          
          // Carregar ingredientes proibidos por dieta - FILTRADO por user preference
          userDietaryPref && userDietaryPref !== 'omnivore' && userDietaryPref !== 'comum'
            ? supabase
                .from('dietary_forbidden_ingredients')
                .select('dietary_key, ingredient')
                .eq('language', 'pt')
                .eq('dietary_key', userDietaryPref)
            : Promise.resolve({ data: [] }),
          
          // Carregar safe keywords - FILTRADO por user intolerances
          userIntolerances.length > 0
            ? supabase
                .from('intolerance_safe_keywords')
                .select('intolerance_key, keyword')
                .in('intolerance_key', userIntolerances)
            : Promise.resolve({ data: [] })
        ]);

        const intoleranceMap = new Map<string, Set<string>>();
        if (intoleranceResult.data) {
          for (const row of intoleranceResult.data) {
            const key = row.intolerance_key.toLowerCase();
            if (!intoleranceMap.has(key)) {
              intoleranceMap.set(key, new Set());
            }
            intoleranceMap.get(key)!.add(row.ingredient.toLowerCase());
          }
        }
        cachedIntoleranceMappings = intoleranceMap;

        const dietaryMap = new Map<string, Set<string>>();
        if (dietaryResult.data) {
          for (const row of dietaryResult.data) {
            const key = row.dietary_key.toLowerCase();
            if (!dietaryMap.has(key)) {
              dietaryMap.set(key, new Set());
            }
            dietaryMap.get(key)!.add(row.ingredient.toLowerCase());
          }
        }
        cachedDietaryForbidden = dietaryMap;

        const safeMap = new Map<string, Set<string>>();
        if (safeResult.data) {
          for (const row of safeResult.data) {
            const key = row.intolerance_key.toLowerCase();
            if (!safeMap.has(key)) {
              safeMap.set(key, new Set());
            }
            safeMap.get(key)!.add(row.keyword.toLowerCase());
          }
        }
        cachedSafeKeywords = safeMap;

        setMappingsLoaded(true);
      } catch (error) {
        console.error('[useDynamicDietaryCompatibility] Error loading mappings:', error);
        // Initialize with empty maps to avoid null checks
        cachedIntoleranceMappings = cachedIntoleranceMappings || new Map();
        cachedDietaryForbidden = cachedDietaryForbidden || new Map();
        cachedSafeKeywords = cachedSafeKeywords || new Map();
        setMappingsLoaded(true);
      }
    };

    loadMappings();
  }, [userIntolerances.join(','), userDietaryPref]);

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
   * Verifica se um ingrediente é seguro devido a safe keywords
   */
  const isSafeByKeyword = useCallback((ingredientName: string, intoleranceKey: string): boolean => {
    if (!cachedSafeKeywords) return false;
    const safeKeywords = cachedSafeKeywords.get(intoleranceKey.toLowerCase());
    if (!safeKeywords) return false;
    
    const normalizedIngredient = ingredientName.toLowerCase();
    for (const keyword of safeKeywords) {
      if (normalizedIngredient.includes(keyword)) {
        return true;
      }
    }
    return false;
  }, []);

  /**
   * Verifica se um ingrediente conflita com uma intolerância
   */
  const checkIngredientConflict = useCallback((
    ingredientName: string, 
    intoleranceKey: string
  ): boolean => {
    if (!cachedIntoleranceMappings) return false;
    
    // Primeiro verifica se é seguro por safe keyword
    if (isSafeByKeyword(ingredientName, intoleranceKey)) {
      return false;
    }
    
    const forbiddenIngredients = cachedIntoleranceMappings.get(intoleranceKey.toLowerCase());
    if (!forbiddenIngredients) return false;
    
    const normalizedIngredient = ingredientName.toLowerCase();
    
    // Verifica match exato ou parcial
    for (const forbidden of forbiddenIngredients) {
      if (normalizedIngredient.includes(forbidden) || forbidden.includes(normalizedIngredient)) {
        return true;
      }
    }
    
    return false;
  }, [isSafeByKeyword]);

  /**
   * Verifica se um ingrediente conflita com uma preferência dietética
   */
  const checkDietaryConflict = useCallback((
    ingredientName: string, 
    dietaryKey: string
  ): boolean => {
    if (!cachedDietaryForbidden) return false;
    
    const forbiddenIngredients = cachedDietaryForbidden.get(dietaryKey.toLowerCase());
    if (!forbiddenIngredients) return false;
    
    const normalizedIngredient = ingredientName.toLowerCase();
    
    for (const forbidden of forbiddenIngredients) {
      if (normalizedIngredient.includes(forbidden) || forbidden.includes(normalizedIngredient)) {
        return true;
      }
    }
    
    return false;
  }, []);

  /**
   * Valida ingredientes de uma refeição contra as restrições do usuário
   */
  const getMealCompatibility = useCallback((
    ingredients: unknown
  ): 'good' | 'moderate' | 'incompatible' | 'unknown' => {
    // Se não tem restrições ou mapeamentos não carregaram, retorna unknown
    if (!hasRestrictions || !mappingsLoaded) return 'unknown';
    if (!ingredients) return 'unknown';
    
    // Normaliza ingredientes para array de strings
    let ingredientNames: string[] = [];
    
    if (Array.isArray(ingredients)) {
      ingredientNames = ingredients.map(ing => {
        if (typeof ing === 'string') return ing;
        if (ing && typeof ing === 'object' && 'item' in ing) return (ing as {item: string}).item;
        return '';
      }).filter(Boolean);
    }
    
    if (ingredientNames.length === 0) return 'unknown';
    
    const userIntolerances = (profileContext.intolerances || []).filter(i => i && i !== 'nenhuma');
    const dietaryPref = profileContext.dietary_preference;
    const excludedIngredients = profileContext.excluded_ingredients || [];
    
    let hasIncompatible = false;
    let hasModerate = false;
    
    for (const ingredientName of ingredientNames) {
      const normalizedIngredient = ingredientName.toLowerCase();
      
      // Verifica exclusões manuais
      for (const excluded of excludedIngredients) {
        if (normalizedIngredient.includes(excluded.toLowerCase())) {
          hasIncompatible = true;
          break;
        }
      }
      
      if (hasIncompatible) break;
      
      // Verifica intolerâncias
      for (const intolerance of userIntolerances) {
        if (checkIngredientConflict(ingredientName, intolerance)) {
          hasIncompatible = true;
          break;
        }
      }
      
      if (hasIncompatible) break;
      
      // Verifica preferência dietética
      if (dietaryPref && dietaryPref !== 'omnivore' && dietaryPref !== 'comum') {
        if (checkDietaryConflict(ingredientName, dietaryPref)) {
          hasIncompatible = true;
          break;
        }
      }
    }
    
    if (hasIncompatible) return 'incompatible';
    if (hasModerate) return 'moderate';
    return 'good';
  }, [hasRestrictions, mappingsLoaded, profileContext.intolerances, profileContext.dietary_preference, profileContext.excluded_ingredients, checkIngredientConflict, checkDietaryConflict]);

  /**
   * Converte alertas do backend para o formato ConflictResult.
   */
  const processBackendAlerts = useCallback((backendAlerts: BackendAlertResult[]): ConflictResult => {
    if (!backendAlerts || backendAlerts.length === 0) {
      return { hasConflict: false, conflicts: [], isSafe: hasRestrictions };
    }

    const conflicts: ConflictResult['conflicts'] = [];
    
    for (const alert of backendAlerts) {
      if (alert.status === 'contem' || alert.status === 'risco_potencial') {
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
   * Verifica conflitos de uma refeição (mantido para compatibilidade)
   */
  const checkMealConflicts = useCallback((ingredients: unknown): ConflictResult => {
    const compatibility = getMealCompatibility(ingredients);
    return {
      hasConflict: compatibility === 'incompatible',
      conflicts: [],
      isSafe: compatibility === 'good'
    };
  }, [getMealCompatibility]);

  return {
    // Funções principais
    getUserRestrictions,
    getMealCompatibility,
    processBackendAlerts,
    getMealCompatibilityFromAlerts,
    checkMealConflicts,
    
    // Estado
    hasRestrictions,
    isLoading: profileContext.isLoading || labelsLoading || !mappingsLoaded,
    hasProfile: hasRestrictions
  };
}
