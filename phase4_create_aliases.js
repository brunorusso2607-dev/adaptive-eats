// FASE 4: Criar aliases linguísticos para alimentos USDA e Canonical
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("═══════════════════════════════════════════════════════════");
console.log("  FASE 4: CRIAÇÃO DE ALIASES LINGUÍSTICOS");
console.log("═══════════════════════════════════════════════════════════\n");

// Mapeamento de aliases PT/EN para alimentos USDA
const aliasMapping = {
  // Whey Protein
  "Beverages, UNILEVER, SLIMFAST Shake Mix, high protein, whey powder, 3-2-1 Plan,": [
    "whey protein",
    "proteína whey",
    "whey isolado",
    "whey concentrado",
    "protein powder",
    "proteína em pó"
  ],
  
  // Leites vegetais
  "Beverages, almond milk, unsweetened, shelf stable": [
    "leite de amêndoa",
    "leite de amendoa",
    "almond milk",
    "bebida de amêndoa"
  ],
  "Beverages, Soy milk, unsweetened, plain, refrigerated": [
    "leite de soja",
    "soy milk",
    "bebida de soja",
    "soya milk"
  ],
  "Oat beverage, unsweetened, plain": [
    "leite de aveia",
    "oat milk",
    "bebida de aveia"
  ],
  
  // Sementes
  "Seeds, sunflower seed kernels, dried": [
    "sementes de girassol",
    "girassol",
    "sunflower seeds",
    "sunflower"
  ],
  "Seeds, pumpkin and squash seed kernels, dried": [
    "sementes de abóbora",
    "sementes de abobora",
    "pumpkin seeds",
    "pepitas",
    "semente de abóbora"
  ],
  "Seeds, hemp seed, hulled": [
    "sementes de cânhamo",
    "sementes de canhamo",
    "hemp seeds",
    "hemp"
  ],
  
  // Grãos
  "Bagels, plain, enriched, with calcium propionate": [
    "bagel",
    "bagel simples",
    "bagel plain"
  ],
  "Couscous, cooked": [
    "cuscuz marroquino",
    "couscous",
    "cuscuz"
  ],
  
  // Condimentos
  "Catsup, tomato": [
    "ketchup",
    "catchup",
    "molho de tomate ketchup"
  ],
  "Soy sauce made from soy and wheat (shoyu)": [
    "molho de soja",
    "shoyu",
    "soy sauce",
    "molho shoyu"
  ],
  "Syrups, maple": [
    "xarope de bordo",
    "maple syrup",
    "xarope maple",
    "melado de bordo"
  ]
};

async function updateFoodAliases(foodName, aliases) {
  // Buscar o alimento
  const { data: food, error: findError } = await supabase
    .from('foods')
    .select('id, name, aliases')
    .eq('name', foodName)
    .eq('source', 'usda')
    .single();
  
  if (findError || !food) {
    console.log(`   ❌ Não encontrado: ${foodName}`);
    return { success: false, name: foodName };
  }
  
  // Mesclar aliases existentes com novos
  const existingAliases = food.aliases || [];
  const newAliases = [...new Set([...existingAliases, ...aliases])];
  
  // Atualizar
  const { error: updateError } = await supabase
    .from('foods')
    .update({ aliases: newAliases })
    .eq('id', food.id);
  
  if (updateError) {
    console.log(`   ❌ Erro ao atualizar: ${updateError.message}`);
    return { success: false, name: foodName };
  }
  
  console.log(`   ✅ ${food.name}`);
  console.log(`      Aliases: ${newAliases.join(', ')}`);
  
  return { success: true, name: food.name, count: newAliases.length };
}

async function createIngredientAliases() {
  console.log("📝 Criando aliases na tabela ingredient_aliases...\n");
  
  let created = 0;
  
  for (const [foodName, aliases] of Object.entries(aliasMapping)) {
    // Buscar food_id
    const { data: food } = await supabase
      .from('foods')
      .select('id')
      .eq('name', foodName)
      .eq('source', 'usda')
      .single();
    
    if (!food) continue;
    
    // Criar aliases
    for (const alias of aliases) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('ingredient_aliases')
        .select('id')
        .eq('food_id', food.id)
        .eq('alias', alias)
        .maybeSingle();
      
      if (existing) continue;
      
      // Inserir
      const { error } = await supabase
        .from('ingredient_aliases')
        .insert({
          food_id: food.id,
          alias: alias,
          language: alias.match(/[à-ú]/i) ? 'pt-BR' : 'en-US',
          region: null
        });
      
      if (!error) {
        created++;
      }
    }
  }
  
  console.log(`✅ Criados ${created} aliases na tabela ingredient_aliases\n`);
  return created;
}

async function main() {
  console.log("📊 1. ATUALIZANDO ALIASES NA TABELA FOODS\n");
  
  const results = {
    success: [],
    failed: []
  };
  
  let i = 1;
  for (const [foodName, aliases] of Object.entries(aliasMapping)) {
    console.log(`[${i}/${Object.keys(aliasMapping).length}]`);
    
    const result = await updateFoodAliases(foodName, aliases);
    
    if (result.success) {
      results.success.push(result);
    } else {
      results.failed.push(result);
    }
    
    console.log("");
    i++;
  }
  
  console.log("─".repeat(60));
  console.log("📊 2. CRIANDO ALIASES NA TABELA INGREDIENT_ALIASES\n");
  
  const aliasesCreated = await createIngredientAliases();
  
  // Resumo
  console.log("═".repeat(60));
  console.log("🎉 FASE 4 CONCLUÍDA!");
  console.log("═".repeat(60));
  console.log(`\n📊 RESUMO:`);
  console.log(`  ✅ Foods atualizados: ${results.success.length}`);
  console.log(`  ❌ Falhas: ${results.failed.length}`);
  console.log(`  📝 Aliases criados: ${aliasesCreated}`);
  
  if (results.failed.length > 0) {
    console.log(`\n❌ FALHAS:`);
    results.failed.forEach(r => console.log(`  - ${r.name}`));
  }
  
  console.log("\n💡 PRÓXIMO PASSO:");
  console.log("  Executar FASE 5: Verificação e testes");
  console.log("═".repeat(60));
}

main().catch(console.error);
