// Script para verificar disponibilidade de dados nas 4 tabelas críticas
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzA3NjUsImV4cCI6MjA1MTUwNjc2NX0.Oe8wYqJPZvHqxqKlNdGVXjLhqLGvKhLqELqLGvKhLqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDataAvailability() {
  console.log('🔍 ANÁLISE DE DISPONIBILIDADE DE DADOS\n');
  console.log('=' .repeat(80));
  
  // 1. INTOLERANCE_MAPPINGS
  console.log('\n📊 TABELA 1: intolerance_mappings');
  console.log('-'.repeat(80));
  
  try {
    // Total de registros
    const { count: totalMappings } = await supabase
      .from('intolerance_mappings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total de registros: ${totalMappings || 0}`);
    
    // Contagem por intolerance_key
    const { data: mappingsByKey } = await supabase
      .from('intolerance_mappings')
      .select('intolerance_key, ingredient')
      .order('intolerance_key');
    
    if (mappingsByKey && mappingsByKey.length > 0) {
      const grouped = mappingsByKey.reduce((acc, item) => {
        if (!acc[item.intolerance_key]) {
          acc[item.intolerance_key] = new Set();
        }
        acc[item.intolerance_key].add(item.ingredient);
        return acc;
      }, {});
      
      console.log('\nContagem por intolerance_key:');
      Object.entries(grouped)
        .sort((a, b) => b[1].size - a[1].size)
        .forEach(([key, ingredients]) => {
          console.log(`  ${key}: ${ingredients.size} ingredientes únicos`);
        });
    } else {
      console.log('⚠️  NENHUM DADO ENCONTRADO');
    }
    
    // Sample de dados
    const { data: sampleMappings } = await supabase
      .from('intolerance_mappings')
      .select('*')
      .limit(5);
    
    if (sampleMappings && sampleMappings.length > 0) {
      console.log('\nAmostra de dados (primeiros 5):');
      sampleMappings.forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.intolerance_key} → ${item.ingredient} (${item.language || 'pt'})`);
      });
    }
  } catch (error) {
    console.error('❌ Erro ao analisar intolerance_mappings:', error.message);
  }
  
  // 2. ONBOARDING_OPTIONS
  console.log('\n\n📊 TABELA 2: onboarding_options');
  console.log('-'.repeat(80));
  
  try {
    const { count: totalOptions } = await supabase
      .from('onboarding_options')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total de registros: ${totalOptions || 0}`);
    
    // Contagem por categoria
    const { data: optionsByCategory } = await supabase
      .from('onboarding_options')
      .select('category, option_id, label')
      .eq('is_active', true)
      .order('category');
    
    if (optionsByCategory && optionsByCategory.length > 0) {
      const grouped = optionsByCategory.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
      
      console.log('\nContagem por categoria:');
      Object.entries(grouped).forEach(([category, items]) => {
        console.log(`  ${category}: ${items.length} opções`);
        
        // Verificar duplicatas
        const optionIds = items.map(i => i.option_id);
        const duplicates = optionIds.filter((id, idx) => optionIds.indexOf(id) !== idx);
        if (duplicates.length > 0) {
          console.log(`    ⚠️  DUPLICATAS ENCONTRADAS: ${[...new Set(duplicates)].join(', ')}`);
        }
      });
      
      // Mostrar opções de intolerâncias
      const intolerances = grouped['intolerances'] || [];
      if (intolerances.length > 0) {
        console.log('\nOpções de Intolerâncias:');
        intolerances.forEach(item => {
          console.log(`  - ${item.option_id}: ${item.label}`);
        });
      }
    } else {
      console.log('⚠️  NENHUM DADO ENCONTRADO');
    }
  } catch (error) {
    console.error('❌ Erro ao analisar onboarding_options:', error.message);
  }
  
  // 3. INTOLERANCE_SAFE_KEYWORDS
  console.log('\n\n📊 TABELA 3: intolerance_safe_keywords');
  console.log('-'.repeat(80));
  
  try {
    const { count: totalKeywords } = await supabase
      .from('intolerance_safe_keywords')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total de registros: ${totalKeywords || 0}`);
    
    if (totalKeywords && totalKeywords > 0) {
      const { data: keywordsByIntolerance } = await supabase
        .from('intolerance_safe_keywords')
        .select('intolerance_key, keyword')
        .order('intolerance_key');
      
      if (keywordsByIntolerance) {
        const grouped = keywordsByIntolerance.reduce((acc, item) => {
          if (!acc[item.intolerance_key]) acc[item.intolerance_key] = [];
          acc[item.intolerance_key].push(item.keyword);
          return acc;
        }, {});
        
        console.log('\nContagem por intolerance_key:');
        Object.entries(grouped).forEach(([key, keywords]) => {
          console.log(`  ${key}: ${keywords.length} keywords seguros`);
        });
        
        // Sample
        const { data: sampleKeywords } = await supabase
          .from('intolerance_safe_keywords')
          .select('*')
          .limit(5);
        
        if (sampleKeywords && sampleKeywords.length > 0) {
          console.log('\nAmostra de dados (primeiros 5):');
          sampleKeywords.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.intolerance_key} → "${item.keyword}" (seguro)`);
          });
        }
      }
    } else {
      console.log('⚠️  NENHUM DADO ENCONTRADO');
    }
  } catch (error) {
    console.error('❌ Erro ao analisar intolerance_safe_keywords:', error.message);
  }
  
  // 4. DIETARY_FORBIDDEN_INGREDIENTS
  console.log('\n\n📊 TABELA 4: dietary_forbidden_ingredients');
  console.log('-'.repeat(80));
  
  try {
    const { count: totalForbidden } = await supabase
      .from('dietary_forbidden_ingredients')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total de registros: ${totalForbidden || 0}`);
    
    if (totalForbidden && totalForbidden > 0) {
      const { data: forbiddenByDiet } = await supabase
        .from('dietary_forbidden_ingredients')
        .select('dietary_preference, ingredient')
        .order('dietary_preference');
      
      if (forbiddenByDiet) {
        const grouped = forbiddenByDiet.reduce((acc, item) => {
          if (!acc[item.dietary_preference]) acc[item.dietary_preference] = [];
          acc[item.dietary_preference].push(item.ingredient);
          return acc;
        }, {});
        
        console.log('\nContagem por dietary_preference:');
        Object.entries(grouped).forEach(([diet, ingredients]) => {
          console.log(`  ${diet}: ${ingredients.length} ingredientes proibidos`);
        });
        
        // Sample
        const { data: sampleForbidden } = await supabase
          .from('dietary_forbidden_ingredients')
          .select('*')
          .limit(5);
        
        if (sampleForbidden && sampleForbidden.length > 0) {
          console.log('\nAmostra de dados (primeiros 5):');
          sampleForbidden.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item.dietary_preference} → ${item.ingredient}`);
          });
        }
      }
    } else {
      console.log('⚠️  NENHUM DADO ENCONTRADO');
    }
  } catch (error) {
    console.error('❌ Erro ao analisar dietary_forbidden_ingredients:', error.message);
  }
  
  // RESUMO FINAL
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 RESUMO DA ANÁLISE');
  console.log('='.repeat(80));
  
  const { count: m } = await supabase.from('intolerance_mappings').select('*', { count: 'exact', head: true });
  const { count: o } = await supabase.from('onboarding_options').select('*', { count: 'exact', head: true });
  const { count: k } = await supabase.from('intolerance_safe_keywords').select('*', { count: 'exact', head: true });
  const { count: f } = await supabase.from('dietary_forbidden_ingredients').select('*', { count: 'exact', head: true });
  
  console.log(`\n1. intolerance_mappings: ${m || 0} registros`);
  console.log(`2. onboarding_options: ${o || 0} registros`);
  console.log(`3. intolerance_safe_keywords: ${k || 0} registros`);
  console.log(`4. dietary_forbidden_ingredients: ${f || 0} registros`);
  
  const total = (m || 0) + (o || 0) + (k || 0) + (f || 0);
  console.log(`\nTOTAL GERAL: ${total} registros em todas as tabelas`);
  
  if (total === 0) {
    console.log('\n🚨 ALERTA: TODAS AS TABELAS ESTÃO VAZIAS!');
    console.log('   Será necessário criar os dados do zero.');
  } else if (total < 100) {
    console.log('\n⚠️  ALERTA: DADOS INSUFICIENTES!');
    console.log('   Algumas tabelas podem estar vazias ou com dados incompletos.');
  } else {
    console.log('\n✅ Dados encontrados. Verificar qualidade e completude.');
  }
  
  console.log('\n' + '='.repeat(80));
}

analyzeDataAvailability().catch(console.error);
