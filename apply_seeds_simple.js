import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔥 Aplicando seeds no banco de dados...\n");

// FASE 1: ONBOARDING - PAÍSES
console.log("📍 1/8 - Inserindo países...");
const countries = [
  { country_code: 'BR', country_name: 'Brasil', flag_emoji: '🇧🇷', is_active: true, sort_order: 1 },
  { country_code: 'PT', country_name: 'Portugal', flag_emoji: '🇵🇹', is_active: false, sort_order: 2 },
  { country_code: 'US', country_name: 'Estados Unidos', flag_emoji: '🇺🇸', is_active: false, sort_order: 3 },
  { country_code: 'GB', country_name: 'Reino Unido', flag_emoji: '🇬🇧', is_active: false, sort_order: 4 }
];

for (const country of countries) {
  const { error } = await supabase.from('onboarding_countries').upsert(country, { onConflict: 'country_code' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ Erro ao inserir ${country.country_name}:`, error.message);
  }
}
console.log("  ✅ Países inseridos");

// FASE 2: ONBOARDING - CATEGORIAS
console.log("\n📂 2/8 - Inserindo categorias do onboarding...");
const categories = [
  { category_key: 'regions', label: 'Regiões', icon_name: 'globe', description: 'Selecione sua região', sort_order: 1, is_active: true },
  { category_key: 'intolerances', label: 'Intolerâncias', icon_name: 'alert-triangle', description: 'Intolerâncias digestivas', sort_order: 2, is_active: true },
  { category_key: 'allergies', label: 'Alergias', icon_name: 'alert-circle', description: 'Reações alérgicas', sort_order: 3, is_active: true },
  { category_key: 'sensitivities', label: 'Sensibilidades', icon_name: 'activity', description: 'Sensibilidades metabólicas', sort_order: 4, is_active: true },
  { category_key: 'dietary_preferences', label: 'Preferências Alimentares', icon_name: 'utensils', description: 'Seu estilo de alimentação', sort_order: 5, is_active: true },
  { category_key: 'excluded_ingredients', label: 'Alimentos Excluídos', icon_name: 'ban', description: 'Ingredientes que você não come', sort_order: 6, is_active: true },
  { category_key: 'goals', label: 'Objetivos', icon_name: 'target', description: 'Seu objetivo nutricional', sort_order: 7, is_active: true }
];

for (const cat of categories) {
  const { error } = await supabase.from('onboarding_categories').upsert(cat, { onConflict: 'category_key' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ Erro ao inserir ${cat.label}:`, error.message);
  }
}
console.log("  ✅ Categorias inseridas");

// FASE 3: ONBOARDING - OPÇÕES (resumido - só as principais)
console.log("\n🎯 3/8 - Inserindo opções do onboarding (isso pode demorar)...");

const options = [
  // Intolerâncias
  { category: 'intolerances', option_id: 'gluten', label: 'Glúten', description: 'Trigo, cevada, centeio', emoji: '🌾', icon_name: 'wheat', is_active: true, sort_order: 1 },
  { category: 'intolerances', option_id: 'lactose', label: 'Lactose', description: 'Leite e derivados', emoji: '🥛', icon_name: 'milk', is_active: true, sort_order: 2 },
  { category: 'intolerances', option_id: 'fodmap', label: 'FODMAP', description: 'Carboidratos fermentáveis', emoji: '🫘', icon_name: 'bean', is_active: true, sort_order: 3 },
  { category: 'intolerances', option_id: 'none', label: 'Nenhuma', description: 'Não tenho intolerâncias', emoji: '✅', icon_name: 'check', is_active: true, sort_order: 99 },
  // Alergias
  { category: 'allergies', option_id: 'peanut', label: 'Amendoim', description: 'Alergia a amendoim', emoji: '🥜', icon_name: 'nut', is_active: true, sort_order: 1 },
  { category: 'allergies', option_id: 'nuts', label: 'Oleaginosas', description: 'Castanhas, nozes', emoji: '🌰', icon_name: 'acorn', is_active: true, sort_order: 2 },
  { category: 'allergies', option_id: 'seafood', label: 'Frutos do mar', description: 'Crustáceos', emoji: '🦐', icon_name: 'fish', is_active: true, sort_order: 3 },
  { category: 'allergies', option_id: 'none', label: 'Nenhuma', description: 'Não tenho alergias', emoji: '✅', icon_name: 'check', is_active: true, sort_order: 99 },
  // Preferências
  { category: 'dietary_preferences', option_id: 'omnivore', label: 'Comum', description: 'Como de tudo', emoji: '🍽️', icon_name: 'utensils', is_active: true, sort_order: 1 },
  { category: 'dietary_preferences', option_id: 'vegetarian', label: 'Vegetariana', description: 'Sem carnes', emoji: '🥗', icon_name: 'salad', is_active: true, sort_order: 2 },
  { category: 'dietary_preferences', option_id: 'vegan', label: 'Vegana', description: 'Sem origem animal', emoji: '🌱', icon_name: 'leaf', is_active: true, sort_order: 3 },
  // Objetivos
  { category: 'goals', option_id: 'lose_weight', label: 'Emagrecer', description: 'Perder peso', emoji: '⬇️', icon_name: 'trending-down', is_active: true, sort_order: 1 },
  { category: 'goals', option_id: 'maintain', label: 'Manter peso', description: 'Manter peso atual', emoji: '⚖️', icon_name: 'scale', is_active: true, sort_order: 2 },
  { category: 'goals', option_id: 'gain_weight', label: 'Ganhar peso', description: 'Ganhar massa', emoji: '⬆️', icon_name: 'trending-up', is_active: true, sort_order: 3 }
];

