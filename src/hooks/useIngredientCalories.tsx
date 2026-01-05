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
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matched: boolean;
  matchedName?: string;
}

// Normalize text removing accents and special chars
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract MAIN food keyword (first substantive word)
function extractMainKeyword(name: string): string {
  const normalized = normalize(name);
  
  // Words to remove (cooking methods, sizes, prepositions)
  const stopWords = new Set([
    'grelhado', 'grelhada', 'cozido', 'cozida', 'frito', 'frita',
    'assado', 'assada', 'refogado', 'refogada', 'cru', 'crua',
    'picado', 'picada', 'ralado', 'ralada', 'integral', 'light',
    'temperado', 'temperada', 'natural', 'vapor', 'desfiado', 'desfiada',
    'medio', 'media', 'pequeno', 'pequena', 'grande', 'fatiado', 'fatiada',
    'de', 'do', 'da', 'dos', 'das', 'com', 'sem', 'e', 'a', 'o', 'um', 'uma',
    'ao', 'em', 'no', 'na', 'para', 'por', 'salteado', 'salteada'
  ]);
  
  const words = normalized.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));
  
  // Return first meaningful word (usually the main ingredient)
  return words[0] || normalized.split(' ')[0] || '';
}

// Parse quantity string to grams
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

// Cache for search results
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

  // Search food in database with FLEXIBLE matching
  const searchFood = useCallback(async (ingredientName: string): Promise<CacheEntry | null> => {
    const cacheKey = normalize(ingredientName);
    
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey) || null;
    }

    try {
      const mainKeyword = extractMainKeyword(ingredientName);
      if (!mainKeyword || mainKeyword.length < 3) {
        cacheRef.current.set(cacheKey, null);
        return null;
      }

      // SINGLE QUERY: Search for keyword ANYWHERE in name_normalized
      // Order by name length (shorter = more pure ingredient)
      const { data, error } = await supabase
        .from('foods')
        .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
        .eq('is_verified', true)
        .ilike('name_normalized', `%${mainKeyword}%`)
        .order('name', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        cacheRef.current.set(cacheKey, null);
        return null;
      }

      if (!data || data.length === 0) {
        cacheRef.current.set(cacheKey, null);
        return null;
      }

      // PRIORITY: Find the PUREST match (shortest name that starts with keyword or equals it)
      // This ensures "Brócolis" matches "Brócolis" not "Arroz de Brócolis"
      const normalizedKeyword = mainKeyword.toLowerCase();
      
      // 1. First try exact match on first word
      let bestMatch = data.find(f => {
        const firstWord = normalize(f.name).split(' ')[0];
        return firstWord === normalizedKeyword || firstWord.startsWith(normalizedKeyword);
      });

      // 2. If no exact first-word match, pick the one with shortest name
      if (!bestMatch) {
        bestMatch = data.reduce((a, b) => 
          (a.name.length <= b.name.length) ? a : b
        );
      }

      const entry: CacheEntry = {
        name: bestMatch.name,
        calories_per_100g: bestMatch.calories_per_100g || 0,
        protein_per_100g: bestMatch.protein_per_100g || 0,
        carbs_per_100g: bestMatch.carbs_per_100g || 0,
        fat_per_100g: bestMatch.fat_per_100g || 0,
      };

      cacheRef.current.set(cacheKey, entry);
      return entry;

    } catch (err) {
      console.error('Search error:', err);
      cacheRef.current.set(cacheKey, null);
      return null;
    }
  }, []);

  // Calculate calories for ingredients
  const calculateIngredientCalories = useCallback(async (
    ingredients: IngredientWithCalories[]
  ): Promise<IngredientCaloriesResult[]> => {
    setIsLoading(true);
    
    try {
      const results = await Promise.all(
        ingredients.map(async (ing) => {
          const grams = parseQuantityToGrams(ing.quantity, ing.unit);
          const food = await searchFood(ing.item);
          
          if (food && food.calories_per_100g > 0) {
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
  }, [searchFood]);

  return {
    calculateIngredientCalories,
    isLoading,
    isLoaded: true,
    tableSize: 10000,
  };
}
