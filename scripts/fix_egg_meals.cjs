#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI2MjcxNywiZXhwIjoyMDYyODM4NzE3fQ.dYMGJLPRzKN2Qo-JvQsLMXqxJSFHxJZwJQqJ7d-Jb2M";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function fixEggMeals() {
  console.log("🔧 CORRIGINDO REFEIÇÕES COM OVO");
  console.log("=" .repeat(60));
  
  try {
    // 1. Buscar TODAS as refeições
    console.log("\n📊 Buscando todas as refeições...");
    const { data: allMeals, error: fetchError } = await supabase
      .from('meal_combinations')
      .select('id, name, components, blocked_for_intolerances');
    
    if (fetchError) {
      console.error("❌ Erro ao buscar refeições:", fetchError);
      return;
    }
    
    console.log(`✓ Total de refeições: ${allMeals?.length || 0}`);
    
    if (!allMeals || allMeals.length === 0) {
      console.log("⚠️  Nenhuma refeição encontrada no banco!");
      return;
    }
    
    // 2. Identificar refeições com ovo que NÃO estão marcadas
    console.log("\n🔍 Analisando refeições com ovo...");
    
    const mealsWithEgg = allMeals.filter(meal => {
      // Verificar se tem ovo no nome
      const nameHasEgg = meal.name?.toLowerCase().includes('ovo') || 
                         meal.name?.toLowerCase().includes('egg') ||
                         meal.name?.toLowerCase().includes('omelete') ||
                         meal.name?.toLowerCase().includes('omelet');
      
      // Verificar se tem ovo nos componentes
      const componentsHaveEgg = meal.components?.some(c => 
        c.name?.toLowerCase().includes('ovo') || 
        c.name?.toLowerCase().includes('egg') ||
        c.name?.toLowerCase().includes('omelete') ||
        c.name?.toLowerCase().includes('omelet')
      );
      
      return nameHasEgg || componentsHaveEgg;
    });
    
    console.log(`✓ Refeições com ovo encontradas: ${mealsWithEgg.length}`);
    
    // 3. Filtrar as que NÃO estão marcadas corretamente
    const needsUpdate = mealsWithEgg.filter(meal => {
      const blocked = meal.blocked_for_intolerances || [];
      return !blocked.includes('egg') && !blocked.includes('eggs');
    });
    
    console.log(`⚠️  Refeições SEM marcação correta: ${needsUpdate.length}`);
    
    if (needsUpdate.length === 0) {
      console.log("\n✅ Todas as refeições com ovo já estão marcadas corretamente!");
      return;
    }
    
    // 4. Mostrar exemplos
    console.log("\n📋 Exemplos de refeições que serão corrigidas:");
    needsUpdate.slice(0, 5).forEach(meal => {
      console.log(`  - ${meal.name}`);
      console.log(`    blocked_for atual: ${JSON.stringify(meal.blocked_for_intolerances)}`);
    });
    
    // 5. Atualizar refeições
    console.log(`\n🔧 Atualizando ${needsUpdate.length} refeições...`);
    
    let updated = 0;
    let errors = 0;
    
    for (const meal of needsUpdate) {
      const currentBlocked = meal.blocked_for_intolerances || [];
      const newBlocked = [...currentBlocked, 'egg'];
      
      const { error } = await supabase
        .from('meal_combinations')
        .update({ blocked_for_intolerances: newBlocked })
        .eq('id', meal.id);
      
      if (error) {
        console.error(`  ❌ Erro ao atualizar "${meal.name}": ${error.message}`);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`  ✓ ${updated}/${needsUpdate.length} atualizadas...`);
        }
      }
    }
    
    console.log(`\n✅ Atualização concluída:`);
    console.log(`   Sucesso: ${updated}`);
    console.log(`   Erros: ${errors}`);
    
    // 6. Verificar resultado
    console.log("\n🔍 Verificando resultado...");
    const { data: verifyMeals } = await supabase
      .from('meal_combinations')
      .select('id, name, blocked_for_intolerances')
      .in('id', needsUpdate.map(m => m.id));
    
    const stillWrong = verifyMeals?.filter(meal => {
      const blocked = meal.blocked_for_intolerances || [];
      return !blocked.includes('egg');
    });
    
    if (stillWrong && stillWrong.length > 0) {
      console.log(`⚠️  ${stillWrong.length} refeições ainda sem marcação correta`);
    } else {
      console.log(`✅ Todas as refeições agora estão marcadas com 'egg'!`);
    }
    
  } catch (error) {
    console.error("\n❌ Erro:", error);
  }
}

fixEggMeals().catch(console.error);
