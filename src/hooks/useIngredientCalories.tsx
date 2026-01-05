import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCountry, DEFAULT_COUNTRY } from './useUserCountry';

/**
 * HOOK CENTRALIZADO DE CÁLCULO DE CALORIAS
 * 
 * Usa DIRETAMENTE a edge function lookup-ingredient (mesma do filtro de alimentos)
 * para garantir consistência de fonte e valores em todo o sistema.
 */

interface IngredientWithCalories {
  item: string;
  quantity: string;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface IngredientCaloriesResult {
  item: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matched: boolean;
  matchedName?: string;
  source: string;
}

interface CacheEntry {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: string;
}

function parseQuantityToGrams(quantity: string, unit?: string): number {
  const numValue = parseFloat(quantity?.toString().replace(",", ".").replace(/[^0-9.]/g, '')) || 0;
  const unitLower = (unit || quantity || "").toLowerCase().trim();
  
  const conversions: Record<string, number> = {
    "g": 1, "gramas": 1, "grama": 1, "kg": 1000, "ml": 1, "l": 1000,
    "litro": 1000, "xícara": 240, "xicara": 240, "colher de sopa": 15,
    "cs": 15, "colher de chá": 5, "cc": 5, "unidade": 100, "un": 100,
    "fatia": 30, "dente": 5, "copo": 200,
  };

  for (const [key, multiplier] of Object.entries(conversions)) {
    if (unitLower.includes(key)) return numValue * multiplier;
  }

  if (unitLower.endsWith('g') && !unitLower.endsWith('kg')) return numValue;
  return numValue || 100;
}

export function useIngredientCalories() {
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CacheEntry | null>>(new Map());
  const { country: userCountry } = useUserCountry();

  const lookupIngredient = useCallback(async (ingredientName: string): Promise<CacheEntry | null> => {
    const country = userCountry || DEFAULT_COUNTRY;
    const cacheKey = `${ingredientName.toLowerCase().trim()}_${country}`;
    
    // Check cache
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey) || null;
    }

    try {
      // Call the same edge function used by the food filter
      const { data, error } = await supabase.functions.invoke('lookup-ingredient', {
        body: { query: ingredientName.trim(), limit: 1, country }
      });

      if (error) {
        console.error('[useIngredientCalories] lookup error:', error);
        cacheRef.current.set(cacheKey, null);
        return null;
      }

      if (data?.results?.length > 0) {
        const food = data.results[0];
        const entry: CacheEntry = {
          name: food.name,
          calories_per_100g: food.calories_per_100g || 0,
          protein_per_100g: food.protein_per_100g || 0,
          carbs_per_100g: food.carbs_per_100g || 0,
          fat_per_100g: food.fat_per_100g || 0,
          source: food.source || 'local',
        };
        cacheRef.current.set(cacheKey, entry);
        return entry;
      }
    } catch (err) {
      console.error('[useIngredientCalories] exception:', err);
    }

    cacheRef.current.set(cacheKey, null);
    return null;
  }, [userCountry]);

  const calculateIngredientCalories = useCallback(async (
    ingredients: IngredientWithCalories[]
  ): Promise<IngredientCaloriesResult[]> => {
    setIsLoading(true);
    
    try {
      const results: IngredientCaloriesResult[] = [];
      
      for (const ing of ingredients) {
        const grams = parseQuantityToGrams(ing.quantity, ing.unit);
        
        // Buscar via lookup-ingredient (mesma função do filtro)
        const dbMatch = await lookupIngredient(ing.item);
        
        if (dbMatch && dbMatch.calories_per_100g > 0) {
          const factor = grams / 100;
          results.push({
            item: ing.item,
            quantity: grams,
            calories: Math.round(dbMatch.calories_per_100g * factor),
            protein: Math.round(dbMatch.protein_per_100g * factor * 10) / 10,
            carbs: Math.round(dbMatch.carbs_per_100g * factor * 10) / 10,
            fat: Math.round(dbMatch.fat_per_100g * factor * 10) / 10,
            matched: true,
            matchedName: dbMatch.name,
            source: dbMatch.source,
          });
          continue;
        }
        
        // Fallback: dados da IA se disponíveis
        if (ing.calories && ing.calories > 0) {
          results.push({
            item: ing.item,
            quantity: grams,
            calories: ing.calories,
            protein: ing.protein || 0,
            carbs: ing.carbs || 0,
            fat: ing.fat || 0,
            matched: true,
            source: 'IA',
          });
          continue;
        }
        
        // Sem dados
        results.push({
          item: ing.item,
          quantity: grams,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          matched: false,
          source: 'not_found',
        });
      }
      
      return results;
    } finally {
      setIsLoading(false);
    }
  }, [lookupIngredient]);

  return {
    calculateIngredientCalories,
    isLoading,
    isLoaded: true,
    tableSize: 0,
  };
}
