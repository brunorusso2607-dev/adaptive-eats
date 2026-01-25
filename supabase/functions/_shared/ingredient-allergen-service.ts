// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - INGREDIENT ALLERGEN SERVICE
// Integração dinâmica com Safety Engine para alérgenos
// ═══════════════════════════════════════════════════════════════════════

import { loadSafetyDatabase, type SafetyDatabase } from "./globalSafetyEngine.ts";
import { UNIVERSAL_INGREDIENTS, type UniversalIngredient } from "./universal-ingredients-db.ts";
import { COUNTRY_SPECIFIC_INGREDIENTS, type CountrySpecificIngredient } from "./country-specific-ingredients.ts";

// ═══════════════════════════════════════════════════════════════════════
// CACHE DE ALÉRGENOS (TTL: 2 minutos, igual ao Safety Engine)
// ═══════════════════════════════════════════════════════════════════════

let allergenCache: Map<string, string[]> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutos

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ═══════════════════════════════════════════════════════════════════════

export async function getIngredientAllergens(
  ingredientName: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<string[]> {
  // Verificar cache
  if (allergenCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    const cached = allergenCache.get(ingredientName.toLowerCase());
    if (cached) return cached;
  }

  // Recarregar cache se expirado
  if (!allergenCache || Date.now() - cacheTimestamp >= CACHE_TTL) {
    await reloadAllergenCache(supabaseUrl, supabaseServiceKey);
  }

  // Buscar no cache recarregado
  const allergens = allergenCache?.get(ingredientName.toLowerCase()) || [];
  return allergens;
}

async function reloadAllergenCache(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<void> {
  try {
    // Carregar Safety Database
    const safetyDb = await loadSafetyDatabase(supabaseUrl, supabaseServiceKey);
    
    // Criar novo cache
    const newCache = new Map<string, string[]>();

    // Processar todos os mapeamentos de intolerância
    for (const [intoleranceKey, ingredients] of safetyDb.intoleranceMappings.entries()) {
      for (const ingredient of ingredients) {
        const normalizedName = ingredient.toLowerCase();
        
        if (!newCache.has(normalizedName)) {
          newCache.set(normalizedName, []);
        }
        
        const allergens = newCache.get(normalizedName)!;
        if (!allergens.includes(intoleranceKey)) {
          allergens.push(intoleranceKey);
        }
      }
    }

    // Atualizar cache global
    allergenCache = newCache;
    cacheTimestamp = Date.now();
    
    console.log(`[AllergenService] Cache reloaded with ${newCache.size} ingredients`);
  } catch (error) {
    console.error("[AllergenService] Error reloading cache:", error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// ENRIQUECER INGREDIENTES COM ALÉRGENOS DINÂMICOS
// ═══════════════════════════════════════════════════════════════════════

export async function enrichIngredientWithAllergens(
  ingredient: UniversalIngredient | CountrySpecificIngredient,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<string[]> {
  // Se ingrediente não usa alérgenos dinâmicos, retornar estáticos
  if (!ingredient.allergens_dynamic) {
    return ingredient.allergens_static || [];
  }

  // Buscar alérgenos dinâmicos do Safety Engine
  const ingredientNames = Object.values(ingredient.i18n).map(t => t.name);
  const allAllergens = new Set<string>();

  // Adicionar alérgenos estáticos primeiro
  if (ingredient.allergens_static) {
    ingredient.allergens_static.forEach(a => allAllergens.add(a));
  }

  // Buscar alérgenos dinâmicos para cada nome traduzido
  for (const name of ingredientNames) {
    const allergens = await getIngredientAllergens(name, supabaseUrl, supabaseServiceKey);
    allergens.forEach(a => allAllergens.add(a));
  }

  return Array.from(allAllergens);
}

export async function enrichAllUniversalIngredients(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Map<string, string[]>> {
  const enrichedMap = new Map<string, string[]>();

  for (const [id, ingredient] of Object.entries(UNIVERSAL_INGREDIENTS)) {
    const allergens = await enrichIngredientWithAllergens(
      ingredient,
      supabaseUrl,
      supabaseServiceKey
    );
    enrichedMap.set(id, allergens);
  }

  return enrichedMap;
}

export async function enrichAllCountrySpecificIngredients(
  countryCode: string,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<Map<string, string[]>> {
  const enrichedMap = new Map<string, string[]>();
  const countryIngredients = COUNTRY_SPECIFIC_INGREDIENTS[countryCode];

  if (!countryIngredients) return enrichedMap;

  for (const [id, ingredient] of Object.entries(countryIngredients)) {
    const allergens = await enrichIngredientWithAllergens(
      ingredient,
      supabaseUrl,
      supabaseServiceKey
    );
    enrichedMap.set(id, allergens);
  }

  return enrichedMap;
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE INGREDIENTES CONTRA INTOLERÂNCIAS
// ═══════════════════════════════════════════════════════════════════════

export async function validateIngredientForIntolerances(
  ingredientId: string,
  userIntolerances: string[],
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ isValid: boolean; blockedBy: string[] }> {
  // Buscar ingrediente (universal ou específico)
  let ingredient: UniversalIngredient | CountrySpecificIngredient | null = null;
  
  if (UNIVERSAL_INGREDIENTS[ingredientId]) {
    ingredient = UNIVERSAL_INGREDIENTS[ingredientId];
  } else {
    // Buscar em todos os países
    for (const countryIngredients of Object.values(COUNTRY_SPECIFIC_INGREDIENTS)) {
      if (countryIngredients[ingredientId]) {
        ingredient = countryIngredients[ingredientId];
        break;
      }
    }
  }

  if (!ingredient) {
    return { isValid: true, blockedBy: [] };
  }

  // Obter alérgenos do ingrediente
  const allergens = await enrichIngredientWithAllergens(
    ingredient,
    supabaseUrl,
    supabaseServiceKey
  );

  // Verificar se algum alérgeno está na lista de intolerâncias do usuário
  const blockedBy = allergens.filter(a => userIntolerances.includes(a));

  return {
    isValid: blockedBy.length === 0,
    blockedBy
  };
}

export async function validateIngredientList(
  ingredientIds: string[],
  userIntolerances: string[],
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ isValid: boolean; blockedIngredients: Array<{ id: string; blockedBy: string[] }> }> {
  const blockedIngredients: Array<{ id: string; blockedBy: string[] }> = [];

  for (const id of ingredientIds) {
    const validation = await validateIngredientForIntolerances(
      id,
      userIntolerances,
      supabaseUrl,
      supabaseServiceKey
    );

    if (!validation.isValid) {
      blockedIngredients.push({
        id,
        blockedBy: validation.blockedBy
      });
    }
  }

  return {
    isValid: blockedIngredients.length === 0,
    blockedIngredients
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER PARA LIMPAR CACHE (útil para testes)
// ═══════════════════════════════════════════════════════════════════════

export function clearAllergenCache(): void {
  allergenCache = null;
  cacheTimestamp = 0;
  console.log("[AllergenService] Cache cleared");
}

