import { useCallback, useMemo, useState, useEffect } from 'react';
import { useUserProfileContext } from './useUserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { useSafetyLabels } from './useSafetyLabels';
import { FALLBACK_GLOBAL_SAFE_EXCEPTIONS } from '@/lib/safetyFallbacks';

// ============================================
// ESTE HOOK AGORA USA DADOS DO BANCO DE DADOS
// As tabelas utilizadas são:
// - intolerance_mappings (ingredientes proibidos por intolerância)
// - intolerance_safe_keywords (keywords que tornam um ingrediente seguro)
// - dietary_forbidden_ingredients (ingredientes proibidos por dieta)
// ============================================

interface IntoleranceMapping {
  forbidden: string[];
  safeKeywords: string[];
}

interface Ingredient {
  item: string;
  quantity?: string | number;
  unit?: string;
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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function useDynamicDietaryCompatibility() {
  const profileContext = useUserProfileContext();
  const { getIntoleranceLabel, getDietaryLabel } = useSafetyLabels();
  
  // Estado para dados carregados do banco
  const [intoleranceMappings, setIntoleranceMappings] = useState<Record<string, IntoleranceMapping>>({});
  const [dietaryForbidden, setDietaryForbidden] = useState<Record<string, string[]>>({});
  const [safeExceptions, setSafeExceptions] = useState<string[]>(FALLBACK_GLOBAL_SAFE_EXCEPTIONS);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Carrega dados do banco de dados
  useEffect(() => {
    const loadSafetyData = async () => {
      try {
        // Carrega mapeamentos de intolerância
        const { data: mappings } = await supabase
          .from('intolerance_mappings')
          .select('intolerance_key, ingredient');

        // Carrega safe keywords
        const { data: safeKeywords } = await supabase
          .from('intolerance_safe_keywords')
          .select('intolerance_key, keyword');

        // Carrega ingredientes proibidos por dieta
        const { data: dietaryIngredients } = await supabase
          .from('dietary_forbidden_ingredients')
          .select('dietary_key, ingredient');

        // Organiza mapeamentos de intolerância
        const organizedMappings: Record<string, IntoleranceMapping> = {};
        
        if (mappings) {
          for (const m of mappings) {
            if (!organizedMappings[m.intolerance_key]) {
              organizedMappings[m.intolerance_key] = { forbidden: [], safeKeywords: [] };
            }
            organizedMappings[m.intolerance_key].forbidden.push(m.ingredient);
          }
        }

        if (safeKeywords) {
          for (const sk of safeKeywords) {
            if (!organizedMappings[sk.intolerance_key]) {
              organizedMappings[sk.intolerance_key] = { forbidden: [], safeKeywords: [] };
            }
            organizedMappings[sk.intolerance_key].safeKeywords.push(sk.keyword);
          }
        }

        // Organiza ingredientes proibidos por dieta
        const organizedDietary: Record<string, string[]> = {};
        
        if (dietaryIngredients) {
          for (const d of dietaryIngredients) {
            if (!organizedDietary[d.dietary_key]) {
              organizedDietary[d.dietary_key] = [];
            }
            organizedDietary[d.dietary_key].push(d.ingredient);
          }
        }

        // Coleta todas as safe keywords como exceções globais
        const allSafeKeywords = safeKeywords?.map(sk => sk.keyword) || [];
        const uniqueSafeKeywords = [...new Set([...FALLBACK_GLOBAL_SAFE_EXCEPTIONS, ...allSafeKeywords])];

        setIntoleranceMappings(organizedMappings);
        setDietaryForbidden(organizedDietary);
        setSafeExceptions(uniqueSafeKeywords);
      } catch (error) {
        console.error('Erro ao carregar dados de segurança:', error);
      } finally {
        setIsDataLoading(false);
      }
    };

    loadSafetyData();
  }, []);

  // Verifica se o usuário tem restrições configuradas
  const hasRestrictions = useMemo(() => {
    const hasIntolerances = (profileContext.intolerances?.length ?? 0) > 0 && 
      !profileContext.intolerances?.includes("nenhuma");
    const hasExcluded = (profileContext.excluded_ingredients?.length ?? 0) > 0;
    const hasDietaryRestriction = profileContext.dietary_preference && 
      profileContext.dietary_preference !== "comum" &&
      profileContext.dietary_preference !== "flexitariana";
    return hasIntolerances || hasExcluded || hasDietaryRestriction;
  }, [profileContext.intolerances, profileContext.excluded_ingredients, profileContext.dietary_preference]);

  // Função principal de checagem de conflitos
  const checkMealConflicts = useCallback((ingredients: Ingredient[] | unknown): ConflictResult => {
    if (!ingredients) {
      return { hasConflict: false, conflicts: [], isSafe: false };
    }

    const ingredientList = Array.isArray(ingredients) ? ingredients : [];
    const conflicts: ConflictResult['conflicts'] = [];

    // Percorre cada ingrediente da receita
    for (const ing of ingredientList) {
      const itemName = typeof ing === "string" ? ing : ing?.item;
      if (!itemName) continue;

      const normalizedItem = normalizeText(itemName);

      // PRIMEIRO: Verifica exceções globais seguras
      const isGlobalSafe = safeExceptions.some(safe => 
        normalizedItem.includes(normalizeText(safe))
      );
      
      if (isGlobalSafe) continue;

      // 1. Verifica intolerâncias do usuário
      const userIntolerances = profileContext.intolerances || [];
      for (const intolerance of userIntolerances) {
        if (intolerance === "nenhuma" || !intolerance) continue;
        
        const mapping = intoleranceMappings[intolerance];
        if (!mapping) continue;

        // Verifica se o ingrediente tem uma keyword de segurança específica
        const isSafe = mapping.safeKeywords.some(safe => 
          normalizedItem.includes(normalizeText(safe))
        );
        
        if (isSafe) continue;

        // Verifica ingredientes proibidos
        for (const forbidden of mapping.forbidden) {
          const normalizedForbidden = normalizeText(forbidden);
          if (normalizedItem.includes(normalizedForbidden)) {
            const exists = conflicts.some(c => 
              c.type === 'intolerance' && 
              c.key === intolerance && 
              c.ingredient === itemName
            );
            if (!exists) {
              conflicts.push({
                type: 'intolerance',
                key: intolerance,
                label: getIntoleranceLabel(intolerance),
                ingredient: itemName,
                matchedTerm: forbidden
              });
            }
            break;
          }
        }
      }

      // 2. Verifica preferência dietética
      const dietaryPref = profileContext.dietary_preference;
      if (dietaryPref && dietaryPref !== "comum" && dietaryPref !== "flexitariana") {
        const forbiddenByDiet = dietaryForbidden[dietaryPref] || [];
        for (const forbidden of forbiddenByDiet) {
          const normalizedForbidden = normalizeText(forbidden);
          if (normalizedItem.includes(normalizedForbidden)) {
            const exists = conflicts.some(c => 
              c.type === 'dietary' && 
              c.key === dietaryPref && 
              c.ingredient === itemName
            );
            if (!exists) {
              conflicts.push({
                type: 'dietary',
                key: dietaryPref,
                label: getDietaryLabel(dietaryPref),
                ingredient: itemName,
                matchedTerm: forbidden
              });
            }
            break;
          }
        }
      }

      // 3. Verifica ingredientes excluídos manualmente
      const excludedList = profileContext.excluded_ingredients || [];
      for (const excluded of excludedList) {
        const normalizedExcluded = normalizeText(excluded);
        if (normalizedItem.includes(normalizedExcluded) || 
            normalizedExcluded.includes(normalizedItem)) {
          const exists = conflicts.some(c => 
            c.type === 'excluded' && 
            c.matchedTerm === excluded && 
            c.ingredient === itemName
          );
          if (!exists) {
            conflicts.push({
              type: 'excluded',
              key: `excluded_${excluded}`,
              label: excluded,
              ingredient: itemName,
              matchedTerm: excluded
            });
          }
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      isSafe: hasRestrictions && conflicts.length === 0
    };
  }, [
    profileContext.intolerances, 
    profileContext.dietary_preference, 
    profileContext.excluded_ingredients, 
    hasRestrictions,
    intoleranceMappings,
    dietaryForbidden,
    safeExceptions,
    getIntoleranceLabel,
    getDietaryLabel
  ]);

  // Classifica a compatibilidade de uma refeição
  const getMealCompatibility = useCallback((ingredients: Ingredient[] | unknown): 'good' | 'moderate' | 'incompatible' | 'unknown' => {
    if (!hasRestrictions) return 'unknown';
    
    const result = checkMealConflicts(ingredients);
    
    if (result.isSafe) return 'good';
    if (result.conflicts.length === 0) return 'unknown';
    
    // Se tem conflito de intolerância ou excluído = incompatível
    const hasHardConflict = result.conflicts.some(c => 
      c.type === 'intolerance' || c.type === 'excluded'
    );
    
    if (hasHardConflict) return 'incompatible';
    
    // Se tem apenas conflito de dieta = moderado
    return 'moderate';
  }, [checkMealConflicts, hasRestrictions]);

  return {
    checkMealConflicts,
    getMealCompatibility,
    hasRestrictions,
    isLoading: profileContext.isLoading || isDataLoading,
    hasProfile: hasRestrictions
  };
}
