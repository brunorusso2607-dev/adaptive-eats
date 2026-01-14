import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 POPULANDO DADOS DO LOVABLE...\n");

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

let norm_inserted = 0;
for (const item of normalization) {
  const { error } = await supabase
    .from('intolerance_key_normalization')
    .upsert(item, { onConflict: 'onboarding_key' });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${item.onboarding_key}: ${error.message}`);
  } else {
    norm_inserted++;
  }
}
console.log(`  ✅ ${norm_inserted}/22 normalizações inseridas\n`);

// ============================================================
// 2. NUTRITIONAL STRATEGIES (6 estratégias)
// ============================================================
console.log("🎯 2. NUTRITIONAL STRATEGIES:");

const strategies = [
  { key: 'weight_loss', label: 'Emagrecimento', calorie_modifier: -500, protein_per_kg: 2.0, carb_ratio: 0.45, fat_ratio: 0.30, is_active: true, sort_order: 1 },
  { key: 'cutting', label: 'Cutting', calorie_modifier: -400, protein_per_kg: 2.2, carb_ratio: 0.40, fat_ratio: 0.30, is_active: false, sort_order: 2 },
  { key: 'maintenance', label: 'Manutenção', calorie_modifier: 0, protein_per_kg: 1.6, carb_ratio: 0.50, fat_ratio: 0.25, is_active: true, sort_order: 3 },
  { key: 'fitness', label: 'Fitness', calorie_modifier: 0, protein_per_kg: 2.0, carb_ratio: 0.45, fat_ratio: 0.30, is_active: false, sort_order: 4 },
  { key: 'weight_gain', label: 'Ganhar Peso', calorie_modifier: 400, protein_per_kg: 2.0, carb_ratio: 0.50, fat_ratio: 0.25, is_active: true, sort_order: 5 },
  { key: 'flexible_diet', label: 'Dieta Flexível', calorie_modifier: null, protein_per_kg: null, carb_ratio: null, fat_ratio: null, is_flexible: true, is_active: false, sort_order: 6 }
];

let strat_inserted = 0;
for (const item of strategies) {
  const { error } = await supabase
    .from('nutritional_strategies')
    .upsert(item, { onConflict: 'key' });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${item.key}: ${error.message}`);
  } else {
    strat_inserted++;
  }
}
console.log(`  ✅ ${strat_inserted}/6 estratégias inseridas\n`);

// ============================================================
// 3. SYMPTOM TYPES (15 sintomas)
// ============================================================
console.log("🤒 3. SYMPTOM TYPES:");

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

let symp_inserted = 0;
for (const item of symptoms) {
  const { error } = await supabase
    .from('symptom_types')
    .upsert(item, { onConflict: 'name' });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${item.name}: ${error.message}`);
  } else {
    symp_inserted++;
  }
}
console.log(`  ✅ ${symp_inserted}/15 sintomas inseridos\n`);

// ============================================================
// 4. FEATURE FLAGS (2 flags)
// ============================================================
console.log("🚩 4. FEATURE FLAGS:");

const flags = [
  { feature_key: 'kids_mode', display_name: 'Modo Kids', is_enabled: false, description: 'Ativa o modo infantil com receitas adaptadas para crianças' },
  { feature_key: 'show_country_selection', display_name: 'Seleção de País no Onboarding', is_enabled: false, description: 'Quando desativado, a página de seleção de país é pulada e o usuário é definido automaticamente como BR' }
];

let flag_inserted = 0;
for (const item of flags) {
  const { error } = await supabase
    .from('feature_flags')
    .upsert(item, { onConflict: 'feature_key' });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${item.feature_key}: ${error.message}`);
  } else {
    flag_inserted++;
  }
}
console.log(`  ✅ ${flag_inserted}/2 flags inseridas\n`);

// ============================================================
// 5. MEAL STATUS COLORS (3 status)
// ============================================================
console.log("🎨 5. MEAL STATUS COLORS:");

const colors = [
  { status_key: 'on_time', label: 'No horário', background_color: 'rgba(34, 197, 94, 0.1)', text_color: 'rgba(34, 197, 94, 1)', border_color: 'rgba(34, 197, 94, 0.3)', sort_order: 1 },
  { status_key: 'alert', label: 'Em alerta', background_color: 'rgba(251, 191, 36, 0.1)', text_color: 'rgba(217, 119, 6, 1)', border_color: 'rgba(251, 191, 36, 0.3)', sort_order: 2 },
  { status_key: 'late', label: 'Atrasado', background_color: 'rgba(239, 68, 68, 0.1)', text_color: 'rgba(239, 68, 68, 1)', border_color: 'rgba(239, 68, 68, 0.3)', sort_order: 3 }
];

