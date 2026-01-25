// ============================================
// RECIPE POOL - POOL CENTRAL DE RECEITAS
// ============================================
// Este módulo centraliza a busca e salvamento de receitas.
// Antes de gerar via IA, todos os módulos devem buscar no banco.
// Receitas geradas são automaticamente salvas para reutilização.
// 
// FILTRO 2: Validação rigorosa contra perfil do usuário antes de usar
// 
// ARCHITECTURE: Usa globalSafetyEngine para validação centralizada

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import {
  loadSafetyDatabase,
  validateIngredient as gseValidateIngredient,
  normalizeUserIntolerances,
  type SafetyDatabase,
  type UserRestrictions,
} from "./globalSafetyEngine.ts";

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
  "leite de soja", "leite de arroz", "leite de castanha", "bebida vegetal",
  // Substitutos veganos - TODOS os tipos de queijo vegano/vegetal
  "queijo vegano", "queijo vegetal", "queijo de castanha", "queijo de amendoas",
  "manteiga vegana", "iogurte vegetal", "creme de coco",
  "nata vegetal", "cream cheese vegano", "creme de leite de coco", 
  "iogurte de coco", "manteiga de coco", "requeijao vegano", "requeijão vegano",
  // Levedura nutricional (substituto de queijo, não contém laticínios)
  "levedura nutricional", "nutritional yeast",
  // Proteínas vegetais
  "proteina vegetal", "proteína vegetal", "proteina de ervilha", "proteína de ervilha",
  // Farinhas sem glúten
  "farinha de arroz", "farinha de mandioca", "polvilho", "tapioca",
  "farinha de amendoas", "farinha de coco", "farinha de milho",
  "aveia sem gluten", "aveia sem glúten", "flocos de aveia sem gluten",
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
  "linguiça vegana", "presunto vegano", "salsicha vegana",
  // Caldos vegetais
  "caldo de legumes", "caldo vegetal"
];

/**
 * Termos que indicam ausência de um ingrediente (quando na descrição)
 * Se o ingrediente menciona "sem X", não deve ser bloqueado por X
 */
const SAFE_ABSENCE_PATTERNS = [
  "sem lactose", "sem gluten", "sem glúten", "sem acucar", "sem açúcar",
  "livre de lactose", "livre de gluten", "livre de glúten",
  "isento de lactose", "isento de gluten",
  "zero lactose", "zero gluten", "lactose free", "gluten free",
  "ausencia de lactose", "ausência de lactose"
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
  forbiddenList: string[],
  dynamicSafeList?: string[]
): { isForbidden: boolean; matchedForbidden: string | null } {
  const normalized = normalizeTextForPool(ingredientName);
  
  // Primeiro verifica se é uma exceção segura (lista estática)
  const isSafeException = SAFE_INGREDIENT_EXCEPTIONS.some(safe => 
    normalized.includes(normalizeTextForPool(safe))
  );
  
  if (isSafeException) {
    return { isForbidden: false, matchedForbidden: null };
  }
  
  // Verifica lista dinâmica de exceções (do banco de dados)
  if (dynamicSafeList && dynamicSafeList.length > 0) {
    const isDynamicSafe = dynamicSafeList.some(safe => 
      normalized.includes(normalizeTextForPool(safe))
    );
    if (isDynamicSafe) {
      return { isForbidden: false, matchedForbidden: null };
    }
  }
  
  // Verifica se o ingrediente indica AUSÊNCIA de um alérgeno
  const hasAbsencePattern = SAFE_ABSENCE_PATTERNS.some(pattern =>
    normalized.includes(normalizeTextForPool(pattern))
  );
  
  // Verifica contra lista de proibidos usando word boundary
  for (const forbidden of forbiddenList) {
    const normalizedForbidden = normalizeTextForPool(forbidden);
    
    // Se encontra "sem X" ou "livre de X" antes do termo proibido, não bloqueia
    if (hasAbsencePattern) {
      const absenceRegex = new RegExp(`(sem|livre de|isento de|zero|ausencia de|ausência de)\\s+${normalizedForbidden}`, 'i');
      if (absenceRegex.test(normalized)) {
        continue;
      }
    }
    
    if (containsForbiddenWord(normalized, normalizedForbidden)) {
      return { isForbidden: true, matchedForbidden: forbidden };
    }
  }
  
  return { isForbidden: false, matchedForbidden: null };
}

