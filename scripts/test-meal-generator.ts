// Script de teste para o gerador de templates
import { MealGenerator } from "../supabase/functions/_shared/meal-generator.ts";

console.log("🧪 TESTANDO GERADOR DE TEMPLATES\n");

const generator = new MealGenerator();

// Estatísticas
const stats = generator.getStats();
console.log("📊 ESTATÍSTICAS:");
console.log(`  Total de ingredientes: ${stats.total_ingredients}`);
console.log(`  Proteínas: ${stats.proteins}`);
console.log(`  Carboidratos: ${stats.carbs}`);
console.log(`  Vegetais: ${stats.vegetables}`);
console.log(`  Frutas: ${stats.fruits}\n`);

// Teste 1: Café da manhã
console.log("☀️ TESTE 1: Gerando 5 cafés da manhã BR");
const cafes = generator.generateMeals("cafe_manha", 5, "BR", []);
console.log(`  ✅ Geradas: ${cafes.length} refeições\n`);

cafes.forEach((meal, i) => {
  console.log(`  ${i + 1}. ${meal.name}`);
  console.log(`     Componentes: ${meal.components.length}`);
  meal.components.forEach(c => {
    console.log(`       - ${c.name} (${c.portion_grams}g)`);
  });
  console.log(`     Macros: ${meal.total_calories} kcal | ${meal.total_protein}g P | ${meal.total_carbs}g C | ${meal.total_fat}g G`);
  console.log(`     Bloqueado para: ${meal.blocked_for_intolerances.join(", ") || "nenhuma intolerância"}\n`);
});

// Teste 2: Almoço
console.log("\n🍽️ TESTE 2: Gerando 5 almoços BR");
const almocos = generator.generateMeals("almoco", 5, "BR", []);
console.log(`  ✅ Geradas: ${almocos.length} refeições\n`);

almocos.forEach((meal, i) => {
  console.log(`  ${i + 1}. ${meal.name}`);
  console.log(`     Componentes: ${meal.components.length}`);
  meal.components.forEach(c => {
    console.log(`       - ${c.name} (${c.portion_grams}g)`);
  });
  console.log(`     Macros: ${meal.total_calories} kcal | ${meal.total_protein}g P | ${meal.total_carbs}g C | ${meal.total_fat}g G`);
  console.log(`     Tempo preparo: ${meal.prep_time_minutes} min\n`);
});

// Teste 3: Com intolerância
console.log("\n🚫 TESTE 3: Gerando 3 almoços BR SEM LACTOSE");
const almocosLactose = generator.generateMeals("almoco", 3, "BR", ["lactose"]);
console.log(`  ✅ Geradas: ${almocosLactose.length} refeições\n`);

almocosLactose.forEach((meal, i) => {
  console.log(`  ${i + 1}. ${meal.name}`);
  console.log(`     Bloqueado para: ${meal.blocked_for_intolerances.join(", ") || "nenhuma intolerância"}`);
  const temLactose = meal.blocked_for_intolerances.includes("lactose");
  console.log(`     ${temLactose ? "❌ ERRO: Contém lactose!" : "✅ OK: Sem lactose"}\n`);
});

// Teste 4: Jantar
console.log("\n🌙 TESTE 4: Gerando 3 jantares BR");
const jantares = generator.generateMeals("jantar", 3, "BR", []);
console.log(`  ✅ Geradas: ${jantares.length} refeições\n`);

jantares.forEach((meal, i) => {
  console.log(`  ${i + 1}. ${meal.name}`);
  console.log(`     Componentes: ${meal.components.length}`);
  console.log(`     Macros: ${meal.total_calories} kcal\n`);
});

console.log("\n✅ TODOS OS TESTES CONCLUÍDOS!");
