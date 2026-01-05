import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserCountry, DEFAULT_COUNTRY } from './useUserCountry';

/**
 * CASCATA CENTRALIZADA DE CÁLCULO DE CALORIAS
 * 
 * Este hook usa a MESMA lógica do lookup-ingredient para garantir
 * consistência de fonte (TACO, USDA, Local, AI) em todo o sistema.
 * 
 * Níveis:
 * 1. Cache em memória
 * 2. Busca no DB via lookup-ingredient (fonte centralizada)
 * 3. Sanity Check (validar limites por categoria)
 * 4. Fallback para dados da IA (ing.calories)
 * 5. Fallback por categoria
 */

// ===== INTERFACES =====
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
  source: 'cache' | 'TACO' | 'TBCA' | 'usda' | 'ai-generated' | 'curated' | 'manual' | 'ai_data' | 'category_fallback';
}

// ===== NORMALIZAÇÃO =====
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

// ===== SANITY CHECK (Limites por categoria) =====
const CALORIE_LIMITS_PER_100: Record<string, { max: number; fallback: number }> = {
  'cha': { max: 10, fallback: 2 },
  'cafe': { max: 15, fallback: 2 },
  'agua': { max: 5, fallback: 0 },
  'leite': { max: 70, fallback: 50 },
  'suco': { max: 60, fallback: 45 },
  'fruta': { max: 120, fallback: 50 },
  'vegetal': { max: 80, fallback: 25 },
  'folhoso': { max: 30, fallback: 15 },
  'carne': { max: 350, fallback: 200 },
  'frango': { max: 250, fallback: 165 },
  'peixe': { max: 250, fallback: 120 },
  'ovo': { max: 180, fallback: 155 },
  'queijo': { max: 450, fallback: 350 },
  'arroz': { max: 180, fallback: 130 },
  'pao': { max: 320, fallback: 265 },
  'massa': { max: 180, fallback: 130 },
  'oleaginosa': { max: 700, fallback: 600 },
  'oleo': { max: 900, fallback: 884 },
  'doce': { max: 450, fallback: 350 },
  'iogurte': { max: 150, fallback: 60 },
  'default': { max: 500, fallback: 150 },
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'cha': ['cha', 'tea', 'camomila', 'hortela', 'mate', 'infusao', 'hibisco'],
  'cafe': ['cafe', 'coffee', 'espresso'],
  'agua': ['agua', 'water'],
  'leite': ['leite', 'milk'],
  'suco': ['suco', 'juice'],
  'fruta': ['banana', 'maca', 'laranja', 'morango', 'manga', 'abacaxi', 'melancia', 'mamao', 'uva'],
  'folhoso': ['alface', 'rucula', 'agriao', 'espinafre', 'couve'],
  'vegetal': ['tomate', 'pepino', 'cenoura', 'brocolis', 'abobrinha', 'legume'],
  'carne': ['carne', 'boi', 'porco', 'bife', 'picanha', 'alcatra', 'patinho'],
  'frango': ['frango', 'peito de frango', 'coxa', 'ave'],
  'peixe': ['peixe', 'salmao', 'tilapia', 'atum', 'camarao'],
  'ovo': ['ovo', 'clara', 'gema', 'omelete'],
  'queijo': ['queijo', 'mussarela', 'parmesao', 'ricota'],
  'arroz': ['arroz'],
  'pao': ['pao', 'torrada'],
  'massa': ['massa', 'macarrao', 'espaguete'],
  'oleaginosa': ['castanha', 'amendoa', 'nozes', 'amendoim'],
  'oleo': ['oleo', 'azeite'],
  'doce': ['chocolate', 'bolo', 'brigadeiro', 'pudim'],
  'iogurte': ['iogurte', 'coalhada'],
};