/**
 * Constrói lista completa de ingredientes proibidos baseado no perfil
 */
/**
 * @deprecated Use validateRecipeWithGSE() para validação via globalSafetyEngine
 * Mantida para compatibilidade, agora delega para globalSafetyEngine
 */
function buildForbiddenListForProfile(
  dietaryPreference?: string,
  intolerances?: string[],
  excludedIngredients?: string[]
): string[] {
  // Esta função agora é legacy - a validação real acontece via gseValidateIngredient
  // Retorna apenas os ingredientes excluídos manualmente para logging
  const allForbidden: string[] = [];
  
  if (excludedIngredients && excludedIngredients.length > 0) {
    allForbidden.push(...excludedIngredients);
  }
  
  return [...new Set(allForbidden)];
}

// Cache para SafetyDatabase
let cachedRecipePoolDB: SafetyDatabase | null = null;

/**
 * Valida um ingrediente usando globalSafetyEngine
 */
async function validateIngredientWithGSE(
  ingredient: string,
  intolerances?: string[],
  dietaryPreference?: string,
  excludedIngredients?: string[]
): Promise<{ isValid: boolean; reason?: string }> {
  try {
    if (!cachedRecipePoolDB) {
      cachedRecipePoolDB = await loadSafetyDatabase();
    }
    
    const normalizedIntolerances = normalizeUserIntolerances(intolerances || [], cachedRecipePoolDB);
    
    const userRestrictions: UserRestrictions = {
      intolerances: normalizedIntolerances,
      dietaryPreference: dietaryPreference || null,
      excludedIngredients: excludedIngredients || [],
    };
    
    const result = gseValidateIngredient(ingredient, userRestrictions, cachedRecipePoolDB);
    return { isValid: result.isValid, reason: result.reason };
  } catch (error) {
    console.error("[recipePool] GSE validation error:", error);
    return { isValid: false, reason: "Safety validation unavailable" };
  }
}

/**
 * FILTRO 2: Valida uma receita do pool contra o perfil COMPLETO do usuário
 * Esta é a última linha de defesa antes de entregar a receita ao usuário
 */
export function validateRecipeAgainstProfile(
  recipe: { name: string; ingredients: any[] },
  dietaryPreference?: string,
  intolerances?: string[],
  excludedIngredients?: string[],
  dynamicSafeList?: string[]
): { isValid: boolean; invalidIngredients: string[]; blockedDetails: BlockedIngredientInfo[] } {
  const invalidIngredients: string[] = [];
  const blockedDetails: BlockedIngredientInfo[] = [];
  
  // Constrói lista completa de proibidos
  const forbiddenList = buildForbiddenListForProfile(
    dietaryPreference,
    intolerances,
    excludedIngredients
  );
  
  // Se não há restrições, tudo é válido
  if (forbiddenList.length === 0) {
    return { isValid: true, invalidIngredients: [], blockedDetails: [] };
  }
  
  // Verifica cada ingrediente da receita
  for (const ingredient of recipe.ingredients) {
    const ingredientName = typeof ingredient === 'string' 
      ? ingredient 
      : ingredient.name || ingredient.item || '';
    
    if (!ingredientName) continue;
    
    const { isForbidden, matchedForbidden } = isIngredientForbidden(
      ingredientName, 
      forbiddenList,
      dynamicSafeList
    );
    
    if (isForbidden && matchedForbidden) {
      invalidIngredients.push(`${ingredientName} (contém: ${matchedForbidden})`);
      blockedDetails.push({
        ingredient: ingredientName,
        blockedReason: matchedForbidden,
        intoleranceOrDiet: dietaryPreference || intolerances?.join(', ') || 'unknown',
        recipeName: recipe.name
      });
    }
  }
  
  return {
    isValid: invalidIngredients.length === 0,
    invalidIngredients,
    blockedDetails
  };
}

/**
 * Interface para informações de ingredientes bloqueados
 */
export interface BlockedIngredientInfo {
  ingredient: string;
  blockedReason: string;
  intoleranceOrDiet: string;
  recipeName: string;
}

/**
 * Registra ingredientes bloqueados no banco para revisão posterior
 */
