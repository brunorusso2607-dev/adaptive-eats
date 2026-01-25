// Importar para a tabela CORRETA: food_decomposition_mappings
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 IMPORTANDO PARA TABELA CORRETA: food_decomposition_mappings\n");

// Copiar dados da tabela errada para a correta
async function migrateData() {
  try {
    // 1. Buscar dados da tabela errada
    console.log("📊 Buscando dados de food_decomposition...");
    const { data: oldData, error: fetchError } = await supabase
      .from('food_decomposition')
      .select('*');
    
    if (fetchError) {
      console.error("❌ Erro ao buscar:", fetchError);
      return;
    }
    
    console.log(`✅ ${oldData.length} registros encontrados\n`);
    
    // 2. Transformar para o formato correto
    console.log("🔄 Transformando dados...");
    const transformedData = oldData.map(item => ({
      food_name: item.processed_food_name,
      base_ingredients: item.base_ingredients,
      language: item.language,
      is_active: item.is_active,
      notes: null
    }));
    
    // 3. Limpar tabela correta
    console.log("🗑️ Limpando food_decomposition_mappings...");
    await supabase.from('food_decomposition_mappings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // 4. Inserir em lotes
    console.log("📥 Inserindo dados na tabela correta...\n");
    const batchSize = 50;
    let totalInserted = 0;
    
    for (let i = 0; i < transformedData.length; i += batchSize) {
      const batch = transformedData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('food_decomposition_mappings')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error.message);
      } else {
        totalInserted += data.length;
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${data.length} inseridos`);
      }
    }
    
    // 5. Verificar resultado
    console.log("\n📊 Verificação final...\n");
    
    const { count: finalCount } = await supabase
      .from('food_decomposition_mappings')
      .select('*', { count: 'exact', head: true });
    
    const { count: enCount } = await supabase
      .from('food_decomposition_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'en');
    
    const { count: ptCount } = await supabase
      .from('food_decomposition_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'pt');
    
    console.log("=".repeat(80));
    console.log("🎉 MIGRAÇÃO CONCLUÍDA!");
    console.log("=".repeat(80));
    console.log(`\n📊 RESULTADO:`);
    console.log(`  ✅ Total inserido: ${totalInserted}`);
    console.log(`  📈 Total no banco: ${finalCount || 0}`);
    console.log(`  🇺🇸 Inglês: ${enCount || 0}`);
    console.log(`  🇧🇷 Português: ${ptCount || 0}`);
    
    if (finalCount && finalCount > 0) {
      console.log(`\n✅ SUCESSO! Painel admin agora deve mostrar os dados!`);
      console.log(`   Acesse: localhost:8081/admin/food-decomposition`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
  }
}

migrateData();