let color_inserted = 0;
for (const item of colors) {
  const { error } = await supabase
    .from('meal_status_colors')
    .upsert(item, { onConflict: 'status_key' });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${item.status_key}: ${error.message}`);
  } else {
    color_inserted++;
  }
}
console.log(`  ✅ ${color_inserted}/3 cores inseridas\n`);

// ============================================================
// 6. SUPPORTED LANGUAGES (6 idiomas)
// ============================================================
console.log("🌍 6. SUPPORTED LANGUAGES:");

const languages = [
  { code: 'pt', name: 'Português', native_name: 'Português', is_active: true, is_base_language: false, expansion_status: 'completed', sort_order: 1 },
  { code: 'en', name: 'English', native_name: 'English', is_active: true, is_base_language: true, expansion_status: 'completed', total_terms: 3473, sort_order: 2 },
  { code: 'es', name: 'Español', native_name: 'Español', is_active: true, is_base_language: false, expansion_status: 'pending', sort_order: 3 },
  { code: 'de', name: 'German', native_name: 'Deutsch', is_active: false, is_base_language: false, expansion_status: 'pending', sort_order: 4 },
  { code: 'fr', name: 'French', native_name: 'Français', is_active: false, is_base_language: false, expansion_status: 'pending', sort_order: 5 },
  { code: 'it', name: 'Italian', native_name: 'Italiano', is_active: false, is_base_language: false, expansion_status: 'pending', sort_order: 6 }
];

let lang_inserted = 0;
for (const item of languages) {
  const { error } = await supabase
    .from('supported_languages')
    .upsert(item, { onConflict: 'code' });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${item.code}: ${error.message}`);
  } else {
    lang_inserted++;
  }
}
console.log(`  ✅ ${lang_inserted}/6 idiomas inseridos\n`);

// ============================================================
// 7. SPOONACULAR REGION QUEUE (4 regiões)
// ============================================================
console.log("🌎 7. SPOONACULAR REGION QUEUE:");

const regions = [
  { region_code: 'BR', region_name: 'Brasil', cuisines: ['brazilian', 'latin american'], priority: 1, is_active: true, use_ai_fallback: true, total_imported: 14 },
  { region_code: 'US', region_name: 'Estados Unidos', cuisines: ['american'], priority: 2, is_active: true, use_ai_fallback: false, total_imported: 0 },
  { region_code: 'EU', region_name: 'Europa', cuisines: ['italian', 'french', 'german', 'spanish', 'greek', 'british', 'mediterranean'], priority: 3, is_active: true, use_ai_fallback: false, total_imported: 0 },
  { region_code: 'LATAM', region_name: 'América Latina', cuisines: ['mexican', 'caribbean'], priority: 4, is_active: true, use_ai_fallback: false, total_imported: 0 }
];

let region_inserted = 0;
for (const item of regions) {
  const { error } = await supabase
    .from('spoonacular_region_queue')
    .upsert(item, { onConflict: 'region_code' });
  
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${item.region_code}: ${error.message}`);
  } else {
    region_inserted++;
  }
}
console.log(`  ✅ ${region_inserted}/4 regiões inseridas\n`);

// ============================================================
// RESUMO FINAL
// ============================================================
console.log("=".repeat(60));
console.log("📊 RESUMO DA POPULAÇÃO:");
console.log("=".repeat(60));
console.log(`✅ Intolerance Key Normalization: ${norm_inserted}/22`);
console.log(`✅ Nutritional Strategies: ${strat_inserted}/6`);
console.log(`✅ Symptom Types: ${symp_inserted}/15`);
console.log(`✅ Feature Flags: ${flag_inserted}/2`);
console.log(`✅ Meal Status Colors: ${color_inserted}/3`);
console.log(`✅ Supported Languages: ${lang_inserted}/6`);
console.log(`✅ Spoonacular Region Queue: ${region_inserted}/4`);

console.log("\n⚠️ TABELAS GRANDES NÃO INCLUÍDAS NO DUMP:");
console.log("  - intolerance_mappings (1000+ registros)");
console.log("  - dietary_forbidden_ingredients (970+ registros)");
console.log("  - intolerance_safe_keywords (500+ registros)");
console.log("  - food_decomposition_mappings (400+ registros)");
console.log("  - simple_meals (156 registros)");
console.log("  - onboarding_options (50+ registros)");

console.log("\n💡 PRÓXIMO PASSO:");
console.log("Solicite ao Lovable o export dessas tabelas grandes via:");
console.log("  1. SQL Editor: COPY (SELECT * FROM [table]) TO STDOUT WITH CSV HEADER");
console.log("  2. Ou: pg_dump com --data-only --inserts");

console.log("\n✨ População de dados de configuração concluída!");
