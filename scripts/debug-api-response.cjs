/**
 * DEBUG: Ver resposta raw da API
 */

const https = require('https');

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4ODg4MzcsImV4cCI6MjA1MjQ2NDgzN30.sz8neorPB2PvPpy52KMz9VZnYlXsAkzXMBBLqPD2gwI';

const data = JSON.stringify({
  country_code: 'BR',
  meal_type: 'almoco',
  quantity: 2
});

const options = {
  hostname: 'onzdkpqtzfxzcdyxczkn.supabase.co',
  port: 443,
  path: '/functions/v1/populate-meal-pool',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'apikey': SUPABASE_ANON_KEY,
    'Content-Length': data.length
  }
};

console.log('Chamando API...');

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('\n=== RESPOSTA RAW ===');
    console.log('Status:', res.statusCode);
    console.log('\nBody:');
    
    try {
      const parsed = JSON.parse(body);
      console.log(JSON.stringify(parsed, null, 2));
      
      // Verificar estrutura das refeições
      if (parsed.meals) {
        console.log('\n=== ANÁLISE DAS REFEIÇÕES ===');
        for (const meal of parsed.meals) {
          console.log(`\nRefeição: ${meal.name}`);
          console.log(`  Components existem: ${!!meal.components}`);
          console.log(`  Components tipo: ${typeof meal.components}`);
          console.log(`  Components é array: ${Array.isArray(meal.components)}`);
          if (meal.components) {
            console.log(`  Components length: ${meal.components.length}`);
            console.log(`  Components: ${JSON.stringify(meal.components)}`);
          }
        }
      }
      
      if (parsed.inserted) {
        console.log('\n=== REFEIÇÕES INSERIDAS ===');
        console.log(`Total inseridas: ${parsed.inserted}`);
      }
      
      if (parsed.error) {
        console.log('\n=== ERRO ===');
        console.log(parsed.error);
      }
      
    } catch (e) {
      console.log('Erro ao parsear JSON:', e.message);
      console.log('Body raw:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Erro na requisição:', e);
});

req.write(data);
req.end();
