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

// ============================================
// CATEGORY DETECTION - Beverage vs Solid Food
// ============================================
const BEVERAGE_KEYWORDS = [
  'cha', 'tea', 'cafe', 'coffee', 'suco', 'juice', 'agua', 'water',
  'leite', 'milk', 'vitamina', 'smoothie', 'infusao', 'refrigerante',
  'bebida', 'drink', 'cappuccino', 'latte', 'espresso'
];

const LOW_CALORIE_BEVERAGES = [
  'cha', 'tea', 'cafe', 'coffee', 'agua', 'water', 'infusao',
  'camomila', 'hortela', 'erva-doce', 'hibisco', 'verde', 'preto', 'mate'
];

const SOLID_FOOD_KEYWORDS = [
  'batata', 'arroz', 'feijao', 'carne', 'frango', 'peixe', 'ovo', 'pao',
  'bolo', 'queijo', 'macarrao', 'biscoito', 'torta', 'pizza', 'hamburguer'
];

function isBeverageSearch(text: string): boolean {
  const normalized = normalizeForLookup(text);
  return BEVERAGE_KEYWORDS.some(kw => normalized.includes(kw));
}

function isLowCalorieBeverage(text: string): boolean {
  const normalized = normalizeForLookup(text);
  return LOW_CALORIE_BEVERAGES.some(kw => normalized.includes(kw));
}

function isSolidFoodMatch(text: string): boolean {
  const normalized = normalizeForLookup(text);
  return SOLID_FOOD_KEYWORDS.some(kw => normalized.includes(kw));
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

// ============================================
// SANITY CHECK: Low calorie beverages should have max ~10 kcal/100ml
// ============================================
const LOW_CAL_BEVERAGE_MAX_PER_100 = 10; // Max 10 kcal per 100ml for plain teas/coffee/water

function applySanityCheckForBeverage(
  foodName: string,
  calories: number,
  grams: number
): number {
  // If this is a low-calorie beverage search, enforce limits
  if (isLowCalorieBeverage(foodName)) {
    const caloriesPer100 = (calories / grams) * 100;
    if (caloriesPer100 > LOW_CAL_BEVERAGE_MAX_PER_100) {
      // Override with correct value for plain tea/coffee/water: ~1-2 kcal/100ml
      const correctedCalories = Math.round((2 / 100) * grams);
      console.log(`[SANITY-CHECK] Beverage "${foodName}" had ${caloriesPer100} kcal/100ml, corrected to 2 kcal/100ml`);
      return correctedCalories;
    }
  }
  return calories;
}

// Lookup food in the nutritional table with CATEGORY PROTECTION
function lookupFood(
  table: NutritionalFood[],
  foodName: string,
  grams: number
): { matched: boolean; matchedName?: string; calories: number; protein: number; carbs: number; fat: number } {
  if (!table || table.length === 0 || grams <= 0) {
    return { matched: false, calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  
  const searchTerms = extractMainTerm(foodName);
  const isBeverage = isBeverageSearch(foodName);
  const isLowCalBeverage = isLowCalorieBeverage(foodName);
  
  // Create normalized index
  const normalizedTable = table.map(f => ({
    ...f,
    normalized: normalizeForLookup(f.name),
  }));
  
  // Helper to validate category compatibility
  const isCategoryCompatible = (matchedFood: { name: string; normalized: string; cal: number }): boolean => {
    // If searching for beverage, reject solid food matches
    if (isBeverage && isSolidFoodMatch(matchedFood.normalized)) {
      return false;
    }
    // If searching for low-calorie beverage, reject high-calorie matches
    if (isLowCalBeverage && matchedFood.cal > LOW_CAL_BEVERAGE_MAX_PER_100) {
      // But allow if the match is also a beverage (could be sweetened version)
      if (!isBeverageSearch(matchedFood.normalized)) {
        return false;
      }
    }
    return true;
  };
  
  // Helper to build result with sanity check
  const buildResult = (food: { name: string; cal: number; prot: number; carb: number; fat: number }) => {
    const factor = grams / 100;
    let calculatedCalories = Math.round(food.cal * factor);
    
    // Apply sanity check for low-calorie beverages
    calculatedCalories = applySanityCheckForBeverage(foodName, calculatedCalories, grams);
    
    return {
      matched: true,
      matchedName: food.name,
      calories: calculatedCalories,
      protein: Math.round(food.prot * factor * 10) / 10,
      carbs: Math.round(food.carb * factor * 10) / 10,
      fat: Math.round(food.fat * factor * 10) / 10,
    };
  };
  
  // PHASE 1: Exact match (with category validation) - ÚNICA FASE DE MATCH
  // Match parcial foi REMOVIDO pois causava falsos positivos (chá → carne)
  for (const term of searchTerms) {
    const exactMatch = normalizedTable.find(f => 
      f.normalized === term && isCategoryCompatible(f)
    );
    if (exactMatch) {
      return buildResult(exactMatch);
    }
  }
  
  // PHASE 2 e 3: REMOVIDAS - Match parcial/fuzzy causava falsos positivos
  // O fallback para bebidas de baixa caloria abaixo é mais seguro
  
  // FALLBACK: For low-calorie beverages, return estimated value even without match
  if (isLowCalBeverage) {
    const estimatedCalories = Math.round((2 / 100) * grams); // 2 kcal per 100ml
    console.log(`[FALLBACK] Low-cal beverage "${foodName}" using fallback: ${estimatedCalories} kcal`);
    return {
      matched: true, // Treat as matched with fallback
      matchedName: `${foodName} (estimado)`,
      calories: estimatedCalories,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
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
