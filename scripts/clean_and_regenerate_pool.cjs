/**
 * Script para limpar e regenerar o pool de refeições
 * Execute com: node scripts/clean_and_regenerate_pool.cjs
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI2MjcxNywiZXhwIjoyMDYyODM4NzE3fQ.BPwtkgMd5Jql0iyBy-UNCFLvPNd2DXkZyP_Kt6cS8DY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanAndRegenerate() {
  console.log('🧹 Iniciando limpeza do pool de refeições do Brasil...');
  
  // 1. Deletar todas as refeições do Brasil
  const { error: deleteError, count } = await supabase
    .from('meal_combinations')
    .delete()
    .contains('country_codes', ['BR']);
  
  if (deleteError) {
    console.error('❌ Erro ao deletar:', deleteError.message);
    return;
  }
  
  console.log(`✅ Deletadas ${count || 'todas'} refeições do Brasil`);
  
  // 2. Regenerar para cada tipo de refeição
  const mealTypes = ['cafe_manha', 'almoco', 'jantar'];
  
  for (const mealType of mealTypes) {
    console.log(`\n🍽️ Gerando refeições para ${mealType}...`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/populate-meal-pool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          country_code: 'BR',
          meal_type: mealType,
          quantity: 5,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ Geradas: ${result.generated}, Inseridas: ${result.inserted}`);
        console.log(`   📋 Refeições:`);
        result.meals.forEach(m => console.log(`      - ${m.name}`));
      } else {
        console.error(`   ❌ Erro: ${result.error}`);
      }
    } catch (error) {
      console.error(`   ❌ Erro ao chamar função:`, error.message);
    }
  }
  
  console.log('\n🎉 Processo concluído!');
}

cleanAndRegenerate();
