// ============================================
// RECIPE POOL - POOL CENTRAL DE RECEITAS
// ============================================
// Este módulo centraliza a busca e salvamento de receitas.
// Antes de gerar via IA, todos os módulos devem buscar no banco.
// Receitas geradas são automaticamente salvas para reutilização.
// 
// FILTRO 2: Validação rigorosa contra perfil do usuário antes de usar

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  FORBIDDEN_INGREDIENTS,
  DIETARY_FORBIDDEN_INGREDIENTS,
} from "./recipeConfig.ts";

// ============================================
// TIPOS
// ============================================

export type SourceModule = 
  | "admin" 
  | "surpreenda_me" 
  | "plano_ia" 
  | "plano_simples" 
  | "regenerate_meal"
  | "manual";

export interface RecipePoolSearchParams {
  mealType: string;
  countryCode?: string;
  dietaryPreference?: string;
  intolerances?: string[];
  excludedIngredients?: string[];
  category?: string;
  limit?: number;
}

export interface RecipePoolResult {
  id: string;
  name: string;
  meal_type: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: any[];
  description?: string;
  source_module?: string;
  usage_count?: number;
}

export interface SaveRecipeParams {
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  ingredients: any[];
  instructions?: any[];
  description?: string;
  countryCode?: string;
  languageCode?: string;
  sourceModule: SourceModule;
  compatibleMealTimes?: string[];
}

// ============================================
// FILTRO 2: VALIDAÇÃO RIGOROSA DE RECEITAS DO POOL
// ============================================

/**
 * Normaliza texto para comparação (remove acentos, lowercase)
 */
