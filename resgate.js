import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// CORREÇÃO: Usando a URL completa e específica da Edge Function
const EXPORTER_FUNCTION_URL = 'https://adaptive-eats.lovable.app/functions/v1/data-exporter';
const API_SECRET = 'migr_secret_kj987dfg65hj';

const tablesToBackup = [
    'foods', 'dietary_forbidden_ingredients', 'intolerance_mappings', 'dietary_profiles',
    'feature_flags', 'food_decomposition_mappings', 'ingredient_aliases',
    'intolerance_key_normalization', 'intolerance_safe_keywords', 'meal_time_settings',
    'nutritional_strategies', 'onboarding_categories', 'onboarding_countries',
    'onboarding_options', 'simple_meals', 'symptom_types', 'supported_languages',
    'profiles', 'recipes', 'meal_plans', 'meal_plan_items', 'meal_consumption',
    'consumption_items', 'symptom_logs', 'water_consumption', 'water_settings',
    'weight_history', 'user_roles', 'push_subscriptions', 'meal_reminder_settings',
    'user_achievements', 'user_gamification'
];

const fetchAndSaveTable = async (tableName) => {
  console.log(`\n🚀 Iniciando resgate da tabela: [${tableName}] via Edge Function...`);

  try {
    const response = await fetch(EXPORTER_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_SECRET}`
      },
      body: JSON.stringify({ table: tableName })
    });

    if (!response.ok) {
        // Tenta ler a resposta como texto para ver a mensagem de erro da função
        const errorBody = await response.text();
        // Se a resposta for um HTML (como uma página de erro), mostramos um trecho
        if (errorBody.trim().startsWith('<!doctype')) {
            throw new Error(`Request failed with status ${response.status}. The function seems to have returned an HTML page instead of JSON.`);
        } else {
            throw new Error(`Request failed with status ${response.status}: ${errorBody}`);
        }
    }

    const records = await response.json();

    if (records.error) {
        throw new Error(`Function Error: ${records.error}`);
    }

    if (records && records.length > 0) {
      const fileName = `${tableName}_backup.json`;
      fs.writeFileSync(fileName, JSON.stringify(records, null, 2));
      console.log(`✅ SUCESSO! ${records.length} registros da tabela [${tableName}] salvos em ${fileName}`);
    } else {
      console.log(`⚪ Tabela [${tableName}] está vazia ou não retornou dados. Nenhum backup gerado.`);
    }
  } catch (error) {
    console.error(`❌ Erro ao buscar dados da tabela [${tableName}]:`, error.message);
  }
};

const runBackup = async () => {
  console.log("🔥 Iniciando processo de backup completo via Data Exporter Function...");
  for (const table of tablesToBackup) {
    await fetchAndSaveTable(table);
  }
  console.log("\n🎉 Processo de backup concluído!");
};

runBackup();
