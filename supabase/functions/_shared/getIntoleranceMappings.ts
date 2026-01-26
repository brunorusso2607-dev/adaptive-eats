/**
 * @deprecated v2.0: Este módulo foi substituído pelo globalSafetyEngine.ts
 * Use loadSafetyDatabase() e as funções de validação do globalSafetyEngine.ts.
 * Este arquivo é mantido apenas para compatibilidade com código legado.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { containsWholeWord } from "./globalSafetyEngine.ts";

interface IntoleranceMapping {
  intolerance_key: string;
  ingredient: string;
}

interface SafeKeyword {
  intolerance_key: string;
  keyword: string;
}

interface IntoleranceData {
  mappings: Map<string, string[]>;
  safeKeywords: Map<string, string[]>;
  allIntoleranceKeys: string[];
}

// Labels amigáveis para intolerâncias
export const INTOLERANCE_LABELS: Record<string, string> = {
  lactose: "Lactose",
  gluten: "Glúten",
  amendoim: "Amendoim",
  oleaginosas: "Oleaginosas/Castanhas",
  frutos_do_mar: "Frutos do Mar",
  peixe: "Peixe",
  ovo: "Ovo",
  soja: "Soja",
  acucar: "Açúcar",
  milho: "Milho",
  castanhas: "Castanhas",
  cafeina: "Cafeína",
  sorbitol: "Sorbitol",
  sulfito: "Sulfito",
  frutose: "Frutose",
  histamina: "Histamina",
  niquel: "Níquel",
  salicilato: "Salicilato",
  fodmap: "FODMAP"
};

// Cache para evitar múltiplas chamadas ao banco
let cachedData: IntoleranceData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Busca todos os mapeamentos de intolerância e keywords seguros do banco de dados.
 * Inclui cache de 5 minutos para performance.
 */
export async function getIntoleranceMappings(
  supabaseUrl?: string,
  supabaseKey?: string
): Promise<IntoleranceData> {
  const now = Date.now();
  
  // Retornar cache se ainda válido
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedData;
  }

  const url = supabaseUrl || Deno.env.get("SUPABASE_URL") || "";
  const key = supabaseKey || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const supabaseClient = createClient(url, key, {
    auth: { persistSession: false }
  });

  // Buscar dados em paralelo - usando limit maior para garantir que pegamos todos
  const [mappingsResult, safeKeywordsResult] = await Promise.all([
    supabaseClient
      .from("intolerance_mappings")
      .select("intolerance_key, ingredient")
      .order("intolerance_key")
      .limit(10000), // Increased from default 1000
    supabaseClient
      .from("intolerance_safe_keywords")
      .select("intolerance_key, keyword")
      .order("intolerance_key")
      .limit(5000) // Increased from default 1000
  ]);

  if (mappingsResult.error) {
    console.error("[getIntoleranceMappings] Error fetching mappings:", mappingsResult.error);
    throw new Error(`Failed to fetch intolerance mappings: ${mappingsResult.error.message}`);
  }

  if (safeKeywordsResult.error) {
    console.error("[getIntoleranceMappings] Error fetching safe keywords:", safeKeywordsResult.error);
    throw new Error(`Failed to fetch safe keywords: ${safeKeywordsResult.error.message}`);
  }

  // Organizar mapeamentos por intolerância
  const mappings = new Map<string, string[]>();
  const allIntoleranceKeys = new Set<string>();

  for (const row of (mappingsResult.data as IntoleranceMapping[]) || []) {
    allIntoleranceKeys.add(row.intolerance_key);
    if (!mappings.has(row.intolerance_key)) {
      mappings.set(row.intolerance_key, []);
    }
    mappings.get(row.intolerance_key)!.push(row.ingredient.toLowerCase());
  }

  // Organizar keywords seguros por intolerância
  const safeKeywords = new Map<string, string[]>();

  for (const row of (safeKeywordsResult.data as SafeKeyword[]) || []) {
    allIntoleranceKeys.add(row.intolerance_key);
    if (!safeKeywords.has(row.intolerance_key)) {
      safeKeywords.set(row.intolerance_key, []);
    }
    safeKeywords.get(row.intolerance_key)!.push(row.keyword.toLowerCase());
  }

  cachedData = {
    mappings,
    safeKeywords,
    allIntoleranceKeys: Array.from(allIntoleranceKeys)
  };
  cacheTimestamp = now;

  console.log(`[getIntoleranceMappings] Loaded ${mappings.size} intolerance types with ${mappingsResult.data?.length || 0} ingredients and ${safeKeywordsResult.data?.length || 0} safe keywords`);

  return cachedData;
}

