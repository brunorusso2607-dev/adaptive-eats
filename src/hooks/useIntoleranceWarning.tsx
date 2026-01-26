/**
 * ============================================
 * HOOK DE AVISO DE INTOLERÂNCIA - MODO HÍBRIDO
 * ============================================
 * 
 * ARQUITETURA ATUALIZADA (Jan/2026):
 * 
 * Este hook agora opera em MODO HÍBRIDO:
 * 
 * 1. MODO REFLETOR (PREFERIDO): Para módulos de análise (foto, rótulo, geladeira),
 *    os alertas são processados pelo globalSafetyEngine no backend e retornados
 *    prontos. Use processBackendAlerts() para converter esses resultados.
 * 
 * 2. MODO LOCAL (LEGADO): Para componentes que ainda precisam de validação
 *    local (ex: checkFood, checkIngredients), o hook mantém a funcionalidade
 *    original como fallback.
 * 
 * FONTE DE VERDADE: globalSafetyEngine no backend
 * Este hook sincroniza com o mesmo banco de dados que o Safety Engine usa,
 * garantindo consistência nos resultados.
 * 
 * IMPORTANTE: Para novas implementações, SEMPRE prefira usar os resultados
 * do backend (alertas_personalizados) em vez das funções locais.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSafetyLabels } from './useSafetyLabels';

// Tipos de restrição alimentar - classificação global
export type RestrictionType = 'intolerance' | 'excluded';

// Detalhe de cada conflito encontrado
export interface ConflictDetail {
  /** Chave da restrição (ex: 'lactose', 'peanut') */
  restrictionKey: string;
  /** Tipo da restrição (intolerância, alergia, sensibilidade, dieta, excluído) */
  type: RestrictionType;
  /** Label amigável (ex: 'Lactose', 'Amendoim') */
  label: string;
  /** Mensagem completa e correta para o tipo */
  message: string;
}

export interface IntoleranceWarning {
  hasConflict: boolean;
  conflicts: string[];
  labels: string[];
  /** Short label for badge (e.g., "Glúten") */
  badgeLabel: string | null;
  /** Full description (e.g., "Contém Glúten") */
  fullLabel: string | null;
  /** Detalhes completos de cada conflito com tipo correto */
  conflictDetails: ConflictDetail[];
}

/** Legacy type for compatibility with old useIngredientConflictCheck */
export type ConflictType = {
  ingredient: string;
  restriction: string;
  restrictionLabel: string;
  /** Tipo da restrição para mensagem correta */
  type?: RestrictionType;
  /** Mensagem correta baseada no tipo */
  message?: string;
};

interface IntoleranceMappingItem {
  ingredient: string;
  intolerance_key: string;
}

interface OnboardingOptionItem {
  option_id: string;
  category: string;
  label: string;
}

/**
 * Verifica se uma palavra está contida como palavra completa em outra string
 * Evita falsos positivos como "maçã" matchando "macaron" ou "alho" em "galho"
 * SINCRONIZADO com globalSafetyEngine.ts do backend
 * 
 * IMPORTANTE: Para ingredientes compostos como "arroz doce", a função verifica se
 * TODAS as palavras do termo de busca estão presentes no texto.
 */
function containsWholeWord(text: string, word: string): boolean {
  if (!text || !word) return false;
  
  // Se são iguais, é match perfeito
  if (text === word) return true;
  
  // Se o termo de busca contém múltiplas palavras, TODAS devem estar presentes
  const searchWords = word.trim().split(/\s+/);
  if (searchWords.length > 1) {
    // Para termos compostos como "arroz doce", verifica se TODAS as palavras estão no texto
    return searchWords.every(w => {
      const escapedW = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const delimiters = '[\\s,;:()\\[\\]\\-\\/]';
      const regex = new RegExp(`(^|${delimiters})${escapedW}(${delimiters}|$)`, 'i');
      return regex.test(text);
    });
  }
  
  // Escapar caracteres especiais de regex
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Delimitadores comuns
  const delimiters = '[\\s,;:()\\[\\]\\-\\/]';
  
  // Padrão: (início ou delimitador) + palavra + (fim ou delimitador)
  const regex = new RegExp(`(^|${delimiters})${escapedWord}(${delimiters}|$)`, 'i');
  
  return regex.test(text);
}

