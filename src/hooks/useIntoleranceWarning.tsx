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

// Ingredientes de origem animal (para veganos)
const ANIMAL_INGREDIENTS = [
  "carne", "carne moída", "carne bovina", "patinho", "alcatra", "picanha",
  "contra filé", "filé mignon", "maminha", "fraldinha", "acém", "músculo", "cupim",
  "costela", "costela bovina", "coxão mole", "coxão duro", "lagarto", "paleta",
  "carne seca", "carne de sol", "charque", "bife", "fígado bovino",
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango",
  "frango desfiado", "moela", "coração de frango", "fígado de frango",
  "peru", "peito de peru", "chester", "pato", "codorna",
  "carne de porco", "lombo", "pernil", "bisteca", "costela de porco",
  "barriga de porco", "pancetta", "bacon", "toucinho", "torresmo",
  "linguiça", "linguiça calabresa", "linguiça toscana", "linguiça portuguesa",
  "paio", "chouriço", "salsicha", "presunto", "copa", "salame", "mortadela", "tender",
  "peixe", "salmão", "atum", "tilápia", "bacalhau", "sardinha", "camarão", "lagosta",
  "lula", "polvo", "marisco", "mexilhão", "ostra", "vieira", "siri", "caranguejo",
  "ovo", "ovos", "gema", "clara de ovo", "omelete", "maionese",
  "leite", "leite integral", "creme de leite", "chantilly", "nata", "coalhada",
  "iogurte", "kefir", "manteiga", "queijo", "mussarela", "parmesão", "ricota",
  "requeijão", "cream cheese", "catupiry", "burrata", "mascarpone",
  "mel", "mel silvestre", "gelatina",
];

// Ingredientes de carne (para vegetarianos)
const MEAT_INGREDIENTS = [
  "carne", "carne moída", "carne bovina", "patinho", "alcatra", "picanha",
  "contra filé", "filé mignon", "maminha", "fraldinha", "acém", "músculo", "cupim",
  "costela", "costela bovina", "coxão mole", "coxão duro", "lagarto", "paleta",
  "carne seca", "carne de sol", "charque", "bife", "fígado bovino",
  "frango", "peito de frango", "coxa de frango", "sobrecoxa", "asa de frango",
  "frango desfiado", "moela", "coração de frango", "fígado de frango",
  "peru", "peito de peru", "chester", "pato", "codorna",
  "carne de porco", "lombo", "pernil", "bisteca", "costela de porco",
  "barriga de porco", "pancetta", "bacon", "toucinho", "torresmo",
  "linguiça", "linguiça calabresa", "linguiça toscana", "linguiça portuguesa",
  "paio", "chouriço", "salsicha", "presunto", "copa", "salame", "mortadela", "tender",
  "peixe", "salmão", "atum", "tilápia", "bacalhau", "sardinha", "camarão", "lagosta",
  "lula", "polvo", "marisco", "mexilhão", "ostra", "vieira", "siri", "caranguejo",
];

// Labels para restrições alimentares
const DIETARY_LABELS: Record<string, string> = {
  vegana: "vegano(a)",
  vegetariana: "vegetariano(a)",
  low_carb: "low carb",
};

export function useIntoleranceWarning() {
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [dietaryPreference, setDietaryPreference] = useState<string | null>(null);
  const [mappings, setMappings] = useState<IntoleranceMappingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile data and mappings
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
            .select('intolerances, dietary_preference')
            .eq('id', session.user.id)
            .single(),
          supabase
            .from('intolerance_mappings')
            .select('ingredient, intolerance_key')
        ]);

        if (profileResult.data) {
          // Set dietary preference
          setDietaryPreference(profileResult.data.dietary_preference || null);

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
      } catch (error) {
        console.error('Error fetching intolerance data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check if user has any restrictions (intolerances or dietary)
  const hasIntolerances = useMemo(() => intolerances.length > 0, [intolerances]);
  const hasDietaryRestriction = useMemo(() => 
    dietaryPreference && dietaryPreference !== 'comum', 
    [dietaryPreference]
  );
  const hasAnyRestriction = useMemo(() => 
    hasIntolerances || hasDietaryRestriction, 
    [hasIntolerances, hasDietaryRestriction]
  );

  // Check dietary conflict for a single ingredient
  const checkDietaryConflict = useCallback((ingredientName: string): { hasConflict: boolean; restriction: string | null } => {
    if (!hasDietaryRestriction || !ingredientName) {
      return { hasConflict: false, restriction: null };
    }

    const normalizedIngredient = ingredientName.toLowerCase().trim();

    if (dietaryPreference === 'vegana') {
      const conflict = ANIMAL_INGREDIENTS.some(animal => 
        normalizedIngredient.includes(animal)
      );
      if (conflict) return { hasConflict: true, restriction: 'vegana' };
    }

    if (dietaryPreference === 'vegetariana') {
      const conflict = MEAT_INGREDIENTS.some(meat => 
        normalizedIngredient.includes(meat)
      );
      if (conflict) return { hasConflict: true, restriction: 'vegetariana' };
    }

    return { hasConflict: false, restriction: null };
  }, [hasDietaryRestriction, dietaryPreference]);

  // Check a single food/ingredient name for intolerance conflicts
  const checkFood = useCallback((foodName: string): IntoleranceWarning => {
    if (!foodName) {
      return { hasConflict: false, conflicts: [], labels: [], badgeLabel: null, fullLabel: null };
    }

    const foundConflicts = new Set<string>();
    const foundLabels: string[] = [];

    // Check dietary restriction first
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

      // Also use the detection function for additional coverage
      const detectionResult = checkUserIntoleranceConflict(foodName, intolerances);
      detectionResult.conflicts.forEach(c => foundConflicts.add(c));
    }

    const conflicts = Array.from(foundConflicts);
    const labels = conflicts.map(c => DIETARY_LABELS[c] || getIntoleranceLabel(c));

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
    };
  }, [hasIntolerances, intolerances, mappings, checkDietaryConflict]);

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
    const labels = conflicts.map(c => DIETARY_LABELS[c] || getIntoleranceLabel(c));

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels,
      badgeLabel: labels.length > 0 ? labels[0] : null,
      fullLabel: labels.length > 0 ? `Contém ${labels.join(', ')}` : null,
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
    /** User's dietary preference (vegana, vegetariana, etc) */
    dietaryPreference,
    /** Whether data is still loading */
    isLoading,
    /** Whether user has any intolerances configured */
    hasIntolerances,
    /** Whether user has dietary restriction (not 'comum') */
    hasDietaryRestriction,
    /** Whether user has any restriction (intolerance or dietary) */
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
