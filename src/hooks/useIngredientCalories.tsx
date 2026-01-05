import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * CASCATA DE CÁLCULO DE CALORIAS (Frontend)
 * 
 * Nível 1: Cache em memória (já calculado)
 * Nível 2: Busca exata no DB (foods.name_normalized)
 * Nível 3: Sanity Check (validar limites por categoria)
 * Nível 4: Fallback para dados da IA (ing.calories)
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

interface IngredientCaloriesResult {
  item: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  matched: boolean;
  matchedName?: string;
  source: 'cache' | 'database' | 'sanity_fallback' | 'ai_data' | 'category_fallback';
}

// ============================================
// NORMALIZAÇÃO E PARSING
// ============================================

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

// ============================================
// SANITY CHECK (Limites por categoria)
// ============================================

const CALORIE_LIMITS_PER_100: Record<string, { max: number; fallback: number }> = {
  'cha': { max: 10, fallback: 2 },
  'infusao': { max: 10, fallback: 2 },
  'cafe': { max: 15, fallback: 2 },
  'agua': { max: 5, fallback: 0 },
  'leite_vegetal': { max: 60, fallback: 25 },
  'leite': { max: 70, fallback: 50 },
  'suco': { max: 60, fallback: 45 },
  'refrigerante': { max: 50, fallback: 42 },
  'refrigerante_zero': { max: 5, fallback: 0 },
  'fruta': { max: 120, fallback: 50 },
  'vegetal': { max: 80, fallback: 25 },
  'folhoso': { max: 30, fallback: 15 },
  'legume': { max: 100, fallback: 40 },
  'carne': { max: 350, fallback: 200 },
  'frango': { max: 250, fallback: 165 },
  'peixe': { max: 250, fallback: 120 },
  'ovo': { max: 180, fallback: 155 },
  'queijo': { max: 450, fallback: 350 },
  'arroz': { max: 180, fallback: 130 },
  'pao': { max: 320, fallback: 265 },
  'massa': { max: 180, fallback: 130 },
  'cereal': { max: 420, fallback: 350 },
  'oleaginosa': { max: 700, fallback: 600 },
  'oleo': { max: 900, fallback: 884 },
  'manteiga': { max: 800, fallback: 717 },
  'doce': { max: 450, fallback: 350 },
  'iogurte': { max: 150, fallback: 60 },
  'default': { max: 500, fallback: 150 },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cha': ['cha', 'tea', 'camomila', 'hortela', 'mate', 'infusao', 'hibisco'],
  'cafe': ['cafe', 'coffee', 'espresso', 'cappuccino'],
  'agua': ['agua', 'water'],
  'leite_vegetal': ['leite de coco', 'leite vegetal', 'leite de amendoa', 'leite de aveia', 'bebida vegetal'],
  'leite': ['leite', 'milk'],
  'suco': ['suco', 'juice'],
  'refrigerante_zero': ['zero', 'diet', 'light', 'sem acucar'],
  'refrigerante': ['refrigerante', 'soda', 'cola', 'guarana'],
  'fruta': ['banana', 'maca', 'laranja', 'morango', 'manga', 'abacaxi', 'melancia', 'mamao', 'uva', 'pera', 'kiwi'],
  'folhoso': ['alface', 'rucula', 'agriao', 'espinafre', 'couve'],
  'vegetal': ['tomate', 'pepino', 'cenoura', 'brocolis', 'abobrinha', 'legume', 'verdura'],
  'legume': ['batata', 'mandioca', 'inhame', 'abobora', 'beterraba'],
  'carne': ['carne', 'boi', 'porco', 'bife', 'picanha', 'alcatra', 'costela', 'patinho'],
  'frango': ['frango', 'peito de frango', 'coxa', 'sobrecoxa', 'ave', 'peru'],
  'peixe': ['peixe', 'salmao', 'tilapia', 'atum', 'sardinha', 'camarao'],
  'ovo': ['ovo', 'clara', 'gema', 'omelete'],
  'queijo': ['queijo', 'mussarela', 'parmesao', 'cottage', 'ricota'],
  'arroz': ['arroz'],
  'pao': ['pao', 'torrada', 'bisnaga'],
  'massa': ['massa', 'macarrao', 'espaguete', 'lasanha'],
  'cereal': ['cereal', 'aveia', 'granola'],
  'oleaginosa': ['castanha', 'amendoa', 'nozes', 'amendoim'],
  'oleo': ['oleo', 'azeite'],
  'manteiga': ['manteiga', 'margarina'],
  'doce': ['chocolate', 'bolo', 'brigadeiro', 'pudim', 'sobremesa'],
  'iogurte': ['iogurte', 'coalhada'],
};