function detectFoodCategory(foodName: string): string {
  const normalized = normalize(foodName);
  
  const categoryOrder = [
    'cha', 'cafe', 'agua', 'suco', 'leite',
    'folhoso', 'fruta', 'vegetal',
    'frango', 'peixe', 'ovo', 'queijo', 'carne',
    'arroz', 'pao', 'massa',
    'oleaginosa', 'oleo',
    'iogurte', 'doce',
  ];
  
  for (const category of categoryOrder) {
    const keywords = CATEGORY_KEYWORDS[category];
    if (keywords?.some(kw => normalized.includes(normalize(kw)))) {
      return category;
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
  
  const correctedCalories = Math.round((limits.fallback / 100) * grams);
  console.log(`[SANITY-CHECK] ${foodName}: ${Math.round(caloriesPer100)} kcal/100g excede ${limits.max} (${category}). Corrigido: ${correctedCalories} kcal`);
  
  return { calories: correctedCalories, wasAdjusted: true };
}

function getCategoryFallback(foodName: string, grams: number): number {
  const category = detectFoodCategory(foodName);
  const limits = CALORIE_LIMITS_PER_100[category] || CALORIE_LIMITS_PER_100['default'];
  return Math.round((limits.fallback / 100) * grams);
}

// ===== CACHE STRUCTURE =====
interface CacheEntry {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  source: string;
}

// ===== MAIN HOOK =====
export function useIngredientCalories() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tableSize, setTableSize] = useState(0);
  
  const cacheRef = useRef<Map<string, CacheEntry | null>>(new Map());
  const dbTableRef = useRef<CacheEntry[]>([]);
  
  const { country: userCountry } = useUserCountry();

  // Carregar tabela nutricional do DB uma vez (como lookup-ingredient faz)
  useEffect(() => {
    const loadTable = async () => {
      try {
        // Prioridade por país (igual lookup-ingredient)
        const countryPriority: Record<string, string[]> = {
          'BR': ['TBCA', 'taco', 'curated'],
          'US': ['usda', 'curated'],
          'MX': ['BAM', 'curated'],
        };
        
        const preferredSources = countryPriority[userCountry || 'BR'] || countryPriority['BR'];
        
        // Buscar alimentos verificados com prioridade por fonte
        const { data, error } = await supabase
          .from('foods')
          .select('name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, source')
          .eq('is_verified', true)
          .eq('is_recipe', false)
          .in('source', [...preferredSources, 'usda', 'ai-generated', 'manual'])
          .order('search_count', { ascending: false, nullsFirst: false })
          .limit(800);

        if (!error && data) {
          dbTableRef.current = data.map(f => ({
            name: f.name,
            calories_per_100g: f.calories_per_100g || 0,
            protein_per_100g: f.protein_per_100g || 0,
            carbs_per_100g: f.carbs_per_100g || 0,
            fat_per_100g: f.fat_per_100g || 0,
            source: f.source || 'local',
          }));
          setTableSize(data.length);
          console.log(`[CALORIE-CASCADE] Tabela nutricional carregada: ${data.length} itens`);
        }
      } catch (err) {
        console.error('[CALORIE-CASCADE] Erro ao carregar tabela:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    
    loadTable();
  }, [userCountry]);

  // Busca no DB local (mesmo algoritmo do lookup-ingredient)
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

    const table = dbTableRef.current;
    
    // Fase 1: Match exato (começa com a palavra)
    let match = table.find(f => {
      const normalizedName = normalize(f.name);
      return normalizedName.startsWith(mainKeyword);
    });

    // Fase 2: Match contém (priorizar nomes mais curtos = mais puros)
    if (!match) {
      const candidates = table.filter(f => 
        normalize(f.name).includes(mainKeyword)
      );
      if (candidates.length > 0) {
        match = candidates.reduce((a, b) => 
          a.name.length <= b.name.length ? a : b
        );
      }
    }

    if (match && match.calories_per_100g > 0) {
      cacheRef.current.set(cacheKey, match);
      return match;
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
        // NÍVEL 2: Busca no DB (fonte centralizada)
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
            source: wasAdjusted ? 'category_fallback' : (dbMatch.source as IngredientCaloriesResult['source']) || 'TACO',
          });
          continue;
        }
        
        // ============================================
        // NÍVEL 4: Fallback para dados da IA
        // ============================================
        if (ing.calories && ing.calories > 0) {
          const { calories, wasAdjusted } = applySanityCheck(ing.item, ing.calories, grams);
          
          results.push({
            item: ing.item,
            quantity: grams,
            calories,
            protein: ing.protein || 0,
            carbs: ing.carbs || 0,
            fat: ing.fat || 0,
            matched: true,
            source: wasAdjusted ? 'category_fallback' : 'ai_data',
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
    tableSize,
  };
}
