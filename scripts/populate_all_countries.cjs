// Script para popular o pool de refeições para TODOS os países do onboarding
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tipos de refeição principais
const MEAL_TYPES = ['cafe_manha', 'almoco', 'jantar'];

// Quantidade de refeições por tipo/país
const QUANTITY_PER_TYPE = 3;

async function populateAllCountries() {
  console.log('===========================================');
  console.log('POPULAR POOL DE REFEIÇÕES - TODOS OS PAÍSES');
  console.log('===========================================\n');

  // 1. Buscar todos os países do onboarding
  console.log('1. Buscando países do onboarding...');
  const { data: countries, error: countriesError } = await supabase
    .from('onboarding_countries')
    .select('country_code, country_name, flag_emoji')
    .order('sort_order');

  if (countriesError) {
    console.error('   ❌ Erro ao buscar países:', countriesError.message);
    return;
  }

  console.log(`   ✓ ${countries.length} países encontrados\n`);

  // 2. Verificar países que já têm refeições
  console.log('2. Verificando países com refeições existentes...');
  const { data: existingMeals } = await supabase
    .from('meal_combinations')
    .select('country_codes');

  const existingCountries = new Set();
  existingMeals?.forEach(m => m.country_codes?.forEach(c => existingCountries.add(c)));
  console.log(`   Países com refeições: ${Array.from(existingCountries).sort().join(', ')}\n`);

  // 3. Identificar países sem refeições
  const countriesWithoutMeals = countries.filter(c => !existingCountries.has(c.country_code));
  console.log(`3. Países SEM refeições no pool: ${countriesWithoutMeals.length}`);
  countriesWithoutMeals.forEach(c => console.log(`   - ${c.flag_emoji} ${c.country_name} (${c.country_code})`));
  console.log('');

  // 4. Gerar refeições para cada país
  console.log('4. Gerando refeições para TODOS os países...\n');

  let totalGenerated = 0;
  let totalErrors = 0;

  for (const country of countries) {
    console.log(`\n--- ${country.flag_emoji} ${country.country_name} (${country.country_code}) ---`);
    
    for (const mealType of MEAL_TYPES) {
      const mealTypeLabel = {
        cafe_manha: 'Café da manhã',
        almoco: 'Almoço',
        jantar: 'Jantar'
      }[mealType];

      console.log(`   Gerando ${QUANTITY_PER_TYPE}x ${mealTypeLabel}...`);

      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/populate-meal-pool`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            country_code: country.country_code,
            meal_type: mealType,
            quantity: QUANTITY_PER_TYPE
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`      ❌ Erro: ${errorText.substring(0, 100)}`);
          totalErrors++;
          continue;
        }

        const result = await response.json();
        console.log(`      ✓ Geradas: ${result.generated || 0}, Inseridas: ${result.inserted || 0}, Puladas: ${result.skipped || 0}`);
        totalGenerated += result.inserted || 0;

      } catch (error) {
        console.log(`      ❌ Erro: ${error.message}`);
        totalErrors++;
      }

      // Pequena pausa para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // 5. Resumo final
  console.log('\n===========================================');
  console.log('RESUMO FINAL');
  console.log('===========================================');
  
  // Verificar novamente
  const { data: finalMeals } = await supabase
    .from('meal_combinations')
    .select('country_codes');

  const finalCountries = new Set();
  finalMeals?.forEach(m => m.country_codes?.forEach(c => finalCountries.add(c)));

  console.log(`Total de refeições geradas: ${totalGenerated}`);
  console.log(`Total de erros: ${totalErrors}`);
  console.log(`Países com refeições: ${Array.from(finalCountries).sort().join(', ')}`);
  console.log(`Total de refeições no pool: ${finalMeals?.length || 0}`);

  // Verificar cobertura
  const missingCountries = countries.filter(c => !finalCountries.has(c.country_code));
  if (missingCountries.length > 0) {
    console.log('\n⚠️  Países ainda sem refeições:');
    missingCountries.forEach(c => console.log(`   - ${c.flag_emoji} ${c.country_name}`));
  } else {
    console.log('\n✅ TODOS os países têm refeições no pool!');
  }
}

populateAllCountries().catch(console.error);
