// Análise completa do sistema de fontes nutricionais para estratégia USDA
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("═══════════════════════════════════════════════════════════");
console.log("  ANÁLISE ESTRATÉGICA: IMPORTAÇÃO USDA");
console.log("═══════════════════════════════════════════════════════════\n");

async function analyzeSystem() {
  // 1. ANÁLISE DO BANCO ATUAL
  console.log("📊 1. ESTADO ATUAL DO BANCO DE DADOS\n");
  
  const { count: totalFoods } = await supabase
    .from('foods')
    .select('*', { count: 'exact', head: true });
  
  const { count: tbcaCount } = await supabase
    .from('foods')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'TBCA');
  
  const { count: tacoCount } = await supabase
    .from('foods')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'taco');
  
  const { count: usdaCount } = await supabase
    .from('foods')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'usda');
  
  const { count: curatedCount } = await supabase
    .from('foods')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'curated');
  
  const { count: canonicalCount } = await supabase
    .from('canonical_ingredients')
    .select('*', { count: 'exact', head: true });
  
  console.log("Tabela 'foods':");
  console.log(`  Total de alimentos: ${totalFoods}`);
  console.log(`  🇧🇷 TBCA (Brasil): ${tbcaCount}`);
  console.log(`  🇧🇷 TACO (Brasil): ${tacoCount}`);
  console.log(`  🇺🇸 USDA (EUA): ${usdaCount}`);
  console.log(`  ✅ Curated (Manual): ${curatedCount}`);
  console.log(`\nTabela 'canonical_ingredients':`);
  console.log(`  Total: ${canonicalCount || 0}`);
  
  // 2. ANÁLISE DE AMOSTRAS
  console.log("\n" + "─".repeat(60));
  console.log("📋 2. ANÁLISE DE AMOSTRAS (TBCA)\n");
  
  const { data: tbcaSamples } = await supabase
    .from('foods')
    .select('name, name_normalized, calories_per_100g, protein_per_100g, source')
    .eq('source', 'TBCA')
    .limit(10);
  
  if (tbcaSamples && tbcaSamples.length > 0) {
    console.log("Exemplos de alimentos TBCA:");
    tbcaSamples.forEach((food, i) => {
      console.log(`  ${i + 1}. ${food.name}`);
      console.log(`     Normalizado: "${food.name_normalized}"`);
      console.log(`     Macros: ${food.calories_per_100g}kcal, ${food.protein_per_100g}g prot`);
    });
  }
  
  // 3. VERIFICAR DUPLICAÇÃO
  console.log("\n" + "─".repeat(60));
  console.log("🔍 3. TESTE DE DUPLICAÇÃO: ARROZ vs RICE\n");
  
  const { data: arrozResults } = await supabase
    .from('foods')
    .select('name, name_normalized, source, calories_per_100g')
    .or('name_normalized.ilike.%arroz%,name_normalized.ilike.%rice%')
    .limit(15);
  
  if (arrozResults && arrozResults.length > 0) {
    console.log("Alimentos encontrados com 'arroz' ou 'rice':");
    const grouped = {};
    arrozResults.forEach(food => {
      const key = food.name_normalized;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(food);
    });
    
    Object.entries(grouped).forEach(([normalized, foods]) => {
      console.log(`\n  "${normalized}":`);
      foods.forEach(f => {
        console.log(`    - ${f.name} (${f.source}) - ${f.calories_per_100g}kcal`);
      });
    });
  }
  
  // 4. ANÁLISE DO CÓDIGO DE BUSCA
  console.log("\n" + "─".repeat(60));
  console.log("🔧 4. COMO O SISTEMA FUNCIONA (calculateRealMacros.ts)\n");
  
  console.log("HIERARQUIA DE BUSCA:");
  console.log("  1️⃣ CANONICAL_INGREDIENTS (prioridade máxima, 100% confiança)");
  console.log("     - Dados verificados manualmente");
  console.log("     - Cache de 5 minutos");
  console.log("     - Busca por EN, PT, ES");
  console.log("");
  console.log("  2️⃣ FOODS - Busca por PAÍS (database)");
  console.log("     - BR: ['TBCA', 'taco', 'curated']");
  console.log("     - US: ['usda', 'curated']");
  console.log("     - Confiança: 100%");
  console.log("");
  console.log("  3️⃣ FOODS - Busca GLOBAL (database_global)");
  console.log("     - Qualquer fonte");
  console.log("     - Confiança: 95%");
  console.log("");
  console.log("  4️⃣ CATEGORY FALLBACK");
  console.log("     - Estimativa por categoria");
  console.log("     - Confiança: 85%");
  console.log("");
  console.log("  5️⃣ AI ESTIMATE");
  console.log("     - Último recurso");
  console.log("     - Confiança: 70-75%");
  
  // 5. PRIORIZAÇÃO POR PAÍS
  console.log("\n" + "─".repeat(60));
  console.log("🌍 5. PRIORIZAÇÃO POR PAÍS\n");
  
  const priorities = {
    'BR': ['TBCA', 'taco', 'curated'],
    'US': ['usda', 'curated'],
    'FR': ['CIQUAL', 'curated'],
    'UK': ['McCance', 'curated'],
    'MX': ['BAM', 'curated'],
    'ES': ['AESAN Spain', 'curated'],
    'DE': ['BLS Germany', 'curated'],
    'IT': ['CREA', 'curated'],
  };
  
  Object.entries(priorities).forEach(([country, sources]) => {
    console.log(`  ${country}: ${sources.join(' → ')}`);
  });
  
  // 6. ANÁLISE DE GAPS
  console.log("\n" + "─".repeat(60));
  console.log("📊 6. ANÁLISE DE GAPS (O QUE FALTA)\n");
  
  // Verificar se existem alimentos internacionais
  const internationalFoods = [
    'quinoa', 'chia', 'kale', 'avocado', 'salmon', 
    'tuna', 'chicken breast', 'brown rice', 'oats', 'almonds'
  ];
  
  console.log("Testando alimentos internacionais comuns:\n");
  for (const food of internationalFoods) {
    const { data } = await supabase
      .from('foods')
      .select('name, source')
      .ilike('name_normalized', `%${food}%`)
      .limit(1)
      .maybeSingle();
    
    const status = data ? `✅ ${data.source}` : '❌ NÃO ENCONTRADO';
    console.log(`  ${food.padEnd(20)} ${status}`);
  }
  
  // 7. CONCLUSÕES E RECOMENDAÇÕES
  console.log("\n" + "═".repeat(60));
  console.log("💡 7. CONCLUSÕES E RECOMENDAÇÕES\n");
  
  console.log("FUNCIONAMENTO ATUAL:");
  console.log("  ✅ Sistema NÃO deduplica automaticamente");
  console.log("  ✅ Cada fonte é tratada independentemente");
  console.log("  ✅ Priorização por país do usuário");
  console.log("  ✅ 'Arroz' (TBCA) ≠ 'Rice' (USDA) no sistema");
  console.log("");
  
  console.log("IMPACTO DA IMPORTAÇÃO USDA:");
  console.log("  📊 USDA tem ~8.000+ alimentos");
  console.log("  🇧🇷 Usuários BR: continuarão usando TBCA/TACO primeiro");
  console.log("  🇺🇸 Usuários US: usarão USDA como prioridade");
  console.log("  🌍 Outros países: USDA como fallback global");
  console.log("");
  
  console.log("ESTRATÉGIAS POSSÍVEIS:\n");
  
  console.log("📌 OPÇÃO 1: IMPORTAÇÃO SELETIVA (RECOMENDADA)");
  console.log("  ✅ Importar apenas alimentos que NÃO existem em TBCA");
  console.log("  ✅ Foco em alimentos internacionais/processados");
  console.log("  ✅ Evita redundância desnecessária");
  console.log("  ✅ Mantém banco enxuto e rápido");
  console.log("  📊 Estimativa: ~2.000-3.000 alimentos novos");
  console.log("");
  
  console.log("📌 OPÇÃO 2: IMPORTAÇÃO COMPLETA");
  console.log("  ⚠️ Importar todos os ~8.000 alimentos USDA");
  console.log("  ⚠️ Haverá duplicação (arroz TBCA + rice USDA)");
  console.log("  ✅ Maior cobertura para usuários internacionais");
  console.log("  ⚠️ Banco mais pesado (14.000+ alimentos)");
  console.log("  ⚠️ Queries mais lentas");
  console.log("");
  
  console.log("📌 OPÇÃO 3: CANONICAL + USDA SELETIVO");
  console.log("  ✅ Popular canonical_ingredients com top 500 alimentos");
  console.log("  ✅ Importar USDA seletivo para gaps");
  console.log("  ✅ Melhor performance (canonical tem cache)");
  console.log("  ✅ Dados verificados em canonical");
  console.log("  📊 Estimativa: 500 canonical + 1.500 USDA");
  console.log("");
  
  console.log("═".repeat(60));
  console.log("🎯 RECOMENDAÇÃO FINAL:\n");
  
  console.log("Usar OPÇÃO 3: CANONICAL + USDA SELETIVO");
  console.log("");
  console.log("FASE 1: Popular canonical_ingredients");
  console.log("  - Top 500 alimentos mais usados globalmente");
  console.log("  - Dados verificados e multilíngues (EN, PT, ES)");
  console.log("  - Flags de intolerância e dieta");
  console.log("  - Prioridade máxima no sistema");
  console.log("");
  console.log("FASE 2: Importar USDA seletivo");
  console.log("  - Alimentos que NÃO existem em TBCA/canonical");
  console.log("  - Foco: processados, internacionais, marcas");
  console.log("  - Exemplos: quinoa, chia, kale, protein powder");
  console.log("  - Source: 'usda'");
  console.log("");
  console.log("BENEFÍCIOS:");
  console.log("  ✅ Sem redundância desnecessária");
  console.log("  ✅ Performance otimizada (canonical cache)");
  console.log("  ✅ Cobertura global completa");
  console.log("  ✅ Dados verificados em canonical");
  console.log("  ✅ Fallback USDA para casos específicos");
  console.log("");
  console.log("═".repeat(60));
}

analyzeSystem().catch(console.error);
