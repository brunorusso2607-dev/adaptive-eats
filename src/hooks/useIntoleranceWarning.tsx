import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSafetyLabels } from './useSafetyLabels';
import { FALLBACK_DIETARY_LABELS_WITH_ARTICLE } from '@/lib/safetyFallbacks';

// Tipos de restrição alimentar - classificação global
export type RestrictionType = 'intolerance' | 'allergy' | 'sensitivity' | 'dietary' | 'excluded';

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

interface ForbiddenIngredientItem {
  ingredient: string;
  dietary_key: string;
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
    case 'allergy':
      return `Você é alérgico a ${label}`;
    case 'intolerance':
      return `Você tem intolerância a ${label}`;
    case 'sensitivity':
      return `Você tem sensibilidade a ${label}`;
    case 'dietary':
      return `Não permitido na dieta ${label}`;
    case 'excluded':
      return `${label} está na sua lista de exclusão`;
  }
}

/**
 * Converte categoria do onboarding_options para RestrictionType
 */
function categoryToRestrictionType(category: string): RestrictionType {
  switch (category) {
    case 'allergies':
      return 'allergy';
    case 'intolerances':
      return 'intolerance';
    case 'sensitivities':
      return 'sensitivity';
    default:
      return 'intolerance'; // fallback seguro
  }
}

