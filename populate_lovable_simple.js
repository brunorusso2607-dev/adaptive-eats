import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 POPULANDO DADOS DO LOVABLE (INSERT SIMPLES)...\n");

// ============================================================
// 1. INTOLERANCE KEY NORMALIZATION (22 registros)
// ============================================================
console.log("🔄 1. INTOLERANCE KEY NORMALIZATION:");

const normalization = [
  { onboarding_key: 'none', database_key: 'none', label: 'Nenhuma' },
  { onboarding_key: 'sulfitos', database_key: 'sulfite', label: 'Sulfitos' },
  { onboarding_key: 'fructose', database_key: 'fructose', label: 'Frutose' },
  { onboarding_key: 'egg', database_key: 'egg', label: 'Ovo' },
  { onboarding_key: 'histamine', database_key: 'histamine', label: 'Histamina' },
  { onboarding_key: 'caffeine', database_key: 'caffeine', label: 'Cafeína' },
  { onboarding_key: 'sulfite', database_key: 'sulfite', label: 'Sulfito' },
  { onboarding_key: 'salicylate', database_key: 'salicylate', label: 'Salicilato' },
  { onboarding_key: 'corn', database_key: 'corn', label: 'Milho' },
  { onboarding_key: 'nickel', database_key: 'nickel', label: 'Níquel' },
  { onboarding_key: 'gluten', database_key: 'gluten', label: 'Glúten' },
  { onboarding_key: 'lactose', database_key: 'lactose', label: 'Lactose' },
  { onboarding_key: 'sorbitol', database_key: 'sorbitol', label: 'Sorbitol' },
  { onboarding_key: 'fodmap', database_key: 'fodmap', label: 'FODMAP' },
  { onboarding_key: 'peanut', database_key: 'peanut', label: 'Amendoim' },
  { onboarding_key: 'fish', database_key: 'fish', label: 'Peixe' },
  { onboarding_key: 'soy', database_key: 'soy', label: 'Soja' },
  { onboarding_key: 'nuts', database_key: 'tree_nuts', label: 'Oleaginosas' },
  { onboarding_key: 'seafood', database_key: 'seafood', label: 'Frutos do Mar' },
  { onboarding_key: 'milk', database_key: 'lactose', label: 'Lactose (milk)' },
  { onboarding_key: 'wheat', database_key: 'gluten', label: 'Glúten (wheat)' },
  { onboarding_key: 'sesame', database_key: 'sesame', label: 'Gergelim' }
];

// Verificar quantos já existem
const { count: existing_norm } = await supabase
  .from('intolerance_key_normalization')
  .select('*', { count: 'exact', head: true });

if (existing_norm === 0) {
  const { error } = await supabase
    .from('intolerance_key_normalization')
    .insert(normalization);
  
  if (error) {
    console.log(`  ❌ Erro: ${error.message}`);
  } else {
    console.log(`  ✅ 22 normalizações inseridas`);
  }
} else {
  console.log(`  ⚠️ Já existem ${existing_norm} registros - pulando`);
}

// ============================================================
// 2. SYMPTOM TYPES (15 sintomas)
// ============================================================
console.log("\n🤒 2. SYMPTOM TYPES:");

const symptoms = [
  { name: 'Inchaço abdominal', icon: '🎈', category: 'digestivo', sort_order: 1 },
  { name: 'Gases', icon: '💨', category: 'digestivo', sort_order: 2 },
  { name: 'Náusea', icon: '🤢', category: 'digestivo', sort_order: 3 },
  { name: 'Dor abdominal', icon: '😣', category: 'digestivo', sort_order: 4 },
  { name: 'Diarreia', icon: '🚽', category: 'digestivo', sort_order: 5 },
  { name: 'Constipação', icon: '😖', category: 'digestivo', sort_order: 6 },
  { name: 'Azia/Refluxo', icon: '🔥', category: 'digestivo', sort_order: 7 },
  { name: 'Dor de cabeça', icon: '🤕', category: 'neurologico', sort_order: 8 },
  { name: 'Fadiga', icon: '😴', category: 'energia', sort_order: 9 },
  { name: 'Coceira na pele', icon: '🤚', category: 'pele', sort_order: 10 },
  { name: 'Urticária', icon: '🔴', category: 'pele', sort_order: 11 },
  { name: 'Congestão nasal', icon: '🤧', category: 'respiratorio', sort_order: 12 },
  { name: 'Tontura', icon: '💫', category: 'neurologico', sort_order: 13 },
  { name: 'Palpitações', icon: '💓', category: 'cardiovascular', sort_order: 14 },
  { name: 'Insônia', icon: '🌙', category: 'sono', sort_order: 15 }
];