function detectFoodCategory(foodName: string): string {
  const normalized = normalize(foodName);
  
  const categoryOrder = [
    'refrigerante_zero', 'leite_vegetal',
    'cha', 'cafe', 'agua', 'suco', 'refrigerante', 'leite',
    'folhoso', 'fruta', 'vegetal', 'legume',
    'frango', 'peixe', 'ovo', 'queijo', 'carne',
    'arroz', 'pao', 'massa', 'cereal',
    'oleaginosa', 'oleo', 'manteiga',
    'iogurte', 'doce',
  ];
  
  for (const category of categoryOrder) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords) {
      for (const keyword of keywords) {
        if (normalized.includes(normalize(keyword))) {
          return category;
        }
      }
    }
  }
  
  return 'default';
}

function applySanityCheck(
  foodName: string,
  calories: number,
  grams: number
): { calories: number; wasAdjusted: boolean } {
  if (grams <= 0 || calories <= 0) {
    return { calories: 0, wasAdjusted: false };
  }
  
  const caloriesPer100 = (calories / grams) * 100;
  const category = detectFoodCategory(foodName);
  const limits = CALORIE_LIMITS_PER_100[category] || CALORIE_LIMITS_PER_100['default'];
  
  if (caloriesPer100 <= limits.max) {
    return { calories, wasAdjusted: false };
  }
  
  // Valor excede limite - usar fallback
  const correctedCalories = Math.round((limits.fallback / 100) * grams);
  console.log(`[SANITY-CHECK] ${foodName}: ${Math.round(caloriesPer100)} kcal/100g excede ${limits.max} (${category}). Corrigido: ${correctedCalories} kcal`);
  
  return { calories: correctedCalories, wasAdjusted: true };
}

function getCategoryFallback(foodName: string, grams: number): number {
  const category = detectFoodCategory(foodName);
  const limits = CALORIE_LIMITS_PER_100[category] || CALORIE_LIMITS_PER_100['default'];
  return Math.round((limits.fallback / 100) * grams);
}

// ============================================
// CACHE STRUCTURES
// ============================================

