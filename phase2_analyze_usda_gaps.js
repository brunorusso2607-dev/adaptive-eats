// FASE 2: Analisar USDA e identificar gaps em relação a TBCA/canonical
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("═══════════════════════════════════════════════════════════");
console.log("  FASE 2: ANÁLISE DE GAPS USDA");
console.log("═══════════════════════════════════════════════════════════\n");

// Lista de alimentos internacionais comuns que devemos ter
const targetFoods = [
  // Proteínas que faltam
  { en: "protein powder", pt: "whey protein", category: "supplements" },
  { en: "greek yogurt", pt: "iogurte grego", category: "dairy" },
  { en: "cottage cheese", pt: "queijo cottage", category: "dairy" },
  { en: "turkey breast", pt: "peito de peru", category: "meat" },
  { en: "bacon", pt: "bacon", category: "meat" },
  { en: "ham", pt: "presunto", category: "meat" },
  { en: "sausage", pt: "salsicha", category: "meat" },
  
  // Grãos e cereais que faltam
  { en: "oats", pt: "aveia", category: "grains" },
  { en: "oatmeal", pt: "aveia em flocos", category: "grains" },
  { en: "granola", pt: "granola", category: "grains" },
  { en: "cornflakes", pt: "flocos de milho", category: "grains" },
  { en: "whole wheat bread", pt: "pão integral", category: "grains" },
  { en: "bagel", pt: "bagel", category: "grains" },
  { en: "tortilla", pt: "tortilha", category: "grains" },
  { en: "couscous", pt: "cuscuz marroquino", category: "grains" },
  
  // Vegetais que faltam
  { en: "kale", pt: "couve kale", category: "vegetables" },
  { en: "brussels sprouts", pt: "couve de bruxelas", category: "vegetables" },
  { en: "asparagus", pt: "aspargos", category: "vegetables" },
  { en: "zucchini", pt: "abobrinha", category: "vegetables" },
  { en: "eggplant", pt: "berinjela", category: "vegetables" },
  { en: "bell pepper", pt: "pimentão", category: "vegetables" },
  { en: "cucumber", pt: "pepino", category: "vegetables" },
  { en: "celery", pt: "aipo", category: "vegetables" },
  { en: "cauliflower", pt: "couve-flor", category: "vegetables" },
  { en: "mushroom", pt: "cogumelo", category: "vegetables" },
  
  // Frutas que faltam
  { en: "mango", pt: "manga", category: "fruits" },
  { en: "pineapple", pt: "abacaxi", category: "fruits" },
  { en: "watermelon", pt: "melancia", category: "fruits" },
  { en: "grape", pt: "uva", category: "fruits" },
  { en: "peach", pt: "pêssego", category: "fruits" },
  { en: "pear", pt: "pera", category: "fruits" },
  { en: "kiwi", pt: "kiwi", category: "fruits" },
  { en: "cherry", pt: "cereja", category: "fruits" },
  { en: "plum", pt: "ameixa", category: "fruits" },
  
  // Nozes e sementes que faltam
  { en: "almond butter", pt: "pasta de amêndoa", category: "nuts" },
  { en: "sunflower seeds", pt: "sementes de girassol", category: "seeds" },
  { en: "pumpkin seeds", pt: "sementes de abóbora", category: "seeds" },
  { en: "flaxseed", pt: "linhaça", category: "seeds" },
  { en: "hemp seeds", pt: "sementes de cânhamo", category: "seeds" },
  
  // Laticínios alternativos
  { en: "almond milk", pt: "leite de amêndoa", category: "dairy_alternative" },
  { en: "soy milk", pt: "leite de soja", category: "dairy_alternative" },
  { en: "oat milk", pt: "leite de aveia", category: "dairy_alternative" },
  { en: "coconut milk", pt: "leite de coco", category: "dairy_alternative" },
  
  // Processados comuns
  { en: "pizza", pt: "pizza", category: "processed" },
  { en: "hamburger", pt: "hambúrguer", category: "processed" },
  { en: "hot dog", pt: "cachorro-quente", category: "processed" },
  { en: "french fries", pt: "batata frita", category: "processed" },
  { en: "ice cream", pt: "sorvete", category: "processed" },
  { en: "chocolate", pt: "chocolate", category: "processed" },
  { en: "cookies", pt: "biscoito", category: "processed" },
  { en: "chips", pt: "salgadinho", category: "processed" },
  
  // Condimentos e temperos
  { en: "mayonnaise", pt: "maionese", category: "condiments" },
  { en: "ketchup", pt: "ketchup", category: "condiments" },
  { en: "mustard", pt: "mostarda", category: "condiments" },
  { en: "soy sauce", pt: "molho de soja", category: "condiments" },
  { en: "honey", pt: "mel", category: "condiments" },
  { en: "maple syrup", pt: "xarope de bordo", category: "condiments" },
];