function normalizeTextForPool(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Exceções de ingredientes que são substitutos seguros ou vegetais com nomes confusos
 */
const SAFE_INGREDIENT_EXCEPTIONS = [
  // Leites vegetais
  "leite de coco", "leite de amendoas", "leite de aveia", "leite vegetal",
  "leite de soja", "leite de arroz", "leite de castanha",
  // Substitutos veganos
  "queijo vegano", "manteiga vegana", "iogurte vegetal", "creme de coco",
  "nata vegetal", "cream cheese vegano", "creme de leite de coco", 
  "iogurte de coco", "manteiga de coco",
  // Farinhas sem glúten
  "farinha de arroz", "farinha de mandioca", "polvilho", "tapioca",
  "farinha de amendoas", "farinha de coco", "farinha de milho",
  // Oleaginosas
  "castanha de caju", "castanha do para", "amendoas", "nozes",
  // VEGETAIS com nomes confusos (não são derivados animais!)
  "couve manteiga", "couve-manteiga", "alface manteiga", "abobora manteiga",
  "abóbora manteiga", "batata manteiga", "feijao manteiga", "feijão manteiga",
  // TEMPEROS com nomes confusos (não são embutidos!)
  "pimenta calabresa", "pimenta-calabresa", "flocos de pimenta calabresa",
  "pimenta calabresa em flocos", "calabresa em flocos",
  // Outros termos seguros
  "ovo vegano", "maionese vegana", "bacon vegano", "linguica vegana",
  "linguiça vegana", "presunto vegano", "salsicha vegana"
];

/**
 * Verifica se o ingrediente contém a palavra proibida como palavra completa
 * Evita falsos positivos como "vermelho" contendo "mel"
 */
function containsForbiddenWord(ingredient: string, forbidden: string): boolean {
  // Cria regex para match de palavra completa (word boundary)
  const escapedForbidden = forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|\\s|,|;|\\(|\\)|/)${escapedForbidden}($|\\s|,|;|\\(|\\)|/)`, 'i');
  
  // Verifica se começa ou termina com a palavra proibida
  const startsWithForbidden = ingredient.startsWith(forbidden + ' ') || ingredient === forbidden;
  const endsWithForbidden = ingredient.endsWith(' ' + forbidden);
  
  return regex.test(ingredient) || startsWithForbidden || endsWithForbidden;
}

/**
 * Verifica se um ingrediente específico é proibido para o perfil
 */
function isIngredientForbidden(
  ingredientName: string,
  forbiddenList: string[]
): { isForbidden: boolean; matchedForbidden: string | null } {
  const normalized = normalizeTextForPool(ingredientName);
  
  // Primeiro verifica se é uma exceção segura
  const isSafeException = SAFE_INGREDIENT_EXCEPTIONS.some(safe => 
    normalized.includes(normalizeTextForPool(safe))
  );
  
  if (isSafeException) {
    return { isForbidden: false, matchedForbidden: null };
  }
  
  // Verifica contra lista de proibidos usando word boundary
  for (const forbidden of forbiddenList) {
    const normalizedForbidden = normalizeTextForPool(forbidden);
    if (containsForbiddenWord(normalized, normalizedForbidden)) {
      return { isForbidden: true, matchedForbidden: forbidden };
    }
  }
  
  return { isForbidden: false, matchedForbidden: null };
}

/**
 * Constrói lista completa de ingredientes proibidos baseado no perfil
 */
function buildForbiddenListForProfile(
  dietaryPreference?: string,
  intolerances?: string[],
  excludedIngredients?: string[]
): string[] {
  const allForbidden: string[] = [];
  
  // Adiciona proibidos da preferência dietética
  if (dietaryPreference) {
    const dietaryForbidden = DIETARY_FORBIDDEN_INGREDIENTS[dietaryPreference];
    if (dietaryForbidden) {
      allForbidden.push(...dietaryForbidden);
    }
  }
  
  // Adiciona proibidos das intolerâncias
  if (intolerances && intolerances.length > 0) {
    for (const intolerance of intolerances) {
      const forbidden = FORBIDDEN_INGREDIENTS[intolerance.toLowerCase()];
      if (forbidden) {
        allForbidden.push(...forbidden);
      }
    }
  }
  
  // Adiciona ingredientes excluídos manualmente
  if (excludedIngredients && excludedIngredients.length > 0) {
    allForbidden.push(...excludedIngredients);
  }
  
  // Remove duplicatas
  return [...new Set(allForbidden)];
}

/**
 * FILTRO 2: Valida uma receita do pool contra o perfil COMPLETO do usuário
 * Esta é a última linha de defesa antes de entregar a receita ao usuário
 */
export function validateRecipeAgainstProfile(
  recipe: { name: string; ingredients: any[] },
  dietaryPreference?: string,
  intolerances?: string[],
  excludedIngredients?: string[]
): { isValid: boolean; invalidIngredients: string[] } {
  const invalidIngredients: string[] = [];
  
  // Constrói lista completa de proibidos
  const forbiddenList = buildForbiddenListForProfile(
    dietaryPreference,
    intolerances,
    excludedIngredients
  );
  
  // Se não há restrições, tudo é válido
  if (forbiddenList.length === 0) {
    return { isValid: true, invalidIngredients: [] };
  }
  
  // Verifica cada ingrediente da receita
  for (const ingredient of recipe.ingredients) {
    const ingredientName = typeof ingredient === 'string' 
      ? ingredient 
      : ingredient.name || ingredient.item || '';
    
    if (!ingredientName) continue;
    
    const { isForbidden, matchedForbidden } = isIngredientForbidden(ingredientName, forbiddenList);
    
    if (isForbidden && matchedForbidden) {
      invalidIngredients.push(`${ingredientName} (contém: ${matchedForbidden})`);
    }
  }
  
  return {
    isValid: invalidIngredients.length === 0,
    invalidIngredients
  };
}

// ============================================
// FUNÇÕES DE BUSCA
// ============================================

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RECIPE-POOL] ${step}${detailsStr}`);
};

/**
 * Busca receitas no pool central baseado nos critérios
 * Prioriza receitas mais usadas e compatíveis
 */