interface DBFoodEntry {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

interface CacheEntry {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  name: string;
}

// ============================================
// MAIN HOOK
// ============================================

export function useIngredientCalories() {
  const [isLoading, setIsLoading] = useState(false);
  const cacheRef = useRef<Map<string, CacheEntry | null>>(new Map());
  const dbTableRef = useRef<DBFoodEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Carregar tabela nutricional do DB uma vez
  useEffect(() => {
    const loadTable = async () => {
      try {
        const { data, error } = await supabase
          .from('foods')
          .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g')
          .eq('is_verified', true)
          .eq('is_recipe', false)
          .order('search_count', { ascending: false, nullsFirst: false })
          .limit(500);

        if (!error && data) {
          dbTableRef.current = data;
          console.log(`[CALORIE-CASCADE] Tabela nutricional carregada: ${data.length} itens`);
        }
      } catch (err) {
        console.error('[CALORIE-CASCADE] Erro ao carregar tabela:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadTable();
  }, []);

  // Busca exata no DB (Nível 2)
  const searchInDB = useCallback((ingredientName: string): CacheEntry | null => {
    const normalizedSearch = normalize(ingredientName);
    const cacheKey = normalizedSearch;
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey) || null;
    }

    // Extrair palavra principal
    const stopWords = new Set([
      'grelhado', 'grelhada', 'cozido', 'cozida', 'frito', 'frita',
      'assado', 'assada', 'refogado', 'refogada', 'cru', 'crua',
      'picado', 'picada', 'ralado', 'ralada', 'integral', 'light',
      'de', 'do', 'da', 'dos', 'das', 'com', 'sem', 'e', 'a', 'o',
    ]);
    
    const words = normalizedSearch.split(' ').filter(w => w.length >= 3 && !stopWords.has(w));
    const mainKeyword = words[0] || '';
    
    if (!mainKeyword || mainKeyword.length < 3) {
      cacheRef.current.set(cacheKey, null);
      return null;
    }

    // Buscar na tabela em memória
    const table = dbTableRef.current;
    
    // Fase 1: Match exato na primeira palavra
    let match = table.find(f => {
      const normalizedName = normalize(f.name);
      const firstWord = normalizedName.split(' ')[0];
      return firstWord === mainKeyword;
    });

    // Fase 2: Match contém a palavra (priorizar nomes mais curtos)
    if (!match) {
      const candidates = table.filter(f => 
        normalize(f.name).includes(mainKeyword)
      );
      if (candidates.length > 0) {
        // Escolher o nome mais curto (mais puro)
        match = candidates.reduce((a, b) => 
          a.name.length <= b.name.length ? a : b
        );
      }
    }

    if (match && match.calories_per_100g > 0) {
      const entry: CacheEntry = {
        name: match.name,
        calories_per_100g: match.calories_per_100g,
        protein_per_100g: match.protein_per_100g || 0,
        carbs_per_100g: match.carbs_per_100g || 0,
        fat_per_100g: match.fat_per_100g || 0,
      };
      cacheRef.current.set(cacheKey, entry);
      return entry;
    }

    cacheRef.current.set(cacheKey, null);
    return null;
  }, []);

  // Cascata completa
  const calculateIngredientCalories = useCallback(async (
    ingredients: IngredientWithCalories[]
  ): Promise<IngredientCaloriesResult[]> => {
    setIsLoading(true);
    
    try {
      const results: IngredientCaloriesResult[] = [];
      
      for (const ing of ingredients) {
        const grams = parseQuantityToGrams(ing.quantity, ing.unit);
        
        // ============================================
        // NÍVEL 2: Busca no DB
        // ============================================
        const dbMatch = searchInDB(ing.item);
        
        if (dbMatch) {
          const factor = grams / 100;
          const rawCalories = Math.round(dbMatch.calories_per_100g * factor);
          
          // NÍVEL 3: Sanity Check
          const { calories, wasAdjusted } = applySanityCheck(ing.item, rawCalories, grams);
          
          results.push({
            item: ing.item,
            quantity: grams,
            calories,
            protein: Math.round(dbMatch.protein_per_100g * factor * 10) / 10,
            carbs: Math.round(dbMatch.carbs_per_100g * factor * 10) / 10,
            fat: Math.round(dbMatch.fat_per_100g * factor * 10) / 10,
            matched: true,
            matchedName: dbMatch.name,
            source: wasAdjusted ? 'sanity_fallback' : 'database',
          });
          continue;
        }
        
        // ============================================
        // NÍVEL 4: Fallback para dados da IA
        // ============================================
        if (ing.calories && ing.calories > 0) {
          // Aplicar sanity check nos dados da IA também
          const { calories, wasAdjusted } = applySanityCheck(ing.item, ing.calories, grams);
          
          results.push({
            item: ing.item,
            quantity: grams,
            calories,
            protein: ing.protein || 0,
            carbs: ing.carbs || 0,
            fat: ing.fat || 0,
            matched: true,
            source: wasAdjusted ? 'sanity_fallback' : 'ai_data',
          });
          continue;
        }
        
        // ============================================
        // ÚLTIMO FALLBACK: Estimativa por categoria
        // ============================================
        const fallbackCalories = getCategoryFallback(ing.item, grams);
        
        results.push({
          item: ing.item,
          quantity: grams,
          calories: fallbackCalories,
          protein: 0,
          carbs: 0,
          fat: 0,
          matched: false,
          source: 'category_fallback',
        });
      }
      
      return results;
    } finally {
      setIsLoading(false);
    }
  }, [searchInDB]);

  return {
    calculateIngredientCalories,
    isLoading,
    isLoaded,
    tableSize: dbTableRef.current.length,
  };
}
