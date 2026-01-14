import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🛡️ EXPANDINDO INTOLERANCE MAPPINGS...\n");

// Mapeamentos adicionais essenciais
const newMappings = [
  // GLUTEN - Expandir
  { intolerance_key: 'gluten', ingredient: 'cerveja', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'beer', language: 'en' },
  { intolerance_key: 'gluten', ingredient: 'molho de soja', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'soy sauce', language: 'en' },
  { intolerance_key: 'gluten', ingredient: 'aveia', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'oats', language: 'en' },
  { intolerance_key: 'gluten', ingredient: 'biscoito', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'cookie', language: 'en' },
  { intolerance_key: 'gluten', ingredient: 'bolo', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'cake', language: 'en' },
  { intolerance_key: 'gluten', ingredient: 'macarrão', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'pasta', language: 'en' },
  { intolerance_key: 'gluten', ingredient: 'pizza', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'pizza', language: 'en' },
  { intolerance_key: 'gluten', ingredient: 'empanado', language: 'pt' },
  { intolerance_key: 'gluten', ingredient: 'breaded', language: 'en' },
  
  // LACTOSE - Expandir
  { intolerance_key: 'lactose', ingredient: 'sorvete', language: 'pt' },
  { intolerance_key: 'lactose', ingredient: 'ice cream', language: 'en' },
  { intolerance_key: 'lactose', ingredient: 'chocolate ao leite', language: 'pt' },
  { intolerance_key: 'lactose', ingredient: 'milk chocolate', language: 'en' },
  { intolerance_key: 'lactose', ingredient: 'pizza', language: 'pt' },
  { intolerance_key: 'lactose', ingredient: 'pizza', language: 'en' },
  { intolerance_key: 'lactose', ingredient: 'lasanha', language: 'pt' },
  { intolerance_key: 'lactose', ingredient: 'lasagna', language: 'en' },
  { intolerance_key: 'lactose', ingredient: 'requeijão', language: 'pt' },
  { intolerance_key: 'lactose', ingredient: 'cream cheese', language: 'en' },
  { intolerance_key: 'lactose', ingredient: 'creme de leite', language: 'pt' },
  { intolerance_key: 'lactose', ingredient: 'cream', language: 'en' },
  
  // EGGS - Expandir
  { intolerance_key: 'egg', ingredient: 'maionese', language: 'pt' },
  { intolerance_key: 'egg', ingredient: 'mayonnaise', language: 'en' },
  { intolerance_key: 'egg', ingredient: 'bolo', language: 'pt' },
  { intolerance_key: 'egg', ingredient: 'cake', language: 'en' },
  { intolerance_key: 'egg', ingredient: 'panqueca', language: 'pt' },
  { intolerance_key: 'egg', ingredient: 'pancake', language: 'en' },
  { intolerance_key: 'egg', ingredient: 'empanado', language: 'pt' },
  { intolerance_key: 'egg', ingredient: 'breaded', language: 'en' },
  { intolerance_key: 'egg', ingredient: 'quiche', language: 'pt' },
  { intolerance_key: 'egg', ingredient: 'quiche', language: 'en' },
  
  // SOY - Expandir
  { intolerance_key: 'soy', ingredient: 'molho de soja', language: 'pt' },
  { intolerance_key: 'soy', ingredient: 'soy sauce', language: 'en' },
  { intolerance_key: 'soy', ingredient: 'tofu', language: 'pt' },
  { intolerance_key: 'soy', ingredient: 'tofu', language: 'en' },
  { intolerance_key: 'soy', ingredient: 'edamame', language: 'pt' },
  { intolerance_key: 'soy', ingredient: 'edamame', language: 'en' },
  { intolerance_key: 'soy', ingredient: 'missô', language: 'pt' },
  { intolerance_key: 'soy', ingredient: 'miso', language: 'en' },
  
  // PEANUT - Expandir
  { intolerance_key: 'peanut', ingredient: 'pasta de amendoim', language: 'pt' },
  { intolerance_key: 'peanut', ingredient: 'peanut butter', language: 'en' },
  { intolerance_key: 'peanut', ingredient: 'paçoca', language: 'pt' },
  { intolerance_key: 'peanut', ingredient: 'pé de moleque', language: 'pt' },
  
  // TREE NUTS - Expandir
  { intolerance_key: 'tree_nuts', ingredient: 'castanha de caju', language: 'pt' },
  { intolerance_key: 'tree_nuts', ingredient: 'cashew', language: 'en' },
  { intolerance_key: 'tree_nuts', ingredient: 'castanha do pará', language: 'pt' },
  { intolerance_key: 'tree_nuts', ingredient: 'brazil nut', language: 'en' },
  { intolerance_key: 'tree_nuts', ingredient: 'pistache', language: 'pt' },
  { intolerance_key: 'tree_nuts', ingredient: 'pistachio', language: 'en' },
  { intolerance_key: 'tree_nuts', ingredient: 'macadâmia', language: 'pt' },
  { intolerance_key: 'tree_nuts', ingredient: 'macadamia', language: 'en' },
  
  // FISH - Expandir
  { intolerance_key: 'fish', ingredient: 'salmão', language: 'pt' },
  { intolerance_key: 'fish', ingredient: 'salmon', language: 'en' },
  { intolerance_key: 'fish', ingredient: 'atum', language: 'pt' },
  { intolerance_key: 'fish', ingredient: 'tuna', language: 'en' },
  { intolerance_key: 'fish', ingredient: 'bacalhau', language: 'pt' },
  { intolerance_key: 'fish', ingredient: 'cod', language: 'en' },
  { intolerance_key: 'fish', ingredient: 'tilápia', language: 'pt' },
  { intolerance_key: 'fish', ingredient: 'tilapia', language: 'en' },
  { intolerance_key: 'fish', ingredient: 'sardinha', language: 'pt' },
  { intolerance_key: 'fish', ingredient: 'sardine', language: 'en' },
  
  // SHELLFISH - Expandir
  { intolerance_key: 'shellfish', ingredient: 'lagosta', language: 'pt' },
  { intolerance_key: 'shellfish', ingredient: 'lobster', language: 'en' },
  { intolerance_key: 'shellfish', ingredient: 'caranguejo', language: 'pt' },
  { intolerance_key: 'shellfish', ingredient: 'crab', language: 'en' },
  { intolerance_key: 'shellfish', ingredient: 'lula', language: 'pt' },
  { intolerance_key: 'shellfish', ingredient: 'squid', language: 'en' },
  { intolerance_key: 'shellfish', ingredient: 'polvo', language: 'pt' },
  { intolerance_key: 'shellfish', ingredient: 'octopus', language: 'en' },
  
  // FRUCTOSE - Novos
  { intolerance_key: 'fructose', ingredient: 'mel', language: 'pt' },
  { intolerance_key: 'fructose', ingredient: 'honey', language: 'en' },
  { intolerance_key: 'fructose', ingredient: 'xarope de milho', language: 'pt' },
  { intolerance_key: 'fructose', ingredient: 'corn syrup', language: 'en' },
  { intolerance_key: 'fructose', ingredient: 'agave', language: 'pt' },
  { intolerance_key: 'fructose', ingredient: 'agave', language: 'en' },
  { intolerance_key: 'fructose', ingredient: 'maçã', language: 'pt' },
  { intolerance_key: 'fructose', ingredient: 'apple', language: 'en' },
  { intolerance_key: 'fructose', ingredient: 'pera', language: 'pt' },
  { intolerance_key: 'fructose', ingredient: 'pear', language: 'en' },
  
  // SORBITOL - Novos
  { intolerance_key: 'sorbitol', ingredient: 'maçã', language: 'pt' },
  { intolerance_key: 'sorbitol', ingredient: 'apple', language: 'en' },
  { intolerance_key: 'sorbitol', ingredient: 'pera', language: 'pt' },
  { intolerance_key: 'sorbitol', ingredient: 'pear', language: 'en' },
  { intolerance_key: 'sorbitol', ingredient: 'pêssego', language: 'pt' },
  { intolerance_key: 'sorbitol', ingredient: 'peach', language: 'en' },
  { intolerance_key: 'sorbitol', ingredient: 'ameixa', language: 'pt' },
  { intolerance_key: 'sorbitol', ingredient: 'plum', language: 'en' },
  
  // FODMAP - Novos
  { intolerance_key: 'fodmap', ingredient: 'cebola', language: 'pt' },
  { intolerance_key: 'fodmap', ingredient: 'onion', language: 'en' },
  { intolerance_key: 'fodmap', ingredient: 'alho', language: 'pt' },
  { intolerance_key: 'fodmap', ingredient: 'garlic', language: 'en' },
  { intolerance_key: 'fodmap', ingredient: 'feijão', language: 'pt' },
  { intolerance_key: 'fodmap', ingredient: 'beans', language: 'en' },
  { intolerance_key: 'fodmap', ingredient: 'grão de bico', language: 'pt' },
  { intolerance_key: 'fodmap', ingredient: 'chickpea', language: 'en' },
  { intolerance_key: 'fodmap', ingredient: 'lentilha', language: 'pt' },
  { intolerance_key: 'fodmap', ingredient: 'lentil', language: 'en' },
  
  // HISTAMINE - Novos
  { intolerance_key: 'histamine', ingredient: 'vinho', language: 'pt' },
  { intolerance_key: 'histamine', ingredient: 'wine', language: 'en' },
  { intolerance_key: 'histamine', ingredient: 'cerveja', language: 'pt' },
  { intolerance_key: 'histamine', ingredient: 'beer', language: 'en' },
  { intolerance_key: 'histamine', ingredient: 'queijo maturado', language: 'pt' },
  { intolerance_key: 'histamine', ingredient: 'aged cheese', language: 'en' },
  { intolerance_key: 'histamine', ingredient: 'tomate', language: 'pt' },
  { intolerance_key: 'histamine', ingredient: 'tomato', language: 'en' },
  { intolerance_key: 'histamine', ingredient: 'espinafre', language: 'pt' },
  { intolerance_key: 'histamine', ingredient: 'spinach', language: 'en' },
  
  // CAFFEINE - Novos
  { intolerance_key: 'caffeine', ingredient: 'café', language: 'pt' },
  { intolerance_key: 'caffeine', ingredient: 'coffee', language: 'en' },
  { intolerance_key: 'caffeine', ingredient: 'chá preto', language: 'pt' },
  { intolerance_key: 'caffeine', ingredient: 'black tea', language: 'en' },
  { intolerance_key: 'caffeine', ingredient: 'chá verde', language: 'pt' },
  { intolerance_key: 'caffeine', ingredient: 'green tea', language: 'en' },
  { intolerance_key: 'caffeine', ingredient: 'chocolate', language: 'pt' },
  { intolerance_key: 'caffeine', ingredient: 'chocolate', language: 'en' },
  { intolerance_key: 'caffeine', ingredient: 'energético', language: 'pt' },
  { intolerance_key: 'caffeine', ingredient: 'energy drink', language: 'en' },
  
  // SULFITE - Novos
  { intolerance_key: 'sulfite', ingredient: 'vinho', language: 'pt' },
  { intolerance_key: 'sulfite', ingredient: 'wine', language: 'en' },
  { intolerance_key: 'sulfite', ingredient: 'frutas secas', language: 'pt' },
  { intolerance_key: 'sulfite', ingredient: 'dried fruit', language: 'en' },
  { intolerance_key: 'sulfite', ingredient: 'vinagre', language: 'pt' },
  { intolerance_key: 'sulfite', ingredient: 'vinegar', language: 'en' },
  
  // SESAME - Novos
  { intolerance_key: 'sesame', ingredient: 'gergelim', language: 'pt' },
  { intolerance_key: 'sesame', ingredient: 'sesame', language: 'en' },
  { intolerance_key: 'sesame', ingredient: 'tahine', language: 'pt' },
  { intolerance_key: 'sesame', ingredient: 'tahini', language: 'en' },
  { intolerance_key: 'sesame', ingredient: 'homus', language: 'pt' },
  { intolerance_key: 'sesame', ingredient: 'hummus', language: 'en' },
  
  // CORN - Novos
  { intolerance_key: 'corn', ingredient: 'milho', language: 'pt' },
  { intolerance_key: 'corn', ingredient: 'corn', language: 'en' },
  { intolerance_key: 'corn', ingredient: 'fubá', language: 'pt' },
  { intolerance_key: 'corn', ingredient: 'cornmeal', language: 'en' },
  { intolerance_key: 'corn', ingredient: 'amido de milho', language: 'pt' },
  { intolerance_key: 'corn', ingredient: 'corn starch', language: 'en' },
  { intolerance_key: 'corn', ingredient: 'pipoca', language: 'pt' },
  { intolerance_key: 'corn', ingredient: 'popcorn', language: 'en' }
];

