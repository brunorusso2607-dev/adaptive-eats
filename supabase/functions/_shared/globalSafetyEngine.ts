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
 * 
 * INTERNACIONALIZAÇÃO (i18n):
 * - intolerance_mappings: Termos globais (sem coluna de idioma)
 *   → Inclui ingredientes em PT, EN, ES, FR, DE, IT, e outros idiomas
 *   → Novos países/idiomas herdam TODAS as configurações automaticamente
 * - intolerance_safe_keywords: Termos globais de segurança
 *   → Ex: "sem lactose", "lactose free", "sans lactose", "laktosefrei"
 * - dietary_forbidden_ingredients: Tem coluna 'language' mas CARREGA TODOS
 *   → Sistema usa todos os idiomas em conjunto para validação
 *   → Novo idioma adicionado no banco é automaticamente incluído
 * 
 * REGRA DE HERANÇA:
 * Quando um novo país/idioma é adicionado ao sistema:
 * 1. Os intolerance_mappings existentes já cobrem múltiplos idiomas
 * 2. Basta adicionar novos termos no banco de dados
 * 3. O cache é recarregado automaticamente (TTL: 2 minutos)
 * 4. Todas as edge functions herdam as novas configurações
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============= INTERFACES =============

export interface IntoleranceMapping {
  intolerance_key: string;
  ingredient: string;
  severity_level?: string; // 'high' = block, 'low' = caution/warning, 'safe' = allowed
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
  intoleranceMappings: Map<string, string[]>; // high severity only (blocked)
  cautionMappings: Map<string, string[]>; // low severity (warning only)
  safeKeywords: Map<string, string[]>;
  dietaryForbidden: Map<string, string[]>;
  keyNormalization: Map<string, string[]>; // CHANGED: now maps to ARRAY of database keys
  keyLabels: Map<string, string>;
  dietaryLabels: Map<string, string>;  // from dietary_profiles table
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
  isCaution?: boolean; // true = contains low-severity ingredient (warning only)
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
  severity?: 'high' | 'low'; // high = block, low = warning
}

export interface SafetyCheckResult {
  isSafe: boolean;
  conflicts: ConflictDetail[]; // high severity = blocks
  warnings: ConflictDetail[]; // low severity = warnings only
  safeReasons: string[];
}

// ============= CACHE =============

let cachedDatabase: SafetyDatabase | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes - reduced for faster updates

// ============= CRITICAL FALLBACK - LOCAL SAFETY NET =============
// These ingredients are ALWAYS blocked if database is unavailable.
// This is the LAST LINE OF DEFENSE for user safety.
// Format: { intoleranceKey: [critical ingredients] }
const CRITICAL_FALLBACK_MAPPINGS: Record<string, string[]> = {
  // === INTOLERÂNCIAS ===
  gluten: ["trigo", "wheat", "centeio", "rye", "cevada", "barley", "malte", "malt", "aveia", "oats", "farinha de trigo", "wheat flour", "gluten", "glúten", "seitan", "cerveja", "beer"],
  lactose: ["leite", "milk", "queijo", "cheese", "iogurte", "yogurt", "creme de leite", "cream", "manteiga", "butter", "nata", "whey", "soro de leite", "lactose", "requeijão", "ricota"],
  fructose: ["mel", "honey", "agave", "xarope de milho", "corn syrup", "frutose", "fructose", "xarope de frutose", "high fructose"],
  sorbitol: ["sorbitol", "ameixa", "prune", "pêssego", "peach", "damasco", "apricot", "cereja", "cherry", "maçã", "apple", "pera", "pear", "chiclete", "gum"],
  fodmap: ["alho", "garlic", "cebola", "onion", "maçã", "apple", "mel", "honey", "trigo", "wheat", "feijão", "beans", "grão de bico", "chickpea", "lentilha", "lentil"],
  
  // === ALERGIAS (7) ===
  egg: ["ovo", "egg", "ovos", "eggs", "gema", "yolk", "clara de ovo", "egg white", "albumina", "albumin", "maionese", "mayonnaise"],
  peanut: ["amendoim", "peanut", "manteiga de amendoim", "peanut butter", "pasta de amendoim"],
  nuts: ["castanha", "nut", "nozes", "walnuts", "amêndoas", "almonds", "avelã", "hazelnut", "pistache", "pistachio", "macadâmia", "macadamia", "pecã", "pecan", "castanha de caju", "cashew"],
  seafood: ["camarão", "shrimp", "lagosta", "lobster", "caranguejo", "crab", "ostra", "oyster", "mexilhão", "mussel", "lula", "squid", "polvo", "octopus", "marisco", "shellfish"],
  fish: ["peixe", "fish", "salmão", "salmon", "atum", "tuna", "bacalhau", "cod", "sardinha", "sardine", "tilápia", "tilapia", "anchova", "anchovy"],
  soy: ["soja", "soy", "tofu", "molho de soja", "soy sauce", "shoyu", "edamame", "tempeh", "missô", "miso", "lecitina de soja"],
  sesame: ["gergelim", "sesame", "tahine", "tahini", "óleo de gergelim", "sesame oil", "pasta de gergelim"],
  
  // === SENSIBILIDADES ===
  histamine: ["vinho", "wine", "cerveja", "beer", "queijo curado", "aged cheese", "salame", "salami", "presunto", "ham", "atum enlatado", "canned tuna", "espinafre", "spinach", "tomate", "tomato", "vinagre", "vinegar"],
  caffeine: ["café", "coffee", "cafeína", "caffeine", "chá preto", "black tea", "chá verde", "green tea", "chocolate", "guaraná", "guarana", "energético", "energy drink", "cola", "mate"],
  sulfite: ["sulfito", "sulfite", "vinho", "wine", "cerveja", "beer", "frutas secas", "dried fruit", "vinagre", "vinegar", "camarão congelado", "frozen shrimp", "batata congelada", "frozen potato"],
  salicylate: ["aspirina", "aspirin", "salicilato", "salicylate", "morango", "strawberry", "framboesa", "raspberry", "hortelã", "mint", "curry", "páprica", "paprika"],
  corn: ["milho", "corn", "amido de milho", "corn starch", "fubá", "cornmeal", "xarope de milho", "corn syrup", "polenta", "pipoca", "popcorn", "óleo de milho", "corn oil"],
  nickel: ["cacau", "cocoa", "chocolate", "aveia", "oats", "oleaginosas", "nuts", "soja", "soy", "feijão", "beans", "lentilha", "lentil", "espinafre", "spinach"]
};

