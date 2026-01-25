import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🛡️ PASSO 1: Inserindo normalizações de chaves de intolerância...\n");

// Normalização de chaves - PULANDO (tabela pode não ter unique constraint)
console.log("  ⚠️ Pulando normalizations (executar manualmente se necessário)\n");

console.log("\n🛡️ PASSO 2: Inserindo mapeamentos de intolerâncias (versão básica)...\n");

// Mapeamentos básicos de intolerâncias (SEM confidence - não existe na tabela)
const mappings = [
  // GLÚTEN - Português
  { intolerance_key: 'gluten', ingredient: 'trigo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'farinha de trigo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'macarrão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'massa', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'gluten', ingredient: 'cevada', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'centeio', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'malte', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'cerveja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'biscoito', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'gluten', ingredient: 'bolo', language: 'pt', severity_level: 'medium' },
  
  // GLÚTEN - Inglês
  { intolerance_key: 'gluten', ingredient: 'wheat', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'bread', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pasta', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'barley', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'rye', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'malt', language: 'en', severity_level: 'high' },
  
  // LACTOSE - Português
  { intolerance_key: 'lactose', ingredient: 'leite', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'queijo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'iogurte', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'manteiga', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'lactose', ingredient: 'creme de leite', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'requeijão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'sorvete', language: 'pt', severity_level: 'medium' },
  
  // LACTOSE - Inglês
  { intolerance_key: 'lactose', ingredient: 'milk', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'cheese', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'yogurt', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'butter', language: 'en', severity_level: 'medium' },
  { intolerance_key: 'lactose', ingredient: 'cream', language: 'en', severity_level: 'high' },
  
  // OVOS - Português
  { intolerance_key: 'eggs', ingredient: 'ovo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'ovos', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'clara', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'gema', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'maionese', language: 'pt', severity_level: 'high' },
  
  // OVOS - Inglês
  { intolerance_key: 'eggs', ingredient: 'egg', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'eggs', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'egg white', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'egg yolk', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'mayonnaise', language: 'en', severity_level: 'high' },
  
  // SOJA - Português
  { intolerance_key: 'soy', ingredient: 'soja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'leite de soja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'tofu', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'molho de soja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'shoyu', language: 'pt', severity_level: 'high' },
  
  // SOJA - Inglês
  { intolerance_key: 'soy', ingredient: 'soy', language: 'en', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'soya', language: 'en', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'tofu', language: 'en', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'soy sauce', language: 'en', severity_level: 'high' },
  
  // AMENDOIM - Português
  { intolerance_key: 'peanut', ingredient: 'amendoim', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'peanut', ingredient: 'pasta de amendoim', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'peanut', ingredient: 'paçoca', language: 'pt', severity_level: 'high' },
  
  // AMENDOIM - Inglês
  { intolerance_key: 'peanut', ingredient: 'peanut', language: 'en', severity_level: 'high' },
  { intolerance_key: 'peanut', ingredient: 'peanut butter', language: 'en', severity_level: 'high' },
  
  // OLEAGINOSAS - Português
  { intolerance_key: 'tree_nuts', ingredient: 'castanha', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'nozes', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'amêndoa', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'avelã', language: 'pt', severity_level: 'high' },
  
  // OLEAGINOSAS - Inglês
  { intolerance_key: 'tree_nuts', ingredient: 'almond', language: 'en', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'walnut', language: 'en', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'cashew', language: 'en', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'hazelnut', language: 'en', severity_level: 'high' }
];

let inserted = 0;
const batchSize = 50;

for (let i = 0; i < mappings.length; i += batchSize) {
  const batch = mappings.slice(i, i + batchSize);
  const { error } = await supabase.from('intolerance_mappings').upsert(batch, { 
    onConflict: 'intolerance_key,ingredient,language',
    ignoreDuplicates: true 
  });
  
  if (!error || error.message.includes('duplicate')) {
    inserted += batch.length;
  } else {
    console.error(`  ⚠️ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error.message.substring(0, 100));
  }
}

console.log(`  ✅ ${inserted} mapeamentos inseridos\n`);

console.log("🛡️ PASSO 3: Inserindo keywords seguras...\n");

const safeKeywords = [
  // Lactose (SEM language - não existe na tabela)
  { intolerance_key: 'lactose', keyword: 'sem lactose' },
  { intolerance_key: 'lactose', keyword: 'zero lactose' },
  { intolerance_key: 'lactose', keyword: 'lactose free' },
  { intolerance_key: 'lactose', keyword: 'lactose-free' },
  // Glúten
  { intolerance_key: 'gluten', keyword: 'sem glúten' },
  { intolerance_key: 'gluten', keyword: 'sem gluten' },
  { intolerance_key: 'gluten', keyword: 'gluten free' },
  { intolerance_key: 'gluten', keyword: 'gluten-free' },
  // Vegano (para lactose/ovos)
  { intolerance_key: 'lactose', keyword: 'vegano' },
  { intolerance_key: 'lactose', keyword: 'vegan' },
  { intolerance_key: 'eggs', keyword: 'vegano' },
  { intolerance_key: 'eggs', keyword: 'vegan' }
];

for (const kw of safeKeywords) {
  const { error } = await supabase.from('intolerance_safe_keywords').upsert(kw, { 
    onConflict: 'intolerance_key,keyword' 
  });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${kw.keyword}:`, error.message);
  } else {
    console.log(`  ✅ ${kw.keyword}`);
  }
}

console.log("\n🎉 SEEDS DE SEGURANÇA ALIMENTAR CONCLUÍDOS!\n");
console.log("📋 Resumo:");
console.log(`  - ${normalizations.length} normalizações de chaves`);
console.log(`  - ${inserted} mapeamentos de intolerâncias`);
console.log(`  - ${safeKeywords.length} keywords seguras`);
console.log("\n⚠️ NOTA: Esta é uma versão BÁSICA (~70 ingredientes).");
console.log("Para cobertura completa (2.846+ ingredientes), execute:");
console.log("  - expand-all-intolerances (via edge function)");
