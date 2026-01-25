// FASE 3: Importar USDA manualmente via API - 12 gaps identificados
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

// USDA API Key - você precisa configurar isso
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY'; // Usar DEMO_KEY para teste (limitado)

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("═══════════════════════════════════════════════════════════");
console.log("  FASE 3: IMPORTAÇÃO MANUAL USDA VIA API");
console.log("═══════════════════════════════════════════════════════════\n");

// 12 gaps identificados na Fase 2
const gapsToImport = [
  { search: "whey protein powder", category: "supplements" },
  { search: "almond milk unsweetened", category: "dairy_alternative" },
  { search: "soy milk unsweetened", category: "dairy_alternative" },
  { search: "oat milk unsweetened", category: "dairy_alternative" },
  { search: "sunflower seeds", category: "nuts_seeds" },
  { search: "pumpkin seeds", category: "nuts_seeds" },
  { search: "hemp seeds", category: "nuts_seeds" },
  { search: "bagel plain", category: "grains" },
  { search: "couscous cooked", category: "grains" },
  { search: "ketchup", category: "condiments" },
  { search: "soy sauce", category: "condiments" },
  { search: "maple syrup", category: "condiments" }
];

const NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  FIBER: 1079,
  SODIUM: 1093
};

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function extractNutrient(nutrients, nutrientId) {
  if (!nutrients || !Array.isArray(nutrients)) return 0;
  
  const nutrient = nutrients.find(n => {
    if (n.nutrientId === nutrientId) return true;
    if (n.nutrient && n.nutrient.id === nutrientId) return true;
    if (n.nutrientNumber === String(nutrientId)) return true;
    return false;
  });
  
  if (nutrient) {
    const value = nutrient.value ?? nutrient.amount ?? 0;
    return Number(value) || 0;
  }
  
  return 0;
}

