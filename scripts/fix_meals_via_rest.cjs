#!/usr/bin/env node

// Script para corrigir refeições via API REST do Supabase
// Usando a chave de serviço (service role key) que tem permissões totais

const SUPABASE_URL = "https://onzdkpqtzfxzcdyxczkn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzI2MjcxNywiZXhwIjoyMDYyODM4NzE3fQ.dYMGJLPRzKN2Qo-JvQsLMXqxJSFHxJZwJQqJ7d-Jb2M";

async function executeSQL(sql) {
  console.log("🔧 Executando SQL via REST API...");
  
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return await response.json();
}

async function fixMeals() {
  console.log("🔧 CORRIGINDO REFEIÇÕES COM OVO E GLÚTEN");
  console.log("=" .repeat(60));
  
  try {
    // 1. Verificar estado atual
    console.log("\n📊 Verificando estado atual...");
    
    const checkSQL = `
      SELECT 
        COUNT(*) as total_com_ovo,
        COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)) as marcadas_egg,
        COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)) as marcadas_eggs,
        COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances))) as sem_marca
      FROM meal_combinations
      WHERE 
        name ILIKE '%ovo%' OR 
        name ILIKE '%egg%' OR
        name ILIKE '%omelete%' OR
        name ILIKE '%omelet%' OR
        EXISTS (
          SELECT 1 FROM jsonb_array_elements(components) AS comp
          WHERE comp->>'name' ILIKE '%ovo%' 
             OR comp->>'name' ILIKE '%egg%'
             OR comp->>'name' ILIKE '%omelete%'
             OR comp->>'name' ILIKE '%omelet%'
        );
    `;
    
    const result = await executeSQL(checkSQL);
    console.log("Resultado:", result);
    
    if (result.length > 0) {
      const stats = result[0];
      console.log(`\n📈 Estatísticas:`);
      console.log(`  Total de refeições com ovo: ${stats.total_com_ovo}`);
      console.log(`  Marcadas com "egg": ${stats.marcadas_egg}`);
      console.log(`  Marcadas com "eggs": ${stats.marcadas_eggs}`);
      console.log(`  SEM MARCA: ${stats.sem_marca} ⚠️`);
      
      if (stats.sem_marca === 0) {
        console.log("\n✅ Todas as refeições com ovo já estão marcadas!");
        return;
      }
    }
    
    // 2. Atualizar refeições com ovo
    console.log("\n🔧 Atualizando refeições com ovo...");
    
    const updateEggSQL = `
      UPDATE meal_combinations
      SET blocked_for_intolerances = 
        CASE 
          WHEN blocked_for_intolerances IS NULL THEN ARRAY['egg']::text[]
          WHEN NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances)) 
            THEN array_append(blocked_for_intolerances, 'egg')
          ELSE blocked_for_intolerances
        END
      WHERE (
        name ILIKE '%ovo%' OR 
        name ILIKE '%egg%' OR
        name ILIKE '%omelete%' OR
        name ILIKE '%omelet%'
      )
      AND NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances));
    `;
    
    await executeSQL(updateEggSQL);
    console.log("✅ Refeições com ovo atualizadas");
    
    // 3. Atualizar refeições com ovo nos componentes
    console.log("\n🔧 Atualizando refeições com ovo nos componentes...");
    
    const updateComponentsSQL = `
      UPDATE meal_combinations
      SET blocked_for_intolerances = 
        CASE 
          WHEN blocked_for_intolerances IS NULL THEN ARRAY['egg']::text[]
          WHEN NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances)) 
            THEN array_append(blocked_for_intolerances, 'egg')
          ELSE blocked_for_intolerances
        END
      WHERE EXISTS (
        SELECT 1 FROM jsonb_array_elements(components) AS comp
        WHERE comp->>'name' ILIKE '%ovo%' 
           OR comp->>'name' ILIKE '%egg%'
           OR comp->>'name' ILIKE '%omelete%'
           OR comp->>'name' ILIKE '%omelet%'
      )
      AND NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances));
    `;
    
    await executeSQL(updateComponentsSQL);
    console.log("✅ Refeições com ovo nos componentes atualizadas");
    
    // 4. Verificar resultado final
    console.log("\n🔍 Verificando resultado final...");
    
    const finalResult = await executeSQL(checkSQL);
    
    if (finalResult.length > 0) {
      const finalStats = finalResult[0];
      console.log(`\n✅ RESULTADO FINAL:`);
      console.log(`  Total de refeições com ovo: ${finalStats.total_com_ovo}`);
      console.log(`  Marcadas com "egg": ${finalStats.marcadas_egg}`);
      console.log(`  Marcadas com "eggs": ${finalStats.marcadas_eggs}`);
      console.log(`  SEM MARCA: ${finalStats.sem_marca}`);
      
      if (finalStats.sem_marca === 0) {
        console.log("\n🎉 SUCESSO! Todas as refeições com ovo estão marcadas!");
      } else {
        console.log(`\n⚠️  Ainda existem ${finalStats.sem_marca} refeições sem marca`);
      }
    }
    
    // 5. Mostrar exemplos
    console.log("\n📋 Exemplos de refeições corrigidas:");
    
    const examplesSQL = `
      SELECT name, blocked_for_intolerances
      FROM meal_combinations
      WHERE (
        name ILIKE '%ovo%' OR 
        name ILIKE '%egg%'
      )
      ORDER BY name
      LIMIT 10;
    `;
    
    const examples = await executeSQL(examplesSQL);
    examples.forEach(meal => {
      console.log(`  - ${meal.name}`);
      console.log(`    blocked_for: ${JSON.stringify(meal.blocked_for_intolerances)}`);
    });
    
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
  }
}

fixMeals().catch(console.error);
