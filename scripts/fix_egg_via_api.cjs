#!/usr/bin/env node

// Este script usa a API REST do Supabase diretamente via fetch
const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
// Usando a chave anon pública (segura para operações de leitura/escrita com RLS)
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyNjI3MTcsImV4cCI6MjA2MjgzODcxN30.Qs0JZKPKl4Hf-ksVJgPvGKNHQRqLJHCpXzZlKmXJZUo";

async function fetchMeals() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/meal_combinations?select=id,name,components,blocked_for_intolerances`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return await response.json();
}

async function updateMeal(id, blocked_for_intolerances) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/meal_combinations?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ blocked_for_intolerances })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return true;
}

async function fixEggMeals() {
  console.log("🔧 CORRIGINDO REFEIÇÕES COM OVO (via API REST)");
  console.log("=" .repeat(60));
  
  try {
    // 1. Buscar todas as refeições
    console.log("\n📊 Buscando todas as refeições...");
    const allMeals = await fetchMeals();
    console.log(`✓ Total de refeições: ${allMeals.length}`);
    
    // 2. Identificar refeições com ovo
    console.log("\n🔍 Analisando refeições com ovo...");
    
    const mealsWithEgg = allMeals.filter(meal => {
      const nameHasEgg = meal.name?.toLowerCase().includes('ovo') || 
                         meal.name?.toLowerCase().includes('egg') ||
                         meal.name?.toLowerCase().includes('omelete') ||
                         meal.name?.toLowerCase().includes('omelet');
      
      const componentsHaveEgg = meal.components?.some(c => 
        c.name?.toLowerCase().includes('ovo') || 
        c.name?.toLowerCase().includes('egg') ||
        c.name?.toLowerCase().includes('omelete') ||
        c.name?.toLowerCase().includes('omelet')
      );
      
      return nameHasEgg || componentsHaveEgg;
    });
    
    console.log(`✓ Refeições com ovo encontradas: ${mealsWithEgg.length}`);
    
    // 3. Filtrar as que NÃO estão marcadas
    const needsUpdate = mealsWithEgg.filter(meal => {
      const blocked = meal.blocked_for_intolerances || [];
      return !blocked.includes('egg') && !blocked.includes('eggs');
    });
    
    console.log(`⚠️  Refeições SEM marcação: ${needsUpdate.length}`);
    
    if (needsUpdate.length === 0) {
      console.log("\n✅ Todas as refeições com ovo já estão marcadas!");
      return;
    }
    
    // 4. Mostrar exemplos
    console.log("\n📋 Exemplos que serão corrigidos:");
    needsUpdate.slice(0, 5).forEach(meal => {
      console.log(`  - ${meal.name}`);
      console.log(`    blocked_for atual: ${JSON.stringify(meal.blocked_for_intolerances)}`);
    });
    
    // 5. Atualizar
    console.log(`\n🔧 Atualizando ${needsUpdate.length} refeições...`);
    
    let updated = 0;
    let errors = 0;
    
    for (const meal of needsUpdate) {
      try {
        const currentBlocked = meal.blocked_for_intolerances || [];
        const newBlocked = [...currentBlocked, 'egg'];
        
        await updateMeal(meal.id, newBlocked);
        updated++;
        
        if (updated % 10 === 0) {
          console.log(`  ✓ ${updated}/${needsUpdate.length} atualizadas...`);
        }
      } catch (error) {
        console.error(`  ❌ Erro ao atualizar "${meal.name}": ${error.message}`);
        errors++;
      }
    }
    
    console.log(`\n✅ Atualização concluída:`);
    console.log(`   Sucesso: ${updated}`);
    console.log(`   Erros: ${errors}`);
    
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
  }
}

fixEggMeals().catch(console.error);
