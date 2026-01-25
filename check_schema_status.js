// Verificar status atual do schema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 VERIFICANDO STATUS DO SCHEMA\n");

async function checkTables() {
  console.log("1️⃣ Verificando tabelas existentes:");
  
  const tables = [
    'food_processing_terms',
    'food_category_keywords', 
    'countries',
    'foods'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: OK`);
      }
    } catch (e) {
      console.log(`   ❌ ${table}: Erro desconhecido`);
    }
  }
}

async function checkColumns() {
  console.log("\n2️⃣ Verificando colunas da tabela foods:");
  
  try {
    // Tentar selecionar as colunas específicas
    const { data, error } = await supabase
      .from('foods')
      .select('id, name, country_code, language, source')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Erro ao verificar colunas: ${error.message}`);
    } else {
      if (data && data.length > 0) {
        const sample = data[0];
        console.log(`   ✅ Colunas encontradas:`);
        console.log(`      - id: ${sample.id ? 'OK' : 'NULL'}`);
        console.log(`      - name: ${sample.name ? 'OK' : 'NULL'}`);
        console.log(`      - country_code: ${sample.country_code ? 'OK' : 'NULL'}`);
        console.log(`      - language: ${sample.language ? 'OK' : 'NULL'}`);
        console.log(`      - source: ${sample.source ? 'OK' : 'NULL'}`);
      } else {
        console.log(`   ⚠️  Tabela foods vazia ou sem dados`);
      }
    }
  } catch (e) {
    console.log(`   ❌ Erro ao verificar colunas: ${e.message}`);
  }
}

async function checkFoodsData() {
  console.log("\n3️⃣ Verificando dados existentes em foods:");
  
  try {
    const { data, error } = await supabase
      .from('foods')
      .select('source, COUNT(*) as total')
      .neq('source', null)
      .group('source')
      .order('total', { ascending: false });
    
    if (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    } else {
      console.log(`   ✅ Dados por source:`);
      data.forEach(d => console.log(`      - ${d.source}: ${d.total}`));
    }
  } catch (e) {
    console.log(`   ❌ Erro: ${e.message}`);
  }
}

async function main() {
  await checkTables();
  await checkColumns();
  await checkFoodsData();
  
  console.log("\n" + "═".repeat(60));
  console.log("📋 DIAGNÓSTICO:");
  console.log("═".repeat(60));
  
  console.log("\nSe as tabelas não foram encontradas:");
  console.log("1. O cache do Supabase pode estar desatualizado");
  console.log("2. Tente novamente em alguns minutos");
  console.log("3. Ou execute o SQL novamente");
  
  console.log("\nSe as colunas country_code/language não existem:");
  console.log("1. Execute o SQL novamente");
  console.log("2. Verifique se não houve erro na execução");
  
  console.log("\nSe tudo estiver OK:");
  console.log("✅ Podemos prosseguir para refatorar calculateRealMacros.ts");
}

main().catch(console.error);