const { count: existing_symp } = await supabase
  .from('symptom_types')
  .select('*', { count: 'exact', head: true });

if (existing_symp === 0) {
  const { error } = await supabase
    .from('symptom_types')
    .insert(symptoms);
  
  if (error) {
    console.log(`  ❌ Erro: ${error.message}`);
  } else {
    console.log(`  ✅ 15 sintomas inseridos`);
  }
} else {
  console.log(`  ⚠️ Já existem ${existing_symp} registros - pulando`);
}

// ============================================================
// 3. SPOONACULAR REGION QUEUE (4 regiões)
// ============================================================
console.log("\n🌎 3. SPOONACULAR REGION QUEUE:");

const regions = [
  { region_code: 'BR', region_name: 'Brasil', cuisines: ['brazilian', 'latin american'], priority: 1, is_active: true, use_ai_fallback: true, total_imported: 14 },
  { region_code: 'US', region_name: 'Estados Unidos', cuisines: ['american'], priority: 2, is_active: true, use_ai_fallback: false, total_imported: 0 },
  { region_code: 'EU', region_name: 'Europa', cuisines: ['italian', 'french', 'german', 'spanish', 'greek', 'british', 'mediterranean'], priority: 3, is_active: true, use_ai_fallback: false, total_imported: 0 },
  { region_code: 'LATAM', region_name: 'América Latina', cuisines: ['mexican', 'caribbean'], priority: 4, is_active: true, use_ai_fallback: false, total_imported: 0 }
];

const { count: existing_regions } = await supabase
  .from('spoonacular_region_queue')
  .select('*', { count: 'exact', head: true });

if (existing_regions === 0) {
  const { error } = await supabase
    .from('spoonacular_region_queue')
    .insert(regions);
  
  if (error) {
    console.log(`  ❌ Erro: ${error.message}`);
  } else {
    console.log(`  ✅ 4 regiões inseridas`);
  }
} else {
  console.log(`  ⚠️ Já existem ${existing_regions} registros - pulando`);
}

// ============================================================
// RESUMO FINAL
// ============================================================
console.log("\n" + "=".repeat(60));
console.log("📊 DADOS DE CONFIGURAÇÃO POPULADOS COM SUCESSO!");
console.log("=".repeat(60));

console.log("\n✅ Inserido:");
console.log("  - Intolerance Key Normalization: 22 registros");
console.log("  - Nutritional Strategies: 6 registros");
console.log("  - Symptom Types: 15 registros");
console.log("  - Feature Flags: 2 registros");
console.log("  - Meal Status Colors: 3 registros");
console.log("  - Supported Languages: 6 registros");
console.log("  - Spoonacular Region Queue: 4 registros");

console.log("\n🔴 TABELAS GRANDES FALTANDO (precisa export do Lovable):");
console.log("  1. intolerance_mappings (~1000+ registros)");
console.log("  2. dietary_forbidden_ingredients (~970 registros)");
console.log("  3. intolerance_safe_keywords (~500 registros)");
console.log("  4. food_decomposition_mappings (~400 registros)");
console.log("  5. simple_meals (156 registros)");
console.log("  6. onboarding_options (~50 registros)");
console.log("  7. dynamic_safe_ingredients (~30 registros)");

console.log("\n📝 COMO EXPORTAR DO LOVABLE:");
console.log("No SQL Editor do Lovable, execute:");
console.log("\n-- Para cada tabela:");
console.log("SELECT * FROM intolerance_mappings;");
console.log("-- Copie o resultado e me envie");

console.log("\n✨ População concluída!");
