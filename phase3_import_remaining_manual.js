// FASE 3B: Importar 10 alimentos restantes com dados USDA verificados manualmente
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("═══════════════════════════════════════════════════════════");
console.log("  FASE 3B: IMPORTAÇÃO MANUAL - 10 ALIMENTOS RESTANTES");
console.log("  Dados verificados do USDA FoodData Central");
console.log("═══════════════════════════════════════════════════════════\n");

// Dados verificados manualmente do USDA FoodData Central
// Fonte: https://fdc.nal.usda.gov/
const foodsToImport = [
  {
    name: "Beverages, Soy milk, unsweetened, plain, refrigerated",
    name_normalized: "beverages, soy milk, unsweetened, plain, refrigerated",
    category: "dairy_alternative",
    calories_per_100g: 33,
    protein_per_100g: 2.86,
    carbs_per_100g: 1.74,
    fat_per_100g: 1.61,
    fiber_per_100g: 0.6,
    sodium_per_100g: 51,
    source: "usda",
    aliases: ["soy milk", "leite de soja"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Oat beverage, unsweetened, plain",
    name_normalized: "oat beverage, unsweetened, plain",
    category: "dairy_alternative",
    calories_per_100g: 42,
    protein_per_100g: 1.0,
    carbs_per_100g: 6.67,
    fat_per_100g: 1.5,
    fiber_per_100g: 0.8,
    sodium_per_100g: 42,
    source: "usda",
    aliases: ["oat milk", "leite de aveia"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Seeds, sunflower seed kernels, dried",
    name_normalized: "seeds, sunflower seed kernels, dried",
    category: "nuts_seeds",
    calories_per_100g: 584,
    protein_per_100g: 20.78,
    carbs_per_100g: 20.0,
    fat_per_100g: 51.46,
    fiber_per_100g: 8.6,
    sodium_per_100g: 9,
    source: "usda",
    aliases: ["sunflower seeds", "sementes de girassol"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Seeds, pumpkin and squash seed kernels, dried",
    name_normalized: "seeds, pumpkin and squash seed kernels, dried",
    category: "nuts_seeds",
    calories_per_100g: 559,
    protein_per_100g: 30.23,
    carbs_per_100g: 10.71,
    fat_per_100g: 49.05,
    fiber_per_100g: 6.0,
    sodium_per_100g: 7,
    source: "usda",
    aliases: ["pumpkin seeds", "sementes de abóbora", "pepitas"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Seeds, hemp seed, hulled",
    name_normalized: "seeds, hemp seed, hulled",
    category: "nuts_seeds",
    calories_per_100g: 553,
    protein_per_100g: 31.56,
    carbs_per_100g: 8.67,
    fat_per_100g: 48.75,
    fiber_per_100g: 4.0,
    sodium_per_100g: 5,
    source: "usda",
    aliases: ["hemp seeds", "sementes de cânhamo"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Bagels, plain, enriched, with calcium propionate",
    name_normalized: "bagels, plain, enriched, with calcium propionate",
    category: "grains",
    calories_per_100g: 257,
    protein_per_100g: 10.0,
    carbs_per_100g: 50.0,
    fat_per_100g: 1.7,
    fiber_per_100g: 2.3,
    sodium_per_100g: 430,
    source: "usda",
    aliases: ["bagel", "bagel simples"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Couscous, cooked",
    name_normalized: "couscous, cooked",
    category: "grains",
    calories_per_100g: 112,
    protein_per_100g: 3.79,
    carbs_per_100g: 23.22,
    fat_per_100g: 0.16,
    fiber_per_100g: 1.4,
    sodium_per_100g: 5,
    source: "usda",
    aliases: ["couscous", "cuscuz marroquino"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Catsup, tomato",
    name_normalized: "catsup, tomato",
    category: "condiments",
    calories_per_100g: 101,
    protein_per_100g: 1.04,
    carbs_per_100g: 27.4,
    fat_per_100g: 0.1,
    fiber_per_100g: 0.3,
    sodium_per_100g: 907,
    source: "usda",
    aliases: ["ketchup", "catchup"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Soy sauce made from soy and wheat (shoyu)",
    name_normalized: "soy sauce made from soy and wheat (shoyu)",
    category: "condiments",
    calories_per_100g: 53,
    protein_per_100g: 5.93,
    carbs_per_100g: 4.93,
    fat_per_100g: 0.57,
    fiber_per_100g: 0.8,
    sodium_per_100g: 5637,
    source: "usda",
    aliases: ["soy sauce", "molho de soja", "shoyu"],
    is_verified: true,
    confidence: 1.0
  },
  {
    name: "Syrups, maple",
    name_normalized: "syrups, maple",
    category: "condiments",
    calories_per_100g: 260,
    protein_per_100g: 0.04,
    carbs_per_100g: 67.04,
    fat_per_100g: 0.06,
    fiber_per_100g: 0.0,
    sodium_per_100g: 9,
    source: "usda",
    aliases: ["maple syrup", "xarope de bordo"],
    is_verified: true,
    confidence: 1.0
  }
];

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function importFood(food) {
  const normalized = normalizeText(food.name);
  
  // Verificar se já existe
  const { data: existing } = await supabase
    .from('foods')
    .select('id, name')
    .eq('name_normalized', normalized)
    .maybeSingle();
  
  if (existing) {
    console.log(`   ⚠️  Já existe: ${existing.name}`);
    return { success: false, reason: 'exists', name: food.name };
  }
  
  // Inserir
  const { data, error } = await supabase
    .from('foods')
    .insert({
      name: food.name,
      name_normalized: normalized,
      calories_per_100g: food.calories_per_100g,
      protein_per_100g: food.protein_per_100g,
      carbs_per_100g: food.carbs_per_100g,
      fat_per_100g: food.fat_per_100g,
      fiber_per_100g: food.fiber_per_100g,
      sodium_per_100g: food.sodium_per_100g,
      source: food.source,
      category: food.category,
      aliases: food.aliases,
      is_verified: food.is_verified,
      confidence: food.confidence
    })
    .select()
    .single();
  
  if (error) {
    console.error(`   ❌ Erro: ${error.message}`);
    return { success: false, reason: error.message, name: food.name };
  }
  
  console.log(`   ✅ ${food.name}`);
  console.log(`      ${food.calories_per_100g}kcal | P:${food.protein_per_100g}g | C:${food.carbs_per_100g}g | F:${food.fat_per_100g}g`);
  
  return { success: true, name: food.name, data };
}

async function main() {
  console.log(`📦 Importando ${foodsToImport.length} alimentos...\n`);
  
  const results = {
    success: [],
    failed: [],
    exists: []
  };
  
  for (let i = 0; i < foodsToImport.length; i++) {
    const food = foodsToImport[i];
    console.log(`[${i + 1}/${foodsToImport.length}] ${food.category.toUpperCase()}`);
    
    const result = await importFood(food);
    
    if (result.success) {
      results.success.push(result.name);
    } else if (result.reason === 'exists') {
      results.exists.push(result.name);
    } else {
      results.failed.push(result.name);
    }
    
    console.log("");
  }
  
  // Resumo
  console.log("═".repeat(60));
  console.log("🎉 IMPORTAÇÃO CONCLUÍDA!");
  console.log("═".repeat(60));
  console.log(`\n📊 RESUMO:`);
  console.log(`  ✅ Importados: ${results.success.length}`);
  console.log(`  ⚠️  Já existiam: ${results.exists.length}`);
  console.log(`  ❌ Falharam: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log(`\n✅ ALIMENTOS IMPORTADOS:`);
    results.success.forEach(name => console.log(`  - ${name}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ FALHAS:`);
    results.failed.forEach(name => console.log(`  - ${name}`));
  }
  
  // Verificar total no banco
  const { count: totalUSDA } = await supabase
    .from('foods')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'usda');
  
  console.log(`\n📊 TOTAL USDA NO BANCO: ${totalUSDA}`);
  console.log("\n💡 PRÓXIMO PASSO:");
  console.log("  Executar FASE 4: Criar aliases linguísticos");
  console.log("═".repeat(60));
}

main().catch(console.error);
