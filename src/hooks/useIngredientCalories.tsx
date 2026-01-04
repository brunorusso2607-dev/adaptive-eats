import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCountry, DEFAULT_COUNTRY } from './useUserCountry';

interface IngredientWithCalories {
  item: string;
  quantity: string;
  unit?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface NutritionalFood {
  name: string;
  cal: number;
  prot: number;
  carb: number;
  fat: number;
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
function extractMainTerm(name: string): string[] {
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
  
  const terms = [normalized, cleaned];
  
  // First significant word
  const words = cleaned.split(' ').filter(w => w.length >= 3);
  if (words[0]) terms.push(words[0]);
  if (words[1]) terms.push(`${words[0]} ${words[1]}`);
  
  return [...new Set(terms)].filter(t => t.length >= 2);
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

// Lookup food in the nutritional table
function lookupFood(
  table: NutritionalFood[],
  foodName: string,
  grams: number
): { matched: boolean; matchedName?: string; calories: number; protein: number; carbs: number; fat: number } {
  if (!table || table.length === 0 || grams <= 0) {
    return { matched: false, calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  
  const searchTerms = extractMainTerm(foodName);
  
  // Create normalized index
  const normalizedTable = table.map(f => ({
    ...f,
    normalized: normalizeForLookup(f.name),
  }));
  
  // PHASE 1: Exact match
  for (const term of searchTerms) {
    const exactMatch = normalizedTable.find(f => f.normalized === term);
    if (exactMatch) {
      const factor = grams / 100;
      return {
        matched: true,
        matchedName: exactMatch.name,
        calories: Math.round(exactMatch.cal * factor),
        protein: Math.round(exactMatch.prot * factor * 10) / 10,
        carbs: Math.round(exactMatch.carb * factor * 10) / 10,
        fat: Math.round(exactMatch.fat * factor * 10) / 10,
      };
    }
  }
  
  // PHASE 2: Partial match (starts with or contains)
  for (const term of searchTerms) {
    if (term.length < 4) continue;
    
    const partialMatch = normalizedTable.find(f => 
      f.normalized.startsWith(term) || f.normalized.includes(` ${term}`)
    );
    
    if (partialMatch) {
      const factor = grams / 100;
      return {
        matched: true,
        matchedName: partialMatch.name,
        calories: Math.round(partialMatch.cal * factor),
        protein: Math.round(partialMatch.prot * factor * 10) / 10,
        carbs: Math.round(partialMatch.carb * factor * 10) / 10,
        fat: Math.round(partialMatch.fat * factor * 10) / 10,
      };
    }
  }
  
  // PHASE 3: Fuzzy match (any word matches)
  const mainWord = searchTerms[searchTerms.length - 1]; // Usually the cleaned single word
  if (mainWord && mainWord.length >= 4) {
    const fuzzyMatch = normalizedTable.find(f => 
      f.normalized.split(' ').some(word => word.startsWith(mainWord.slice(0, 4)))
    );
    
    if (fuzzyMatch) {
      const factor = grams / 100;
      return {
        matched: true,
        matchedName: fuzzyMatch.name,
        calories: Math.round(fuzzyMatch.cal * factor),
        protein: Math.round(fuzzyMatch.prot * factor * 10) / 10,
        carbs: Math.round(fuzzyMatch.carb * factor * 10) / 10,
        fat: Math.round(fuzzyMatch.fat * factor * 10) / 10,
      };
    }
  }
  
  return { matched: false, calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function useIngredientCalories() {
  const [nutritionalTable, setNutritionalTable] = useState<NutritionalFood[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { country } = useUserCountry();

  // Load nutritional table once
  const loadTable = useCallback(async () => {
    if (isLoaded || isLoading) return;
    
    setIsLoading(true);
    try {
      // Query foods table with verified sources, prioritizing country-specific
      const { data, error } = await supabase
        .from('foods')
        .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
        .eq('is_verified', true)
        .limit(500);
      
      if (error) throw error;
      
      if (data) {
        const table: NutritionalFood[] = data.map(f => ({
          name: f.name,
          cal: f.calories_per_100g || 0,
          prot: f.protein_per_100g || 0,
          carb: f.carbs_per_100g || 0,
          fat: f.fat_per_100g || 0,
        }));
        setNutritionalTable(table);
        setIsLoaded(true);
      }
    } catch (err) {
      console.error('Error loading nutritional table:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, isLoading]);

  // Load on mount
  useEffect(() => {
    loadTable();
  }, [loadTable]);

  // Calculate calories for a list of ingredients
  const calculateIngredientCalories = useCallback((
    ingredients: IngredientWithCalories[]
  ): IngredientCaloriesResult[] => {
    if (!isLoaded || nutritionalTable.length === 0) {
      return ingredients.map(ing => ({
        item: ing.item,
        quantity: parseQuantityToGrams(ing.quantity, ing.unit),
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        matched: false,
      }));
    }
    
    return ingredients.map(ing => {
      const grams = parseQuantityToGrams(ing.quantity, ing.unit);
      const result = lookupFood(nutritionalTable, ing.item, grams);
      
      return {
        item: ing.item,
        quantity: grams,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        matched: result.matched,
        matchedName: result.matchedName,
      };
    });
  }, [isLoaded, nutritionalTable]);

  return {
    calculateIngredientCalories,
    isLoading,
    isLoaded,
    tableSize: nutritionalTable.length,
  };
}
