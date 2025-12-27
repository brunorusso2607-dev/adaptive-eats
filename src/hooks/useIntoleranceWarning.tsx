import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkUserIntoleranceConflict, getIntoleranceLabel } from '@/lib/intoleranceDetection';

export interface IntoleranceWarning {
  hasConflict: boolean;
  conflicts: string[];
  labels: string[];
  /** Short label for badge (e.g., "Glúten") */
  badgeLabel: string | null;
  /** Full description (e.g., "Contém Glúten") */
  fullLabel: string | null;
}

interface IntoleranceMappingItem {
  ingredient: string;
  intolerance_key: string;
}

export function useIntoleranceWarning() {
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [mappings, setMappings] = useState<IntoleranceMappingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user intolerances and mappings
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        // Fetch in parallel
        const [profileResult, mappingsResult] = await Promise.all([
          supabase
            .from('profiles')
            .select('intolerances')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('intolerance_mappings')
            .select('ingredient, intolerance_key')
        ]);

        if (profileResult.data?.intolerances) {
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

        if (mappingsResult.data) {
          setMappings(mappingsResult.data);
        }
      } catch (error) {
        console.error('Error fetching intolerance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check if user has any intolerances configured
  const hasIntolerances = useMemo(() => intolerances.length > 0, [intolerances]);

  // Check a single food/ingredient name for conflicts
  const checkFood = useCallback((foodName: string): IntoleranceWarning => {
    if (!hasIntolerances || !foodName) {
      return { hasConflict: false, conflicts: [], labels: [], badgeLabel: null, fullLabel: null };
    }

    const normalizedName = foodName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const foundConflicts = new Set<string>();

    // Check against mappings from database
    for (const mapping of mappings) {
      const normalizedIngredient = mapping.ingredient.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedName.includes(normalizedIngredient) && intolerances.includes(mapping.intolerance_key)) {
        foundConflicts.add(mapping.intolerance_key);
      }
    }

    // Also use the detection function for additional coverage
    const detectionResult = checkUserIntoleranceConflict(foodName, intolerances);
    detectionResult.conflicts.forEach(c => foundConflicts.add(c));

    const conflicts = Array.from(foundConflicts);
    const labels = conflicts.map(c => getIntoleranceLabel(c));

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
    };
  }, [hasIntolerances, intolerances, mappings]);

  // Check a meal with ingredients for conflicts
  const checkMeal = useCallback((mealName: string, ingredients?: any[]): IntoleranceWarning => {
    if (!hasIntolerances) {
      return { hasConflict: false, conflicts: [], labels: [], badgeLabel: null, fullLabel: null };
    }

    const allConflicts = new Set<string>();

    // Check meal name
    const nameResult = checkFood(mealName);
    nameResult.conflicts.forEach(c => allConflicts.add(c));

    // Check each ingredient
    if (ingredients && Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        const ingredientName = typeof ing === 'string' ? ing : (ing.name || ing.ingredient || '');
        if (ingredientName) {
          const ingResult = checkFood(ingredientName);
          ingResult.conflicts.forEach(c => allConflicts.add(c));
        }
      }
    }

    const conflicts = Array.from(allConflicts);
    const labels = conflicts.map(c => getIntoleranceLabel(c));

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
    };
  }, [hasIntolerances, checkFood]);

  // Batch check multiple foods at once (for lists)
  const checkFoodList = useCallback((foods: string[]): Map<string, IntoleranceWarning> => {
    const results = new Map<string, IntoleranceWarning>();
    for (const food of foods) {
      results.set(food, checkFood(food));
    }
    return results;
  }, [checkFood]);

  return {
    /** User's configured intolerances */
    intolerances,
    /** Whether data is still loading */
    isLoading,
    /** Whether user has any intolerances configured */
    hasIntolerances,
    /** Check a single food name for conflicts */
    checkFood,
    /** Check a meal with its ingredients for conflicts */
    checkMeal,
    /** Batch check multiple foods */
    checkFoodList,
  };
}