async function analyzeGaps() {
  console.log("📊 1. VERIFICANDO COBERTURA ATUAL\n");
  
  const results = {
    foundInCanonical: [],
    foundInTBCA: [],
    notFound: [],
    foundElsewhere: []
  };
  
  for (const food of targetFoods) {
    // Buscar em canonical
    const { data: canonical } = await supabase
      .from('canonical_ingredients')
      .select('name_en, name_pt')
      .or(`name_en.ilike.%${food.en}%,name_pt.ilike.%${food.pt}%`)
      .limit(1)
      .maybeSingle();
    
    if (canonical) {
      results.foundInCanonical.push({ ...food, found: canonical });
      continue;
    }
    
    // Buscar em TBCA
    const { data: tbca } = await supabase
      .from('foods')
      .select('name, source')
      .eq('source', 'TBCA')
      .or(`name.ilike.%${food.en}%,name.ilike.%${food.pt}%`)
      .limit(1)
      .maybeSingle();
    
    if (tbca) {
      results.foundInTBCA.push({ ...food, found: tbca });
      continue;
    }
    
    // Buscar em outras fontes
    const { data: other } = await supabase
      .from('foods')
      .select('name, source')
      .or(`name.ilike.%${food.en}%,name.ilike.%${food.pt}%`)
      .limit(1)
      .maybeSingle();
    
    if (other) {
      results.foundElsewhere.push({ ...food, found: other });
    } else {
      results.notFound.push(food);
    }
  }
  
  console.log("✅ ENCONTRADOS EM CANONICAL:");
  console.log(`   Total: ${results.foundInCanonical.length}`);
  if (results.foundInCanonical.length > 0) {
    results.foundInCanonical.slice(0, 5).forEach(f => {
      console.log(`   - ${f.en} (${f.found.name_en})`);
    });
    if (results.foundInCanonical.length > 5) {
      console.log(`   ... e mais ${results.foundInCanonical.length - 5}`);
    }
  }
  
  console.log("\n✅ ENCONTRADOS EM TBCA:");
  console.log(`   Total: ${results.foundInTBCA.length}`);
  if (results.foundInTBCA.length > 0) {
    results.foundInTBCA.slice(0, 5).forEach(f => {
      console.log(`   - ${f.en} (${f.found.name})`);
    });
    if (results.foundInTBCA.length > 5) {
      console.log(`   ... e mais ${results.foundInTBCA.length - 5}`);
    }
  }
  
  console.log("\n✅ ENCONTRADOS EM OUTRAS FONTES:");
  console.log(`   Total: ${results.foundElsewhere.length}`);
  if (results.foundElsewhere.length > 0) {
    results.foundElsewhere.slice(0, 5).forEach(f => {
      console.log(`   - ${f.en} (${f.found.name} - ${f.found.source})`);
    });
    if (results.foundElsewhere.length > 5) {
      console.log(`   ... e mais ${results.foundElsewhere.length - 5}`);
    }
  }
  
  console.log("\n❌ NÃO ENCONTRADOS (GAPS):");
  console.log(`   Total: ${results.notFound.length}`);
  if (results.notFound.length > 0) {
    results.notFound.forEach(f => {
      console.log(`   - ${f.en} (${f.pt}) [${f.category}]`);
    });
  }
  
  console.log("\n" + "═".repeat(60));
  console.log("📊 2. RESUMO DA ANÁLISE\n");
  
  const total = targetFoods.length;
  const coverage = ((total - results.notFound.length) / total * 100).toFixed(1);
  
  console.log(`Total de alimentos analisados: ${total}`);
  console.log(`Cobertura atual: ${coverage}%`);
  console.log(`\nDistribuição:`);
  console.log(`  ✅ Canonical: ${results.foundInCanonical.length} (${(results.foundInCanonical.length/total*100).toFixed(1)}%)`);
  console.log(`  ✅ TBCA: ${results.foundInTBCA.length} (${(results.foundInTBCA.length/total*100).toFixed(1)}%)`);
  console.log(`  ✅ Outras fontes: ${results.foundElsewhere.length} (${(results.foundElsewhere.length/total*100).toFixed(1)}%)`);
  console.log(`  ❌ Gaps (USDA): ${results.notFound.length} (${(results.notFound.length/total*100).toFixed(1)}%)`);
  
  console.log("\n" + "═".repeat(60));
  console.log("📋 3. CATEGORIAS DOS GAPS\n");
  
  const gapsByCategory = {};
  results.notFound.forEach(f => {
    if (!gapsByCategory[f.category]) {
      gapsByCategory[f.category] = [];
    }
    gapsByCategory[f.category].push(f);
  });
  
  Object.entries(gapsByCategory).forEach(([category, foods]) => {
    console.log(`\n${category.toUpperCase()} (${foods.length}):`);
    foods.forEach(f => console.log(`  - ${f.en} (${f.pt})`));
  });
  
  console.log("\n" + "═".repeat(60));
  console.log("🎯 4. RECOMENDAÇÃO PARA FASE 3\n");
  
  console.log(`Importar ${results.notFound.length} alimentos USDA para preencher gaps:`);
  console.log(`\nPrioridades:`);
  console.log(`  1. Suplementos (protein powder, etc.)`);
  console.log(`  2. Alternativas lácteas (leites vegetais)`);
  console.log(`  3. Grãos e cereais (oats, granola, etc.)`);
  console.log(`  4. Vegetais específicos (kale, asparagus, etc.)`);
  console.log(`  5. Processados comuns (pizza, hamburger, etc.)`);
  
  console.log("\n💡 PRÓXIMO PASSO:");
  console.log("  Executar FASE 3: Importar USDA seletivo");
  console.log("  Script: phase3_import_usda_selective.js");
  
  // Salvar lista de gaps para próxima fase
  const fs = await import('fs');
  fs.writeFileSync(
    'usda_gaps_to_import.json',
    JSON.stringify(results.notFound, null, 2)
  );
  
  console.log("\n✅ Lista de gaps salva em: usda_gaps_to_import.json");
  console.log("═".repeat(60));
}

analyzeGaps().catch(console.error);
