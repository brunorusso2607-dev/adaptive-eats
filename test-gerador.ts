// Teste rápido do gerador
import { generateMealsForPool } from "./supabase/functions/_shared/advanced-meal-generator.ts";

console.log("Testando gerador...");

try {
  const meals = generateMealsForPool("almoco", 5, "BR", [], new Set());
  console.log(`✅ Gerou ${meals.length} refeições`);
  console.log("Primeira refeição:", meals[0]?.name);
} catch (error) {
  console.error("❌ Erro:", error);
}
