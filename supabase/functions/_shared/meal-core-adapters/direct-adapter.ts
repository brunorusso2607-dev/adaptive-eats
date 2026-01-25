/**
 * DIRECT ADAPTER
 * 
 * Converte output do gerador direto (templates) para o formato do Core Unificado
 */

import { 
  processRawMeal, 
  RawComponent, 
  ProcessingResult,
  UserContext,
  MealType,
} from '../unified-meal-core/index.ts';

import { INGREDIENTS } from '../meal-ingredients-db.ts';

export interface DirectGeneratedMeal {
  name: string;
  components: Array<{
    type: string;
    name: string;
    name_en: string;
    portion_grams: number;
    ingredient_key?: string;  // ✅ Chave do ingrediente para formatPortion()
  }>;
  total_calories: number;
}

/**
 * Processa uma refeição gerada diretamente através do Core Unificado
 */
export async function processDirectMeal(
  directMeal: DirectGeneratedMeal,
  mealType: MealType,
  userContext: UserContext,
  templateId: string = 'unknown',
): Promise<ProcessingResult> {
  console.log(`[DIRECT-ADAPTER] Processando: ${directMeal.name} (template: ${templateId})`);
  console.log(`[DIRECT-ADAPTER] Componentes recebidos: ${directMeal.components.length}`);
  
  // Converter components para RawComponents
  const rawComponents: RawComponent[] = directMeal.components.map(comp => {
    // ✅ PRIORIZAR ingredient_key passado diretamente, senão tentar resolver pelo nome
    const ingredientKey = comp.ingredient_key || resolveKeyFromName(comp.name_en);
    const ingredient = ingredientKey ? INGREDIENTS[ingredientKey] : null;
    
    if (!ingredient) {
      console.warn(`[DIRECT-ADAPTER] ⚠️ Ingrediente não encontrado: name_en="${comp.name_en}", key="${ingredientKey}"`);
    }
    
    return {
      name: comp.name,
      name_en: comp.name_en,
      grams: comp.portion_grams,
      ingredient_key: ingredientKey || undefined,
      type: comp.type,
      // Se temos o ingrediente, passar macros
      kcal: ingredient ? ingredient.kcal * (comp.portion_grams / 100) : undefined,
      protein: ingredient ? ingredient.prot * (comp.portion_grams / 100) : undefined,
      carbs: ingredient ? ingredient.carbs * (comp.portion_grams / 100) : undefined,
      fat: ingredient ? ingredient.fat * (comp.portion_grams / 100) : undefined,
      fiber: ingredient ? ingredient.fiber * (comp.portion_grams / 100) : undefined,
    };
  });
  
  console.log(`[DIRECT-ADAPTER] RawComponents criados: ${rawComponents.length}`);
  
  // Processar através do Core
  const result = await processRawMeal(
    rawComponents,
    mealType,
    directMeal.name,
    userContext,
    { type: 'direct', template_id: templateId },
  );
  
  console.log(`[DIRECT-ADAPTER] Resultado: success=${result.success}, fallback=${result.fallback_used}, errors=${result.errors?.length || 0}, warnings=${result.warnings?.length || 0}`);
  if (result.errors && result.errors.length > 0) {
    console.error(`[DIRECT-ADAPTER] ❌ Erros: ${JSON.stringify(result.errors)}`);
  }
  
  return result;
}

function resolveKeyFromName(nameEn: string): string | null {
  const normalized = nameEn.toLowerCase().replace(/\s+/g, '_');
  if (INGREDIENTS[normalized]) return normalized;
  
  // Tentar encontrar por display_name_en
  for (const [key, ing] of Object.entries(INGREDIENTS)) {
    if (ing.display_name_en.toLowerCase() === nameEn.toLowerCase()) {
      return key;
    }
  }
  
  return null;
}
