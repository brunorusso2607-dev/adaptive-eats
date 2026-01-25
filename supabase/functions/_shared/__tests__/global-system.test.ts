// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - GLOBAL SYSTEM TESTS
// Suite completa de testes para sistema de globalização
// ═══════════════════════════════════════════════════════════════════════

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.192.0/testing/asserts.ts";

// Imports dos módulos a testar
import { 
  UNIVERSAL_INGREDIENTS, 
  getIngredientName,
  getIngredientsByCountry,
  getIngredientMacros
} from "../universal-ingredients-db.ts";

import {
  COUNTRY_SPECIFIC_INGREDIENTS,
  getCountrySpecificIngredient,
  getSubstituteIngredient,
  isIngredientAvailableInCountry
} from "../country-specific-ingredients.ts";

import {
  substituteIngredientForCountry,
  substituteMealIngredientsForCountry,
  validateMacrosAfterSubstitution
} from "../ingredient-substitution-service.ts";

import {
  validateCulturalCombinations,
  validateMealDensity,
  validateProteinForMealType,
  validateMealCulturally
} from "../cultural-validation-service.ts";

// NOTA: meal-pools foi removido - testes relacionados comentados abaixo
// import {
//   getMealPoolForCountry,
//   getRandomMealTemplate,
//   getMealTemplateById,
//   getMealTemplateName
// } from "../meal-pools/index.ts";

// ═══════════════════════════════════════════════════════════════════════
// TESTES - INGREDIENTES UNIVERSAIS
// ═══════════════════════════════════════════════════════════════════════

Deno.test("Universal Ingredients - Should have at least 30 ingredients", () => {
  const count = Object.keys(UNIVERSAL_INGREDIENTS).length;
  assert(count >= 30, `Expected at least 30 ingredients, got ${count}`);
});

Deno.test("Universal Ingredients - All ingredients should have required fields", () => {
  for (const [id, ingredient] of Object.entries(UNIVERSAL_INGREDIENTS)) {
    assertExists(ingredient.id, `Ingredient ${id} missing id`);
    assertExists(ingredient.category, `Ingredient ${id} missing category`);
    assertExists(ingredient.macros, `Ingredient ${id} missing macros`);
    assertExists(ingredient.portion_default, `Ingredient ${id} missing portion_default`);
    assertExists(ingredient.countries, `Ingredient ${id} missing countries`);
    assertExists(ingredient.i18n, `Ingredient ${id} missing i18n`);
    
    // Verificar macros
    assert(ingredient.macros.kcal >= 0, `Ingredient ${id} has negative kcal`);
    assert(ingredient.macros.prot >= 0, `Ingredient ${id} has negative protein`);
    assert(ingredient.macros.carbs >= 0, `Ingredient ${id} has negative carbs`);
    assert(ingredient.macros.fat >= 0, `Ingredient ${id} has negative fat`);
    
    // Verificar traduções
    assert(ingredient.i18n["pt-BR"], `Ingredient ${id} missing pt-BR translation`);
    assert(ingredient.i18n["en-US"], `Ingredient ${id} missing en-US translation`);
  }
});

Deno.test("Universal Ingredients - getIngredientName should return correct translation", () => {
  const namePT = getIngredientName("chicken_breast", "pt-BR");
  assertEquals(namePT, "Peito de frango grelhado");
  
  const nameEN = getIngredientName("chicken_breast", "en-US");
  assertEquals(nameEN, "Grilled chicken breast");
  
  const nameES = getIngredientName("chicken_breast", "es-ES");
  assertEquals(nameES, "Pechuga de pollo a la plancha");
});

Deno.test("Universal Ingredients - getIngredientName should fallback to English", () => {
  const name = getIngredientName("chicken_breast", "ja-JP");
  assertEquals(name, "Grilled chicken breast");
});

Deno.test("Universal Ingredients - getIngredientsByCountry should filter by country", () => {
  const brIngredients = getIngredientsByCountry("BR");
  assert(brIngredients.length > 0, "Brazil should have ingredients");
  
  const usIngredients = getIngredientsByCountry("US");
  assert(usIngredients.length > 0, "USA should have ingredients");
});

