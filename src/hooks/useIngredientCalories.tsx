import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface IngredientWithCalories {
  item: string;
  quantity: string;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface IngredientCaloriesResult {
  item: string;
  quantity: number; // in grams
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matched: boolean;
  matchedName?: string;
}

// Normalize text for comparison
function normalizeForLookup(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract main food term from ingredient name
function extractMainTerm(name: string): string {
  const normalized = normalizeForLookup(name);
  
  // Remove common cooking modifiers
  const modifiers = [
    'grelhado', 'grelhada', 'cozido', 'cozida', 'frito', 'frita',
    'assado', 'assada', 'refogado', 'refogada', 'cru', 'crua',
    'picado', 'picada', 'ralado', 'ralada', 'integral', 'light',
    'temperado', 'temperada', 'natural', 'no vapor', 'ao vapor',
    'desfiado', 'desfiada', 'pure', 'molho', 'salteado', 'salteada',
    'medio', 'media', 'pequeno', 'pequena', 'grande', 'fatiado', 'fatiada',
  ];
  
  let cleaned = normalized;
  for (const mod of modifiers) {
    cleaned = cleaned.replace(new RegExp(`\\b${mod}\\b`, 'g'), '').trim();
  }
  
  // Remove prepositions
  cleaned = cleaned
    .replace(/\b(de|do|da|dos|das|com|sem|e|a|o|um|uma|ao|em|no|na)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned || normalized;
}

// Parse quantity string to grams
function parseQuantityToGrams(quantity: string, unit?: string): number {
  const numValue = parseFloat(quantity?.toString().replace(",", ".").replace(/[^0-9.]/g, '')) || 0;
  
  const unitLower = (unit || quantity || "").toLowerCase().trim();
  
  // Common unit conversions to grams
  const conversions: Record<string, number> = {
    "g": 1,
    "gramas": 1,
    "grama": 1,
    "kg": 1000,
    "ml": 1,
    "l": 1000,
    "litro": 1000,
    "xícara": 240,
    "xicara": 240,
    "colher de sopa": 15,
    "cs": 15,
    "colher de chá": 5,
    "cc": 5,
    "unidade": 100,
    "un": 100,
    "fatia": 30,
    "dente": 5,
    "copo": 200,
  };

  for (const [key, multiplier] of Object.entries(conversions)) {
    if (unitLower.includes(key)) {
      return numValue * multiplier;
    }
  }

  // If quantity ends with 'g', it's grams
  if (unitLower.endsWith('g') && !unitLower.endsWith('kg')) {
    return numValue;
  }

  // Default: assume the number is grams
  return numValue || 100;
}

// Cache para evitar buscas repetidas
interface CacheEntry {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  name: string;
}

export function useIngredientCalories() {
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CacheEntry | null>>(new Map());

  // Buscar alimento no banco de dados
  const searchFoodInDatabase = useCallback(async (searchTerm: string): Promise<CacheEntry | null> => {
    const cacheKey = normalizeForLookup(searchTerm);
    
    // Verificar cache
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey) || null;
    }

    try {
      const mainTerm = extractMainTerm(searchTerm);
      
      // FASE 1: Busca exata no name_normalized
      let { data } = await supabase
        .from('foods')
        .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_verified')
        .eq('is_verified', true)
        .ilike('name_normalized', mainTerm)
        .limit(1);

      if (data && data.length > 0) {
        const entry: CacheEntry = {
          name: data[0].name,
          calories_per_100g: data[0].calories_per_100g || 0,
          protein_per_100g: data[0].protein_per_100g || 0,
          carbs_per_100g: data[0].carbs_per_100g || 0,
          fat_per_100g: data[0].fat_per_100g || 0,
        };
        cacheRef.current.set(cacheKey, entry);
        return entry;
      }

      // FASE 2: Busca por prefixo (começa com)
      const prefixResult = await supabase
        .from('foods')
        .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_verified')
        .eq('is_verified', true)
        .ilike('name_normalized', `${mainTerm}%`)
        .order('calories_per_100g', { ascending: false }) // Prioriza alimentos mais calóricos (evita bebidas)
        .limit(1);

      if (prefixResult.data && prefixResult.data.length > 0) {
        const entry: CacheEntry = {
          name: prefixResult.data[0].name,
          calories_per_100g: prefixResult.data[0].calories_per_100g || 0,
          protein_per_100g: prefixResult.data[0].protein_per_100g || 0,
          carbs_per_100g: prefixResult.data[0].carbs_per_100g || 0,
          fat_per_100g: prefixResult.data[0].fat_per_100g || 0,
        };
        cacheRef.current.set(cacheKey, entry);
        return entry;
      }

      // FASE 3: Busca contém (para termos mais curtos)
      if (mainTerm.length >= 4) {
        const containsResult = await supabase
          .from('foods')
          .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_verified')
          .eq('is_verified', true)
          .ilike('name_normalized', `%${mainTerm}%`)
          .order('calories_per_100g', { ascending: false })
          .limit(1);

        if (containsResult.data && containsResult.data.length > 0) {
          const entry: CacheEntry = {
            name: containsResult.data[0].name,
            calories_per_100g: containsResult.data[0].calories_per_100g || 0,
            protein_per_100g: containsResult.data[0].protein_per_100g || 0,
            carbs_per_100g: containsResult.data[0].carbs_per_100g || 0,
            fat_per_100g: containsResult.data[0].fat_per_100g || 0,
          };
          cacheRef.current.set(cacheKey, entry);
          return entry;
        }
      }

      // FASE 4: Tenta palavra-chave individual
      const words = mainTerm.split(' ').filter(w => w.length >= 4);
      for (const word of words) {
        const wordResult = await supabase
          .from('foods')
          .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_verified')
          .eq('is_verified', true)
          .ilike('name_normalized', `%${word}%`)
          .order('calories_per_100g', { ascending: false })
          .limit(1);

        if (wordResult.data && wordResult.data.length > 0) {
          const entry: CacheEntry = {
            name: wordResult.data[0].name,
            calories_per_100g: wordResult.data[0].calories_per_100g || 0,
            protein_per_100g: wordResult.data[0].protein_per_100g || 0,
            carbs_per_100g: wordResult.data[0].carbs_per_100g || 0,
            fat_per_100g: wordResult.data[0].fat_per_100g || 0,
          };
          cacheRef.current.set(cacheKey, entry);
          return entry;
        }
      }

      // Não encontrado
      cacheRef.current.set(cacheKey, null);
      return null;

    } catch (err) {
      console.error('Error searching food:', err);
      return null;
    }
  }, []);

  // Calculate calories for a list of ingredients
  const calculateIngredientCalories = useCallback(async (
    ingredients: IngredientWithCalories[]
  ): Promise<IngredientCaloriesResult[]> => {
    setIsLoading(true);
    
    try {
      const results = await Promise.all(
        ingredients.map(async (ing) => {
          const grams = parseQuantityToGrams(ing.quantity, ing.unit);
          const food = await searchFoodInDatabase(ing.item);
          
          if (food) {
            const factor = grams / 100;
            return {
              item: ing.item,
              quantity: grams,
              calories: Math.round(food.calories_per_100g * factor),
              protein: Math.round(food.protein_per_100g * factor * 10) / 10,
              carbs: Math.round(food.carbs_per_100g * factor * 10) / 10,
              fat: Math.round(food.fat_per_100g * factor * 10) / 10,
              matched: true,
              matchedName: food.name,
            };
          }
          
          return {
            item: ing.item,
            quantity: grams,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            matched: false,
          };
        })
      );
      
      return results;
    } finally {
      setIsLoading(false);
    }
  }, [searchFoodInDatabase]);

  return {
    calculateIngredientCalories,
    isLoading,
    isLoaded: true, // Sempre pronto para buscar
    tableSize: 10000, // Aproximado
  };
}
