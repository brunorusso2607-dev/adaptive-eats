import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCountry, DEFAULT_COUNTRY } from './useUserCountry';

/**
 * HOOK CENTRALIZADO DE CÁLCULO DE CALORIAS
 * 
 * Usa DIRETAMENTE a edge function lookup-ingredient (mesma do filtro de alimentos)
 * para garantir consistência de fonte e valores em todo o sistema.
 * 
 * Implementa extração de ingrediente principal para pratos compostos.
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

/**
 * Extrai o ingrediente principal de um nome de prato composto
 * Ex: "Filé de frango grelhado ao limão" -> ["file de frango", "frango"]
 * Ex: "Arroz com feijão" -> ["arroz"]
 * Ex: "Salada de folhas verdes com tomate" -> ["salada", "folhas verdes"]
 */
function extractMainIngredients(dishName: string): string[] {
  const normalized = dishName.toLowerCase().trim();
  const candidates: string[] = [];
  
  // Mapeamento de ingredientes principais conhecidos
  const knownIngredients: Record<string, string[]> = {
    'frango': ['frango', 'peito de frango'],
    'file de frango': ['peito de frango', 'frango'],
    'filé de frango': ['peito de frango', 'frango'],
    'peito de frango': ['peito de frango'],
    'carne': ['carne bovina', 'patinho'],
    'boi': ['carne bovina'],
    'bovina': ['carne bovina'],
    'peixe': ['peixe', 'tilapia'],
    'salmao': ['salmao'],
    'salmão': ['salmao'],
    'tilapia': ['tilapia'],
    'ovo': ['ovo', 'ovo de galinha'],
    'ovos': ['ovo', 'ovo de galinha'],
    'arroz': ['arroz', 'arroz branco'],
    'feijao': ['feijao', 'feijao carioca'],
    'feijão': ['feijao', 'feijao carioca'],
    'batata': ['batata', 'batata inglesa'],
    'salada': ['alface', 'tomate'],
    'folhas': ['alface'],
    'abacaxi': ['abacaxi'],
    'banana': ['banana'],
    'maca': ['maca', 'maça'],
    'maçã': ['maca'],
    'laranja': ['laranja'],
    'agua': ['agua'],
    'água': ['agua'],
    'suco': ['suco'],
    'leite': ['leite'],
    'queijo': ['queijo'],
    'pao': ['pao', 'pao frances'],
    'pão': ['pao', 'pao frances'],
    'macarrao': ['macarrao', 'espaguete'],
    'macarrão': ['macarrao', 'espaguete'],
  };
  
  // Primeiro: verificar se contém ingredientes conhecidos
  for (const [key, values] of Object.entries(knownIngredients)) {
    if (normalized.includes(key)) {
      candidates.push(...values);
    }
  }
  
  // Segundo: extrair primeira palavra significativa (ignorando artigos/preposições)
  const stopWords = ['de', 'da', 'do', 'com', 'ao', 'a', 'o', 'e', 'em', 'no', 'na', 'um', 'uma', '1', '2', '3', '4', '5'];
  const words = normalized.split(/\s+/).filter(w => !stopWords.includes(w) && w.length > 2);
  
  if (words.length > 0) {
    // Pegar as 2 primeiras palavras significativas como candidatas
    candidates.push(words[0]);
    if (words.length > 1 && words[1].length > 3) {
      candidates.push(`${words[0]} ${words[1]}`);
    }
  }
  
  // Remover duplicatas mantendo ordem
  return [...new Set(candidates)];
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
        body: { query: ingredientName.trim(), limit: 5, country }
      });

      if (error) {
        console.error('[useIngredientCalories] lookup error:', error);
        cacheRef.current.set(cacheKey, null);
        return null;
      }

      // Filtrar apenas resultados de fontes confiáveis (não ai-generated)
      const verifiedResults = (data?.results || []).filter(
        (r: any) => r.source && r.source !== 'ai-generated' && r.calories_per_100g > 0
      );

      if (verifiedResults.length > 0) {
        const food = verifiedResults[0];
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
        
        // PASSO 1: Tentar busca direta com nome completo
        let dbMatch = await lookupIngredient(ing.item);
        
        // PASSO 2: Se não encontrou, extrair ingrediente principal e tentar novamente
        if (!dbMatch || dbMatch.calories_per_100g <= 0) {
          const mainIngredients = extractMainIngredients(ing.item);
          console.log(`[useIngredientCalories] Extracting main from "${ing.item}":`, mainIngredients);
          
          for (const candidate of mainIngredients) {
            const candidateMatch = await lookupIngredient(candidate);
            if (candidateMatch && candidateMatch.calories_per_100g > 0) {
              console.log(`[useIngredientCalories] Found match via "${candidate}":`, candidateMatch.name);
              dbMatch = candidateMatch;
              break;
            }
          }
        }
        
        // PASSO 3: Se encontrou match verificado, usar
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
        
        // PASSO 4: NÃO usar ing.calories da IA - esses valores são TOTAIS da refeição, não individuais
        // Se não encontrou no banco, melhor não mostrar do que mostrar valor incorreto
        
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