Deno.test("Universal Ingredients - getIngredientMacros should return correct macros", () => {
  const macros = getIngredientMacros("chicken_breast");
  assertExists(macros);
  assertEquals(macros?.kcal, 159);
  assertEquals(macros?.prot, 32);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTES - INGREDIENTES ESPECÍFICOS POR PAÍS
// ═══════════════════════════════════════════════════════════════════════

Deno.test("Country Specific - Brazil should have requeijao", () => {
  const requeijao = getCountrySpecificIngredient("requeijao", "BR");
  assertExists(requeijao);
  assertEquals(requeijao?.country_code, "BR");
});

Deno.test("Country Specific - USA should have cream_cheese", () => {
  const creamCheese = getCountrySpecificIngredient("cream_cheese", "US");
  assertExists(creamCheese);
  assertEquals(creamCheese?.country_code, "US");
});

Deno.test("Country Specific - getSubstituteIngredient should return correct substitute", () => {
  const substitute = getSubstituteIngredient("requeijao", "BR", "US");
  assertEquals(substitute, "cream_cheese");
});

Deno.test("Country Specific - isIngredientAvailableInCountry should work correctly", () => {
  const availableBR = isIngredientAvailableInCountry("requeijao", "BR");
  assertEquals(availableBR, true);
  
  const availableUS = isIngredientAvailableInCountry("requeijao", "US");
  assertEquals(availableUS, false);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTES - SISTEMA DE SUBSTITUIÇÃO
// ═══════════════════════════════════════════════════════════════════════

Deno.test("Substitution - Should substitute requeijao to cream_cheese", () => {
  const result = substituteIngredientForCountry("requeijao", "BR", "US");
  assertEquals(result.was_substituted, true);
  assertEquals(result.substituted_id, "cream_cheese");
});

Deno.test("Substitution - Should not substitute universal ingredients", () => {
  const result = substituteIngredientForCountry("chicken_breast", "BR", "US");
  assertEquals(result.was_substituted, false);
  assertEquals(result.substituted_id, "chicken_breast");
});

Deno.test("Substitution - Should substitute multiple ingredients", () => {
  const result = substituteMealIngredientsForCountry(
    ["requeijao", "farofa", "black_coffee"],
    "BR",
    "US"
  );
  
  assertEquals(result.total_substitutions, 2);
  assert(result.ingredients.includes("cream_cheese"));
  assert(result.ingredients.includes("breadcrumbs"));
  assert(result.ingredients.includes("black_coffee"));
});

Deno.test("Substitution - Macros should be preserved within tolerance", () => {
  const original = ["chicken_breast", "white_rice"];
  const substituted = ["chicken_breast", "white_rice"];
  
  const validation = validateMacrosAfterSubstitution(original, substituted, 0.15);
  assertEquals(validation.is_valid, true);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTES - VALIDAÇÃO CULTURAL
// ═══════════════════════════════════════════════════════════════════════

Deno.test("Cultural Validation - Should reject macarrao + salada in Brazil", () => {
  const result = validateCulturalCombinations(["macarrao", "salada"], "BR");
  assertEquals(result.is_valid, false);
  assert(result.violations.length > 0);
});

Deno.test("Cultural Validation - Should accept arroz + feijao in Brazil", () => {
  const result = validateCulturalCombinations(["arroz", "feijao"], "BR");
  assertEquals(result.is_valid, true);
});

Deno.test("Cultural Validation - Ceia should be light", () => {
  const result = validateMealDensity("ceia", "light", "BR");
  assertEquals(result.is_valid, true);
});

Deno.test("Cultural Validation - Ceia should not be heavy", () => {
  const result = validateMealDensity("ceia", "heavy", "BR");
  assertEquals(result.is_valid, false);
});

Deno.test("Cultural Validation - Cafe da manha should not have heavy protein", () => {
  const result = validateProteinForMealType("cafe_manha", ["beef", "rice"]);
  assertEquals(result.is_valid, false);
  assert(result.violations.length > 0);
});

Deno.test("Cultural Validation - Almoco should have protein", () => {
  const result = validateProteinForMealType("almoco", ["rice", "beans", "salad"]);
  assertEquals(result.is_valid, false);
  assert(result.violations.some(v => v.includes("protein")));
});

Deno.test("Cultural Validation - Complete validation should work", () => {
  const result = validateMealCulturally(
    "almoco",
    ["chicken_breast", "white_rice", "black_beans", "lettuce"],
    "moderate",
    "BR"
  );
  
  assertEquals(result.is_valid, true);
  assertEquals(result.violations.length, 0);
});

// ═══════════════════════════════════════════════════════════════════════
// TESTES - MEAL POOLS (REMOVIDO - Agora usa banco de dados)
// ═══════════════════════════════════════════════════════════════════════
// NOTA: meal-pools foi removido em favor do banco de dados meal_combinations
// Os testes abaixo foram comentados pois o módulo não existe mais

// Deno.test("Meal Pools - Brazil should have breakfast templates", () => {
//   const pool = getMealPoolForCountry("BR", "cafe_manha");
//   assert(pool.length > 0, "Brazil should have breakfast templates");
// });

// Deno.test("Meal Pools - USA should have lunch templates", () => {
//   const pool = getMealPoolForCountry("US", "almoco");
//   assert(pool.length > 0, "USA should have lunch templates");
// });

// Deno.test("Meal Pools - getRandomMealTemplate should return valid template", () => {
//   const template = getRandomMealTemplate("BR", "cafe_manha");
//   assertExists(template);
//   assertExists(template?.id);
//   assertExists(template?.meal_type);
//   assertExists(template?.ingredients);
//   assertExists(template?.i18n);
// });

// Deno.test("Meal Pools - getMealTemplateById should find template", () => {
//   const template = getMealTemplateById("br_cafe_pao_queijo", "BR");
//   assertExists(template);
//   assertEquals(template?.id, "br_cafe_pao_queijo");
// });

// Deno.test("Meal Pools - getMealTemplateName should return translated name", () => {
//   const template = getMealTemplateById("br_cafe_pao_queijo", "BR");
//   assertExists(template);
//   
//   const namePT = getMealTemplateName(template!, "pt-BR");
//   assertEquals(namePT, "Pão de queijo com café");
//   
//   const nameEN = getMealTemplateName(template!, "en-US");
//   assertEquals(nameEN, "Brazilian cheese bread with coffee");
// });

// Deno.test("Meal Pools - All templates should have required fields", () => {
//   const brPool = getMealPoolForCountry("BR", "cafe_manha");
//   
//   for (const template of brPool) {
//     assertExists(template.id, `Template missing id`);
//     assertExists(template.meal_type, `Template ${template.id} missing meal_type`);
//     assertExists(template.ingredients, `Template ${template.id} missing ingredients`);
//     assertExists(template.i18n, `Template ${template.id} missing i18n`);
//     assertExists(template.density, `Template ${template.id} missing density`);
//     
//     assert(template.ingredients.length > 0, `Template ${template.id} has no ingredients`);
//     assert(template.i18n["pt-BR"], `Template ${template.id} missing pt-BR translation`);
//     assert(template.i18n["en-US"], `Template ${template.id} missing en-US translation`);
//   }
// });

// ═══════════════════════════════════════════════════════════════════════
// TESTES DE INTEGRAÇÃO (PARCIALMENTE REMOVIDO - meal-pools não existe mais)
// ═══════════════════════════════════════════════════════════════════════

// Deno.test("Integration - Full flow: Get template, substitute, validate", () => {
//   // 1. Obter template brasileiro
//   const template = getMealTemplateById("br_cafe_pao_queijo", "BR");
//   assertExists(template);
//   
//   // 2. Substituir ingredientes para EUA
//   const substitution = substituteMealIngredientsForCountry(
//     template!.ingredients,
//     "BR",
//     "US"
//   );
//   
//   assert(substitution.total_substitutions > 0, "Should have substitutions");
//   
//   // 3. Validar culturalmente
//   const validation = validateMealCulturally(
//     template!.meal_type,
//     substitution.ingredients,
//     template!.density,
//     "US"
//   );
//   
//   assertEquals(validation.is_valid, true);
// });

// Deno.test("Integration - Brazilian lunch should be valid", () => {
//   const template = getMealTemplateById("br_almoco_arroz_feijao_frango", "BR");
//   assertExists(template);
//   
//   const validation = validateMealCulturally(
//     template!.meal_type,
//     template!.ingredients,
//     template!.density,
//     "BR"
//   );
//   
//   assertEquals(validation.is_valid, true);
//   assertEquals(validation.violations.length, 0);
// });

// Deno.test("Integration - USA breakfast should be valid", () => {
//   const template = getMealTemplateById("us_breakfast_pancakes", "US");
//   assertExists(template);
//   
//   const validation = validateMealCulturally(
//     template!.meal_type,
//     template!.ingredients,
//     template!.density,
//     "US"
//   );
//   
//   assertEquals(validation.is_valid, true);
// });

// ═══════════════════════════════════════════════════════════════════════
// TESTES DE PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════

Deno.test("Performance - getIngredientName should be fast", () => {
  const start = performance.now();
  
  for (let i = 0; i < 1000; i++) {
    getIngredientName("chicken_breast", "pt-BR");
  }
  
  const end = performance.now();
  const duration = end - start;
  
  assert(duration < 100, `getIngredientName too slow: ${duration}ms for 1000 calls`);
});

Deno.test("Performance - substituteIngredientForCountry should be fast", () => {
  const start = performance.now();
  
  for (let i = 0; i < 1000; i++) {
    substituteIngredientForCountry("requeijao", "BR", "US");
  }
  
  const end = performance.now();
  const duration = end - start;
  
  assert(duration < 200, `substituteIngredientForCountry too slow: ${duration}ms for 1000 calls`);
});

console.log("\n✅ All tests completed!");