/**
 * Normaliza texto para comparação (remove acentos, lowercase, trim)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\s+/g, " "); // Normaliza espaços
}

/**
 * Verifica se um alimento contém ingredientes problemáticos para uma intolerância específica.
 * Considera também keywords que indicam que o produto é seguro.
 */
export function checkFoodForIntolerance(
  foodName: string,
  intoleranceKey: string,
  data: IntoleranceData
): { hasConflict: boolean; matchedIngredients: string[]; isSafe: boolean; safeReason?: string } {
  const normalizedFood = normalizeText(foodName);
  const ingredients = data.mappings.get(intoleranceKey) || [];
  const safeWords = data.safeKeywords.get(intoleranceKey) || [];

  // Primeiro, verificar se contém keywords de segurança
  for (const safeWord of safeWords) {
    if (normalizedFood.includes(normalizeText(safeWord))) {
      return {
        hasConflict: false,
        matchedIngredients: [],
        isSafe: true,
        safeReason: `Contém indicador de segurança: "${safeWord}"`
      };
    }
  }

  // Verificar se contém ingredientes problemáticos
  const matchedIngredients: string[] = [];
  for (const ingredient of ingredients) {
    const normalizedIngredient = normalizeText(ingredient);
    // Evitar falsos positivos: verificar se é palavra completa
    // "maca" (maçã) não deve matchear "macaron" ou "macadamia"
    if (containsWholeWord(normalizedFood, normalizedIngredient)) {
      matchedIngredients.push(ingredient);
    }
  }

  return {
    hasConflict: matchedIngredients.length > 0,
    matchedIngredients,
    isSafe: false
  };
}

/**
 * Verifica conflitos de um alimento contra todas as intolerâncias do usuário.
 */
export function checkFoodAgainstUserIntolerances(
  foodName: string,
  userIntolerances: string[],
  data: IntoleranceData
): Array<{
  intolerance: string;
  intoleranceLabel: string;
  hasConflict: boolean;
  matchedIngredients: string[];
  isSafe: boolean;
  safeReason?: string;
}> {
  const results = [];

  for (const intolerance of userIntolerances) {
    if (intolerance === "nenhuma" || !intolerance) continue;

    const result = checkFoodForIntolerance(foodName, intolerance, data);
    results.push({
      intolerance,
      intoleranceLabel: INTOLERANCE_LABELS[intolerance] || intolerance,
      ...result
    });
  }

  return results;
}

/**
 * Gera uma lista formatada de ingredientes para usar no prompt da IA.
 * Agrupa por intolerância para melhor contexto.
 */
export function generateIngredientsPromptContext(
  userIntolerances: string[],
  data: IntoleranceData
): string {
  if (userIntolerances.length === 0) {
    return "";
  }

  const sections: string[] = [];

  for (const intolerance of userIntolerances) {
    if (intolerance === "nenhuma" || !intolerance) continue;

    const ingredients = data.mappings.get(intolerance) || [];
    const safeWords = data.safeKeywords.get(intolerance) || [];
    const label = INTOLERANCE_LABELS[intolerance] || intolerance;

    if (ingredients.length > 0) {
      sections.push(`### ${label.toUpperCase()}
⛔ Ingredientes problemáticos (${ingredients.length}): ${ingredients.slice(0, 50).join(", ")}${ingredients.length > 50 ? ` ... e mais ${ingredients.length - 50}` : ""}
✅ Indicadores de segurança: ${safeWords.length > 0 ? safeWords.join(", ") : "nenhum específico"}`);
    }
  }

  if (sections.length === 0) {
    return "";
  }

  return `
## MAPEAMENTO DETALHADO DE INGREDIENTES PARA AS INTOLERÂNCIAS DO USUÁRIO

${sections.join("\n\n")}

IMPORTANTE:
- Se encontrar QUALQUER ingrediente da lista "problemáticos", marque como CONFLITO
- Se encontrar indicadores de segurança (ex: "sem lactose", "zero glúten"), pode ser seguro mesmo contendo termos similares
- Em caso de DÚVIDA, sempre assume o PIOR cenário (fail-safe)
`;
}

/**
 * Gera estatísticas dos mapeamentos para logging/debug
 */
export function getMappingsStats(data: IntoleranceData): string {
  const stats: string[] = [];
  
  for (const key of data.allIntoleranceKeys) {
    const ingredients = data.mappings.get(key)?.length || 0;
    const safeWords = data.safeKeywords.get(key)?.length || 0;
    stats.push(`${INTOLERANCE_LABELS[key] || key}: ${ingredients} ingredientes, ${safeWords} keywords seguros`);
  }

  return stats.join(" | ");
}

