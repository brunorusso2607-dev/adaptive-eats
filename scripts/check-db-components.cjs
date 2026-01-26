/**
 * Verificar componentes salvos no banco
 */

const https = require('https');

const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4ODg4MzcsImV4cCI6MjA1MjQ2NDgzN30.sz8neorPB2PvPpy52KMz9VZnYlXsAkzXMBBLqPD2gwI';

// Buscar últimas 5 refeições do banco
const url = new URL(`${SUPABASE_URL}/rest/v1/meal_combinations`);
url.searchParams.append('select', 'name,meal_type,components,total_calories,total_protein,macro_source,created_at');
url.searchParams.append('order', 'created_at.desc');
url.searchParams.append('limit', '5');

console.log('Buscando últimas 5 refeições do banco...\n');

const options = {
  hostname: 'onzdkpqtzfxzcdyxczkn.supabase.co',
  port: 443,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const meals = JSON.parse(body);
      
      console.log('='.repeat(80));
      console.log('REFEIÇÕES NO BANCO DE DADOS');
      console.log('='.repeat(80));
      
      for (const meal of meals) {
        console.log(`\n📋 ${meal.name}`);
        console.log(`   Tipo: ${meal.meal_type}`);
        console.log(`   Calorias: ${meal.total_calories} kcal`);
        console.log(`   Proteína: ${meal.total_protein}g`);
        console.log(`   Fonte: ${meal.macro_source}`);
        console.log(`   Criado: ${meal.created_at}`);
        console.log(`   Components existe: ${!!meal.components}`);
        console.log(`   Components tipo: ${typeof meal.components}`);
        
        if (meal.components) {
          if (Array.isArray(meal.components)) {
            console.log(`   Components length: ${meal.components.length}`);
            console.log(`   Components:`);
            for (const comp of meal.components) {
              console.log(`     - ${comp.name} (${comp.type}) ${comp.portion_grams ? comp.portion_grams + 'g' : 'sem porção'}`);
            }
          } else {
            console.log(`   Components (não é array): ${JSON.stringify(meal.components).slice(0, 200)}`);
          }
        } else {
          console.log(`   ⚠️ SEM COMPONENTES!`);
        }
      }
      
      console.log('\n');
      
    } catch (e) {
      console.error('Erro ao parsear:', e.message);
      console.log('Body:', body);
    }
  });
});

req.on('error', (e) => console.error('Erro:', e));
req.end();
