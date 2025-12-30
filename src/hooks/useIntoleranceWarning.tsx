import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSafetyLabels } from './useSafetyLabels';
import { FALLBACK_DIETARY_LABELS_WITH_ARTICLE } from '@/lib/safetyFallbacks';

// NOTA: checkUserIntoleranceConflict de intoleranceDetection.ts foi depreciado
// Agora usamos dados do banco de dados diretamente
export interface IntoleranceWarning {
  hasConflict: boolean;
  conflicts: string[];
  labels: string[];
  /** Short label for badge (e.g., "Glúten") */
  badgeLabel: string | null;
  /** Full description (e.g., "Contém Glúten") */
  fullLabel: string | null;
}

/** Legacy type for compatibility with old useIngredientConflictCheck */
export type ConflictType = {
  ingredient: string;
  restriction: string;
  restrictionLabel: string;
};

interface IntoleranceMappingItem {
  ingredient: string;
  intolerance_key: string;
}

interface ForbiddenIngredientItem {
  ingredient: string;
  dietary_key: string;
}

interface DietaryLabelItem {
  key: string;
  name: string;
}

export function useIntoleranceWarning() {
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [dietaryPreference, setDietaryPreference] = useState<string | null>(null);
  const [mappings, setMappings] = useState<IntoleranceMappingItem[]>([]);
  const [forbiddenIngredients, setForbiddenIngredients] = useState<ForbiddenIngredientItem[]>([]);
  const [dietaryLabels, setDietaryLabels] = useState<Record<string, string>>(FALLBACK_DIETARY_LABELS_WITH_ARTICLE);
  const [isLoading, setIsLoading] = useState(true);
  
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

        // Fetch all data in parallel
        const [profileResult, mappingsResult, forbiddenResult, dietaryProfilesResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('intolerances, dietary_preference, excluded_ingredients')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('intolerance_mappings')
            .select('ingredient, intolerance_key'),
          supabase
            .from('dietary_forbidden_ingredients')
            .select('ingredient, dietary_key'),
          supabase
            .from('dietary_profiles')
            .select('key, name')
            .eq('is_active', true)
        ]);

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
            const normalizedIntolerances = profileResult.data.intolerances
              .map((intol: string) => {
                const mapping: Record<string, string> = {
                  'Lactose': 'lactose',
                  'lactose': 'lactose',
                  'Glúten': 'gluten',
                  'Gluten': 'gluten',
                  'gluten': 'gluten',
                  'glúten': 'gluten',
                  'Cafeína': 'cafeina',
                  'Cafeina': 'cafeina',
                  'cafeina': 'cafeina',
                  'cafeína': 'cafeina',
                  'Açúcar': 'acucar',
                  'Acucar': 'acucar',
                  'açúcar': 'acucar',
                  'acucar': 'acucar',
                  'Ovo': 'ovo',
                  'ovo': 'ovo',
                  'Frutos do Mar': 'frutos_do_mar',
                  'frutos_do_mar': 'frutos_do_mar',
                  'Amendoim': 'amendoim',
                  'amendoim': 'amendoim',
                  'Soja': 'soja',
                  'soja': 'soja',
                  'Castanhas': 'castanhas',
                  'castanhas': 'castanhas',
                };
                return mapping[intol] || intol.toLowerCase().replace(/\s+/g, '_');
              })
              .filter((i: string) => i !== 'nenhuma');
            setIntolerances(normalizedIntolerances);
          }
        }

        if (mappingsResult.data) {
          setMappings(mappingsResult.data);
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
      if (normalizedIngredient.includes(excluded) || excluded.includes(normalizedIngredient)) {
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
        if (normalizedIngredient.includes(normalizedForbidden) || normalizedForbidden.includes(normalizedIngredient)) {
          return { hasConflict: true, restriction: dietaryPreference };
        }
      }
    }

    return { hasConflict: false, restriction: null };
  }, [hasDietaryRestriction, dietaryPreference, forbiddenIngredients]);

  // Check a single food/ingredient name for intolerance conflicts
  const checkFood = useCallback((foodName: string): IntoleranceWarning => {
    if (!foodName) {
      return { hasConflict: false, conflicts: [], labels: [], badgeLabel: null, fullLabel: null };
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
        if (normalizedName.includes(normalizedIngredient) && intolerances.includes(mapping.intolerance_key)) {
          foundConflicts.add(mapping.intolerance_key);
        }
      }
    }

    const conflicts = Array.from(foundConflicts);
    const labels = conflicts.map(c => {
      if (c.startsWith('excluded:')) {
        return c.replace('excluded:', '');
      }
      return dietaryLabels[c] || getDbIntoleranceLabel(c);
    });

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
    };
  }, [hasIntolerances, intolerances, mappings, checkDietaryConflict, checkExcludedConflict, dietaryLabels, getDbIntoleranceLabel]);

  // Check a meal with ingredients for conflicts
  const checkMeal = useCallback((mealName: string, ingredients?: any[]): IntoleranceWarning => {
    if (!hasAnyRestriction) {
      return { hasConflict: false, conflicts: [], labels: [], badgeLabel: null, fullLabel: null };
    }

    const allConflicts = new Set<string>();

    // Check meal name
    const nameResult = checkFood(mealName);
    nameResult.conflicts.forEach(c => allConflicts.add(c));

    // Check each ingredient
    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const ingredientName = typeof ing === 'string' ? ing : (ing.name || ing.ingredient || ing.item || '');
        if (ingredientName) {
          const ingResult = checkFood(ingredientName);
          ingResult.conflicts.forEach(c => allConflicts.add(c));
        }
      }
    }

    const conflicts = Array.from(allConflicts);
    const labels = conflicts.map(c => dietaryLabels[c] || getDbIntoleranceLabel(c));

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
    };
  }, [hasAnyRestriction, checkFood, dietaryLabels, getDbIntoleranceLabel]);

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
   * Use this when migrating from useIngredientConflictCheck
   */
  const checkConflict = useCallback((ingredient: string): ConflictType | null => {
    const result = checkFood(ingredient);
    if (!result.hasConflict) return null;
    
    return {
      ingredient: ingredient.toLowerCase().trim(),
      restriction: result.conflicts[0],
      restrictionLabel: result.labels[0] || result.conflicts[0],
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