export async function searchRecipePool(
  supabase: SupabaseClient,
  params: RecipePoolSearchParams
): Promise<RecipePoolResult[]> {
  const {
    mealType,
    countryCode = "BR",
    dietaryPreference,
    intolerances = [],
    excludedIngredients = [],
    category,
    limit = 10
  } = params;

  logStep("Searching recipe pool", { mealType, countryCode, dietaryPreference, limit });

  try {
    // Normaliza o meal_type para busca
    const normalizedMealType = normalizeMealType(mealType);
    
    // Query base - EXCLUI receitas de fontes externas (source_url não nulo)
    let query = supabase
      .from("simple_meals")
      .select(`
        id,
        name,
        meal_type,
        calories,
        protein,
        carbs,
        fat,
        prep_time,
        ingredients,
        description,
        source_module,
        usage_count,
        country_code,
        compatible_meal_times,
        source_url
      `)
      .eq("is_active", true)
      .is("source_url", null) // Exclui receitas importadas de fontes externas
      .order("usage_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit * 3); // Busca mais para filtrar depois

    // Filtro por tipo de refeição - usa compatible_meal_times ou meal_type
    // A receita é compatível se o meal_type bate OU se está em compatible_meal_times

    // Filtro por país (preferência, não exclusivo)
    // Vamos buscar receitas do país do usuário primeiro
    
    const { data: recipes, error } = await query;

    if (error) {
      logStep("Error searching pool", { error: error.message });
      return [];
    }

    if (!recipes || recipes.length === 0) {
      logStep("No recipes found in pool");
      return [];
    }

    logStep("Raw results from pool", { count: recipes.length });

    // ============================================
    // FILTRO 2: VALIDAÇÃO RIGOROSA CONTRA PERFIL DO USUÁRIO
    // ============================================
    let rejectedCount = 0;
    const rejectedRecipes: string[] = [];
    
    // Filtra receitas compatíveis com VALIDAÇÃO RIGOROSA
    const compatibleRecipes = recipes.filter((recipe: any) => {
      // Verifica compatibilidade com meal_type
      const isCompatibleMealType = 
        normalizeMealType(recipe.meal_type) === normalizedMealType ||
        (recipe.compatible_meal_times && recipe.compatible_meal_times.includes(normalizedMealType));

      if (!isCompatibleMealType) return false;

      // FILTRO 2: Validação rigorosa usando a função centralizada
      const validation = validateRecipeAgainstProfile(
        { name: recipe.name, ingredients: recipe.ingredients || [] },
        dietaryPreference,
        intolerances,
        excludedIngredients
      );
      
      if (!validation.isValid) {
        rejectedCount++;
        rejectedRecipes.push(`${recipe.name}: ${validation.invalidIngredients.join(', ')}`);
        logStep(`❌ BLOQUEADA pelo Filtro 2: "${recipe.name}"`, { 
          reason: validation.invalidIngredients 
        });
        return false;
      }

      return true;
    });

    if (rejectedCount > 0) {
      logStep(`🛑 Filtro 2 bloqueou ${rejectedCount} receitas do pool`, { 
        rejectedRecipes: rejectedRecipes.slice(0, 5) 
      });
    }
    
    logStep("Compatible recipes after Filtro 2", { 
      total: recipes.length, 
      passed: compatibleRecipes.length, 
      blocked: rejectedCount 
    });

    // Prioriza receitas do país do usuário
    const sortedRecipes = compatibleRecipes.sort((a: any, b: any) => {
      // Prioridade 1: País do usuário
      const aCountryMatch = a.country_code === countryCode ? 1 : 0;
      const bCountryMatch = b.country_code === countryCode ? 1 : 0;
      if (aCountryMatch !== bCountryMatch) return bCountryMatch - aCountryMatch;

      // Prioridade 2: Mais usadas
      return (b.usage_count || 0) - (a.usage_count || 0);
    });

    // Retorna no formato padronizado
    return sortedRecipes.slice(0, limit).map((recipe: any) => ({
      id: recipe.id,
      name: recipe.name,
      meal_type: recipe.meal_type,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      prep_time: recipe.prep_time,
      ingredients: recipe.ingredients,
      description: recipe.description,
      source_module: recipe.source_module,
      usage_count: recipe.usage_count || 0
    }));

  } catch (error) {
    logStep("Exception searching pool", { error: String(error) });
    return [];
  }
}

/**
 * Busca uma receita específica do pool que atenda aos critérios
 * Retorna null se não encontrar
 */
export async function findRecipeInPool(
  supabase: SupabaseClient,
  params: RecipePoolSearchParams
): Promise<RecipePoolResult | null> {
  const results = await searchRecipePool(supabase, { ...params, limit: 1 });
  return results.length > 0 ? results[0] : null;
}

/**
 * Busca múltiplas receitas do pool para um dia completo
 */
export async function findDayRecipesInPool(
  supabase: SupabaseClient,
  mealTypes: string[],
  baseParams: Omit<RecipePoolSearchParams, "mealType">
): Promise<Map<string, RecipePoolResult | null>> {
  const results = new Map<string, RecipePoolResult | null>();

  for (const mealType of mealTypes) {
    const recipe = await findRecipeInPool(supabase, {
      ...baseParams,
      mealType
    });
    results.set(mealType, recipe);
  }

  return results;
}

// ============================================
// FUNÇÕES DE SALVAMENTO
// ============================================

/**
 * Salva uma receita gerada por IA no pool central
 * Verifica duplicatas antes de salvar
 */
export async function saveRecipeToPool(
  supabase: SupabaseClient,
  params: SaveRecipeParams
): Promise<{ success: boolean; id?: string; error?: string }> {
  const {
    name,
    mealType,
    calories,
    protein,
    carbs,
    fat,
    prepTime,
    ingredients,
    instructions,
    description,
    countryCode = "BR",
    languageCode = "pt-BR",
    sourceModule,
    compatibleMealTimes
  } = params;

  logStep("Saving recipe to pool", { name, mealType, sourceModule });

  try {
    // Verifica se já existe uma receita com nome similar
    const normalizedName = name.toLowerCase().trim();
    const { data: existing } = await supabase
      .from("simple_meals")
      .select("id, name")
      .ilike("name", `%${normalizedName}%`)
      .eq("meal_type", normalizeMealType(mealType))
      .limit(1);

    if (existing && existing.length > 0) {
      logStep("Similar recipe already exists", { existingName: existing[0].name });
      
      // Incrementa o usage_count da receita existente
      await incrementUsageCount(supabase, existing[0].id);
      
      return { success: true, id: existing[0].id };
    }

    // Prepara dados para inserção
    const recipeData = {
      name,
      meal_type: normalizeMealType(mealType),
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      prep_time: Math.round(prepTime),
      ingredients: ingredients || [],
      description: description || null,
      country_code: countryCode,
      language_code: languageCode,
      source_module: sourceModule,
      compatible_meal_times: compatibleMealTimes || [normalizeMealType(mealType)],
      is_active: true,
      usage_count: 1,
      last_used_at: new Date().toISOString(),
      ai_generated: sourceModule !== "admin" && sourceModule !== "manual"
    };

    const { data: inserted, error } = await supabase
      .from("simple_meals")
      .insert(recipeData)
      .select("id")
      .single();

    if (error) {
      logStep("Error saving recipe", { error: error.message });
      return { success: false, error: error.message };
    }

    logStep("Recipe saved successfully", { id: inserted?.id });
    return { success: true, id: inserted?.id };

  } catch (error) {
    logStep("Exception saving recipe", { error: String(error) });
    return { success: false, error: String(error) };
  }
}

/**
 * Salva múltiplas receitas de uma vez (para planos alimentares)
 */
export async function saveRecipesToPool(
  supabase: SupabaseClient,
  recipes: SaveRecipeParams[]
): Promise<{ saved: number; errors: number }> {
  let saved = 0;
  let errors = 0;

  for (const recipe of recipes) {
    const result = await saveRecipeToPool(supabase, recipe);
    if (result.success) {
      saved++;
    } else {
      errors++;
    }
  }

  logStep("Batch save complete", { saved, errors });
  return { saved, errors };
}

/**
 * Incrementa o contador de uso de uma receita
 */
export async function incrementUsageCount(
  supabase: SupabaseClient,
  recipeId: string
): Promise<void> {
  try {
    // Busca o valor atual e incrementa
    const { data: current } = await supabase
      .from("simple_meals")
      .select("usage_count")
      .eq("id", recipeId)
      .single();

    const currentCount = current?.usage_count || 0;

    await supabase
      .from("simple_meals")
      .update({
        usage_count: currentCount + 1,
        last_used_at: new Date().toISOString() 
      })
      .eq("id", recipeId);
  } catch (error) {
    console.log("[RECIPE-POOL] Error incrementing usage count:", error);
  }
}

/**
 * Marca uma receita como usada (atualiza last_used_at e incrementa usage_count)
 */
export async function markRecipeAsUsed(
  supabase: SupabaseClient,
  recipeId: string
): Promise<void> {
  logStep("Marking recipe as used", { recipeId });
  
  const { data: current } = await supabase
    .from("simple_meals")
    .select("usage_count")
    .eq("id", recipeId)
    .single();

  const currentCount = current?.usage_count || 0;

  await supabase
    .from("simple_meals")
    .update({ 
      usage_count: currentCount + 1,
      last_used_at: new Date().toISOString() 
    })
    .eq("id", recipeId);
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Normaliza o tipo de refeição para o padrão do sistema
 */
function normalizeMealType(mealType: string): string {
  if (!mealType) return "cafe_manha";
  
  const normalized = mealType.toLowerCase().trim();
  
  const normalizations: Record<string, string> = {
    "breakfast": "cafe_manha",
    "lunch": "almoco",
    "dinner": "jantar",
    "snack": "lanche",
    "supper": "ceia",
    "lanche_tarde": "lanche",
    "lanche_da_tarde": "lanche",
    "café_manha": "cafe_manha",
    "cafe_da_manha": "cafe_manha",
    "café_da_manhã": "cafe_manha",
    "almoço": "almoco",
  };
  
  return normalizations[normalized] || normalized;
}

/**
 * Extrai nomes de ingredientes de um array de ingredientes
 */
function getIngredientNames(ingredients: any[]): string[] {
  if (!ingredients || !Array.isArray(ingredients)) return [];
  
  return ingredients.map(ing => {
    if (typeof ing === "string") return ing;
    if (typeof ing === "object" && ing !== null) {
      return ing.name || ing.ingredient || ing.item || "";
    }
    return "";
  }).filter(Boolean);
}

/**
 * Verifica se há conflito de intolerância nos ingredientes
 */
function hasIntoleranceConflict(ingredients: string[], intolerance: string): boolean {
  const intoleranceKeywords: Record<string, string[]> = {
    lactose: ["leite", "queijo", "iogurte", "manteiga", "creme de leite", "requeijão", "nata", "ricota", "cottage", "cream cheese", "milk", "cheese", "yogurt", "butter", "cream"],
    gluten: ["trigo", "farinha", "pão", "macarrão", "massa", "biscoito", "bolo", "aveia", "cevada", "centeio", "wheat", "flour", "bread", "pasta", "cookie", "cake", "oat", "barley", "rye"],
    ovo: ["ovo", "ovos", "gema", "clara", "egg", "eggs", "yolk", "albumin"],
    frutos_mar: ["camarão", "lagosta", "caranguejo", "marisco", "ostra", "mexilhão", "polvo", "lula", "shrimp", "lobster", "crab", "shellfish", "oyster", "mussel", "octopus", "squid"],
    amendoim: ["amendoim", "pasta de amendoim", "peanut", "peanut butter"],
    nozes: ["nozes", "castanha", "amêndoa", "avelã", "pistache", "macadâmia", "pecã", "nut", "walnut", "almond", "hazelnut", "pistachio", "macadamia", "pecan", "cashew"],
    soja: ["soja", "tofu", "edamame", "missô", "shoyu", "molho de soja", "soy", "tofu", "miso", "soy sauce"],
    peixe: ["peixe", "salmão", "atum", "bacalhau", "tilápia", "sardinha", "anchova", "fish", "salmon", "tuna", "cod", "tilapia", "sardine", "anchovy"]
  };

  const keywords = intoleranceKeywords[intolerance.toLowerCase()] || [];
  
  for (const ingredient of ingredients) {
    const lowerIng = ingredient.toLowerCase();
    for (const keyword of keywords) {
      if (lowerIng.includes(keyword)) {
        return true;
      }
    }
  }
  
  return false;
}

// ============================================
// FUNÇÕES DE ESTRATÉGIA
// ============================================

/**
 * Decide se deve buscar do pool ou gerar via IA
 * Retorna a receita do pool se encontrada, ou null para gerar via IA
 */
export async function getOrGenerateRecipe(
  supabase: SupabaseClient,
  params: RecipePoolSearchParams & { prioritySource?: "database_first" | "ai_only" }
): Promise<{ source: "pool" | "ai_needed"; recipe: RecipePoolResult | null }> {
  const { prioritySource = "database_first", ...searchParams } = params;

  // Se for ai_only, não busca no pool
  if (prioritySource === "ai_only") {
    return { source: "ai_needed", recipe: null };
  }

  // Busca no pool
  const poolRecipe = await findRecipeInPool(supabase, searchParams);

  if (poolRecipe) {
    // Marca como usada
    await markRecipeAsUsed(supabase, poolRecipe.id);
    return { source: "pool", recipe: poolRecipe };
  }

  return { source: "ai_needed", recipe: null };
}
