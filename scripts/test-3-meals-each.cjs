const https = require('https');

const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY3MTU1NzksImV4cCI6MjA1MjI5MTU3OX0.Qv8vxPRhYbBqKz2NfIqVdOjBJkiPPkJUCJHJGEYFQpg';

const MEAL_TYPES = ['cafe_manha', 'lanche_manha', 'almoco', 'lanche_tarde', 'jantar', 'ceia'];

async function generateMeals(mealType) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      country_code: 'BR',
      meal_type: mealType,
      quantity: 3,
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
  console.log('TESTE DE CORREÇÕES - 3 REFEIÇÕES DE CADA TIPO');
  console.log('Validando: 1) Sem duplicação, 2) Ordem correta, 3) Bebidas em ml');
  console.log('═══════════════════════════════════════════════════════════════\n');

  for (const mealType of MEAL_TYPES) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📋 ${mealType.toUpperCase().replace('_', ' ')}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    try {
      const response = await generateMeals(mealType);
      
      console.log(`✅ Status: ${response.success ? 'SUCESSO' : 'FALHA'}`);
      console.log(`📊 Geradas: ${response.generated} | Inseridas: ${response.inserted} | Puladas: ${response.skipped}\n`);

      if (response.meals && response.meals.length > 0) {
        response.meals.forEach((meal, index) => {
          console.log(`${index + 1}. ${meal.name}`);
          console.log(`   📈 ${meal.calories} kcal | P: ${meal.protein}g | C: ${meal.carbs}g | G: ${meal.fat}g | F: ${meal.fiber}g`);
          console.log(`   🍽️  Componentes (${meal.components_count}):`);
          
          // Verificar duplicação
          const componentNames = meal.components.map(c => c.name);
          const hasDuplicates = componentNames.length !== new Set(componentNames).size;
          if (hasDuplicates) {
            console.log(`   ⚠️  DUPLICAÇÃO DETECTADA!`);
          }
          
          // Verificar ordem (arroz primeiro, feijão segundo se existir)
          const hasArroz = meal.components.some(c => c.name.toLowerCase().includes('arroz'));
          const hasFeijao = meal.components.some(c => c.name.toLowerCase().includes('feijão'));
          if (hasArroz && hasFeijao) {
            const arrozIndex = meal.components.findIndex(c => c.name.toLowerCase().includes('arroz'));
            const feijaoIndex = meal.components.findIndex(c => c.name.toLowerCase().includes('feijão'));
            if (arrozIndex !== 0 || feijaoIndex !== 1) {
              console.log(`   ⚠️  ORDEM INCORRETA! Arroz: ${arrozIndex}, Feijão: ${feijaoIndex}`);
            } else {
              console.log(`   ✅ Ordem correta: Arroz (0), Feijão (1)`);
            }
          }
          
          meal.components.forEach(comp => {
            const icon = comp.type === 'beverage' ? '🥤' : '🍽️';
            console.log(`      ${icon} ${comp.name} (${comp.portion_label})`);
            
            // Verificar se bebida está em ml
            if (comp.type === 'beverage' && !comp.portion_label.includes('ml')) {
              console.log(`         ⚠️  ERRO: Bebida deveria estar em ml, não g!`);
            }
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
  console.log('VALIDAÇÃO COMPLETA!');
  console.log('═══════════════════════════════════════════════════════════════');
}

main().catch(console.error);
