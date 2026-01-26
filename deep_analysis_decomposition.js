// Análise profunda da tabela food_decomposition
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 ANÁLISE PROFUNDA: food_decomposition\n");
console.log("=".repeat(80));

async function deepAnalysis() {
  try {
    // 1. Verificar total de registros
    console.log("\n📊 1. CONTAGEM TOTAL");
    const { count: totalCount, error: countError } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error("❌ Erro ao contar:", countError);
    } else {
      console.log(`   Total de registros: ${totalCount || 0}`);
    }
    
    // 2. Verificar por idioma
    console.log("\n📊 2. DISTRIBUIÇÃO POR IDIOMA");
    
    const { count: enCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'en');
    
    const { count: ptCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'pt');
    
    console.log(`   🇺🇸 Inglês (en): ${enCount || 0}`);
    console.log(`   🇧🇷 Português (pt): ${ptCount || 0}`);
    
    // 3. Verificar registros ativos
    console.log("\n📊 3. STATUS DE ATIVAÇÃO");
    
    const { count: activeCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { count: inactiveCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);
    
    console.log(`   ✅ Ativos: ${activeCount || 0}`);
    console.log(`   ❌ Inativos: ${inactiveCount || 0}`);
    
    // 4. Verificar categorias
    console.log("\n📊 4. DISTRIBUIÇÃO POR CATEGORIA");
    
    const { data: categories } = await supabase
      .from('food_decomposition')
      .select('category')
      .not('category', 'is', null);
    
    if (categories) {
      const categoryCount = {};
      categories.forEach(item => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      });
      
      const sortedCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      sortedCategories.forEach(([cat, count]) => {
        console.log(`   ${cat}: ${count}`);
      });
    }
    
    // 5. Amostras de dados
    console.log("\n📊 5. AMOSTRAS DE DADOS (primeiros 10)");
    
    const { data: samples } = await supabase
      .from('food_decomposition')
      .select('*')
      .limit(10);
    
    if (samples && samples.length > 0) {
      samples.forEach((item, idx) => {
        console.log(`\n   ${idx + 1}. ${item.processed_food_name} (${item.language})`);
        console.log(`      Categoria: ${item.category}`);
        console.log(`      Ingredientes: ${item.base_ingredients.join(', ')}`);
        console.log(`      Ativo: ${item.is_active}`);
      });
    } else {
      console.log("   ⚠️ Nenhuma amostra encontrada");
    }
    
    // 6. Verificar estrutura da tabela
    console.log("\n📊 6. ESTRUTURA DA TABELA");
    
    const { data: sampleRow } = await supabase
      .from('food_decomposition')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleRow) {
      console.log("   Colunas disponíveis:");
      Object.keys(sampleRow).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleRow[key]}`);
      });
    }
    
    // 7. Verificar se há problemas de visibilidade
    console.log("\n📊 7. VERIFICAÇÃO DE VISIBILIDADE");
    
    // Tentar buscar com diferentes filtros
    const { data: allData } = await supabase
      .from('food_decomposition')
      .select('*');
    
    const { data: activeData } = await supabase
      .from('food_decomposition')
      .select('*')
      .eq('is_active', true);
    
    console.log(`   Total sem filtro: ${allData?.length || 0}`);
    console.log(`   Total com is_active=true: ${activeData?.length || 0}`);
    
    // 8. Verificar RLS (Row Level Security)
    console.log("\n📊 8. VERIFICAÇÃO DE POLÍTICAS RLS");
    console.log("   Usando service_role key - deve ter acesso total");
    console.log("   Se o painel admin usa anon key, pode haver restrições RLS");
    
    // 9. Diagnóstico final
    console.log("\n" + "=".repeat(80));
    console.log("🔍 DIAGNÓSTICO FINAL");
    console.log("=".repeat(80));
    
    if (totalCount === 0) {
      console.log("\n❌ PROBLEMA: Tabela está vazia!");
      console.log("   Causa provável: Dados não foram inseridos ou foram deletados");
    } else if (totalCount > 0 && totalCount < 50) {
      console.log("\n🟡 PROBLEMA: Dados incompletos!");
      console.log(`   Apenas ${totalCount} registros encontrados`);
      console.log("   Esperado: 554 alimentos processados");
    } else {
      console.log("\n✅ Dados presentes no banco!");
      console.log(`   ${totalCount} registros encontrados`);
      
      if (activeCount === 0) {
        console.log("\n⚠️ PROBLEMA: Nenhum registro ativo!");
        console.log("   Todos os registros estão com is_active=false");
      }
    }
    
    console.log("\n📋 POSSÍVEIS CAUSAS DO PROBLEMA NO PAINEL:");
    console.log("   1. RLS (Row Level Security) bloqueando acesso com anon key");
    console.log("   2. Filtro no painel buscando por is_active=true mas dados estão false");
    console.log("   3. Painel buscando em tabela diferente ou com nome errado");
    console.log("   4. Cache do navegador mostrando dados antigos");
    console.log("   5. Conexão do painel usando URL/key diferente");
    
  } catch (error) {
    console.error('\n❌ Erro fatal na análise:', error);
  }
}

deepAnalysis();
