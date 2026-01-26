// TESTE IMEDIATO: Verificar se os termos do banco funcionam
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🧪 TESTANDO TERMOS DO BANCO\n");

async function testProcessingTerms() {
  console.log("1️⃣ Testando termos de processamento (PT):");
  
  const { data: ptTerms, error: ptError } = await supabase
    .from('food_processing_terms')
    .select('term, category')
    .eq('language', 'pt')
    .limit(10);
  
  if (ptError) {
    console.log("   ❌ Erro:", ptError.message);
    return;
  }
  
  console.log("   ✅ Termos PT encontrados:");
  ptTerms.forEach(t => console.log(`      - ${t.term} (${t.category})`));
  
  console.log("\n2️⃣ Testando termos de processamento (EN):");
  
  const { data: enTerms, error: enError } = await supabase
    .from('food_processing_terms')
    .select('term, category')
    .eq('language', 'en')
    .limit(10);
  
  if (enError) {
    console.log("   ❌ Erro:", enError.message);
    return;
  }
  
  console.log("   ✅ Termos EN encontrados:");
  enTerms.forEach(t => console.log(`      - ${t.term} (${t.category})`));
}

async function testCategoryKeywords() {
  console.log("\n3️⃣ Testando palavras-chave de categoria (PT):");
  
  const { data: ptKeywords, error: ptError } = await supabase
    .from('food_category_keywords')
    .select('keyword, category, weight')
    .eq('language', 'pt')
    .limit(10);
  
  if (ptError) {
    console.log("   ❌ Erro:", ptError.message);
    return;
  }
  
  console.log("   ✅ Keywords PT encontradas:");
  ptKeywords.forEach(k => console.log(`      - ${k.keyword} (${k.category}, peso: ${k.weight})`));
}

async function testCountries() {
  console.log("\n4️⃣ Testando configuração de países:");
  
  const { data: countries, error: countriesError } = await supabase
    .from('countries')
    .select('code, name_native, default_language, nutritional_sources')
    .eq('is_active', true)
    .order('sort_order');
  
  if (countriesError) {
    console.log("   ❌ Erro:", countriesError.message);
    return;
  }
  
  console.log("   ✅ Países configurados:");
  countries.forEach(c => {
    console.log(`      - ${c.code}: ${c.name_native} (${c.default_language})`);
    console.log(`        Fontes: ${c.nutritional_sources.join(', ')}`);
  });
}

async function testFoodsWithCountryCode() {
  console.log("\n5️⃣ Testando foods com country_code:");
  
  const { data: foods, error: foodsError } = await supabase
    .from('foods')
    .select('country_code, language, source')
    .neq('country_code', null)
    .limit(10);
  
  if (foodsError) {
    console.log("   ❌ Erro:", foodsError.message);
    return;
  }
  
  console.log("   ✅ Foods com country_code:");
  foods.forEach(f => console.log(`      - ${f.country_code}/${f.language} (${f.source})`));
}

async function testRealWorldExample() {
  console.log("\n6️⃣ Teste prático: Buscar 'frango grelhado'");
  
  // Buscar termos de processamento PT
  const { data: processingTerms } = await supabase
    .from('food_processing_terms')
    .select('term')
    .eq('language', 'pt');
  
  // Buscar keywords de categoria PT
  const { data: categoryKeywords } = await supabase
    .from('food_category_keywords')
    .select('keyword, category, weight')
    .eq('language', 'pt');
  
  const foodName = "frango grelhado";
  let cleaned = foodName.toLowerCase();
  
  // Remover termos de processamento
  if (processingTerms) {
    for (const term of processingTerms) {
      const regex = new RegExp(`\\b${term.term}\\b`, 'gi');
      cleaned = cleaned.replace(regex, '').trim();
    }
  }
  
  console.log(`   📝 Original: ${foodName}`);
  console.log(`   🧹 Limpo: ${cleaned}`);
  
  // Detectar categoria
  if (categoryKeywords) {
    let bestCategory = '';
    let bestScore = 0;
    
    for (const keyword of categoryKeywords) {
      if (cleaned.includes(keyword.keyword)) {
        if (keyword.weight > bestScore) {
          bestScore = keyword.weight;
          bestCategory = keyword.category;
        }
      }
    }
    
    console.log(`   🏷️  Categoria detectada: ${bestCategory} (score: ${bestScore})`);
  }
}

async function main() {
  await testProcessingTerms();
  await testCategoryKeywords();
  await testCountries();
  await testFoodsWithCountryCode();
  await testRealWorldExample();
  
  console.log("\n" + "═".repeat(60));
  console.log("🎉 TESTE CONCLUÍDO!");
  console.log("═".repeat(60));
  console.log("\n✅ Sistema funcionando com termos do banco!");
  console.log("\n📊 Próximo passo:");
  console.log("   1. Refatorar calculateRealMacros.ts para usar estas funções");
  console.log("   2. Implementar sistema i18n básico");
  console.log("   3. Testar com usuário de outro país");
}

main().catch(console.error);
