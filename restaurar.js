import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// ATENÇÃO: Usando a SERVICE_ROLE_KEY para acesso total
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // <-- MUDANÇA CRÍTICA AQUI

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Erro: VITE_SUPABASE_URL ou VITE_SUPABASE_SERVICE_ROLE_KEY não encontradas no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Ordem de importação - tabelas sem dependências primeiro.
const filesToRestore = [
    // Configuração primeiro
    'dietary_profiles_backup.json',
    'feature_flags_backup.json',
    'intolerance_key_normalization_backup.json',
    'meal_time_settings_backup.json',
    'nutritional_strategies_backup.json',
    'onboarding_categories_backup.json',
    'onboarding_countries_backup.json',
    'onboarding_options_backup.json',
    'symptom_types_backup.json',
    'supported_languages_backup.json',
    'foods_backup.json',
    
    // Tabelas dependentes
    'dietary_forbidden_ingredients_backup.json',
    'food_decomposition_mappings_backup.json',
    'ingredient_aliases_backup.json',
    'intolerance_mappings_backup.json',
    'intolerance_safe_keywords_backup.json',
    'simple_meals_backup.json',

    // Dados de usuários (importante que profiles venha primeiro)
    'profiles_backup.json',
    'recipes_backup.json',
    'meal_plans_backup.json',
    'meal_plan_items_backup.json',
    'meal_consumption_backup.json',
    'consumption_items_backup.json',
    'symptom_logs_backup.json',
    'water_consumption_backup.json',
    'water_settings_backup.json',
    'weight_history_backup.json',
    'user_roles_backup.json',
    'push_subscriptions_backup.json',
    'meal_reminder_settings_backup.json',
    'user_achievements_backup.json',
    'user_gamification_backup.json'
];

const importData = async (fileName) => {
  const tableName = fileName.replace('_backup.json', '');
  console.log(`
🚀 Restaurando tabela: [${tableName}] do arquivo: ${fileName}`);
  
  if (!fs.existsSync(fileName)) {
    console.warn(`🟡 Aviso: Arquivo ${fileName} não encontrado! Pulando.`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
  
  if (data.length === 0) {
      console.log(`⚪ Tabela [${tableName}] está vazia no backup. Pulando.`);
      return;
  }

  const pageSize = 500; 
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < data.length; i += pageSize) {
    const chunk = data.slice(i, i + pageSize);
    console.log(`  ...Enviando registros ${i + 1} a ${Math.min(i + pageSize, data.length)}...`);

    const { error } = await supabase.from(tableName).insert(chunk);

    if (error) {
      console.error(`  ❌ Erro ao inserir lote na tabela [${tableName}]:`, error.message);
      // Opcional: logar os dados que falharam
      // fs.writeFileSync(`${tableName}_failed_chunk_${i}.json`, JSON.stringify(chunk, null, 2));
      errorCount += chunk.length;
    } else {
      successCount += chunk.length;
    }
  }

  console.log(`✅ Concluído para [${tableName}]: ${successCount} registros restaurados, ${errorCount} falhas.`);
};

const runRestore = async () => {
    console.log("🔥 Iniciando processo de restauração para o novo banco de dados...");
    for (const file of filesToRestore) {
        await importData(file);
    }
    console.log("\n🎉 Processo de restauração concluído! Seu banco de dados agora deve estar populado.");
};

runRestore();