export function useIntoleranceWarning() {
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [dietaryPreference, setDietaryPreference] = useState<string | null>(null);
  const [mappings, setMappings] = useState<IntoleranceMappingItem[]>([]);
  const [forbiddenIngredients, setForbiddenIngredients] = useState<ForbiddenIngredientItem[]>([]);
  const [dietaryLabels, setDietaryLabels] = useState<Record<string, string>>(FALLBACK_DIETARY_LABELS_WITH_ARTICLE);
  const [isLoading, setIsLoading] = useState(true);
  
  // Mapeamento de option_id → tipo de restrição (carregado do onboarding_options)
  const [restrictionTypeMap, setRestrictionTypeMap] = useState<Record<string, RestrictionType>>({});
  // Mapeamento de option_id → label amigável
  const [restrictionLabelMap, setRestrictionLabelMap] = useState<Record<string, string>>({});
  
  // Hook para labels de segurança do banco de dados
  const { getIntoleranceLabel: getDbIntoleranceLabel } = useSafetyLabels();

  // Fetch user profile data, mappings, and forbidden ingredients from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        // Função para carregar todos os mapeamentos com paginação explícita
        const fetchAllMappings = async () => {
          const pageSize = 1000;
          let allMappings: { ingredient: string; intolerance_key: string }[] = [];
          let page = 0;
          let hasMore = true;
          
          while (hasMore) {
            const from = page * pageSize;
            const to = from + pageSize - 1;
            
            const { data, error } = await supabase
              .from('intolerance_mappings')
              .select('ingredient, intolerance_key')
              .range(from, to);
            
            if (error) {
              console.error('[INTOLERANCE] Erro ao carregar mapeamentos:', error);
              break;
            }
            
            if (data && data.length > 0) {
              allMappings = [...allMappings, ...data];
              hasMore = data.length === pageSize;
              page++;
            } else {
              hasMore = false;
            }
          }
          
          return allMappings;
        };

        // Fetch all data in parallel - incluindo onboarding_options para classificação
        const [profileResult, allMappings, forbiddenResult, dietaryProfilesResult, onboardingResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('intolerances, dietary_preference, excluded_ingredients')
            .eq('id', session.user.id)
            .single(),
          fetchAllMappings(),
          supabase
            .from('dietary_forbidden_ingredients')
            .select('ingredient, dietary_key'),
          supabase
            .from('dietary_profiles')
            .select('key, name')
            .eq('is_active', true),
          // Buscar categorias do onboarding_options para classificar cada restrição
          supabase
            .from('onboarding_options')
            .select('option_id, category, label')
            .in('category', ['intolerances', 'allergies', 'sensitivities'])
            .eq('is_active', true)
        ]);

        // Construir mapeamentos de tipo e label a partir do onboarding_options
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

        if (profileResult.data) {
          // Set dietary preference
          setDietaryPreference(profileResult.data.dietary_preference || null);

          // Set excluded ingredients (normalized)
          if (profileResult.data.excluded_ingredients && Array.isArray(profileResult.data.excluded_ingredients)) {
            const normalizedExcluded = profileResult.data.excluded_ingredients.map((ing: string) =>
              ing.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
            );
            setExcludedIngredients(normalizedExcluded);
          }

          // Normalize intolerances
          if (profileResult.data.intolerances) {
            // Normaliza intolerâncias do perfil para chaves canônicas do banco
            // O onboarding atual usa chaves em inglês (egg, nuts, seafood, etc)
            // O banco usa as mesmas chaves via intolerance_key_normalization
            const normalizedIntolerances = profileResult.data.intolerances
              .map((intol: string) => {
                // Mapeamento de chaves legadas/alternativas para chaves canônicas do banco
                const mapping: Record<string, string> = {
                  // === CHAVES CANÔNICAS (já corretas) ===
                  'gluten': 'gluten',
                  'lactose': 'lactose',
                  'fructose': 'fructose',
                  'sorbitol': 'sorbitol',
                  'fodmap': 'fodmap',
                  'egg': 'egg',
                  'nuts': 'tree_nuts', // onboarding usa 'nuts', banco usa 'tree_nuts'
                  'tree_nuts': 'tree_nuts',
                  'seafood': 'seafood',
                  'soy': 'soy',
                  'peanut': 'peanut',
                  'fish': 'fish',
                  'corn': 'corn',
                  'histamine': 'histamine',
                  'caffeine': 'caffeine',
                  'sulfite': 'sulfite',
                  'salicylate': 'salicylate',
                  'nickel': 'nickel',
                  
                  // === ALIASES LEGADOS (português → inglês) ===
                  'Lactose': 'lactose',
                  'Glúten': 'gluten',
                  'Gluten': 'gluten',
                  'glúten': 'gluten',
                  'Cafeína': 'caffeine',
                  'Cafeina': 'caffeine',
                  'cafeina': 'caffeine',
                  'cafeína': 'caffeine',
                  'Açúcar': 'sugar',
                  'Acucar': 'sugar',
                  'açúcar': 'sugar',
                  'acucar': 'sugar',
                  'sugar': 'sugar',
                  'Ovo': 'egg',
                  'ovo': 'egg',
                  'ovos': 'egg',
                  'Ovos': 'egg',
                  'eggs': 'egg',
                  'Frutos do Mar': 'seafood',
                  'frutos_do_mar': 'seafood',
                  'Amendoim': 'peanut',
                  'amendoim': 'peanut',
                  'Soja': 'soy',
                  'soja': 'soy',
                  'Castanhas': 'tree_nuts',
                  'castanhas': 'tree_nuts',
                  'oleaginosas': 'tree_nuts',
                  'Oleaginosas': 'tree_nuts',
                  'Peixe': 'fish',
                  'peixe': 'fish',
                  'Milho': 'corn',
                  'milho': 'corn',
                  'Histamina': 'histamine',
                  'histamina': 'histamine',
                  'Frutose': 'fructose',
                  'frutose': 'fructose',
                  'Sorbitol': 'sorbitol',
                  'Sulfito': 'sulfite',
                  'sulfito': 'sulfite',
                  'sulfitos': 'sulfite',
                  'Salicilato': 'salicylate',
                  'salicilato': 'salicylate',
                  'salicilatos': 'salicylate',
                  'Níquel': 'nickel',
                  'niquel': 'nickel',
                };
                return mapping[intol] || intol.toLowerCase().replace(/\s+/g, '_');
              })
              .filter((i: string) => i !== 'nenhuma' && i !== 'none');
            setIntolerances(normalizedIntolerances);
          }
        }

        if (allMappings && allMappings.length > 0) {
          console.log('[INTOLERANCE] Mapeamentos carregados:', allMappings.length);
          
          // Log de amostra para peanut e lactose
          const peanutMappings = allMappings.filter((m: any) => m.intolerance_key === 'peanut');
          const lactoseMappings = allMappings.filter((m: any) => m.intolerance_key === 'lactose');
          console.log('[INTOLERANCE] Peanut mappings:', peanutMappings.length, 'Lactose mappings:', lactoseMappings.length);
          
          setMappings(allMappings);
        }

        // Set forbidden ingredients from database
        if (forbiddenResult.data) {
          setForbiddenIngredients(forbiddenResult.data);
        }

        // Set dietary labels from database
        if (dietaryProfilesResult.data) {
          const labels: Record<string, string> = { ...FALLBACK_DIETARY_LABELS_WITH_ARTICLE };
          for (const profile of dietaryProfilesResult.data) {
            labels[profile.key] = profile.name;
          }
          setDietaryLabels(labels);
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
  const hasDietaryRestriction = useMemo(() => 
    dietaryPreference && dietaryPreference !== 'comum', 
    [dietaryPreference]
  );
  const hasAnyRestriction = useMemo(() => 
    hasIntolerances || hasDietaryRestriction || hasExcludedIngredients, 
    [hasIntolerances, hasDietaryRestriction, hasExcludedIngredients]
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

  // Check dietary conflict for a single ingredient using database forbidden ingredients
  const checkDietaryConflict = useCallback((ingredientName: string): { hasConflict: boolean; restriction: string | null } => {
    if (!hasDietaryRestriction || !ingredientName || !dietaryPreference) {
      return { hasConflict: false, restriction: null };
    }

    const normalizedIngredient = ingredientName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // Check against forbidden ingredients from database
    for (const forbidden of forbiddenIngredients) {
      if (forbidden.dietary_key === dietaryPreference) {
        const normalizedForbidden = forbidden.ingredient.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        // Usar containsWholeWord para evitar falsos positivos
        if (containsWholeWord(normalizedIngredient, normalizedForbidden)) {
          return { hasConflict: true, restriction: dietaryPreference };
        }
      }
    }

    return { hasConflict: false, restriction: null };
  }, [hasDietaryRestriction, dietaryPreference, forbiddenIngredients]);

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
    
    // Preferência dietética (vegana, vegetariana, etc)
    if (dietaryLabels[conflictKey] && dietaryPreference === conflictKey) {
      return { type: 'dietary', label: dietaryLabels[conflictKey] };
    }
    
    // Buscar tipo do mapeamento carregado do onboarding_options
    const normalizedKey = conflictKey.toLowerCase();
    const type = restrictionTypeMap[normalizedKey] || 'intolerance';
    const label = restrictionLabelMap[normalizedKey] || getDbIntoleranceLabel(conflictKey);
    
    return { type, label };
  }, [dietaryLabels, dietaryPreference, restrictionTypeMap, restrictionLabelMap, getDbIntoleranceLabel]);

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

    // Check dietary restriction
    const dietaryResult = checkDietaryConflict(foodName);
    if (dietaryResult.hasConflict && dietaryResult.restriction) {
      foundConflicts.add(dietaryResult.restriction);
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
  }, [hasIntolerances, intolerances, mappings, checkDietaryConflict, checkExcludedConflict, getRestrictionInfo]);

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

  return {
    /** User's configured intolerances */
    intolerances,
    /** User's excluded ingredients */
    excludedIngredients,
    /** User's dietary preference (vegana, vegetariana, etc) */
    dietaryPreference,
    /** Whether data is still loading */
    isLoading,
    /** Whether user has any intolerances configured */
    hasIntolerances,
    /** Whether user has excluded ingredients configured */
    hasExcludedIngredients,
    /** Whether user has dietary restriction (not 'comum') */
    hasDietaryRestriction,
    /** Whether user has any restriction (intolerance, dietary, or excluded) */
    hasAnyRestriction,
    /** Check a single food name for conflicts (returns IntoleranceWarning) */
    checkFood,
    /** Check a meal with its ingredients for conflicts */
    checkMeal,
    /** Batch check multiple foods */
    checkFoodList,
    /** Legacy: Check conflict returning ConflictType | null */
    checkConflict,
  };
}
