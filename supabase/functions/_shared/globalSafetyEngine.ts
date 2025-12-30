/**
 * ============================================
 * GLOBAL SAFETY ENGINE - NÚCLEO CENTRALIZADO
 * ============================================
 * 
 * Este é o ÚNICO arquivo que todos os módulos de validação devem usar.
 * Qualquer alteração aqui afeta TODOS os edge functions automaticamente:
 * - analyze-food-photo
 * - analyze-label-photo
 * - analyze-fridge-photo
 * - generate-ai-meal-plan
 * - regenerate-meal
 * - regenerate-ai-meal-alternatives
 * - generate-recipe
 * - suggest-meal-alternatives
 * - suggest-food-ai
 * 
 * ARQUITETURA:
 * 1. Carrega dados do banco de dados (fonte de verdade)
 * 2. Normaliza keys de intolerância (onboarding → database)
 * 3. Valida ingredientes contra intolerâncias e perfis dietéticos
 * 4. Gera contexto de prompt para IA
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ============= INTERFACES =============

export interface IntoleranceMapping {
  intolerance_key: string;
  ingredient: string;
}

export interface SafeKeyword {
  intolerance_key: string;
  keyword: string;
}

export interface DietaryForbidden {
  dietary_key: string;
  ingredient: string;
  language: string;
  category: string;
}

export interface KeyNormalization {
  onboarding_key: string;
  database_key: string;
  label: string;
}

export interface DietaryProfile {
  key: string;
  name: string;
}

export interface SafetyDatabase {
  intoleranceMappings: Map<string, string[]>;
  safeKeywords: Map<string, string[]>;
  dietaryForbidden: Map<string, string[]>;
  keyNormalization: Map<string, string>;
  keyLabels: Map<string, string>;
  dietaryLabels: Map<string, string>;  // NEW: from dietary_profiles table
  allIntoleranceKeys: string[];
  allDietaryKeys: string[];
}

export interface UserRestrictions {
  intolerances: string[];
  dietaryPreference: string | null;
  excludedIngredients: string[];
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  restriction?: string;
  matchedIngredient?: string;
  category?: string;
}

export interface ConflictDetail {
  type: 'intolerance' | 'dietary' | 'excluded';
  key: string;
  label: string;
  matchedIngredient: string;
  originalIngredient: string;
}

export interface SafetyCheckResult {
  isSafe: boolean;
  conflicts: ConflictDetail[];
  safeReasons: string[];
}

// ============= CACHE =============

let cachedDatabase: SafetyDatabase | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ============= LABELS AMIGÁVEIS =============

export const INTOLERANCE_LABELS: Record<string, string> = {
  lactose: "Lactose",
  gluten: "Glúten",
  peanut: "Amendoim",
  tree_nuts: "Oleaginosas/Castanhas",
  seafood: "Frutos do Mar",
  fish: "Peixe",
  egg: "Ovos",
  soy: "Soja",
  sugar: "Açúcar",
  corn: "Milho",
  caffeine: "Cafeína",
  sorbitol: "Sorbitol",
  sulfite: "Sulfito",
  fructose: "Frutose",
  histamine: "Histamina",
  nickel: "Níquel",
  salicylate: "Salicilato",
  fodmap: "FODMAP",
  none: "Nenhuma"
};

export const DIETARY_LABELS: Record<string, string> = {
  vegana: "Veganismo",
  vegetariana: "Vegetarianismo",
  pescetariana: "Pescetarianismo",
  comum: "Onívoro",
  low_carb: "Low Carb",
  cetogenica: "Cetogênica",
  flexitariana: "Flexitariana"
};

// ============= FUNÇÕES PRINCIPAIS =============

/**
 * Normaliza texto para comparação (remove acentos, lowercase, trim)
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\s+/g, " "); // Normaliza espaços
}

/**
 * Carrega todos os dados de segurança do banco de dados.
 * Utiliza cache de 5 minutos para performance.
 */
