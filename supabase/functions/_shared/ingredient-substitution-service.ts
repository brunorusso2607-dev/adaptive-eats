// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - INGREDIENT SUBSTITUTION SERVICE
// Sistema de substituição automática de ingredientes por país
// ═══════════════════════════════════════════════════════════════════════

import { UNIVERSAL_INGREDIENTS } from "./universal-ingredients-db.ts";
import { 
  COUNTRY_SPECIFIC_INGREDIENTS, 
  getCountrySpecificIngredient,
  getSubstituteIngredient 
} from "./country-specific-ingredients.ts";

// ═══════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════

export interface SubstitutionResult {
  original_id: string;
  substituted_id: string;
  was_substituted: boolean;
  reason?: string;
}

export interface MealSubstitutionResult {
  ingredients: string[];
  substitutions: SubstitutionResult[];
  total_substitutions: number;
}

// ═══════════════════════════════════════════════════════════════════════
// FUNÇÕES PRINCIPAIS
// ═══════════════════════════════════════════════════════════════════════

export function substituteIngredientForCountry(
  ingredientId: string,
  fromCountry: string,
  toCountry: string
): SubstitutionResult {
  // 1. Verificar se ingrediente é universal
  if (UNIVERSAL_INGREDIENTS[ingredientId]) {
    // Ingrediente universal, não precisa substituir
    return {
      original_id: ingredientId,
      substituted_id: ingredientId,
      was_substituted: false,
      reason: "Universal ingredient available in all countries"
    };
  }

  // 2. Verificar se ingrediente é específico do país de origem
  const specificIngredient = getCountrySpecificIngredient(ingredientId, fromCountry);
  
  if (!specificIngredient) {
    // Ingrediente não encontrado, retornar original
    return {
      original_id: ingredientId,
      substituted_id: ingredientId,
      was_substituted: false,
      reason: "Ingredient not found in database"
    };
  }

  // 3. Verificar se ingrediente existe no país de destino
  const existsInTarget = getCountrySpecificIngredient(ingredientId, toCountry);
  
  if (existsInTarget) {
    // Ingrediente existe no país de destino, não precisa substituir
    return {
      original_id: ingredientId,
      substituted_id: ingredientId,
      was_substituted: false,
      reason: "Ingredient available in target country"
    };
  }

  // 4. Buscar substituto
  const substitute = getSubstituteIngredient(ingredientId, fromCountry, toCountry);
  
  if (substitute) {
    return {
      original_id: ingredientId,
      substituted_id: substitute,
      was_substituted: true,
      reason: `Substituted ${ingredientId} with ${substitute} for ${toCountry}`
    };
  }

  // 5. Não encontrou substituto, retornar original com aviso
  return {
    original_id: ingredientId,
    substituted_id: ingredientId,
    was_substituted: false,
    reason: "No substitute found, using original ingredient"
  };
}

export function substituteMealIngredientsForCountry(
  ingredientIds: string[],
  fromCountry: string,
  toCountry: string
): MealSubstitutionResult {
  const substitutions: SubstitutionResult[] = [];
  const substitutedIngredients: string[] = [];

  for (const ingredientId of ingredientIds) {
    const result = substituteIngredientForCountry(ingredientId, fromCountry, toCountry);
    substitutions.push(result);
    substitutedIngredients.push(result.substituted_id);
  }

  const totalSubstitutions = substitutions.filter(s => s.was_substituted).length;

  return {
    ingredients: substitutedIngredients,
    substitutions,
    total_substitutions: totalSubstitutions
  };
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDAÇÃO DE MACROS APÓS SUBSTITUIÇÃO
// ═══════════════════════════════════════════════════════════════════════

export function validateMacrosAfterSubstitution(
  originalIngredients: string[],
  substitutedIngredients: string[],
  tolerance: number = 0.15  // 15% de tolerância
): {
  is_valid: boolean;
  original_macros: { kcal: number; prot: number; carbs: number; fat: number };
  substituted_macros: { kcal: number; prot: number; carbs: number; fat: number };
  differences: { kcal: number; prot: number; carbs: number; fat: number };
  differences_percent: { kcal: number; prot: number; carbs: number; fat: number };
} {
  // Calcular macros originais
  const originalMacros = calculateTotalMacros(originalIngredients);
  
  // Calcular macros substituídos
  const substitutedMacros = calculateTotalMacros(substitutedIngredients);
  
  // Calcular diferenças
  const differences = {
    kcal: substitutedMacros.kcal - originalMacros.kcal,
    prot: substitutedMacros.prot - originalMacros.prot,
    carbs: substitutedMacros.carbs - originalMacros.carbs,
    fat: substitutedMacros.fat - originalMacros.fat
  };
  
  // Calcular diferenças percentuais
  const differences_percent = {
    kcal: originalMacros.kcal > 0 ? (differences.kcal / originalMacros.kcal) : 0,
    prot: originalMacros.prot > 0 ? (differences.prot / originalMacros.prot) : 0,
    carbs: originalMacros.carbs > 0 ? (differences.carbs / originalMacros.carbs) : 0,
    fat: originalMacros.fat > 0 ? (differences.fat / originalMacros.fat) : 0
  };
  
  // Validar se diferenças estão dentro da tolerância
  const is_valid = 
    Math.abs(differences_percent.kcal) <= tolerance &&
    Math.abs(differences_percent.prot) <= tolerance &&
    Math.abs(differences_percent.carbs) <= tolerance &&
    Math.abs(differences_percent.fat) <= tolerance;
  
  return {
    is_valid,
    original_macros: originalMacros,
    substituted_macros: substitutedMacros,
    differences,
    differences_percent
  };
}

function calculateTotalMacros(ingredientIds: string[]): {
  kcal: number;
  prot: number;
  carbs: number;
  fat: number;
} {
  let totalKcal = 0;
  let totalProt = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const id of ingredientIds) {
    // Buscar em ingredientes universais
    const universal = UNIVERSAL_INGREDIENTS[id];
    if (universal) {
      totalKcal += universal.macros.kcal;
      totalProt += universal.macros.prot;
      totalCarbs += universal.macros.carbs;
      totalFat += universal.macros.fat;
      continue;
    }

    // Buscar em ingredientes específicos
    for (const countryIngredients of Object.values(COUNTRY_SPECIFIC_INGREDIENTS)) {
      const specific = countryIngredients[id];
      if (specific) {
        totalKcal += specific.macros.kcal;
        totalProt += specific.macros.prot;
        totalCarbs += specific.macros.carbs;
        totalFat += specific.macros.fat;
        break;
      }
    }
  }

  return {
    kcal: totalKcal,
    prot: totalProt,
    carbs: totalCarbs,
    fat: totalFat
  };
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER PARA LOGGING
// ═══════════════════════════════════════════════════════════════════════

export function logSubstitutions(result: MealSubstitutionResult): void {
  if (result.total_substitutions === 0) {
    console.log("[Substitution] No substitutions needed");
    return;
  }

  console.log(`[Substitution] Made ${result.total_substitutions} substitution(s):`);
  
  for (const sub of result.substitutions) {
    if (sub.was_substituted) {
      console.log(`  - ${sub.original_id} → ${sub.substituted_id}`);
      console.log(`    Reason: ${sub.reason}`);
    }
  }
}