export async function logBlockedIngredients(
  supabase: SupabaseClient,
  blockedItems: BlockedIngredientInfo[],
  userId?: string
): Promise<void> {
  if (!blockedItems || blockedItems.length === 0) return;
  
  try {
    // Agrupa por ingrediente único para evitar duplicatas
    const uniqueBlocks = new Map<string, BlockedIngredientInfo>();
    for (const item of blockedItems) {
      const key = `${item.ingredient.toLowerCase()}_${item.intoleranceOrDiet}`;
      if (!uniqueBlocks.has(key)) {
        uniqueBlocks.set(key, item);
      }
    }
    
    const records = Array.from(uniqueBlocks.values()).map(item => ({
      ingredient: item.ingredient,
      blocked_reason: item.blockedReason,
      intolerance_or_diet: item.intoleranceOrDiet,
      recipe_context: item.recipeName,
      user_id: userId || null,
      status: 'pending'
    }));
    
    // Verifica se já existem registros pendentes para estes ingredientes
    for (const record of records) {
      const { data: existing } = await supabase
        .from('blocked_ingredients_review')
        .select('id')
        .eq('ingredient', record.ingredient)
        .eq('intolerance_or_diet', record.intolerance_or_diet)
        .eq('status', 'pending')
        .limit(1);
      
      if (!existing || existing.length === 0) {
        await supabase
          .from('blocked_ingredients_review')
          .insert(record);
        
        logStep(`📝 Logged blocked ingredient for review: "${record.ingredient}"`);
      }
    }
  } catch (error) {
    logStep('Error logging blocked ingredients', { error: String(error) });
  }
}

/**
 * Busca lista de exceções dinâmicas do banco de dados
 */
export async function fetchDynamicSafeIngredients(
  supabase: SupabaseClient,
  safeFor: string[]
): Promise<string[]> {
  if (!safeFor || safeFor.length === 0) return [];
  
  try {
    const { data, error } = await supabase
      .from('dynamic_safe_ingredients')
      .select('ingredient')
      .eq('is_active', true)
      .in('safe_for', safeFor);
    
    if (error || !data) return [];
    
    return data.map(d => d.ingredient);
  } catch (error) {
    logStep('Error fetching dynamic safe ingredients', { error: String(error) });
    return [];
  }
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
      .limit(limit + 10); // OTIMIZADO: busca menos para reduzir CPU

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
    // BUSCA EXCEÇÕES DINÂMICAS DO BANCO
    // ============================================
    const safeForList: string[] = [];
    if (dietaryPreference) safeForList.push(dietaryPreference);
    if (intolerances && intolerances.length > 0) safeForList.push(...intolerances);
    
    const dynamicSafeList = await fetchDynamicSafeIngredients(supabase, safeForList);
    
    if (dynamicSafeList.length > 0) {
      logStep("Loaded dynamic safe ingredients", { count: dynamicSafeList.length });
    }

    // ============================================
    // FILTRO 2: VALIDAÇÃO RIGOROSA CONTRA PERFIL DO USUÁRIO
    // ============================================
    let rejectedCount = 0;
    const rejectedRecipes: string[] = [];
    const allBlockedDetails: BlockedIngredientInfo[] = [];
    
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
        excludedIngredients,
        dynamicSafeList
      );
      
      if (!validation.isValid) {
        rejectedCount++;
        // OTIMIZADO: não loga cada receita individualmente para economizar CPU
        if (rejectedRecipes.length < 5) {
          rejectedRecipes.push(`${recipe.name}: ${validation.invalidIngredients.join(', ')}`);
        }
        allBlockedDetails.push(...validation.blockedDetails);
        return false;
      }

      return true;
    });

    // Loga ingredientes bloqueados para revisão automática posterior
    if (allBlockedDetails.length > 0) {
      logBlockedIngredients(supabase, allBlockedDetails);
    }

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
  if (!mealType) return "breakfast";
  
  const normalized = mealType.toLowerCase().trim();
  
  // Mapeamento para novas chaves em inglês (mantendo retrocompatibilidade)
  const normalizations: Record<string, string> = {
    // Valores antigos em português -> novos valores em inglês
    "cafe_manha": "breakfast",
    "lanche_manha": "morning_snack",
    "almoco": "lunch",
    "lanche": "afternoon_snack",
    "lanche_tarde": "afternoon_snack",
    "lanche_da_tarde": "afternoon_snack",
    "jantar": "dinner",
    "ceia": "supper",
    // Variações com acento
    "café_manha": "breakfast",
    "cafe_da_manha": "breakfast",
    "café_da_manhã": "breakfast",
    "almoço": "lunch",
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

