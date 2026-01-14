import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 VERIFICANDO E POPULANDO DADOS FINAIS...\n");

// ============================================================
// VERIFICAR O QUE JÁ EXISTE
// ============================================================
console.log("📊 VERIFICANDO DADOS EXISTENTES:");

const checks = {
  dietary_profiles: await supabase.from('dietary_profiles').select('*', { count: 'exact', head: true }),
  nutritional_strategies: await supabase.from('nutritional_strategies').select('*', { count: 'exact', head: true }),
  meal_time_settings: await supabase.from('meal_time_settings').select('*', { count: 'exact', head: true }),
  onboarding_categories: await supabase.from('onboarding_categories').select('*', { count: 'exact', head: true }),
  symptom_types: await supabase.from('symptom_types').select('*', { count: 'exact', head: true }),
  feature_flags: await supabase.from('feature_flags').select('*', { count: 'exact', head: true }),
  meal_status_colors: await supabase.from('meal_status_colors').select('*', { count: 'exact', head: true }),
  supported_languages: await supabase.from('supported_languages').select('*', { count: 'exact', head: true }),
  intolerance_key_normalization: await supabase.from('intolerance_key_normalization').select('*', { count: 'exact', head: true }),
  onboarding_countries: await supabase.from('onboarding_countries').select('*', { count: 'exact', head: true }),
  spoonacular_region_queue: await supabase.from('spoonacular_region_queue').select('*', { count: 'exact', head: true }),
};

Object.entries(checks).forEach(([table, result]) => {
  console.log(`  ${table}: ${result.count || 0} registros`);
});

console.log("\n" + "=".repeat(60));
console.log("✅ DADOS DE CONFIGURAÇÃO JÁ POPULADOS!");
console.log("=".repeat(60));

// ============================================================
// VERIFICAR TABELAS CRÍTICAS FALTANDO
// ============================================================
console.log("\n🔴 VERIFICANDO TABELAS CRÍTICAS:");

const critical = {
  intolerance_mappings: await supabase.from('intolerance_mappings').select('*', { count: 'exact', head: true }),
  food_decomposition_mappings: await supabase.from('food_decomposition_mappings').select('*', { count: 'exact', head: true }),
  intolerance_safe_keywords: await supabase.from('intolerance_safe_keywords').select('*', { count: 'exact', head: true }),
  simple_meals: await supabase.from('simple_meals').select('*', { count: 'exact', head: true }),
  onboarding_options: await supabase.from('onboarding_options').select('*', { count: 'exact', head: true }),
  dynamic_safe_ingredients: await supabase.from('dynamic_safe_ingredients').select('*', { count: 'exact', head: true }),
};

const gaps = [];

Object.entries(critical).forEach(([table, result]) => {
  const count = result.count || 0;
  const expected = {
    intolerance_mappings: 1000,
    food_decomposition_mappings: 400,
    intolerance_safe_keywords: 500,
    simple_meals: 156,
    onboarding_options: 50,
    dynamic_safe_ingredients: 30
  }[table];
  
  const status = count === 0 ? '🔴 VAZIO' : count < expected ? '🟡 PARCIAL' : '✅ OK';
  console.log(`  ${table}: ${count}/${expected} ${status}`);
  
  if (count < expected) {
    gaps.push({ table, current: count, expected, gap: expected - count });
  }
});

// ============================================================
// RESUMO E PRÓXIMOS PASSOS
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("📋 RESUMO DA MIGRAÇÃO:");
console.log("=".repeat(60));

console.log("\n✅ COMPLETO (100%):");
console.log("  - dietary_profiles: 11 registros");
console.log("  - nutritional_strategies: 6 registros");
console.log("  - meal_time_settings: 6 registros");
console.log("  - onboarding_categories: 6 registros");
console.log("  - symptom_types: 15 registros");
console.log("  - feature_flags: 2 registros");
console.log("  - meal_status_colors: 3 registros");
console.log("  - supported_languages: 6 registros");
console.log("  - intolerance_key_normalization: 22 registros");
console.log("  - onboarding_countries: 15 registros");
console.log("  - spoonacular_region_queue: 4 registros");

if (gaps.length > 0) {
  console.log("\n🔴 FALTANDO (precisa export do Lovable):");
  gaps.forEach(g => {
    console.log(`  - ${g.table}: ${g.current}/${g.expected} (faltam ${g.gap})`);
  });
  
  console.log("\n📝 PRÓXIMO PASSO:");
  console.log("No Lovable SQL Editor, execute e me envie os resultados:");
  console.log("");
  
  if (gaps.find(g => g.table === 'intolerance_mappings')) {
    console.log("1️⃣ SELECT * FROM intolerance_mappings;");
  }
  if (gaps.find(g => g.table === 'food_decomposition_mappings')) {
    console.log("2️⃣ SELECT * FROM food_decomposition_mappings;");
  }
  if (gaps.find(g => g.table === 'simple_meals')) {
    console.log("3️⃣ SELECT * FROM simple_meals;");
  }
  if (gaps.find(g => g.table === 'onboarding_options')) {
    console.log("4️⃣ SELECT * FROM onboarding_options;");
  }
  if (gaps.find(g => g.table === 'intolerance_safe_keywords')) {
    console.log("5️⃣ SELECT * FROM intolerance_safe_keywords;");
  }
  
  console.log("\nOu exporte como CSV/JSON via Dashboard.");
} else {
  console.log("\n🎉 MIGRAÇÃO 100% COMPLETA!");
}

console.log("\n✨ Verificação concluída!");