async function searchUSDA(searchTerm) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(searchTerm)}&dataType=Foundation,SR%20Legacy&pageSize=5`;
  
  console.log(`\n🔍 Buscando: "${searchTerm}"`);
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      console.log(`   ❌ Não encontrado`);
      return null;
    }
    
    // Retornar top 5 para análise
    return data.foods.slice(0, 5);
    
  } catch (error) {
    console.error(`   ❌ Erro na API: ${error.message}`);
    return null;
  }
}

async function getFoodDetails(fdcId) {
  const url = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${USDA_API_KEY}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error(`   ❌ Erro ao buscar detalhes: ${error.message}`);
    return null;
  }
}

function analyzeFood(food) {
  const nutrients = food.foodNutrients || [];
  
  const calories = extractNutrient(nutrients, NUTRIENT_IDS.ENERGY);
  const protein = extractNutrient(nutrients, NUTRIENT_IDS.PROTEIN);
  const carbs = extractNutrient(nutrients, NUTRIENT_IDS.CARBS);
  const fat = extractNutrient(nutrients, NUTRIENT_IDS.FAT);
  const fiber = extractNutrient(nutrients, NUTRIENT_IDS.FIBER);
  const sodium = extractNutrient(nutrients, NUTRIENT_IDS.SODIUM);
  
  const hasCompleteMacros = calories > 0 && (protein > 0 || carbs > 0 || fat > 0);
  
  return {
    fdcId: food.fdcId,
    description: food.description,
    dataType: food.dataType,
    category: food.foodCategory?.description || 'unknown',
    calories,
    protein,
    carbs,
    fat,
    fiber,
    sodium,
    hasCompleteMacros,
    score: hasCompleteMacros ? (calories + protein + carbs + fat) : 0
  };
}

async function importToDatabase(foodData, originalCategory) {
  const normalizedName = normalizeText(foodData.description);
  
  // Verificar se já existe
  const { data: existing } = await supabase
    .from('foods')
    .select('id, name')
    .eq('name_normalized', normalizedName)
    .maybeSingle();
  
  if (existing) {
    console.log(`   ⚠️  Já existe: ${existing.name}`);
    return { success: false, reason: 'already_exists' };
  }
  
  // Inserir
  const { data, error } = await supabase
    .from('foods')
    .insert({
      name: foodData.description,
      name_normalized: normalizedName,
      calories_per_100g: foodData.calories,
      protein_per_100g: foodData.protein,
      carbs_per_100g: foodData.carbs,
      fat_per_100g: foodData.fat,
      fiber_per_100g: foodData.fiber,
      sodium_per_100g: foodData.sodium,
      source: 'usda',
      category: originalCategory,
      is_verified: true,
      confidence: 1.0
    })
    .select()
    .single();
  
  if (error) {
    console.error(`   ❌ Erro ao inserir: ${error.message}`);
    return { success: false, reason: error.message };
  }
  
  console.log(`   ✅ IMPORTADO: ${foodData.description}`);
  console.log(`      Macros: ${foodData.calories}kcal | P:${foodData.protein}g | C:${foodData.carbs}g | F:${foodData.fat}g`);
  
  return { success: true, data };
}

async function processGap(gap) {
  console.log("\n" + "─".repeat(60));
  console.log(`📦 ${gap.search.toUpperCase()} [${gap.category}]`);
  
  // Buscar na API
  const results = await searchUSDA(gap.search);
  
  if (!results || results.length === 0) {
    console.log(`   ❌ Nenhum resultado encontrado`);
    return { success: false, gap: gap.search };
  }
  
  console.log(`\n   📊 Encontrados ${results.length} resultados:`);
  
  // Analisar cada resultado
  const analyzed = [];
  for (const food of results) {
    const details = await getFoodDetails(food.fdcId);
    if (details) {
      const analysis = analyzeFood(details);
      analyzed.push(analysis);
      
      const status = analysis.hasCompleteMacros ? '✅' : '❌';
      console.log(`\n   ${status} [${analysis.fdcId}] ${analysis.description}`);
      console.log(`      Type: ${analysis.dataType}`);
      console.log(`      Macros: ${analysis.calories}kcal | P:${analysis.protein}g | C:${analysis.carbs}g | F:${analysis.fat}g`);
      
      // Delay para respeitar rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Selecionar melhor resultado (com macros completos e maior score)
  const validResults = analyzed.filter(a => a.hasCompleteMacros);
  
  if (validResults.length === 0) {
    console.log(`\n   ⚠️  NENHUM resultado tem macros completos!`);
    return { success: false, gap: gap.search, reason: 'no_complete_macros' };
  }
  
  // Ordenar por score e pegar o melhor
  validResults.sort((a, b) => b.score - a.score);
  const best = validResults[0];
  
  console.log(`\n   🎯 MELHOR OPÇÃO: ${best.description}`);
  
  // Importar para o banco
  const result = await importToDatabase(best, gap.category);
  
  return { success: result.success, gap: gap.search, food: best };
}

async function main() {
  console.log(`🔑 USDA API Key: ${USDA_API_KEY === 'DEMO_KEY' ? 'DEMO_KEY (limitado)' : 'Configurada'}\n`);
  
  if (USDA_API_KEY === 'DEMO_KEY') {
    console.log("⚠️  AVISO: Usando DEMO_KEY - limitado a 30 requests/hora");
    console.log("   Configure USDA_API_KEY para uso ilimitado\n");
  }
  
  const results = {
    success: [],
    failed: [],
    skipped: []
  };
  
  for (let i = 0; i < gapsToImport.length; i++) {
    const gap = gapsToImport[i];
    
    console.log(`\n[${ i + 1}/${gapsToImport.length}]`);
    
    const result = await processGap(gap);
    
    if (result.success) {
      results.success.push(result);
    } else if (result.reason === 'already_exists') {
      results.skipped.push(result);
    } else {
      results.failed.push(result);
    }
    
    // Delay entre gaps
    if (i < gapsToImport.length - 1) {
      console.log("\n⏳ Aguardando 2s...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Resumo final
  console.log("\n" + "═".repeat(60));
  console.log("🎉 FASE 3 CONCLUÍDA!");
  console.log("═".repeat(60));
  console.log(`\n📊 RESUMO:`);
  console.log(`  ✅ Importados: ${results.success.length}`);
  console.log(`  ⚠️  Já existiam: ${results.skipped.length}`);
  console.log(`  ❌ Falharam: ${results.failed.length}`);
  
  if (results.success.length > 0) {
    console.log(`\n✅ ALIMENTOS IMPORTADOS:`);
    results.success.forEach(r => {
      console.log(`  - ${r.gap}`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ FALHAS:`);
    results.failed.forEach(r => {
      console.log(`  - ${r.gap} (${r.reason || 'unknown'})`);
    });
  }
  
  console.log("\n💡 PRÓXIMO PASSO:");
  console.log("  Executar FASE 4: Criar aliases linguísticos");
  console.log("═".repeat(60));
}

main().catch(console.error);
