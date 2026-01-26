// Executar SQL diretamente via Supabase client
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 EXECUTANDO GLOBAL ARCHITECTURE - PHASE 1\n");

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  return !error || error.code !== '42P01'; // 42P01 = table does not exist
}

async function main() {
  console.log("1️⃣ Verificando tabela food_processing_terms...");
  const hasProcessingTerms = await checkTableExists('food_processing_terms');
  console.log(hasProcessingTerms ? "   ✅ Já existe" : "   ⚠️  Não existe - precisa criar via migration\n");

  console.log("2️⃣ Verificando tabela food_category_keywords...");
  const hasCategoryKeywords = await checkTableExists('food_category_keywords');
  console.log(hasCategoryKeywords ? "   ✅ Já existe" : "   ⚠️  Não existe - precisa criar via migration\n");

  console.log("3️⃣ Verificando tabela countries...");
  const hasCountries = await checkTableExists('countries');
  console.log(hasCountries ? "   ✅ Já existe" : "   ⚠️  Não existe - precisa criar via migration\n");

  console.log("4️⃣ Verificando coluna foods.country_code...");
  const { data: foodsSample } = await supabase
    .from('foods')
    .select('id, country_code, language')
    .limit(1)
    .maybeSingle();
  
  if (foodsSample && 'country_code' in foodsSample) {
    console.log("   ✅ Coluna country_code existe");
    console.log("   ✅ Coluna language existe");
  } else {
    console.log("   ⚠️  Colunas não existem - precisa criar via migration\n");
  }

  console.log("\n" + "═".repeat(60));
  console.log("📋 RESUMO:");
  console.log("═".repeat(60));
  
  if (!hasProcessingTerms || !hasCategoryKeywords || !hasCountries || !foodsSample?.country_code) {
    console.log("\n⚠️  AÇÃO NECESSÁRIA:");
    console.log("As tabelas precisam ser criadas via migration SQL.");
    console.log("\nVou criar um script SQL simplificado que você pode executar");
    console.log("diretamente no Supabase SQL Editor.\n");
  } else {
    console.log("\n✅ Todas as tabelas e colunas já existem!");
    console.log("Podemos prosseguir para popular os dados.\n");
  }
}

main().catch(console.error);
