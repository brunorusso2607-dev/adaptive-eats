// Script para verificar se dados foram populados após população rápida com ChatGPT
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzA3NjUsImV4cCI6MjA1MTUwNjc2NX0.Oe8wYqJPZvHqxqKlNdGVXjLhqLGvKhLqELqLGvKhLqE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDataAfterPopulation() {
  console.log('🔍 VERIFICANDO DADOS APÓS POPULAÇÃO RÁPIDA COM CHATGPT\n');
  console.log('=' .repeat(80));
  
  // 1. INTOLERANCE_MAPPINGS
  console.log('\n📊 TABELA 1: intolerance_mappings');
  console.log('-'.repeat(80));
  
  try {
    const { count: totalMappings } = await supabase
      .from('intolerance_mappings')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total de registros: ${totalMappings || 0}`);
    
    if (totalMappings && totalMappings > 0) {
      // Contagem por intolerance_key
      const { data: mappingsByKey } = await supabase
        .from('intolerance_mappings')
        .select('intolerance_key, severity_level, ingredient, language')
        .order('intolerance_key');
      
      if (mappingsByKey && mappingsByKey.length > 0) {
        const grouped = mappingsByKey.reduce((acc, item) => {
          if (!acc[item.intolerance_key]) acc[item.intolerance_key] = { high: 0, low: 0, safe: 0, unknown: 0 };
          acc[item.intolerance_key][item.severity_level || 'unknown']++;
          return acc;
        }, {});
        
        console.log('\nContagem por intolerance_key e severity:');
        Object.entries(grouped)
          .sort((a, b) => (b[1].high + b[1].low + b[1].safe) - (a[1].high + a[1].low + a[1].safe))
          .forEach(([key, counts]) => {
            const total = counts.high + counts.low + counts.safe + counts.unknown;
            console.log(`  ${key}: ${total} ingredientes (🔴${counts.high} ⚠️${counts.low} ✅${counts.safe} ❓${counts.unknown})`);
          });
        
        // Verificar qualidade dos dados
        const sampleSize = Math.min(10, mappingsByKey.length);
        console.log(`\nAmostra de dados (primeiros ${sampleSize}):`);
        for (let i = 0; i < sampleSize; i++) {
          const item = mappingsByKey[i];
          const severity = item.severity_level || 'unknown';
          const icon = severity === 'high' ? '🔴' : severity === 'low' ? '⚠️' : severity === 'safe' ? '✅' : '❓';
          console.log(`  ${icon} ${item.intolerance_key} → "${item.ingredient}" (${severity})`);
        }
      }
    } else {
      console.log('⚠️  NENHUM DADO ENCONTRADO');
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
    
    if (totalOptions && totalOptions > 0) {
      const { data: optionsByCategory } = await supabase
        .from('onboarding_options')
        .select('category, option_id, label, emoji, icon_name, is_active, sort_order')
        .eq('is_active', true)
        .order('category, sort_order');
      
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
            console.log(`    ⚠️  DUPLICATAS: ${[...new Set(duplicates)].join(', ')}`);
          }
          
          // Mostrar opções com emojis
          console.log(`    Opções: ${items.map(i => `${i.emoji || '•'} ${i.label}`).join(', ')}`);
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
          console.log(`    Exemplos: ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '...' : ''}`);
        });
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
        .select('dietary_key, ingredient, language, category')
        .order('dietary_key');
      
      if (forbiddenByDiet) {
        const grouped = forbiddenByDiet.reduce((acc, item) => {
          if (!acc[item.dietary_key]) acc[item.dietary_key] = [];
          acc[item.dietary_key].push(item);
          return acc;
        }, {});
        
        console.log('\nContagem por dietary_key:');
        Object.entries(grouped).forEach(([diet, ingredients]) => {
          console.log(`  ${diet}: ${ingredients.length} ingredientes proibidos`);
          console.log(`    Exemplos: ${ingredients.slice(0, 3).map(i => i.ingredient).join(', ')}${ingredients.length > 3 ? '...' : ''}`);
        });
      }
    } else {
      console.log('⚠️  NENHUM DADO ENCONTRADO');
    }
  } catch (error) {
    console.error('❌ Erro ao analisar dietary_forbidden_ingredients:', error.message);
  }
  
  // RESUMO FINAL
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 RESUMO APÓS POPULAÇÃO RÁPIDA');
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
    console.log('\n🚨 ALERTA: TABELAS AINDA VAZIAS!');
    console.log('   A população rápida com ChatGPT não foi aplicada ao banco.');
  } else if (total < 100) {
    console.log('\n⚠️  ALERTA: POPULAÇÃO INCOMPLETA!');
    console.log('   Alguns dados foram adicionados, mas parece incompleto.');
  } else if (total < 1000) {
    console.log('\n📊 POPULAÇÃO BÁSICA REALIZADA!');
    console.log('   Dados básicos foram adicionados, mas pode precisar expansão.');
  } else {
    console.log('\n🎉 POPULAÇÃO MASSIVA REALIZADA!');
    console.log('   Excelente! Dados foram populados em massa.');
  }
  
  console.log('\n' + '='.repeat(80));
}

checkDataAfterPopulation().catch(console.error);