/**
 * Gera mensagem correta baseada no tipo de restrição
 * Esta função é a fonte de verdade para todas as mensagens do sistema
 */
export function getRestrictionMessage(type: RestrictionType, label: string): string {
  switch (type) {
    case 'intolerance':
      return `Você tem intolerância a ${label}`;
    case 'excluded':
      return `${label} está na sua lista de exclusão`;
  }
}

/**
 * Converte categoria do onboarding_options para RestrictionType
 */
function categoryToRestrictionType(category: string): RestrictionType {
  switch (category) {
    case 'intolerances':
      return 'intolerance';
    default:
      return 'intolerance'; // fallback seguro
  }
}

export function useIntoleranceWarning() {
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [mappings, setMappings] = useState<IntoleranceMappingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Safe keywords by intolerance key - items marked safe despite containing restricted base ingredient
  const [safeKeywords, setSafeKeywords] = useState<Record<string, string[]>>({});
  
  // Mapeamento de option_id → tipo de restrição (carregado do onboarding_options)
  const [restrictionTypeMap, setRestrictionTypeMap] = useState<Record<string, RestrictionType>>({});
  // Mapeamento de option_id → label amigável
  const [restrictionLabelMap, setRestrictionLabelMap] = useState<Record<string, string>>({});
  
  // Hook para labels de segurança do banco de dados
  const { getIntoleranceLabel: getDbIntoleranceLabel } = useSafetyLabels();

  // Estado para mapeamento de normalização de chaves do banco de dados
  const [keyNormalizationMap, setKeyNormalizationMap] = useState<Record<string, string>>({});

  // Fetch user profile data, mappings, and forbidden ingredients from database
  // OTIMIZADO: Só carrega dados relevantes às restrições do usuário
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        // PASSO 1: Buscar perfil do usuário PRIMEIRO para saber quais restrições tem
        const { data: profileData } = await supabase
          .from('profiles')
          .select('intolerances, excluded_ingredients')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!profileData) {
          setIsLoading(false);
          return;
        }

        // Configurar estados básicos
        if (profileData.excluded_ingredients && Array.isArray(profileData.excluded_ingredients)) {
          const normalizedExcluded = profileData.excluded_ingredients.map((ing: string) =>
            ing.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
          );
          setExcludedIngredients(normalizedExcluded);
        }

        // Verificar se o usuário tem alguma restrição que precise de dados do banco
        const userIntolerances = profileData.intolerances || [];
        const hasIntoleranceRestrictions = userIntolerances.length > 0 && !userIntolerances.every((i: string) => i === 'nenhuma' || i === 'none');

        // Se não tem restrições, não precisa carregar nada do banco
        if (!hasIntoleranceRestrictions) {
          console.log('[INTOLERANCE] Usuário sem restrições, skip de carregamento pesado');
          setIsLoading(false);
          return;
        }

        // PASSO 2: Buscar key normalization para traduzir chaves do usuário
        const { data: keyNormData } = await supabase
          .from('intolerance_key_normalization')
          .select('onboarding_key, database_key');

        const dbKeyNormMap: Record<string, string> = {};
        if (keyNormData) {
          for (const norm of keyNormData) {
            dbKeyNormMap[norm.onboarding_key.toLowerCase()] = norm.database_key.toLowerCase();
          }
          setKeyNormalizationMap(dbKeyNormMap);
        }

        // Normalizar intolerâncias do usuário para chaves do banco
        const normalizedUserIntolerances = userIntolerances
          .map((intol: string) => {
            const lowerIntol = intol.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
            return dbKeyNormMap[lowerIntol] || dbKeyNormMap[intol.toLowerCase()] || lowerIntol;
          })
          .filter((i: string) => i !== 'nenhuma' && i !== 'none');
        
        setIntolerances(normalizedUserIntolerances);

        // PASSO 3: Buscar APENAS dados relevantes em paralelo
        // Usar estrutura await direto em vez de array de promises para evitar problemas de tipo
        let mappingsData: IntoleranceMappingItem[] = [];
        let safeKeywordsData: { intolerance_key: string; keyword: string }[] = [];

        // Buscar dados condicionalmente em paralelo
        const conditionalFetches: Promise<void>[] = [];

        if (normalizedUserIntolerances.length > 0) {
          conditionalFetches.push(
            (async () => {
              const result = await supabase
                .from('intolerance_mappings')
                .select('ingredient, intolerance_key')
                .in('intolerance_key', normalizedUserIntolerances);
              if (result.data) mappingsData = result.data;
            })()
          );
          conditionalFetches.push(
            (async () => {
              const result = await supabase
                .from('intolerance_safe_keywords')
                .select('intolerance_key, keyword')
                .in('intolerance_key', normalizedUserIntolerances);
              if (result.data) safeKeywordsData = result.data;
            })()
          );
        }

        // Buscar tabelas pequenas e condicionais em paralelo
        const [onboardingResult] = await Promise.all([
          supabase.from('onboarding_options')
            .select('option_id, category, label')
            .in('category', ['intolerances'])
            .eq('is_active', true),
          ...conditionalFetches
        ]);

        // Processar mapeamentos de intolerância
        if (mappingsData.length > 0) {
          console.log('[INTOLERANCE] Mapeamentos carregados (filtrados):', mappingsData.length);
          setMappings(mappingsData);
        }

        // Processar safe keywords
        const safeKeywordsByIntolerance: Record<string, string[]> = {};
        if (safeKeywordsData.length > 0) {
          for (const sk of safeKeywordsData) {
            if (!safeKeywordsByIntolerance[sk.intolerance_key]) {
              safeKeywordsByIntolerance[sk.intolerance_key] = [];
            }
            safeKeywordsByIntolerance[sk.intolerance_key].push(
              sk.keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            );
          }
          setSafeKeywords(safeKeywordsByIntolerance);
        }

        // Processar onboarding options para tipos e labels
        if (onboardingResult.data) {
          const typeMap: Record<string, RestrictionType> = {};
          const labelMap: Record<string, string> = {};
          
          for (const opt of onboardingResult.data as OnboardingOptionItem[]) {
            if (opt.option_id && opt.option_id !== 'none' && opt.option_id !== 'Nenhuma') {
              const normalizedKey = opt.option_id.toLowerCase();
              typeMap[normalizedKey] = categoryToRestrictionType(opt.category);
              labelMap[normalizedKey] = opt.label;
            }
          }
          
          setRestrictionTypeMap(typeMap);
          setRestrictionLabelMap(labelMap);
        }

      } catch (error) {
        console.error('Error fetching intolerance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check if user has any restrictions (intolerances, dietary, or excluded)
  const hasIntolerances = useMemo(() => intolerances.length > 0, [intolerances]);
  const hasExcludedIngredients = useMemo(() => excludedIngredients.length > 0, [excludedIngredients]);
  const hasAnyRestriction = useMemo(() => 
    hasIntolerances || hasExcludedIngredients, 
    [hasIntolerances, hasExcludedIngredients]
  );

  // Check excluded ingredients for a single ingredient
  const checkExcludedConflict = useCallback((ingredientName: string): { hasConflict: boolean; excludedItem: string | null } => {
    if (!hasExcludedIngredients || !ingredientName) {
      return { hasConflict: false, excludedItem: null };
    }

    const normalizedIngredient = ingredientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    for (const excluded of excludedIngredients) {
      // Usar containsWholeWord para evitar falsos positivos
      if (containsWholeWord(normalizedIngredient, excluded)) {
        return { hasConflict: true, excludedItem: excluded };
      }
    }

    return { hasConflict: false, excludedItem: null };
  }, [hasExcludedIngredients, excludedIngredients]);

  // Função auxiliar para determinar tipo e label de uma restrição
  const getRestrictionInfo = useCallback((conflictKey: string): { type: RestrictionType; label: string } => {
    // Ingrediente excluído
    if (conflictKey.startsWith('excluded:')) {
      const excludedItem = conflictKey.replace('excluded:', '');
      return { 
        type: 'excluded', 
        label: excludedItem.charAt(0).toUpperCase() + excludedItem.slice(1) 
      };
    }
    
    // Buscar tipo do mapeamento carregado do onboarding_options
    const normalizedKey = conflictKey.toLowerCase();
    const type = restrictionTypeMap[normalizedKey] || 'intolerance';
    const label = restrictionLabelMap[normalizedKey] || getDbIntoleranceLabel(conflictKey);
    
    return { type, label };
  }, [restrictionTypeMap, restrictionLabelMap, getDbIntoleranceLabel]);

  // Check a single food/ingredient name for intolerance conflicts
  const checkFood = useCallback((foodName: string): IntoleranceWarning => {
    if (!foodName) {
      return { hasConflict: false, conflicts: [], labels: [], badgeLabel: null, fullLabel: null, conflictDetails: [] };
    }

    const foundConflicts = new Set<string>();

    // Check excluded ingredients first
    const excludedResult = checkExcludedConflict(foodName);
    if (excludedResult.hasConflict && excludedResult.excludedItem) {
      foundConflicts.add(`excluded:${excludedResult.excludedItem}`);
    }

    // Check intolerances
    if (hasIntolerances) {
      const normalizedName = foodName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      // Check against mappings from database
      for (const mapping of mappings) {
        const normalizedIngredient = mapping.ingredient.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // IMPORTANTE: Verificar se o ingrediente mapeado está contido no nome do alimento
        // Ex: "leite" deve matchear "leite integral", mas "arroz doce" NÃO deve matchear "arroz branco"
        // Para isso, o ingrediente mapeado precisa ser encontrado COMO PALAVRA COMPLETA no nome
        const isMatch = normalizedName === normalizedIngredient || 
          containsWholeWord(normalizedName, normalizedIngredient);
        
        if (isMatch && intolerances.includes(mapping.intolerance_key)) {
          // CRITICAL FIX: Check safe keywords BEFORE marking as conflict
          // Ex: "pão sem glúten" should NOT trigger gluten conflict
          const safeWordsForIntolerance = safeKeywords[mapping.intolerance_key] || [];
          const isSafeFood = safeWordsForIntolerance.some(safeWord => 
            normalizedName.includes(safeWord)
          );
          
          if (isSafeFood) {
            // Food contains a safe keyword, skip this intolerance
            continue;
          }
          
          foundConflicts.add(mapping.intolerance_key);
        }
      }
    }

    const conflicts = Array.from(foundConflicts);
    
    // Construir detalhes completos de cada conflito
    const conflictDetails: ConflictDetail[] = conflicts.map(c => {
      const { type, label } = getRestrictionInfo(c);
      return {
        restrictionKey: c,
        type,
        label,
        message: getRestrictionMessage(type, label),
      };
    });
    
    const labels = conflictDetails.map(d => d.label);

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
      conflictDetails,
    };
  }, [hasIntolerances, intolerances, mappings, safeKeywords, checkExcludedConflict, getRestrictionInfo]);

  // Check a meal with ingredients for conflicts
  const checkMeal = useCallback((mealName: string, ingredients?: any[]): IntoleranceWarning => {
    if (!hasAnyRestriction) {
      return { hasConflict: false, conflicts: [], labels: [], badgeLabel: null, fullLabel: null, conflictDetails: [] };
    }

    const allConflicts = new Set<string>();
    const allDetails: ConflictDetail[] = [];

    // Check meal name
    const nameResult = checkFood(mealName);
    nameResult.conflicts.forEach(c => allConflicts.add(c));
    nameResult.conflictDetails.forEach(d => {
      if (!allDetails.find(existing => existing.restrictionKey === d.restrictionKey)) {
        allDetails.push(d);
      }
    });

    // Check each ingredient
    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const ingredientName = typeof ing === 'string' ? ing : (ing.name || ing.ingredient || ing.item || '');
        if (ingredientName) {
          const ingResult = checkFood(ingredientName);
          ingResult.conflicts.forEach(c => allConflicts.add(c));
          ingResult.conflictDetails.forEach(d => {
            if (!allDetails.find(existing => existing.restrictionKey === d.restrictionKey)) {
              allDetails.push(d);
            }
          });
        }
      }
    }

    const conflicts = Array.from(allConflicts);
    const labels = allDetails.map(d => d.label);

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
      conflictDetails: allDetails,
    };
  }, [hasAnyRestriction, checkFood]);

  // Batch check multiple foods at once (for lists)
  const checkFoodList = useCallback((foods: string[]): Map<string, IntoleranceWarning> => {
    const results = new Map<string, IntoleranceWarning>();
    for (const food of foods) {
      results.set(food, checkFood(food));
    }
    return results;
  }, [checkFood]);

  /**
   * Legacy compatibility function - returns ConflictType or null
   * ATUALIZADO: Agora retorna tipo e mensagem correta baseados na classificação
   */
  const checkConflict = useCallback((ingredient: string): ConflictType | null => {
    const result = checkFood(ingredient);
    if (!result.hasConflict) return null;
    
    const firstDetail = result.conflictDetails[0];
    
    return {
      ingredient: ingredient.toLowerCase().trim(),
      restriction: result.conflicts[0],
      restrictionLabel: firstDetail?.label || result.labels[0] || result.conflicts[0],
      type: firstDetail?.type || 'intolerance',
      message: firstDetail?.message || `Contém ${result.labels[0]}`,
    };
  }, [checkFood]);

  /**
   * NOVO: Processa alertas que vieram do backend (globalSafetyEngine)
   * Use esta função para converter alertas_personalizados do backend
   * para o formato IntoleranceWarning usado pela UI.
   * 
   * @param backendAlerts - Array de alertas retornados pelo backend
   * @returns IntoleranceWarning compatível com componentes existentes
   */
  const processBackendAlerts = useCallback((backendAlerts: Array<{
    restricao: string;
    status: 'seguro' | 'risco_potencial' | 'contem';
    ingrediente?: string;
    mensagem?: string;
    icone?: string;
  }>): IntoleranceWarning => {
    if (!backendAlerts || backendAlerts.length === 0) {
      return { 
        hasConflict: false, 
        conflicts: [], 
        labels: [], 
        badgeLabel: null, 
        fullLabel: null, 
        conflictDetails: [] 
      };
    }

    const conflicts: string[] = [];
    const labels: string[] = [];
    const conflictDetails: ConflictDetail[] = [];

    for (const alert of backendAlerts) {
      if (alert.status === 'contem' || alert.status === 'risco_potencial') {
        conflicts.push(alert.restricao);
        labels.push(alert.restricao);
        
        // Determinar o tipo baseado no contexto
        const isExcluded = excludedIngredients.some(ex => 
          alert.restricao.toLowerCase().includes(ex.toLowerCase())
        );
        
        let type: RestrictionType = 'intolerance';
        if (isExcluded) type = 'excluded';
        else {
          // Buscar tipo do mapeamento
          const normalizedKey = alert.restricao.toLowerCase();
          type = restrictionTypeMap[normalizedKey] || 'intolerance';
        }

        conflictDetails.push({
          restrictionKey: alert.restricao,
          type,
          label: alert.restricao,
          message: alert.mensagem || getRestrictionMessage(type, alert.restricao)
        });
      }
    }

    const hasConflict = conflicts.length > 0;
    const badgeLabel = hasConflict ? labels[0] : null;
    const fullLabel = hasConflict ? `Contém ${labels.join(', ')}` : null;

    return {
      hasConflict,
      conflicts,
      labels,
      badgeLabel,
      fullLabel,
      conflictDetails
    };
  }, [excludedIngredients, restrictionTypeMap]);

  /**
   * NOVO: Retorna as restrições do usuário com labels amigáveis
   * Útil para componentes que precisam exibir as restrições do usuário
   */
  const getUserRestrictions = useCallback(() => {
    const restrictions: Array<{ key: string; label: string; type: RestrictionType }> = [];

    // Intolerâncias
    for (const intolerance of intolerances) {
      if (intolerance === 'nenhuma' || intolerance === 'none' || !intolerance) continue;
      const { type, label } = getRestrictionInfo(intolerance);
      restrictions.push({ key: intolerance, label, type });
    }

    // Ingredientes excluídos
    for (const excluded of excludedIngredients) {
      restrictions.push({
        key: `excluded:${excluded}`,
        label: excluded.charAt(0).toUpperCase() + excluded.slice(1),
        type: 'excluded'
      });
    }

    return restrictions;
  }, [intolerances, excludedIngredients, getRestrictionInfo]);

  return {
    /** User's configured intolerances */
    intolerances,
    /** User's excluded ingredients */
    excludedIngredients,
    /** Whether data is still loading */
    isLoading,
    /** Whether user has any intolerances configured */
    hasIntolerances,
    /** Whether user has excluded ingredients configured */
    hasExcludedIngredients,
    /** Whether user has any restriction (intolerance or excluded) */
    hasAnyRestriction,
    /** Check a single food name for conflicts (returns IntoleranceWarning) */
    checkFood,
    /** Check a meal with its ingredients for conflicts */
    checkMeal,
    /** Batch check multiple foods */
    checkFoodList,
    checkConflict,
    processBackendAlerts,
    getUserRestrictions,
  };
};

export default useIntoleranceWarning;
