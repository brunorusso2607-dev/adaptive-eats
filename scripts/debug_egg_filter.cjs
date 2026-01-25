#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI2MjcxNywiZXhwIjoyMDYyODM4NzE3fQ.dYMGJLPRzKN2Qo-JvQsLMXqxJSFHxJZwJQqJ7d-Jb2M";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function debugEggFilter() {
  console.log("🔍 DEBUGANDO FILTRO 'SEM OVO'");
  console.log("=" .repeat(60));
  
  // 1. Buscar refeições que aparecem na imagem
  console.log("\n📋 Refeições que aparecem na imagem:");
  const problematicMeals = [
    "Pão francês com ovo cozido e suco de laranja",
    "Pão francês com ovo mexido e café puro"
  ];
  
  for (const mealName of problematicMeals) {
    const { data, error } = await supabase
      .from('meal_combinations')
      .select('id, name, blocked_for_intolerances, components')
      .ilike('name', `%${mealName}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      const meal = data[0];
      console.log(`\n✓ "${meal.name}"`);
      console.log(`  ID: ${meal.id}`);
      console.log(`  blocked_for_intolerances: ${JSON.stringify(meal.blocked_for_intolerances)}`);
      console.log(`  Componentes:`, meal.components?.map(c => c.name).join(', '));
      
      // Verificar se tem ovo nos componentes
      const hasEgg = meal.components?.some(c => 
        c.name?.toLowerCase().includes('ovo') || 
        c.name?.toLowerCase().includes('egg')
      );
      console.log(`  Contém ovo nos componentes: ${hasEgg ? '✅ SIM' : '❌ NÃO'}`);
      
      // Verificar se está marcado para egg
      const isBlockedForEgg = meal.blocked_for_intolerances?.includes('egg');
      const isBlockedForEggs = meal.blocked_for_intolerances?.includes('eggs');
      console.log(`  Bloqueado para 'egg': ${isBlockedForEgg ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`  Bloqueado para 'eggs': ${isBlockedForEggs ? '✅ SIM' : '❌ NÃO'}`);
      
      if (hasEgg && !isBlockedForEgg && !isBlockedForEggs) {
        console.log(`  ⚠️  PROBLEMA: Tem ovo mas NÃO está marcado!`);
      }
    }
  }
  
  // 2. Testar a query do frontend
  console.log("\n\n🔎 Testando query do frontend:");
  console.log("Query: .not('blocked_for_intolerances', 'cs', '{egg}')");
  
  const { data: filteredMeals, error: filterError } = await supabase
    .from('meal_combinations')
    .select('id, name, blocked_for_intolerances')
    .eq('meal_type', 'cafe_manha')
    .not('blocked_for_intolerances', 'cs', '{egg}')
    .limit(10);
  
  if (filteredMeals) {
    console.log(`\nRefeições retornadas: ${filteredMeals.length}`);
    filteredMeals.forEach(meal => {
      const hasEggInName = meal.name.toLowerCase().includes('ovo') || meal.name.toLowerCase().includes('egg');
      console.log(`  ${hasEggInName ? '⚠️ ' : '✓'} ${meal.name}`);
      console.log(`     blocked_for: ${JSON.stringify(meal.blocked_for_intolerances)}`);
    });
  }
  
  // 3. Buscar TODAS as refeições com ovo no nome
  console.log("\n\n📊 Todas as refeições com 'ovo' no nome:");
  const { data: allEggMeals } = await supabase
    .from('meal_combinations')
    .select('id, name, blocked_for_intolerances')
    .or('name.ilike.%ovo%,name.ilike.%egg%')
    .limit(20);
  
  if (allEggMeals) {
    console.log(`Total encontrado: ${allEggMeals.length}`);
    
    let withEgg = 0;
    let withEggs = 0;
    let withoutMark = 0;
    
    allEggMeals.forEach(meal => {
      const hasEgg = meal.blocked_for_intolerances?.includes('egg');
      const hasEggs = meal.blocked_for_intolerances?.includes('eggs');
      
      if (hasEgg) withEgg++;
      if (hasEggs) withEggs++;
      if (!hasEgg && !hasEggs) {
        withoutMark++;
        console.log(`  ❌ SEM MARCA: ${meal.name}`);
        console.log(`     blocked_for: ${JSON.stringify(meal.blocked_for_intolerances)}`);
      }
    });
    
    console.log(`\n📈 Estatísticas:`);
    console.log(`  Com 'egg': ${withEgg}`);
    console.log(`  Com 'eggs': ${withEggs}`);
    console.log(`  SEM MARCA: ${withoutMark} ⚠️`);
  }
}

debugEggFilter().catch(console.error);