const CRITICAL_DIETARY_FALLBACK: Record<string, string[]> = {
  vegan: ["carne", "meat", "frango", "chicken", "peixe", "fish", "ovo", "egg", "leite", "milk", "queijo", "cheese", "mel", "honey", "manteiga", "butter", "bacon", "presunto", "ham"],
  vegetarian: ["carne", "meat", "frango", "chicken", "peixe", "fish", "bacon", "presunto", "ham", "linguiça", "sausage"],
  pescatarian: ["carne", "meat", "frango", "chicken", "bacon", "presunto", "ham", "linguiça", "boi", "beef", "porco", "pork"]
};

const CRITICAL_SAFE_KEYWORDS: Record<string, string[]> = {
  // === CORE INTOLERÂNCIAS (3) ===
  lactose: ["sem lactose", "lactose free", "lactose-free", "vegetal", "plant-based", "vegan"],
  gluten: ["sem glúten", "gluten free", "gluten-free", "sem trigo", "wheat free"],
  fodmap: ["low fodmap", "baixo fodmap", "fodmap friendly"],
  
  // === ALERGIAS (7) ===
  egg: ["sem ovo", "egg free", "sem ovos", "egg-free", "vegan"],
  peanut: ["sem amendoim", "peanut free", "peanut-free"],
  nuts: ["sem oleaginosas", "nut free", "sem nozes", "tree nut free", "nut-free"],
  seafood: ["sem frutos do mar", "shellfish free", "sem marisco"],
  fish: ["sem peixe", "fish free"],
  soy: ["sem soja", "soy free", "soy-free"],
  sesame: ["sem gergelim", "sesame free"],
  
  // === SENSIBILIDADES ===
  histamine: ["baixa histamina", "low histamine"],
  caffeine: ["sem cafeína", "caffeine free", "descafeinado", "decaf"],
  sulfite: ["sem sulfito", "sulfite free", "sem conservantes"],
  salicylate: ["baixo salicilato", "low salicylate"],
  corn: ["sem milho", "corn free"],
  nickel: ["baixo níquel", "low nickel"]
};

// ============= LABELS AMIGÁVEIS =============
// SINCRONIZADO com onboarding_options (jan/2026)
// 18 restrições: 5 intolerâncias + 7 alergias + 6 sensibilidades

export const INTOLERANCE_LABELS: Record<string, string> = {
  // === INTOLERÂNCIAS (5) ===
  gluten: "Glúten",
  lactose: "Lactose",
  fructose: "Frutose",
  sorbitol: "Sorbitol",
  fodmap: "FODMAP",
  
  // === ALERGIAS (7) ===
  egg: "Ovos",
  peanut: "Amendoim",
  nuts: "Oleaginosas",
  tree_nuts: "Oleaginosas", // alias do banco para 'nuts'
  seafood: "Frutos do Mar",
  fish: "Peixe",
  soy: "Soja",
  sesame: "Gergelim",
  
  // === SENSIBILIDADES (6) ===
  histamine: "Histamina",
  caffeine: "Cafeína",
  sulfite: "Sulfito",
  salicylate: "Salicilato",
  corn: "Milho",
  nickel: "Níquel",
  
  // === ESPECIAL ===
  none: "Nenhuma",
  
  // === ALIASES LEGADOS para compatibilidade ===
  sugar: "Açúcar",
  milk: "Leite",
  wheat: "Trigo",
  alcohol: "Álcool",
  lupin: "Tremoço",
  mustard: "Mostarda", // legado
  celery: "Aipo", // legado
};

