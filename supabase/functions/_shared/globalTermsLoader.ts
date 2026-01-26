// ============================================
// GLOBAL TERMS LOADER - Carrega termos dinamicamente do banco
// Substitui arrays hardcoded de calculateRealMacros.ts
// ============================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Cache para evitar queries repetidas
let processingTermsCache: Map<string, string[]> | null = null;
let categoryKeywordsCache: Map<string, Map<string, number>> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hora

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

/**
 * Carrega termos de processamento do banco (com cache)
 */
export async function loadProcessingTerms(language: string): Promise<string[]> {
  const now = Date.now();
  
  // Verificar cache
  if (processingTermsCache && (now - cacheTimestamp) < CACHE_TTL) {
    const cached = processingTermsCache.get(language);
    if (cached) return cached;
  }
  
  // Carregar do banco
  const { data, error } = await supabase
    .from('food_processing_terms')
    .select('term')
    .eq('language', language);
  
  if (error) {
    console.error(`[TERMS] Error loading processing terms for ${language}:`, error);
    return [];
  }
  
  const terms = data?.map(d => d.term) || [];
  
  // Atualizar cache
  if (!processingTermsCache) processingTermsCache = new Map();
  processingTermsCache.set(language, terms);
  cacheTimestamp = now;
  
  console.log(`[TERMS] Loaded ${terms.length} processing terms for ${language}`);
  return terms;
}

/**
 * Carrega palavras-chave de categoria do banco (com cache)
 */
export async function loadCategoryKeywords(language: string): Promise<Map<string, number>> {
  const now = Date.now();
  
  // Verificar cache
  if (categoryKeywordsCache && (now - cacheTimestamp) < CACHE_TTL) {
    const cached = categoryKeywordsCache.get(language);
    if (cached) return cached;
  }
  
  // Carregar do banco
  const { data, error } = await supabase
    .from('food_category_keywords')
    .select('keyword, category, weight')
    .eq('language', language);
  
  if (error) {
    console.error(`[TERMS] Error loading category keywords for ${language}:`, error);
    return new Map();
  }
  
  const keywords = new Map<string, number>();
  data?.forEach(d => {
    keywords.set(d.keyword, d.weight || 1);
  });
  
  // Atualizar cache
  if (!categoryKeywordsCache) categoryKeywordsCache = new Map();
  categoryKeywordsCache.set(language, keywords);
  cacheTimestamp = now;
  
  console.log(`[TERMS] Loaded ${keywords.size} category keywords for ${language}`);
  return keywords;
}

/**
 * Carrega configuração de país do banco (com cache)
 */
export async function loadCountryConfig(countryCode: string): Promise<any> {
  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .eq('code', countryCode)
    .eq('is_active', true)
    .single();
  
  if (error) {
    console.error(`[TERMS] Error loading country config for ${countryCode}:`, error);
    return null;
  }
  
  return data;
}

/**
 * Limpa cache forçadamente
 */
export function clearTermsCache(): void {
  processingTermsCache = null;
  categoryKeywordsCache = null;
  cacheTimestamp = 0;
  console.log('[TERMS] Cache cleared');
}

/**
 * Detecta categoria usando palavras-chave do banco
 */
export async function detectCategoryFromKeywords(foodName: string, language: string): string {
  const keywords = await loadCategoryKeywords(language);
  const normalized = foodName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  let bestCategory = '';
  let bestScore = 0;
  
  // Verificar cada palavra-chave
  for (const [keyword, weight] of keywords.entries()) {
    if (normalized.includes(keyword.toLowerCase())) {
      const score = weight;
      if (score > bestScore) {
        bestScore = score;
        bestCategory = keyword; // Retornar o keyword como categoria por enquanto
      }
    }
  }
  
  return bestCategory;
}

/**
 * Remove termos de processamento usando dados do banco
 */
export async function removeProcessingTerms(foodName: string, language: string): string {
  const terms = await loadProcessingTerms(language);
  let cleaned = foodName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Remover cada termo de processamento
  for (const term of terms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '').trim();
  }
  
  // Remover artigos e preposições (mantidos hardcoded por enquanto)
  cleaned = cleaned
    .replace(/\b(de|do|da|dos|das|com|sem|e|a|o|um|uma|the|with|without|and)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
}

/**
 * Verifica se é termo de bebida usando dados do banco
 */
export async function isBeverageTermFromDB(foodName: string, language: string): boolean {
  const keywords = await loadCategoryKeywords(language);
  const normalized = foodName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Palavras-chave de bebidas (hardcoded temporariamente)
  const beverageKeywords = ['cha', 'cafe', 'suco', 'agua', 'leite', 'vitamina', 'smoothie', 'infusao', 'refrigerante', 'tea', 'coffee', 'juice', 'water', 'milk'];
  
  return beverageKeywords.some(keyword => normalized.includes(keyword));
}

// Fallback para termos hardcoded (migração gradual)
export const FALLBACK_PROCESSING_TERMS = {
  pt: ['grelhado', 'grelhada', 'cozido', 'cozida', 'frito', 'frita', 'assado', 'assada', 'refogado', 'refogada', 'cru', 'crua', 'natural', 'integral', 'desnatado', 'desnatada', 'light', 'sem pele', 'com pele', 'picado', 'picada', 'ralado', 'ralada', 'em cubos', 'em fatias', 'em tiras', 'temperado', 'temperada', 'sem acucar', 'zero', 'diet'],
  en: ['grilled', 'baked', 'fried', 'boiled', 'steamed', 'raw', 'cooked', 'sugar free', 'unsweetened', 'plain', 'whole', 'skinless', 'boneless', 'diced', 'sliced', 'chopped', 'shredded'],
  es: ['asado', 'frito', 'cocido', 'hervido', 'crudo', 'sin azucar', 'integral', 'natural']
};

export const FALLBACK_CATEGORY_KEYWORDS = {
  pt: { 'frango': 10, 'peito': 8, 'carne': 10, 'boi': 9, 'porco': 9, 'peixe': 10, 'arroz': 10, 'feijao': 10, 'pao': 9, 'macarrao': 9, 'aveia': 8, 'batata': 9, 'tomate': 8, 'cebola': 7, 'alface': 7, 'leite': 10, 'queijo': 9, 'iogurte': 9 },
  en: { 'chicken': 10, 'breast': 8, 'beef': 10, 'pork': 9, 'fish': 10, 'salmon': 9, 'tuna': 9, 'rice': 10, 'beans': 10, 'bread': 9, 'pasta': 9, 'oats': 8, 'potato': 9, 'tomato': 8, 'onion': 7, 'lettuce': 7, 'milk': 10, 'cheese': 9, 'yogurt': 9 },
  es: { 'pollo': 10, 'pechuga': 8, 'carne': 10, 'res': 9, 'cerdo': 9, 'pescado': 10, 'arroz': 10, 'frijoles': 10, 'pan': 9, 'pasta': 9, 'avena': 8 }
};

