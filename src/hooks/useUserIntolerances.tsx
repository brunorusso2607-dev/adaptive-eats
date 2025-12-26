import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { checkUserIntoleranceConflict, getIntoleranceLabel } from '@/lib/intoleranceDetection';

type IntoleranceConflict = {
  hasConflict: boolean;
  conflicts: string[];
  labels: string[];
};

export function useUserIntolerances() {
  const [intolerances, setIntolerances] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntolerances = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('intolerances')
          .eq('id', session.user.id)
          .single();

        if (profile?.intolerances) {
          // Normalizar as keys de intolerância para o formato do sistema
          const normalizedIntolerances = profile.intolerances.map((intol: string) => {
            // Mapear nomes do perfil para keys do sistema
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
              'caffeine': 'cafeina',
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
          });
          setIntolerances(normalizedIntolerances);
        }
      } catch (error) {
        console.error('Error fetching user intolerances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchIntolerances();
  }, []);

  // Verifica se um alimento conflita com as intolerâncias do usuário
  const checkConflict = useCallback((foodName: string): IntoleranceConflict => {
    if (intolerances.length === 0) {
      return { hasConflict: false, conflicts: [], labels: [] };
    }

    const result = checkUserIntoleranceConflict(foodName, intolerances);
    
    return {
      hasConflict: result.hasConflict,
      conflicts: result.conflicts,
      labels: result.conflicts.map(c => getIntoleranceLabel(c)),
    };
  }, [intolerances]);

  // Verifica conflitos também nos ingredientes de uma refeição
  const checkMealConflict = useCallback((mealName: string, ingredients?: any[]): IntoleranceConflict => {
    if (intolerances.length === 0) {
      return { hasConflict: false, conflicts: [], labels: [] };
    }

    const allConflicts = new Set<string>();
    
    // Verificar nome da refeição
    const nameResult = checkUserIntoleranceConflict(mealName, intolerances);
    nameResult.conflicts.forEach(c => allConflicts.add(c));
    
    // Verificar ingredientes se disponíveis
    if (ingredients && Array.isArray(ingredients)) {
      ingredients.forEach(ing => {
        const ingredientName = typeof ing === 'string' ? ing : ing.name || ing.ingredient || '';
        if (ingredientName) {
          const ingResult = checkUserIntoleranceConflict(ingredientName, intolerances);
          ingResult.conflicts.forEach(c => allConflicts.add(c));
        }
      });
    }
    
    const conflicts = Array.from(allConflicts);
    
    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      labels: conflicts.map(c => getIntoleranceLabel(c)),
    };
  }, [intolerances]);

  return {
    intolerances,
    isLoading,
    checkConflict,
    checkMealConflict,
    hasIntolerances: intolerances.length > 0,
  };
}