export const DIETARY_LABELS: Record<string, string> = {
  // === CHAVES CANÔNICAS EM INGLÊS (sincronizado com dietary_profiles e onboarding_options) ===
  omnivore: "Onívoro",
  vegetarian: "Vegetarianismo",
  vegan: "Veganismo",
  pescatarian: "Pescetarianismo",
  flexitarian: "Flexitariana",
  ketogenic: "Cetogênica",
  low_carb: "Low Carb",
  
  // === ALIASES LEGADOS para compatibilidade (podem ser removidos no futuro) ===
  vegana: "Veganismo",
  vegetariana: "Vegetarianismo",
  pescetariana: "Pescetarianismo",
  comum: "Onívoro",
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
 * Cria um SafetyDatabase usando APENAS os fallbacks locais críticos.
 * Usado quando o banco de dados está indisponível.
 */
function createFallbackDatabase(): SafetyDatabase {
  console.warn("[GlobalSafetyEngine] USANDO FALLBACK LOCAL - Banco indisponível");
  
  const intoleranceMappings = new Map<string, string[]>();
  const safeKeywords = new Map<string, string[]>();
  const dietaryForbidden = new Map<string, string[]>();
  
  // Carregar fallbacks críticos de intolerâncias
  for (const [key, ingredients] of Object.entries(CRITICAL_FALLBACK_MAPPINGS)) {
    intoleranceMappings.set(key, ingredients.map(i => normalizeText(i)));
  }
  
  // Carregar fallbacks críticos de dietas
  for (const [key, ingredients] of Object.entries(CRITICAL_DIETARY_FALLBACK)) {
    dietaryForbidden.set(key, ingredients.map(i => normalizeText(i)));
  }
  
  // Carregar fallbacks de safe keywords
  for (const [key, keywords] of Object.entries(CRITICAL_SAFE_KEYWORDS)) {
    safeKeywords.set(key, keywords.map(k => normalizeText(k)));
  }
  
  return {
    intoleranceMappings,
    cautionMappings: new Map(),
    safeKeywords,
    dietaryForbidden,
    keyNormalization: new Map(),
    keyLabels: new Map(),
    dietaryLabels: new Map(),
    allIntoleranceKeys: Object.keys(CRITICAL_FALLBACK_MAPPINGS),
    allDietaryKeys: Object.keys(CRITICAL_DIETARY_FALLBACK)
  };
}

/**
 * Mescla os dados do banco com os fallbacks críticos locais.
 * Isso garante que mesmo se algo faltar no banco, os ingredientes críticos estejam protegidos.
 */
function mergeWithCriticalFallbacks(database: SafetyDatabase): SafetyDatabase {
  // Adicionar fallbacks críticos ao intoleranceMappings (se ainda não existirem)
  for (const [key, ingredients] of Object.entries(CRITICAL_FALLBACK_MAPPINGS)) {
    const existing = database.intoleranceMappings.get(key) || [];
    const normalizedFallbacks = ingredients.map(i => normalizeText(i));
    
    // Adicionar apenas os que não existem
    for (const fallback of normalizedFallbacks) {
      if (!existing.includes(fallback)) {
        existing.push(fallback);
      }
    }
    database.intoleranceMappings.set(key, existing);
  }
  
  // Adicionar fallbacks críticos de dietas
  for (const [key, ingredients] of Object.entries(CRITICAL_DIETARY_FALLBACK)) {
    const existing = database.dietaryForbidden.get(key) || [];
    const normalizedFallbacks = ingredients.map(i => normalizeText(i));
    
    for (const fallback of normalizedFallbacks) {
      if (!existing.includes(fallback)) {
        existing.push(fallback);
      }
    }
    database.dietaryForbidden.set(key, existing);
  }
  
  // Adicionar fallbacks de safe keywords
  for (const [key, keywords] of Object.entries(CRITICAL_SAFE_KEYWORDS)) {
    const existing = database.safeKeywords.get(key) || [];
    const normalizedFallbacks = keywords.map(k => normalizeText(k));
    
    for (const fallback of normalizedFallbacks) {
      if (!existing.includes(fallback)) {
        existing.push(fallback);
      }
    }
    database.safeKeywords.set(key, existing);
  }
  
  return database;
}

/**
 * Carrega todos os dados de segurança do banco de dados.
 * Utiliza cache de 2 minutos para performance.
 * Se o banco falhar, usa fallback local de ingredientes críticos.
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

  // Se não há credenciais, usar fallback
  if (!url || !key) {
    console.warn("[GlobalSafetyEngine] Sem credenciais - usando fallback local");
    cachedDatabase = createFallbackDatabase();
    cacheTimestamp = now;
    return cachedDatabase;
  }

  const supabaseClient = createClient(url, key, {
    auth: { persistSession: false }
  });

  try {
    // Helper function to fetch all records with explicit pagination
    // Supabase has a default limit of 1000 rows per request
    async function fetchAllMappings(): Promise<IntoleranceMapping[]> {
      const pageSize = 1000;
      let allData: IntoleranceMapping[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabaseClient
          .from("intolerance_mappings")
          .select("intolerance_key, ingredient, severity_level")
          .range(from, from + pageSize - 1);

        if (error) {
          console.error("[GlobalSafetyEngine] Error fetching mappings page:", error);
          throw new Error(`Failed to load intolerance mappings: ${error.message}`);
        }

        if (data && data.length > 0) {
          allData = allData.concat(data as IntoleranceMapping[]);
          from += pageSize;
          // If we got less than pageSize, we've reached the end
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      return allData;
    }

    // Fetch mappings with pagination, other tables in parallel
    const [
      allMappings,
      safeKeywordsResult,
      dietaryResult,
      normalizationResult,
      dietaryProfilesResult
    ] = await Promise.all([
      fetchAllMappings(),
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

    // Organizar dados em Maps para acesso O(1)
    // Separar por severity: high = blocked, low = caution/warning
    const intoleranceMappings = new Map<string, string[]>();
    const cautionMappings = new Map<string, string[]>();
    const allIntoleranceKeys = new Set<string>();

    for (const row of allMappings) {
      allIntoleranceKeys.add(row.intolerance_key);
      const normalizedIngredient = normalizeText(row.ingredient);
      
      // Severity 'low' goes to caution, 'high' or undefined goes to blocked
      if (row.severity_level === 'low') {
        if (!cautionMappings.has(row.intolerance_key)) {
          cautionMappings.set(row.intolerance_key, []);
        }
        cautionMappings.get(row.intolerance_key)!.push(normalizedIngredient);
      } else if (row.severity_level !== 'safe') {
        // 'high', 'unknown', or undefined = blocked
        if (!intoleranceMappings.has(row.intolerance_key)) {
          intoleranceMappings.set(row.intolerance_key, []);
        }
        intoleranceMappings.get(row.intolerance_key)!.push(normalizedIngredient);
      }
      // severity_level === 'safe' is ignored (allowed foods)
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

    // CHANGED: Now supports MULTIPLE database_keys per onboarding_key
    // This allows "seafood" to map to both "seafood" AND "shellfish"
    const keyNormalization = new Map<string, string[]>();
    const keyLabels = new Map<string, string>();
    for (const row of (normalizationResult.data as KeyNormalization[]) || []) {
      // Append to array instead of overwrite
      const existingKeys = keyNormalization.get(row.onboarding_key) || [];
      if (!existingKeys.includes(row.database_key)) {
        existingKeys.push(row.database_key);
      }
      keyNormalization.set(row.onboarding_key, existingKeys);
      keyLabels.set(row.onboarding_key, row.label);
      keyLabels.set(row.database_key, row.label);
    }

    // Processar dietary labels do banco
    const dietaryLabels = new Map<string, string>();
    for (const row of (dietaryProfilesResult.data as DietaryProfile[]) || []) {
      dietaryLabels.set(row.key, row.name);
    }

    let database: SafetyDatabase = {
      intoleranceMappings,
      cautionMappings,
      safeKeywords,
      dietaryForbidden,
      keyNormalization,
      keyLabels,
      dietaryLabels,
      allIntoleranceKeys: Array.from(allIntoleranceKeys),
      allDietaryKeys: Array.from(allDietaryKeys)
    };

    // MESCLAR com fallbacks críticos para garantir segurança máxima
    database = mergeWithCriticalFallbacks(database);

    cachedDatabase = database;
    cacheTimestamp = now;

    console.log(`[GlobalSafetyEngine] Loaded: ${intoleranceMappings.size} intolerance types (blocked), ${cautionMappings.size} caution types, ${dietaryForbidden.size} dietary profiles, ${dietaryLabels.size} dietary labels, ${allMappings.length} total ingredients (+ critical fallbacks merged)`);

    return cachedDatabase;
  } catch (error) {
    console.error("[GlobalSafetyEngine] Database error, using fallback:", error);
    
    // Se o banco falhou, usar fallback local
    cachedDatabase = createFallbackDatabase();
    cacheTimestamp = now;
    return cachedDatabase;
  }
}

/**
 * Normaliza uma key de intolerância do onboarding para as keys do banco de dados
 * CHANGED: Now returns ARRAY of keys (one onboarding key can map to multiple DB keys)
 * E.g., "seafood" maps to ["seafood", "shellfish"]
 */
export function normalizeIntoleranceKey(
  onboardingKey: string,
  database: SafetyDatabase
): string[] {
  return database.keyNormalization.get(onboardingKey) || [onboardingKey];
}

/**
 * Normaliza uma lista de intolerâncias do usuário
 * CHANGED: Now flattens array of arrays since one key can map to multiple DB keys
 */
export function normalizeUserIntolerances(
  userIntolerances: string[],
  database: SafetyDatabase
): string[] {
  const expanded = userIntolerances
    .filter(i => i && i !== "none" && i !== "nenhuma")
    .flatMap(i => normalizeIntoleranceKey(i, database));
  
  // Remove duplicates
  return [...new Set(expanded)];
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
/**
 * Verifica se uma palavra está contida como palavra completa em outra string
 * Evita falsos positivos como "maçã" matchando "macaron" ou "alho" em "galho"
 * 
 * IMPORTANTE: Para ingredientes compostos como "arroz doce", a função verifica se
 * TODAS as palavras do termo de busca estão presentes no texto.
 * Ex: "arroz doce" NÃO deve matchear "arroz branco cozido" (falta "doce")
 */
export function containsWholeWord(text: string, word: string): boolean {
  if (!text || !word) return false;
  
  // Se são iguais, é match perfeito
  if (text === word) return true;
  
  // Delimitadores comuns
  const delimiters = '[\\s,;:()\\[\\]\\-\\/]';
  
  // Se o termo de busca contém múltiplas palavras, TODAS devem estar presentes
  const searchWords = word.trim().split(/\s+/);
  if (searchWords.length > 1) {
    // Para termos compostos como "arroz doce", verifica se TODAS as palavras estão no texto
    return searchWords.every(w => {
      const escapedW = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|${delimiters})${escapedW}(${delimiters}|$)`, 'i');
      return regex.test(text);
    });
  }
  
  // Escapar caracteres especiais de regex
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Padrão: (início ou delimitador) + palavra + (fim ou delimitador)
  const regex = new RegExp(`(^|${delimiters})${escapedWord}(${delimiters}|$)`, 'i');
  
  return regex.test(text);
}

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
  
  // Verificar se contém ingredientes BLOQUEADOS (severity = high)
  const forbiddenIngredients = database.intoleranceMappings.get(intoleranceKey) || [];
  
  for (const forbidden of forbiddenIngredients) {
    if (containsWholeWord(normalizedIngredient, forbidden)) {
      return {
        isValid: false,
        isCaution: false,
        reason: `Contém ${forbidden} (intolerância: ${getIntoleranceLabel(intoleranceKey, database)})`,
        restriction: `intolerance_${intoleranceKey}`,
        matchedIngredient: forbidden
      };
    }
  }
  
  // Verificar se contém ingredientes de ATENÇÃO (severity = low)
  // Estes NÃO bloqueiam, apenas geram warning
  const cautionIngredients = database.cautionMappings.get(intoleranceKey) || [];
  
  for (const caution of cautionIngredients) {
    if (containsWholeWord(normalizedIngredient, caution)) {
      return {
        isValid: true, // NÃO bloqueia
        isCaution: true, // Mas gera warning
        reason: `Contém pequena quantidade de ${getIntoleranceLabel(intoleranceKey, database)} (${caution})`,
        restriction: `intolerance_${intoleranceKey}`,
        matchedIngredient: caution
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Verifica se um ingrediente conflita com um perfil dietético
 * ATUALIZADO: Agora verifica safe keywords para dietas também
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
  
  // NOVO: Primeiro verificar se é um ingrediente SEGURO para esta dieta
  // Usa a mesma tabela intolerance_safe_keywords com dietaryKey
  const safeWords = database.safeKeywords.get(dietaryKey) || [];
  for (const safeWord of safeWords) {
    if (normalizedIngredient.includes(normalizeText(safeWord))) {
      return { 
        isValid: true, 
        reason: `Ingrediente seguro para ${getDietaryLabel(dietaryKey)}: contém "${safeWord}"` 
      };
    }
  }
  
  const forbiddenIngredients = database.dietaryForbidden.get(dietaryKey) || [];
  
  for (const forbidden of forbiddenIngredients) {
    // Usar containsWholeWord para evitar falsos positivos
    if (containsWholeWord(normalizedIngredient, forbidden)) {
      return {
        isValid: false,
        reason: `Contém ingrediente animal: ${forbidden}`,
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
    // Usar containsWholeWord para evitar falsos positivos
    if (containsWholeWord(normalizedIngredient, normalizedExcluded)) {
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
  const warnings: ConflictDetail[] = [];
  const safeReasons: string[] = [];
  
  for (const ingredient of ingredients) {
    const result = validateIngredient(ingredient, restrictions, database);
    
    if (!result.isValid && result.restriction && result.matchedIngredient) {
      // Blocked ingredient (high severity)
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
        originalIngredient: ingredient,
        severity: 'high'
      });
    } else if (result.isCaution && result.restriction && result.matchedIngredient) {
      // Caution ingredient (low severity) - warning only, doesn't block
      let type: 'intolerance' | 'dietary' | 'excluded' = 'intolerance';
      let key = 'unknown';
      let label = 'Atenção';
      
      if (result.restriction.startsWith('intolerance_')) {
        key = result.restriction.replace('intolerance_', '');
        label = getIntoleranceLabel(key, database);
      }
      
      warnings.push({
        type,
        key,
        label,
        matchedIngredient: result.matchedIngredient,
        originalIngredient: ingredient,
        severity: 'low'
      });
    } else if (result.reason) {
      safeReasons.push(result.reason);
    }
  }
  
  return {
    isSafe: conflicts.length === 0, // Only blocked ingredients affect safety
    conflicts,
    warnings,
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

// ============= DECOMPOSIÇÃO DE ALIMENTOS PROCESSADOS =============
// Centralizado aqui para uso em TODOS os módulos do app

/**
 * Palavras-chave que indicam alimentos processados que precisam ser decompostos
 * Usado por: analyze-food-photo, analyze-label-photo, analyze-fridge-photo
 */
export const PROCESSED_FOOD_KEYWORDS = [
  // Padaria e massas
  'biscoito', 'bolacha', 'pão', 'bolo', 'torta', 'pizza', 'macarrão', 'massa', 
  'salgado', 'pastel', 'empada', 'coxinha', 'esfiha', 'croissant', 'wafer',
  'cookie', 'cracker', 'muffin', 'brownie', 'donut', 'rosquinha', 'pretzel',
  'sanduíche', 'hambúrguer', 'hot dog', 'cachorro quente', 'wrap', 'tapioca',
  'lasanha', 'nhoque', 'ravioli', 'cappelletti', 'ravióli', 'canelone',
  'panqueca', 'crepe', 'waffle', 'churros', 'sonho', 'bomba', 'éclair',
  'panetone', 'colomba', 'brioche', 'focaccia', 'ciabatta', 'baguete',
  'cereal', 'granola', 'muesli', 'barra de cereal', 'snack', 'chips',
  'sorvete', 'picolé', 'açaí', 'pudim', 'mousse', 'cheesecake',
  'bagel', 'broa', 'pita', 'scone', 'danish', 'folhado', 'vol-au-vent',
  'canapé', 'bruschetta', 'quiche', 'panko', 'crouton',
  // Doces brasileiros
  'brigadeiro', 'beijinho', 'cajuzinho', 'paçoca', 'pé de moleque',
  'canjica', 'arroz doce', 'mingau', 'manjar', 'quindim', 'romeu e julieta',
  // Bebidas
  'vitamina', 'milk shake', 'milkshake', 'cappuccino', 'café com leite',
  'achocolatado', 'yakult', 'leite fermentado', 'petit suisse', 'danoninho',
  'cerveja', 'beer', 'heineken', 'brahma', 'skol', 'budweiser', 'corona',
  'refrigerante', 'frappuccino', 'latte', 'mocha', 'chai',
  'smoothie', 'shake', 'whisky', 'whiskey', 'vodka', 'gin', 'baileys',
  'licor', 'vinho', 'champagne', 'sidra', 'sakê', 'sake', 'chopp',
  'ovomaltine', 'toddy', 'nescau', 'kefir', 'lassi', 'horchata',
  'protein shake', 'whey', 'mass gainer',
  // Pratos regionais
  'strogonoff', 'strogonofe', 'escondidinho', 'bobó', 'moqueca', 'vatapá',
  'acarajé', 'pão de queijo', 'cuscuz', 'polenta', 'purê', 'xinxim',
  'caruru', 'tacacá', 'baião', 'tropeiro', 'carreteiro', 'galinhada',
  'pamonha', 'curau', 'cural', 'mungunzá',
  // Oriental
  'sushi', 'tempurá', 'tempura', 'yakisoba', 'rolinho primavera', 'guioza',
  'dumpling', 'miojo', 'lámen', 'lamen', 'ramen', 'udon', 'soba',
  'takoyaki', 'okonomiyaki', 'tonkatsu', 'korokke', 'gyudon', 'katsudon',
  'oyakodon', 'natto', 'unagi', 'tamagoyaki', 'dim sum', 'siu mai',
  'har gow', 'baozi', 'jiaozi', 'wonton', 'char siu', 'congee',
  // Sobremesas internacionais
  'tiramisù', 'tiramisu', 'panna cotta', 'creme brulee', 'crème brûlée',
  'petit gateau', 'pastel de nata', 'pão de mel', 'affogato',
  'cinnamon roll', 'macaron', 'blondie', 'pavê',
  'trifle', 'banana split', 'sundae',
  // Embutidos e processados
  'salsicha', 'linguiça', 'mortadela', 'presunto', 'nugget', 'empanado',
  'almôndega', 'croquete', 'bolinho', 'isca', 'milanesa',
  // Salgadinhos
  'doritos', 'cheetos', 'salgadinho', 'pipoca', 'ruffles', 'pringles',
  // Cremes e pastas
  'nutella', 'creme de avelã', 'requeijão', 'cream cheese',
  // Fast food
  'big mac', 'whopper', 'mcchicken', 'mcnuggets', 'mcflurry', 'cheeseburger',
  // Sopas e caldos
  'sopa', 'caldo', 'canja', 'minestrone', 'missoshiru',
  // Pratos internacionais
  'pad thai', 'curry', 'pho', 'banh mi', 'kimchi', 'bibimbap',
  'taco', 'burrito', 'quesadilla', 'nachos', 'falafel', 'shawarma', 'kebab',
  'tikka masala', 'naan', 'samosa', 'biryani',
];

/**
 * Mapa de decomposição local para alimentos processados
 * Usado como fallback quando o banco de dados não tem a decomposição
 */
export const DECOMPOSITION_MAP: Record<string, string[]> = {
  // Bebidas com glúten
  'cerveja': ['cevada', 'trigo', 'lúpulo', 'glúten', 'malte'],
  'beer': ['barley', 'wheat', 'hops', 'gluten', 'malt'],
  'heineken': ['cevada', 'trigo', 'lúpulo', 'glúten', 'malte'],
  'brahma': ['cevada', 'trigo', 'lúpulo', 'glúten', 'malte'],
  'skol': ['cevada', 'trigo', 'lúpulo', 'glúten', 'malte'],
  'budweiser': ['cevada', 'trigo', 'lúpulo', 'glúten', 'malte'],
  'corona': ['cevada', 'trigo', 'lúpulo', 'glúten', 'malte'],
  'chopp': ['cevada', 'trigo', 'lúpulo', 'glúten', 'malte'],
  'cerveja de trigo': ['trigo', 'glúten', 'cevada', 'malte'],
  'whisky': ['cevada maltada', 'glúten'],
  'whiskey': ['cevada maltada', 'glúten'],
  
  // Pães
  'pão': ['farinha de trigo', 'trigo', 'fermento', 'sal', 'açúcar'],
  'pão de forma': ['farinha de trigo', 'trigo', 'fermento', 'açúcar', 'leite', 'soja'],
  'pão francês': ['farinha de trigo', 'trigo', 'fermento', 'sal', 'leite'],
  'pão de queijo': ['polvilho', 'queijo', 'leite', 'ovo'],
  
  // Massas
  'macarrão': ['farinha de trigo', 'trigo', 'ovo'],
  'pizza': ['farinha de trigo', 'trigo', 'queijo', 'tomate'],
  'lasanha': ['farinha de trigo', 'trigo', 'ovo', 'queijo', 'leite', 'carne'],
  
  // Laticínios
  'sorvete': ['leite', 'açúcar', 'creme de leite'],
  'queijo': ['leite'],
  'iogurte': ['leite', 'fermento lácteo'],
  
  // Doces
  'brigadeiro': ['leite condensado', 'leite', 'chocolate', 'cacau', 'manteiga'],
  'pudim': ['leite', 'ovo', 'açúcar', 'caramelo'],
  'bolo': ['farinha de trigo', 'trigo', 'açúcar', 'ovo', 'leite', 'manteiga'],
  
  // Embutidos
  'salsicha': ['carne', 'amido', 'sal', 'soja', 'lactose'],
  'mortadela': ['carne', 'amido', 'sal', 'soja', 'lactose'],
  'presunto': ['carne suína', 'sal', 'açúcar', 'lactose'],
  
  // Salgados
  'coxinha': ['farinha de trigo', 'trigo', 'frango', 'leite', 'ovo'],
  'pastel': ['farinha de trigo', 'trigo', 'gordura', 'ovo'],
  'empada': ['farinha de trigo', 'trigo', 'manteiga', 'ovo'],
};

/**
 * Verifica se um alimento é processado e precisa ser decomposto
 */
export function isProcessedFood(foodName: string): boolean {
  const normalized = foodName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return PROCESSED_FOOD_KEYWORDS.some(keyword => 
    normalized.includes(keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
  );
}

/**
 * Busca decomposição no banco de dados food_decomposition_mappings
 * @param foodName Nome do alimento
 * @param supabaseUrl URL do Supabase
 * @param supabaseKey Chave de serviço do Supabase
 * @param userCountry País do usuário para priorização de idioma
 */
export async function getDecompositionFromDatabase(
  foodName: string,
  supabaseUrl?: string,
  supabaseKey?: string,
  userCountry: string = 'BR'
): Promise<string[] | null> {
  try {
    const url = supabaseUrl || Deno.env.get('SUPABASE_URL');
    const key = supabaseKey || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!url || !key) return null;
    
    const serviceClient = createClient(url, key);
    const normalized = foodName.toLowerCase().trim();
    
    // 1. Buscar em EN primeiro (padrão global)
    const { data: enData, error: enError } = await serviceClient
      .from('food_decomposition_mappings')
      .select('base_ingredients')
      .eq('is_active', true)
      .eq('language', 'en')
      .ilike('food_name', `%${normalized}%`)
      .limit(1)
      .single();
    
    if (!enError && enData?.base_ingredients?.length > 0) {
      console.log(`[GlobalSafetyEngine] Found EN decomposition for "${foodName}":`, enData.base_ingredients);
      return enData.base_ingredients;
    }
    
    // 2. Buscar no idioma do país do usuário
    const languageMap: Record<string, string> = { 'BR': 'br', 'PT': 'pt', 'ES': 'es', 'MX': 'es' };
    const lang = languageMap[userCountry] || 'en';
    
    if (lang !== 'en') {
      const { data: langData, error: langError } = await serviceClient
        .from('food_decomposition_mappings')
        .select('base_ingredients')
        .eq('is_active', true)
        .eq('language', lang)
        .ilike('food_name', `%${normalized}%`)
        .limit(1)
        .single();
      
      if (!langError && langData?.base_ingredients?.length > 0) {
        console.log(`[GlobalSafetyEngine] Found ${lang} decomposition for "${foodName}":`, langData.base_ingredients);
        return langData.base_ingredients;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Decompõe um alimento processado em ingredientes base
 * Prioridade: 1. Banco de dados, 2. Mapa local, 3. Nome original
 */
export async function decomposeFood(
  foodName: string,
  supabaseUrl?: string,
  supabaseKey?: string,
  userCountry: string = 'BR'
): Promise<string[]> {
  const normalized = foodName.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // 1. Tentar banco de dados primeiro
  const dbDecomposition = await getDecompositionFromDatabase(foodName, supabaseUrl, supabaseKey, userCountry);
  if (dbDecomposition && dbDecomposition.length > 0) {
    return dbDecomposition;
  }
  
  // 2. Fallback: Mapa local
  for (const [key, ingredients] of Object.entries(DECOMPOSITION_MAP)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(keyNormalized) || keyNormalized.includes(normalized)) {
      console.log(`[GlobalSafetyEngine] Using local decomposition for "${foodName}" → "${key}"`);
      return ingredients;
    }
  }
  
  // 3. Match parcial por palavras
  for (const [key, ingredients] of Object.entries(DECOMPOSITION_MAP)) {
    const keyNormalized = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const keyWords = keyNormalized.split(' ');
    if (keyWords.some(word => word.length > 3 && normalized.includes(word))) {
      console.log(`[GlobalSafetyEngine] Using partial match for "${foodName}" → "${key}"`);
      return ingredients;
    }
  }
  
  // 4. Retorna nome original se não conseguir decompor
  return [foodName];
}

/**
 * Valida um alimento com decomposição automática
 * Esta função decompõe automaticamente alimentos processados antes de validar
 * 
 * @param foodName Nome do alimento ou produto
 * @param restrictions Restrições do usuário
 * @param database Base de dados de segurança
 * @param supabaseUrl URL do Supabase (opcional)
 * @param supabaseKey Chave de serviço (opcional)
 * @param userCountry País do usuário (padrão: BR)
 */
export async function validateFoodWithDecomposition(
  foodName: string,
  restrictions: UserRestrictions,
  database: SafetyDatabase,
  supabaseUrl?: string,
  supabaseKey?: string,
  userCountry: string = 'BR'
): Promise<SafetyCheckResult & { decomposedIngredients?: string[], wasDecomposed?: boolean }> {
  let ingredientsToValidate: string[] = [foodName];
  let wasDecomposed = false;
  
  // Se é alimento processado, decompor primeiro
  if (isProcessedFood(foodName)) {
    const decomposed = await decomposeFood(foodName, supabaseUrl, supabaseKey, userCountry);
    if (decomposed.length > 0 && (decomposed.length > 1 || decomposed[0] !== foodName)) {
      ingredientsToValidate = decomposed;
      wasDecomposed = true;
      console.log(`[GlobalSafetyEngine] Decomposed "${foodName}" into:`, decomposed);
    }
  }
  
  // Validar todos os ingredientes (incluindo o nome original para segurança)
  const allItems = wasDecomposed ? [foodName, ...ingredientsToValidate] : ingredientsToValidate;
  const result = validateIngredientList(allItems, restrictions, database);
  
  return {
    ...result,
    decomposedIngredients: wasDecomposed ? ingredientsToValidate : undefined,
    wasDecomposed
  };
}

