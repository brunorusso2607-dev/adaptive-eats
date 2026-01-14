import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🛡️ Inserindo mapeamentos de intolerâncias (CURADO MANUALMENTE)...\n");

// Dados curados manualmente - SEM IA
const mappings = [
  // GLÚTEN - Português (25 ingredientes)
  { intolerance_key: 'gluten', ingredient: 'trigo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'farinha de trigo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pão francês', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pão integral', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'macarrão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'massa', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pizza', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'cevada', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'centeio', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'malte', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'cerveja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'biscoito', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'gluten', ingredient: 'bolo', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'gluten', ingredient: 'seitan', language: 'pt', severity_level: 'high' },
  
  // GLÚTEN - Inglês (14 ingredientes)
  { intolerance_key: 'gluten', ingredient: 'wheat', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'bread', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pasta', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'barley', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'rye', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'malt', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'beer', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'pizza', language: 'en', severity_level: 'high' },
  { intolerance_key: 'gluten', ingredient: 'seitan', language: 'en', severity_level: 'high' },
  
  // LACTOSE - Português (21 ingredientes)
  { intolerance_key: 'lactose', ingredient: 'leite', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'leite integral', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'leite condensado', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'queijo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'queijo minas', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'queijo mussarela', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'queijo parmesão', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'lactose', ingredient: 'iogurte', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'manteiga', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'lactose', ingredient: 'creme de leite', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'requeijão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'sorvete', language: 'pt', severity_level: 'medium' },
  { intolerance_key: 'lactose', ingredient: 'doce de leite', language: 'pt', severity_level: 'high' },
  
  // LACTOSE - Inglês (14 ingredientes)
  { intolerance_key: 'lactose', ingredient: 'milk', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'cheese', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'yogurt', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'butter', language: 'en', severity_level: 'medium' },
  { intolerance_key: 'lactose', ingredient: 'cream', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'ice cream', language: 'en', severity_level: 'medium' },
  { intolerance_key: 'lactose', ingredient: 'whey', language: 'en', severity_level: 'high' },
  { intolerance_key: 'lactose', ingredient: 'casein', language: 'en', severity_level: 'high' },
  
  // OVOS - Português (14 ingredientes)
  { intolerance_key: 'eggs', ingredient: 'ovo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'ovos', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'clara', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'gema', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'maionese', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'omelete', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'merengue', language: 'pt', severity_level: 'high' },
  
  // OVOS - Inglês (8 ingredientes)
  { intolerance_key: 'eggs', ingredient: 'egg', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'egg white', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'egg yolk', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'mayonnaise', language: 'en', severity_level: 'high' },
  { intolerance_key: 'eggs', ingredient: 'albumin', language: 'en', severity_level: 'high' },
  
  // SOJA - Português (11 ingredientes)
  { intolerance_key: 'soy', ingredient: 'soja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'leite de soja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'tofu', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'molho de soja', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'shoyu', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'tempeh', language: 'pt', severity_level: 'high' },
  
  // SOJA - Inglês (11 ingredientes)
  { intolerance_key: 'soy', ingredient: 'soy', language: 'en', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'tofu', language: 'en', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'soy sauce', language: 'en', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'tempeh', language: 'en', severity_level: 'high' },
  { intolerance_key: 'soy', ingredient: 'edamame', language: 'en', severity_level: 'high' },
  
  // AMENDOIM - Português (6 ingredientes)
  { intolerance_key: 'peanut', ingredient: 'amendoim', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'peanut', ingredient: 'pasta de amendoim', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'peanut', ingredient: 'paçoca', language: 'pt', severity_level: 'high' },
  
  // AMENDOIM - Inglês (4 ingredientes)
  { intolerance_key: 'peanut', ingredient: 'peanut', language: 'en', severity_level: 'high' },
  { intolerance_key: 'peanut', ingredient: 'peanut butter', language: 'en', severity_level: 'high' },
  
  // OLEAGINOSAS - Português (10 ingredientes)
  { intolerance_key: 'tree_nuts', ingredient: 'castanha', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'castanha de caju', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'nozes', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'amêndoa', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'avelã', language: 'pt', severity_level: 'high' },
  
  // OLEAGINOSAS - Inglês (8 ingredientes)
  { intolerance_key: 'tree_nuts', ingredient: 'almond', language: 'en', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'walnut', language: 'en', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'cashew', language: 'en', severity_level: 'high' },
  { intolerance_key: 'tree_nuts', ingredient: 'hazelnut', language: 'en', severity_level: 'high' },
  
  // PEIXE - Português (9 ingredientes)
  { intolerance_key: 'fish', ingredient: 'peixe', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'fish', ingredient: 'salmão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'fish', ingredient: 'atum', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'fish', ingredient: 'bacalhau', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'fish', ingredient: 'sardinha', language: 'pt', severity_level: 'high' },
  
  // PEIXE - Inglês (9 ingredientes)
  { intolerance_key: 'fish', ingredient: 'fish', language: 'en', severity_level: 'high' },
  { intolerance_key: 'fish', ingredient: 'salmon', language: 'en', severity_level: 'high' },
  { intolerance_key: 'fish', ingredient: 'tuna', language: 'en', severity_level: 'high' },
  { intolerance_key: 'fish', ingredient: 'cod', language: 'en', severity_level: 'high' },
  
  // FRUTOS DO MAR - Português (9 ingredientes)
  { intolerance_key: 'shellfish', ingredient: 'camarão', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'lagosta', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'lula', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'polvo', language: 'pt', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'ostra', language: 'pt', severity_level: 'high' },
  
  // FRUTOS DO MAR - Inglês (10 ingredientes)
  { intolerance_key: 'shellfish', ingredient: 'shrimp', language: 'en', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'lobster', language: 'en', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'crab', language: 'en', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'squid', language: 'en', severity_level: 'high' },
  { intolerance_key: 'shellfish', ingredient: 'octopus', language: 'en', severity_level: 'high' }
];

console.log(`Total de ingredientes a inserir: ${mappings.length}\n`);

let inserted = 0;
let errors = 0;

for (const mapping of mappings) {
  const { error } = await supabase
    .from('intolerance_mappings')
    .insert(mapping);
  
  if (error) {
    if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
      console.error(`❌ ${mapping.ingredient}:`, error.message.substring(0, 80));
      errors++;
    }
  } else {
    inserted++;
  }
}

console.log(`\n✅ CONCLUÍDO!`);
console.log(`  - ${inserted} ingredientes inseridos`);
console.log(`  - ${errors} erros`);
console.log(`  - ${mappings.length - inserted - errors} duplicados (ignorados)`);
console.log(`\n📊 Total no banco: ${inserted} novos mapeamentos`);
console.log(`\n⚠️ NOTA: Esta é uma versão CURADA MANUALMENTE (~${mappings.length} ingredientes essenciais)`);
console.log(`Para adicionar mais ingredientes, use o painel Admin → Mapeamento Intolerâncias`);
