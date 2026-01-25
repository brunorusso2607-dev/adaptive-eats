#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI2MjcxNywiZXhwIjoyMDYyODM4NzE3fQ.dYMGJLPRzKN2Qo-JvQsLMXqxJSFHxJZwJQqJ7d-Jb2M";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runMigration() {
  console.log("🔄 INICIANDO MIGRAÇÃO: eggs → egg");
  console.log("=" .repeat(60));
  
  try {
    // 1. Verificar estado atual
    console.log("\n📊 Estado ANTES da migração:");
    
    const { data: beforeMeals } = await supabase
      .from('meal_combinations')
      .select('id, name, blocked_for_intolerances')
      .or('blocked_for_intolerances.cs.{eggs},blocked_for_intolerances.cs.{egg}');
    
    const withEggs = beforeMeals?.filter(m => m.blocked_for_intolerances?.includes('eggs')) || [];
    const withEgg = beforeMeals?.filter(m => m.blocked_for_intolerances?.includes('egg')) || [];
    
    console.log(`   Refeições com "eggs": ${withEggs.length}`);
    console.log(`   Refeições com "egg": ${withEgg.length}`);
    
    if (withEggs.length === 0) {
      console.log("\n✅ Nenhuma refeição com 'eggs' encontrada. Migração não necessária.");
      return;
    }
    
    // 2. Executar migração
    console.log(`\n🔧 Migrando ${withEggs.length} refeições...`);
    
    let updated = 0;
    let errors = 0;
    
    for (const meal of withEggs) {
      // Substituir 'eggs' por 'egg' no array
      const newIntolerances = meal.blocked_for_intolerances.map(i => i === 'eggs' ? 'egg' : i);
      
      const { error } = await supabase
        .from('meal_combinations')
        .update({ blocked_for_intolerances: newIntolerances })
        .eq('id', meal.id);
      
      if (error) {
        console.error(`   ❌ Erro ao atualizar ${meal.name}: ${error.message}`);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          console.log(`   ✓ ${updated} refeições atualizadas...`);
        }
      }
    }
    
    console.log(`\n✅ Migração concluída: ${updated} atualizadas, ${errors} erros`);
    
    // 3. Verificar estado final
    console.log("\n📊 Estado DEPOIS da migração:");
    
    const { data: afterMeals } = await supabase
      .from('meal_combinations')
      .select('id, name, blocked_for_intolerances')
      .or('blocked_for_intolerances.cs.{eggs},blocked_for_intolerances.cs.{egg}');
    
    const afterWithEggs = afterMeals?.filter(m => m.blocked_for_intolerances?.includes('eggs')) || [];
    const afterWithEgg = afterMeals?.filter(m => m.blocked_for_intolerances?.includes('egg')) || [];
    
    console.log(`   Refeições com "eggs": ${afterWithEggs.length}`);
    console.log(`   Refeições com "egg": ${afterWithEgg.length}`);
    
    if (afterWithEggs.length > 0) {
      console.log("\n⚠️  ATENÇÃO: Ainda existem refeições com 'eggs':");
      afterWithEggs.slice(0, 5).forEach(m => {
        console.log(`   - ${m.name}`);
      });
    } else {
      console.log("\n✅ Sucesso! Todas as refeições agora usam 'egg' (singular)");
    }
    
  } catch (error) {
    console.error("\n❌ Erro na migração:", error);
  }
}

runMigration().catch(console.error);
