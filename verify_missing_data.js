import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 VERIFICANDO DADOS FALTANTES...\n");

// 1. Simple Meals
console.log("📋 1. SIMPLE MEALS:");
const { data: simpleMeals, error: sm_error } = await supabase
  .from('simple_meals')
  .select('meal_type', { count: 'exact' });

if (sm_error) {
  console.log(`  ❌ Erro: ${sm_error.message}`);
} else {
  const grouped = {};
  simpleMeals?.forEach(m => {
    grouped[m.meal_type] = (grouped[m.meal_type] || 0) + 1;
  });
  console.log(`  Total: ${simpleMeals?.length || 0} refeições`);
  Object.entries(grouped).forEach(([type, count]) => {
    console.log(`    - ${type}: ${count}`);
  });
}

// 2. Food Decomposition Mappings
console.log("\n🍕 2. FOOD DECOMPOSITION MAPPINGS:");
const { count: fdm_count, error: fdm_error } = await supabase
  .from('food_decomposition_mappings')
  .select('*', { count: 'exact', head: true });

if (fdm_error) {
  console.log(`  ❌ Erro: ${fdm_error.message}`);
} else {
  console.log(`  Total: ${fdm_count || 0} mapeamentos`);
}

// 3. Intolerance Mappings por intolerância
console.log("\n🛡️ 3. INTOLERANCE MAPPINGS (por intolerância):");
const { data: im_data, error: im_error } = await supabase
  .from('intolerance_mappings')
  .select('intolerance_key');

if (im_error) {
  console.log(`  ❌ Erro: ${im_error.message}`);
} else {
  const grouped = {};
  im_data?.forEach(m => {
    grouped[m.intolerance_key] = (grouped[m.intolerance_key] || 0) + 1;
  });
  
  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  console.log(`  Total: ${im_data?.length || 0} ingredientes mapeados`);
  sorted.forEach(([key, count]) => {
    console.log(`    - ${key}: ${count} ingredientes`);
  });
}

// 4. Safe Keywords
console.log("\n✅ 4. INTOLERANCE SAFE KEYWORDS:");
const { data: sk_data, error: sk_error } = await supabase
  .from('intolerance_safe_keywords')
  .select('intolerance_key');

if (sk_error) {
  console.log(`  ❌ Erro: ${sk_error.message}`);
} else {
  const grouped = {};
  sk_data?.forEach(m => {
    grouped[m.intolerance_key] = (grouped[m.intolerance_key] || 0) + 1;
  });
  
  console.log(`  Total: ${sk_data?.length || 0} keywords`);
  Object.entries(grouped).forEach(([key, count]) => {
    console.log(`    - ${key}: ${count} keywords`);
  });
}

// 5. Dynamic Safe Ingredients
console.log("\n🔓 5. DYNAMIC SAFE INGREDIENTS:");
const { count: dsi_count, error: dsi_error } = await supabase
  .from('dynamic_safe_ingredients')
  .select('*', { count: 'exact', head: true });

if (dsi_error) {
  console.log(`  ❌ Erro: ${dsi_error.message}`);
} else {
  console.log(`  Total: ${dsi_count || 0} ingredientes`);
}

// 6. Intolerance Key Normalization
console.log("\n🔄 6. INTOLERANCE KEY NORMALIZATION:");
const { count: ikn_count, error: ikn_error } = await supabase
  .from('intolerance_key_normalization')
  .select('*', { count: 'exact', head: true });

if (ikn_error) {
  console.log(`  ❌ Erro: ${ikn_error.message}`);
} else {
  console.log(`  Total: ${ikn_count || 0} normalizações`);
}

console.log("\n" + "=".repeat(60));
console.log("📊 RESUMO DOS GAPS:");
console.log("=".repeat(60));

const gaps = [];

if (!simpleMeals || simpleMeals.length === 0) {
  gaps.push("🔴 CRÍTICO: simple_meals está vazio (esperado: 156)");
}

if (fdm_count === 0) {
  gaps.push("🔴 CRÍTICO: food_decomposition_mappings está vazio (esperado: 50-100)");
}

if (!im_data || im_data.length < 500) {
  gaps.push(`🟡 IMPORTANTE: intolerance_mappings tem apenas ${im_data?.length || 0} (esperado: 500+)`);
}

if (!sk_data || sk_data.length < 50) {
  gaps.push(`🟡 MÉDIO: intolerance_safe_keywords tem apenas ${sk_data?.length || 0} (esperado: 100+)`);
}

if (ikn_count === 0) {
  gaps.push("🟡 MÉDIO: intolerance_key_normalization está vazio (esperado: 18-20)");
}

if (gaps.length === 0) {
  console.log("✅ Nenhum gap crítico encontrado!");
} else {
  gaps.forEach(gap => console.log(gap));
}

console.log("\n✨ Verificação concluída!");