export async function loadSafetyDatabase(
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<SafetyDatabase> {
  const now = Date.now();
  
  // Retornar cache se ainda válido
  if (cachedDatabase && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedDatabase;
  }

  const url = supabaseUrl || Deno.env.get("SUPABASE_URL") || "";
  const key = supabaseKey || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const supabaseClient = createClient(url, key, {
    auth: { persistSession: false }
  });

  // Buscar todos os dados em paralelo
  const [
    mappingsResult,
    safeKeywordsResult,
    dietaryResult,
    normalizationResult,
    dietaryProfilesResult
  ] = await Promise.all([
    supabaseClient
      .from("intolerance_mappings")
      .select("intolerance_key, ingredient")
      .limit(5000),  // Increased limit for full coverage
    supabaseClient
      .from("intolerance_safe_keywords")
      .select("intolerance_key, keyword")
      .limit(2000),
    supabaseClient
      .from("dietary_forbidden_ingredients")
      .select("dietary_key, ingredient, language, category")
      .limit(3000),
    supabaseClient
      .from("intolerance_key_normalization")
      .select("onboarding_key, database_key, label"),
    supabaseClient
      .from("dietary_profiles")
      .select("key, name")
      .eq("is_active", true)
  ]);

  // Processar erros
  if (mappingsResult.error) {
    console.error("[GlobalSafetyEngine] Error loading mappings:", mappingsResult.error);
    throw new Error(`Failed to load intolerance mappings: ${mappingsResult.error.message}`);
  }

  // Organizar dados em Maps para acesso O(1)
  const intoleranceMappings = new Map<string, string[]>();
  const allIntoleranceKeys = new Set<string>();

  for (const row of (mappingsResult.data as IntoleranceMapping[]) || []) {
    allIntoleranceKeys.add(row.intolerance_key);
    if (!intoleranceMappings.has(row.intolerance_key)) {
      intoleranceMappings.set(row.intolerance_key, []);
    }
    intoleranceMappings.get(row.intolerance_key)!.push(normalizeText(row.ingredient));
  }

  const safeKeywords = new Map<string, string[]>();
  for (const row of (safeKeywordsResult.data as SafeKeyword[]) || []) {
    if (!safeKeywords.has(row.intolerance_key)) {
      safeKeywords.set(row.intolerance_key, []);
    }
    safeKeywords.get(row.intolerance_key)!.push(normalizeText(row.keyword));
  }

  const dietaryForbidden = new Map<string, string[]>();
  const allDietaryKeys = new Set<string>();
  for (const row of (dietaryResult.data as DietaryForbidden[]) || []) {
    allDietaryKeys.add(row.dietary_key);
    if (!dietaryForbidden.has(row.dietary_key)) {
      dietaryForbidden.set(row.dietary_key, []);
    }
    dietaryForbidden.get(row.dietary_key)!.push(normalizeText(row.ingredient));
  }

  const keyNormalization = new Map<string, string>();
  const keyLabels = new Map<string, string>();
  for (const row of (normalizationResult.data as KeyNormalization[]) || []) {
    keyNormalization.set(row.onboarding_key, row.database_key);
    keyLabels.set(row.onboarding_key, row.label);
    keyLabels.set(row.database_key, row.label);
  }

  // Processar dietary labels do banco
  const dietaryLabels = new Map<string, string>();
  for (const row of (dietaryProfilesResult.data as DietaryProfile[]) || []) {
    dietaryLabels.set(row.key, row.name);
  }

  cachedDatabase = {
    intoleranceMappings,
    safeKeywords,
    dietaryForbidden,
    keyNormalization,
    keyLabels,
    dietaryLabels,
    allIntoleranceKeys: Array.from(allIntoleranceKeys),
    allDietaryKeys: Array.from(allDietaryKeys)
  };
  cacheTimestamp = now;

  console.log(`[GlobalSafetyEngine] Loaded: ${intoleranceMappings.size} intolerance types, ${dietaryForbidden.size} dietary profiles, ${dietaryLabels.size} dietary labels, ${mappingsResult.data?.length || 0} ingredients`);

  return cachedDatabase;
}

/**
 * Normaliza uma key de intolerância do onboarding para a key do banco de dados
 */
export function normalizeIntoleranceKey(
  onboardingKey: string,
  database: SafetyDatabase
): string {
  return database.keyNormalization.get(onboardingKey) || onboardingKey;
}

/**
 * Normaliza uma lista de intolerâncias do usuário
 */
export function normalizeUserIntolerances(
  userIntolerances: string[],
  database: SafetyDatabase
): string[] {
  return userIntolerances
    .filter(i => i && i !== "none" && i !== "nenhuma")
    .map(i => normalizeIntoleranceKey(i, database));
}

/**
 * Obtém o label amigável para uma intolerância
 */
export function getIntoleranceLabel(key: string, database: SafetyDatabase): string {
  return database.keyLabels.get(key) || INTOLERANCE_LABELS[key] || key;
}

/**
 * Obtém o label amigável para um perfil dietético
 * Prioriza dados do banco (dietary_profiles.name)
 */
export function getDietaryLabel(key: string, database?: SafetyDatabase): string {
  if (database?.dietaryLabels) {
    return database.dietaryLabels.get(key) || DIETARY_LABELS[key] || key;
  }
  return DIETARY_LABELS[key] || key;
}

/**
 * Verifica se um ingrediente contém palavras-chave seguras para uma intolerância
 */
function checkSafeKeywords(
  ingredient: string,
  intoleranceKey: string,
  database: SafetyDatabase
): { isSafe: boolean; reason?: string } {
  const safeWords = database.safeKeywords.get(intoleranceKey) || [];
  const normalizedIngredient = normalizeText(ingredient);
  
  for (const safeWord of safeWords) {
    if (normalizedIngredient.includes(safeWord)) {
      return {
        isSafe: true,
        reason: `Contém indicador de segurança: "${safeWord}"`
      };
    }
  }
  
  return { isSafe: false };
}

/**
 * Verifica se um ingrediente conflita com uma intolerância específica
 */
export function checkIngredientForIntolerance(
  ingredient: string,
  intoleranceKey: string,
  database: SafetyDatabase
): ValidationResult {
  const normalizedIngredient = normalizeText(ingredient);
  
  // Primeiro, verificar se é seguro
  const safeCheck = checkSafeKeywords(ingredient, intoleranceKey, database);
  if (safeCheck.isSafe) {
    return { isValid: true, reason: safeCheck.reason };
  }
  
  // Verificar se contém ingredientes proibidos
  const forbiddenIngredients = database.intoleranceMappings.get(intoleranceKey) || [];
  
  for (const forbidden of forbiddenIngredients) {
    // Verificar se o ingrediente contém a palavra proibida ou vice-versa
    if (normalizedIngredient.includes(forbidden) || forbidden.includes(normalizedIngredient)) {
      return {
        isValid: false,
        reason: `Contém ${forbidden} (intolerância: ${getIntoleranceLabel(intoleranceKey, database)})`,
        restriction: `intolerance_${intoleranceKey}`,
        matchedIngredient: forbidden
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Verifica se um ingrediente conflita com um perfil dietético
 */
export function checkIngredientForDietary(
  ingredient: string,
  dietaryKey: string,
  database: SafetyDatabase
): ValidationResult {
  if (!dietaryKey || dietaryKey === "comum") {
    return { isValid: true };
  }
  
  const normalizedIngredient = normalizeText(ingredient);
  const forbiddenIngredients = database.dietaryForbidden.get(dietaryKey) || [];
  
  for (const forbidden of forbiddenIngredients) {
    if (normalizedIngredient.includes(forbidden) || forbidden.includes(normalizedIngredient)) {
      return {
        isValid: false,
        reason: `Contém ${forbidden} (incompatível com ${getDietaryLabel(dietaryKey)})`,
        restriction: `dietary_${dietaryKey}`,
        matchedIngredient: forbidden
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Verifica se um ingrediente está na lista de excluídos do usuário
 */
export function checkExcludedIngredient(
  ingredient: string,
  excludedIngredients: string[]
): ValidationResult {
  const normalizedIngredient = normalizeText(ingredient);
  
  for (const excluded of excludedIngredients) {
    const normalizedExcluded = normalizeText(excluded);
    if (normalizedIngredient.includes(normalizedExcluded) || normalizedExcluded.includes(normalizedIngredient)) {
      return {
        isValid: false,
        reason: `Contém ingrediente excluído: ${excluded}`,
        restriction: "excluded_ingredient",
        matchedIngredient: excluded
      };
    }
  }
  
  return { isValid: true };
}

/**
 * FUNÇÃO PRINCIPAL: Valida um ingrediente contra TODAS as restrições do usuário
 */
export function validateIngredient(
  ingredient: string,
  restrictions: UserRestrictions,
  database: SafetyDatabase
): ValidationResult {
  // 1. Verificar ingredientes excluídos pelo usuário (mais específico)
  const excludedCheck = checkExcludedIngredient(ingredient, restrictions.excludedIngredients);
  if (!excludedCheck.isValid) {
    return excludedCheck;
  }
  
  // 2. Normalizar e verificar intolerâncias
  const normalizedIntolerances = normalizeUserIntolerances(restrictions.intolerances, database);
  
  for (const intoleranceKey of normalizedIntolerances) {
    const check = checkIngredientForIntolerance(ingredient, intoleranceKey, database);
    if (!check.isValid) {
      return check;
    }
  }
  
  // 3. Verificar perfil dietético
  if (restrictions.dietaryPreference) {
    const dietaryCheck = checkIngredientForDietary(
      ingredient,
      restrictions.dietaryPreference,
      database
    );
    if (!dietaryCheck.isValid) {
      return dietaryCheck;
    }
  }
  
  return { isValid: true };
}

/**
 * Valida uma lista de ingredientes e retorna todos os conflitos encontrados
 */
export function validateIngredientList(
  ingredients: string[],
  restrictions: UserRestrictions,
  database: SafetyDatabase
): SafetyCheckResult {
  const conflicts: ConflictDetail[] = [];
  const safeReasons: string[] = [];
  
  for (const ingredient of ingredients) {
    const result = validateIngredient(ingredient, restrictions, database);
    
    if (!result.isValid && result.restriction && result.matchedIngredient) {
      let type: 'intolerance' | 'dietary' | 'excluded' = 'excluded';
      let key = 'excluded';
      let label = 'Ingrediente Excluído';
      
      if (result.restriction.startsWith('intolerance_')) {
        type = 'intolerance';
        key = result.restriction.replace('intolerance_', '');
        label = getIntoleranceLabel(key, database);
      } else if (result.restriction.startsWith('dietary_')) {
        type = 'dietary';
        key = result.restriction.replace('dietary_', '');
        label = getDietaryLabel(key);
      }
      
      conflicts.push({
        type,
        key,
        label,
        matchedIngredient: result.matchedIngredient,
        originalIngredient: ingredient
      });
    } else if (result.reason) {
      safeReasons.push(result.reason);
    }
  }
  
  return {
    isSafe: conflicts.length === 0,
    conflicts,
    safeReasons
  };
}

/**
 * Valida uma refeição completa (nome + ingredientes)
 */
export function validateMeal(
  mealName: string,
  ingredients: string[],
  restrictions: UserRestrictions,
  database: SafetyDatabase
): SafetyCheckResult {
  // Combinar nome da refeição com ingredientes para validação completa
  const allItems = [mealName, ...ingredients];
  return validateIngredientList(allItems, restrictions, database);
}

/**
 * Gera texto de contexto de restrições para prompts de IA
 */
export function generateRestrictionsPromptContext(
  restrictions: UserRestrictions,
  database: SafetyDatabase,
  language: string = 'pt'
): string {
  const sections: string[] = [];
  
  // 1. Ingredientes excluídos (específicos do usuário)
  if (restrictions.excludedIngredients.length > 0) {
    sections.push(`## INGREDIENTES EXCLUÍDOS PELO USUÁRIO
⛔ NUNCA use: ${restrictions.excludedIngredients.join(", ")}
Estes são alimentos que o usuário especificamente não consome.`);
  }
  
  // 2. Intolerâncias
  const normalizedIntolerances = normalizeUserIntolerances(restrictions.intolerances, database);
  
  if (normalizedIntolerances.length > 0) {
    const intoleranceSections: string[] = [];
    
    for (const intolerance of normalizedIntolerances) {
      const ingredients = database.intoleranceMappings.get(intolerance) || [];
      const safeWords = database.safeKeywords.get(intolerance) || [];
      const label = getIntoleranceLabel(intolerance, database);
      
      if (ingredients.length > 0) {
        // Mostrar até 100 ingredientes (os mais comuns)
        const displayIngredients = ingredients.slice(0, 100);
        const hasMore = ingredients.length > 100;
        
        intoleranceSections.push(`### ${label.toUpperCase()} (${intolerance})
⛔ Ingredientes proibidos (${ingredients.length}): ${displayIngredients.join(", ")}${hasMore ? ` ... e mais ${ingredients.length - 100}` : ""}
✅ Indicadores de segurança: ${safeWords.length > 0 ? safeWords.join(", ") : "nenhum específico"}`);
      }
    }
    
    if (intoleranceSections.length > 0) {
      sections.push(`## INTOLERÂNCIAS ALIMENTARES DO USUÁRIO

${intoleranceSections.join("\n\n")}`);
    }
  }
  
  // 3. Perfil dietético
  if (restrictions.dietaryPreference && restrictions.dietaryPreference !== "comum") {
    const dietLabel = getDietaryLabel(restrictions.dietaryPreference);
    const forbidden = database.dietaryForbidden.get(restrictions.dietaryPreference) || [];
    
    // Agrupar por categoria para melhor legibilidade
    const uniqueForbidden = [...new Set(forbidden)].slice(0, 150);
    
    sections.push(`## PERFIL DIETÉTICO: ${dietLabel.toUpperCase()}
⛔ Ingredientes incompatíveis (${forbidden.length}): ${uniqueForbidden.join(", ")}${forbidden.length > 150 ? ` ... e mais ${forbidden.length - 150}` : ""}

REGRA ABSOLUTA: Não inclua NENHUM ingrediente de origem animal em receitas para ${dietLabel.toLowerCase()}.`);
  }
  
  if (sections.length === 0) {
    return "";
  }
  
  return `
# ⚠️ RESTRIÇÕES ALIMENTARES DO USUÁRIO - VALIDAÇÃO OBRIGATÓRIA

${sections.join("\n\n")}

## REGRAS DE SEGURANÇA (OBRIGATÓRIAS)
1. NUNCA inclua ingredientes das listas proibidas acima
2. Se encontrar indicador de segurança (ex: "sem lactose", "zero glúten"), o produto pode ser seguro
3. Em caso de DÚVIDA, sempre assuma o PIOR cenário (fail-safe)
4. Qualquer violação é considerada CRÍTICA para a saúde do usuário
`;
}

/**
 * Gera estatísticas do banco de dados para logging/debug
 */
export function getDatabaseStats(database: SafetyDatabase): string {
  const stats: string[] = [];
  
  stats.push(`Intolerances: ${database.intoleranceMappings.size} types`);
  stats.push(`Dietary profiles: ${database.dietaryForbidden.size} types`);
  
  let totalIngredients = 0;
  for (const [_, ingredients] of database.intoleranceMappings) {
    totalIngredients += ingredients.length;
  }
  stats.push(`Total intolerance ingredients: ${totalIngredients}`);
  
  let totalDietary = 0;
  for (const [_, ingredients] of database.dietaryForbidden) {
    totalDietary += ingredients.length;
  }
  stats.push(`Total dietary forbidden: ${totalDietary}`);
  
  return stats.join(" | ");
}

/**
 * Limpa o cache forçando reload na próxima chamada
 */
export function clearCache(): void {
  cachedDatabase = null;
  cacheTimestamp = 0;
}
