#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI2MjcxNywiZXhwIjoyMDYyODM4NzE3fQ.dYMGJLPRzKN2Qo-JvQsLMXqxJSFHxJZwJQqJ7d-Jb2M";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function checkEggMeals() {
  console.log("🔍 ANALISANDO REFEIÇÕES COM OVO NO BANCO DE DADOS\n");
  console.log("=" .repeat(80));
  
  // Buscar refeições que contêm "ovo" no nome
  const { data: mealsWithEgg, error } = await supabase
    .from('meal_combinations')
    .select('id, name, blocked_for_intolerances, components, meal_type')
    .or('name.ilike.%ovo%,name.ilike.%egg%')
    .eq('meal_type', 'cafe_manha')
    .limit(20);
  
  if (error) {
    console.error("❌ Erro ao buscar refeições:", error);
    return;
  }
  
  console.log(`\n📊 Total de refeições com "ovo" no nome: ${mealsWithEgg?.length || 0}\n`);
  
  if (!mealsWithEgg || mealsWithEgg.length === 0) {
    console.log("✅ Nenhuma refeição com ovo encontrada.");
    return;
  }
  
  console.log("ANÁLISE DETALHADA:");
  console.log("-".repeat(80));
  
  let correctCount = 0;
  let incorrectCount = 0;
  
  for (const meal of mealsWithEgg) {
    const hasEggInName = meal.name.toLowerCase().includes('ovo') || meal.name.toLowerCase().includes('egg');
    const hasEggInComponents = meal.components?.some(c => 
      c.name?.toLowerCase().includes('ovo') || c.name?.toLowerCase().includes('egg')
    );
    const isBlockedForEgg = meal.blocked_for_intolerances?.includes('egg') || 
                            meal.blocked_for_intolerances?.includes('eggs');
    
    const hasEgg = hasEggInName || hasEggInComponents;
    const shouldBeBlocked = hasEgg;
    const isCorrect = shouldBeBlocked === isBlockedForEgg;
    
    if (isCorrect) {
      correctCount++;
    } else {
      incorrectCount++;
    }
    
    console.log(`\n${isCorrect ? '✅' : '❌'} ${meal.name}`);
    console.log(`   ID: ${meal.id}`);
    console.log(`   Tem ovo no nome: ${hasEggInName ? 'SIM' : 'NÃO'}`);
    console.log(`   Tem ovo nos componentes: ${hasEggInComponents ? 'SIM' : 'NÃO'}`);
    console.log(`   blocked_for_intolerances: [${meal.blocked_for_intolerances?.join(', ') || 'vazio'}]`);
    console.log(`   Deveria estar bloqueado para 'egg': ${shouldBeBlocked ? 'SIM' : 'NÃO'}`);
    console.log(`   Está bloqueado para 'egg': ${isBlockedForEgg ? 'SIM' : 'NÃO'}`);
    
    if (!isCorrect) {
      console.log(`   ⚠️  PROBLEMA: Refeição ${shouldBeBlocked ? 'TEM' : 'NÃO TEM'} ovo mas ${isBlockedForEgg ? 'ESTÁ' : 'NÃO ESTÁ'} bloqueada!`);
    }
    
    if (meal.components && meal.components.length > 0) {
      console.log(`   Componentes:`);
      meal.components.forEach(c => {
        console.log(`      - ${c.name} (${c.portion_label || 'sem porção'})`);
      });
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("📊 RESUMO:");
  console.log(`   ✅ Corretas: ${correctCount}`);
  console.log(`   ❌ Incorretas: ${incorrectCount}`);
  console.log(`   📈 Taxa de acerto: ${((correctCount / mealsWithEgg.length) * 100).toFixed(1)}%`);
  console.log("=".repeat(80));
  
  // Testar filtro do frontend
  console.log("\n🔍 TESTANDO LÓGICA DO FILTRO FRONTEND:\n");
  
  const { data: filteredMeals, error: filterError } = await supabase
    .from('meal_combinations')
    .select('name, blocked_for_intolerances')
    .eq('meal_type', 'cafe_manha')
    .not('blocked_for_intolerances', 'cs', '{egg}')
    .limit(10);
  
  if (filterError) {
    console.error("❌ Erro ao testar filtro:", filterError);
    return;
  }
  
  console.log(`Filtro aplicado: .not('blocked_for_intolerances', 'cs', '{egg}')`);
  console.log(`Resultado: ${filteredMeals?.length || 0} refeições retornadas\n`);
  
  if (filteredMeals && filteredMeals.length > 0) {
    console.log("Primeiras 10 refeições retornadas pelo filtro:");
    filteredMeals.forEach((meal, i) => {
      const hasEggInName = meal.name.toLowerCase().includes('ovo');
      console.log(`${i + 1}. ${hasEggInName ? '❌' : '✅'} ${meal.name}`);
      console.log(`   blocked_for_intolerances: [${meal.blocked_for_intolerances?.join(', ') || 'vazio'}]`);
    });
  }
}

checkEggMeals().catch(console.error);
