// ═══════════════════════════════════════════════════════════════════════
// INGREDIENT SUBSTITUTION SERVICE
// Busca alternativas do ingredient_pool para intolerâncias
// ═══════════════════════════════════════════════════════════════════════

export interface AlternativeIngredient {
  ingredient_key: string;
  display_name_pt: string;
  display_name_en: string;
  safe_for_intolerances: string[];
  replaces_ingredients: string[];
  kcal_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  default_portion_grams: number;
}

// Cache de alternativas (carregado uma vez por execução)
let alternativesCache: AlternativeIngredient[] | null = null;

/**
 * Carrega todas as alternativas do ingredient_pool
 */
export async function loadAlternatives(supabase: any): Promise<AlternativeIngredient[]> {
  if (alternativesCache) {
    return alternativesCache;
  }

  const { data, error } = await supabase
    .from('ingredient_pool')
    .select('ingredient_key, display_name_pt, display_name_en, safe_for_intolerances, replaces_ingredients, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams')
    .eq('is_alternative', true);

  if (error) {
    console.error('[SUBSTITUTION] Error loading alternatives:', error);
    return [];
  }

  alternativesCache = (data || []).map((item: any) => ({
    ingredient_key: item.ingredient_key,
    display_name_pt: item.display_name_pt,
    display_name_en: item.display_name_en,
    safe_for_intolerances: item.safe_for_intolerances || [],
    replaces_ingredients: item.replaces_ingredients || [],
    kcal_per_100g: item.kcal_per_100g || 0,
    protein_per_100g: item.protein_per_100g || 0,
    carbs_per_100g: item.carbs_per_100g || 0,
    fat_per_100g: item.fat_per_100g || 0,
    fiber_per_100g: item.fiber_per_100g || 0,
    default_portion_grams: item.default_portion_grams || 100,
  }));

  console.log(`[SUBSTITUTION] Loaded ${alternativesCache.length} alternatives from ingredient_pool`);
  return alternativesCache;
}

/**
 * Encontra uma alternativa para um ingrediente baseado nas intolerâncias do usuário
 * 
 * @param ingredientKey - Chave do ingrediente original (ex: 'whole_milk')
 * @param userIntolerances - Lista de intolerâncias do usuário (ex: ['lactose'])
 * @param alternatives - Lista de alternativas carregadas do banco
 * @returns A alternativa encontrada ou null se não houver
 */
export function findAlternative(
  ingredientKey: string,
  userIntolerances: string[],
  alternatives: AlternativeIngredient[]
): AlternativeIngredient | null {
  if (!userIntolerances || userIntolerances.length === 0) {
    return null;
  }

  // Buscar alternativa que:
  // 1. Substitui o ingrediente original (replaces_ingredients contém ingredientKey)
  // 2. É segura para pelo menos uma das intolerâncias do usuário
  for (const alt of alternatives) {
    const replacesThis = alt.replaces_ingredients.includes(ingredientKey);
    const safeForUser = alt.safe_for_intolerances.some(safe => userIntolerances.includes(safe));

    if (replacesThis && safeForUser) {
      return alt;
    }
  }

  return null;
}

/**
 * Substitui ingredientes em uma lista baseado nas intolerâncias do usuário
 * Retorna a lista com ingredientes substituídos quando possível
 */
export function substituteIngredients(
  ingredientKeys: string[],
  userIntolerances: string[],
  alternatives: AlternativeIngredient[]
): { original: string; substituted: string; alternative: AlternativeIngredient | null }[] {
  return ingredientKeys.map(key => {
    const alt = findAlternative(key, userIntolerances, alternatives);
    return {
      original: key,
      substituted: alt ? alt.ingredient_key : key,
      alternative: alt,
    };
  });
}

/**
 * Limpa o cache de alternativas (útil para testes)
 */
export function clearAlternativesCache(): void {
  alternativesCache = null;
}
