// Verificar estrutura da tabela food_decomposition
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 VERIFICANDO TABELA food_decomposition\n");

async function checkTable() {
  // Tentar inserir um registro de teste
  const { data, error } = await supabase
    .from('food_decomposition')
    .insert({
      processed_food_name: 'teste',
      base_ingredients: ['teste'],
      category: 'teste',
      language: 'en',
      is_active: true
    })
    .select();
  
  if (error) {
    console.log("❌ Erro ao inserir:", error.message);
    console.log("\n📊 Detalhes do erro:", error);
  } else {
    console.log("✅ Inserção bem-sucedida!");
    console.log("📊 Dados inseridos:", data);
    
    // Limpar teste
    await supabase
      .from('food_decomposition')
      .delete()
      .eq('processed_food_name', 'teste');
  }
  
  // Verificar registros existentes
  const { count } = await supabase
    .from('food_decomposition')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 Total de registros na tabela: ${count || 0}`);
}

checkTable();