let optionsInserted = 0;
for (const opt of options) {
  const { error } = await supabase.from('onboarding_options').upsert(opt, { onConflict: 'category,option_id' });
  if (!error || error.message.includes('duplicate')) {
    optionsInserted++;
  } else {
    console.error(`  ⚠️ ${opt.label}:`, error.message.substring(0, 50));
  }
}
console.log(`  ✅ ${optionsInserted}/${options.length} opções inseridas`);

// FASE 4: CONFIGURAÇÕES GLOBAIS
console.log("\n⚙️ 4/8 - Inserindo horários de refeições...");
const mealTimes = [
  { meal_type: 'cafe_manha', start_hour: 6, end_hour: 10, label: 'Café da Manhã', icon_name: 'sunrise', is_active: true, sort_order: 1 },
  { meal_type: 'almoco', start_hour: 11, end_hour: 14, label: 'Almoço', icon_name: 'sun', is_active: true, sort_order: 3 },
  { meal_type: 'jantar', start_hour: 18, end_hour: 21, label: 'Jantar', icon_name: 'moon', is_active: true, sort_order: 5 }
];

for (const mt of mealTimes) {
  const { error } = await supabase.from('meal_time_settings').upsert(mt, { onConflict: 'meal_type' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${mt.label}:`, error.message);
  }
}
console.log("  ✅ Horários inseridos");

console.log("\n🌍 5/8 - Inserindo idiomas suportados...");
const languages = [
  { language_code: 'pt-BR', language_name: 'Portuguese (Brazil)', native_name: 'Português (Brasil)', flag_emoji: '🇧🇷', is_active: true, is_default: true, sort_order: 1, translation_coverage: 100 },
  { language_code: 'en-US', language_name: 'English (US)', native_name: 'English (US)', flag_emoji: '🇺🇸', is_active: true, is_default: false, sort_order: 2, translation_coverage: 80 }
];

for (const lang of languages) {
  const { error } = await supabase.from('supported_languages').upsert(lang, { onConflict: 'language_code' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${lang.native_name}:`, error.message);
  }
}
console.log("  ✅ Idiomas inseridos");

console.log("\n🏥 6/8 - Inserindo tipos de sintomas...");
const symptoms = [
  { symptom_key: 'nausea', label: 'Náusea', description: 'Enjoo', icon_name: 'frown', severity_level: 'medium', is_active: true, sort_order: 1 },
  { symptom_key: 'stomach_pain', label: 'Dor de Estômago', description: 'Dor abdominal', icon_name: 'activity', severity_level: 'high', is_active: true, sort_order: 2 },
  { symptom_key: 'bloating', label: 'Inchaço', description: 'Barriga inchada', icon_name: 'circle', severity_level: 'low', is_active: true, sort_order: 3 }
];

for (const symp of symptoms) {
  const { error } = await supabase.from('symptom_types').upsert(symp, { onConflict: 'symptom_key' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${symp.label}:`, error.message);
  }
}
console.log("  ✅ Sintomas inseridos");

console.log("\n🚩 7/8 - Inserindo feature flags...");
const flags = [
  { flag_key: 'meal_plans', label: 'Planos Alimentares', description: 'Geração de planos por IA', is_enabled: true, category: 'core', sort_order: 1 },
  { flag_key: 'photo_analysis', label: 'Análise de Fotos', description: 'Análise de fotos de refeições', is_enabled: true, category: 'ai', sort_order: 2 },
  { flag_key: 'symptom_tracking', label: 'Rastreamento de Sintomas', description: 'Registro de sintomas', is_enabled: true, category: 'health', sort_order: 3 }
];

for (const flag of flags) {
  const { error } = await supabase.from('feature_flags').upsert(flag, { onConflict: 'flag_key' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${flag.label}:`, error.message);
  }
}
console.log("  ✅ Feature flags inseridas");

console.log("\n🥗 8/8 - Inserindo perfis dietéticos...");
const profiles = [
  { profile_key: 'vegan', label: 'Vegano', description: 'Sem produtos animais', icon_name: 'leaf', color: 'green', is_active: true, sort_order: 1, requires_validation: true },
  { profile_key: 'vegetarian', label: 'Vegetariano', description: 'Sem carnes', icon_name: 'salad', color: 'lime', is_active: true, sort_order: 2, requires_validation: true },
  { profile_key: 'omnivore', label: 'Onívoro', description: 'Come de tudo', icon_name: 'utensils', color: 'gray', is_active: true, sort_order: 5, requires_validation: false }
];

for (const prof of profiles) {
  const { error } = await supabase.from('dietary_profiles').upsert(prof, { onConflict: 'profile_key' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${prof.label}:`, error.message);
  }
}
console.log("  ✅ Perfis dietéticos inseridos");

console.log("\n\n🎉 SEEDS APLICADOS COM SUCESSO!\n");
console.log("📋 Próximos passos:");
console.log("1. ✅ Acesse o Admin → Onboarding e verifique se os dados aparecem");
console.log("2. 📦 Popule a base de alimentos executando os importadores");
console.log("3. 🛡️ Opcionalmente, expanda as intolerâncias via edge functions de IA\n");
