const https = require('https');

const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MTU1NzksImV4cCI6MjA1MjI5MTU3OX0.Qv8vxPRhYbBqKz2NfIqVdOjBJkiPPkJUCJHJGEYFQpg';

const MEAL_TYPES = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'];

async function generateMeals(mealType) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      country_code: 'BR',
      meal_type: mealType,
      quantity: 5,
    });

    const options = {
      hostname: 'onzdkpqtzfxzcdyxczkn.supabase.co',
      port: 443,
      path: '/functions/v1/populate-meal-pool',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('TESTE DO GERADOR AVANÇADO - 5 REFEIÇÕES DE CADA TIPO');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const mealType of MEAL_TYPES) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 TIPO: ${mealType.toUpperCase().replace('_', ' ')}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const response = await generateMeals(mealType);
      
      console.log(`✅ Status: ${response.success ? 'SUCESSO' : 'FALHA'}`);
      console.log(`📊 Geradas: ${response.generated} | Inseridas: ${response.inserted} | Puladas: ${response.skipped}\n`);

      if (response.meals && response.meals.length > 0) {
        response.meals.forEach((meal, index) => {
          console.log(`${index + 1}. ${meal.name}`);
          console.log(`   📈 Calorias: ${meal.calories} kcal | Proteína: ${meal.protein}g | Carbs: ${meal.carbs}g | Gordura: ${meal.fat}g | Fibras: ${meal.fiber}g`);
          console.log(`   🔒 Confiança: ${meal.confidence}`);
          console.log(`   🍽️  Componentes (${meal.components_count}):`);
          
          meal.components.forEach(comp => {
            console.log(`      • ${comp.name} (${comp.portion_label}) - ${comp.type}`);
          });
          console.log('');
        });
      }

      // Aguardar 2 segundos entre requisições
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`❌ Erro ao gerar ${mealType}:`, error.message);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TESTE COMPLETO!');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
