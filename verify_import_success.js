// Verificar importação com SERVICE ROLE KEY
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 VERIFICANDO IMPORTAÇÃO COM SERVICE ROLE KEY\n");

async function verify() {
  // 1. intolerance_mappings
  const { count: mappings } = await supabase
    .from('intolerance_mappings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 intolerance_mappings: ${mappings || 0} registros`);
  
  if (mappings > 0) {
    const { data: sample } = await supabase
      .from('intolerance_mappings')
      .select('intolerance_key, severity_level, ingredient')
      .limit(10);
    
    console.log('\nAmostra:');
    sample?.forEach(item => {
      const icon = item.severity_level === 'high' ? '🔴' : item.severity_level === 'low' ? '⚠️' : '✅';
      console.log(`  ${icon} ${item.intolerance_key} → ${item.ingredient}`);
    });
  }
  
  // 2. intolerance_safe_keywords
  const { count: keywords } = await supabase
    .from('intolerance_safe_keywords')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 intolerance_safe_keywords: ${keywords || 0} registros`);
  
  if (keywords > 0) {
    const { data: sample } = await supabase
      .from('intolerance_safe_keywords')
      .select('intolerance_key, keyword')
      .limit(5);
    
    console.log('\nAmostra:');
    sample?.forEach(item => {
      console.log(`  🔵 ${item.intolerance_key} → "${item.keyword}"`);
    });
  }
  
  // 3. onboarding_options
  const { count: options } = await supabase
    .from('onboarding_options')
    .select('*', { count: 'exact', head: true });
  
  console.log(`\n📊 onboarding_options: ${options || 0} registros`);
  
  // 4. dietary_forbidden_ingredients
  const { count: dietary } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📊 dietary_forbidden_ingredients: ${dietary || 0} registros`);
  
  const total = (mappings || 0) + (keywords || 0) + (options || 0) + (dietary || 0);
  
  console.log('\n' + '='.repeat(80));
  console.log(`\n🎉 TOTAL: ${total} registros no banco`);
  
  if (mappings >= 1000 && keywords >= 300) {
    console.log('\n✅ SUCESSO! Sistema populado e funcional!');
    console.log('   Onboarding e validação de ingredientes devem funcionar.');
  } else if (total > 0) {
    console.log('\n⚠️  Sistema parcialmente populado.');
    console.log('   Alguns dados foram inseridos, mas pode precisar complementação.');
  } else {
    console.log('\n❌ Sistema ainda vazio.');
  }
}

verify();