// Verificar quais já existem
const { data: existing } = await supabase
  .from('intolerance_mappings')
  .select('intolerance_key, ingredient, language');

const existingKeys = new Set(
  existing?.map(m => `${m.intolerance_key}_${m.ingredient}_${m.language}`) || []
);

const toInsert = newMappings.filter(m => 
  !existingKeys.has(`${m.intolerance_key}_${m.ingredient}_${m.language}`)
);

console.log(`📊 Total de novos mapeamentos: ${toInsert.length}`);

if (toInsert.length > 0) {
  // Inserir em lotes de 100
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const { error } = await supabase
      .from('intolerance_mappings')
      .insert(batch);
    
    if (error) {
      console.log(`❌ Erro no lote ${i / batchSize + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
      console.log(`✅ Lote ${i / batchSize + 1}: ${batch.length} mapeamentos inseridos`);
    }
  }
  
  console.log(`\n✅ Total inserido: ${inserted} mapeamentos`);
} else {
  console.log('⚠️ Todos os mapeamentos já existem');
}

// Verificar total final
const { count: finalCount } = await supabase
  .from('intolerance_mappings')
  .select('*', { count: 'exact', head: true });

console.log(`\n📊 TOTAL FINAL: ${finalCount} mapeamentos de intolerâncias`);
console.log('\n✨ Expansão concluída!');
