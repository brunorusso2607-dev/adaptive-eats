// Corrigir language em dietary_forbidden_ingredients de 'pt' para 'br'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 CORRIGINDO dietary_forbidden_ingredients\n");

async function fixDietaryLanguage() {
  // Verificar distribuição atual
  const { count: totalCount } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('*', { count: 'exact', head: true });
  
  const { count: ptCount } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'pt');
  
  const { count: brCount } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('*', { count: 'exact', head: true })
    .eq('language', 'br');
  
  console.log("📊 DISTRIBUIÇÃO ATUAL:");
  console.log(`  Total: ${totalCount}`);
  console.log(`  🇵🇹 Portugal (pt): ${ptCount}`);
  console.log(`  🇧🇷 Brasil (br): ${brCount}\n`);
  
  if (ptCount > 0) {
    console.log("🔧 CORRIGINDO: Mudando 'pt' para 'br'...\n");
    
    // Buscar todos com 'pt'
    const { data: ptItems } = await supabase
      .from('dietary_forbidden_ingredients')
      .select('*')
      .eq('language', 'pt');
    
    console.log(`📝 Encontrados ${ptItems.length} ingredientes para corrigir\n`);
    
    // Atualizar cada um
    let updated = 0;
    for (const item of ptItems) {
      const { error } = await supabase
        .from('dietary_forbidden_ingredients')
        .update({ language: 'br' })
        .eq('id', item.id);
      
      if (!error) {
        console.log(`✅ ${item.ingredient} (${item.dietary_key})`);
        updated++;
      } else {
        console.error(`❌ Erro: ${item.ingredient} - ${error.message}`);
      }
    }
    
    // Verificação final
    const { count: newPtCount } = await supabase
      .from('dietary_forbidden_ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'pt');
    
    const { count: newBrCount } = await supabase
      .from('dietary_forbidden_ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'br');
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 CORREÇÃO CONCLUÍDA!");
    console.log("=".repeat(60));
    console.log(`\n📊 RESULTADO:`);
    console.log(`  ✅ Atualizados: ${updated}`);
    console.log(`  🇵🇹 Portugal (pt): ${newPtCount}`);
    console.log(`  🇧🇷 Brasil (br): ${newBrCount}`);
  } else {
    console.log("✅ Nenhuma correção necessária!");
  }
}

fixDietaryLanguage();
