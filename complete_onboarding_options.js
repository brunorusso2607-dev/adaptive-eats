import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("📋 Completando opções de onboarding...\n");

const options = [
  // INTOLERÂNCIAS que estão faltando
  { category: 'intolerances', option_id: 'eggs', label: 'Ovos', description: 'Alergia a ovos', emoji: '🥚', icon_name: 'egg', is_active: true, sort_order: 4 },
  { category: 'intolerances', option_id: 'soy', label: 'Soja', description: 'Alergia a soja', emoji: '🫘', icon_name: 'bean', is_active: true, sort_order: 5 },
  { category: 'intolerances', option_id: 'fructose', label: 'Frutose', description: 'Má absorção de frutose', emoji: '🍎', icon_name: 'apple', is_active: true, sort_order: 6 },
  { category: 'intolerances', option_id: 'histamine', label: 'Histamina', description: 'Intolerância à histamina', emoji: '🧪', icon_name: 'flask', is_active: true, sort_order: 7 },
  
  // ALERGIAS que estão faltando
  { category: 'allergies', option_id: 'fish', label: 'Peixe', description: 'Alergia a peixes', emoji: '🐟', icon_name: 'fish', is_active: true, sort_order: 5 },
  { category: 'allergies', option_id: 'shellfish', label: 'Frutos do mar', description: 'Crustáceos e moluscos', emoji: '🦐', icon_name: 'fish', is_active: true, sort_order: 6 },
  { category: 'allergies', option_id: 'tree_nuts', label: 'Oleaginosas', description: 'Castanhas e nozes', emoji: '🌰', icon_name: 'acorn', is_active: true, sort_order: 7 },
  { category: 'allergies', option_id: 'milk', label: 'Leite', description: 'Proteína do leite', emoji: '🥛', icon_name: 'milk', is_active: true, sort_order: 8 },
  
  // SENSIBILIDADES
  { category: 'sensitivities', option_id: 'sulfite', label: 'Sulfitos', description: 'Conservantes em alimentos', emoji: '🍇', icon_name: 'grape', is_active: true, sort_order: 7 },
  { category: 'sensitivities', option_id: 'salicylate', label: 'Salicilatos', description: 'Compostos em frutas e vegetais', emoji: '🥗', icon_name: 'salad', is_active: true, sort_order: 8 },
];

let inserted = 0;
let errors = 0;

for (const opt of options) {
  const { error } = await supabase
    .from('onboarding_options')
    .insert(opt);
  
  if (error) {
    if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
      console.error(`❌ ${opt.label}:`, error.message.substring(0, 80));
      errors++;
    } else {
      console.log(`⚠️ ${opt.label} (já existe)`);
    }
  } else {
    console.log(`✅ ${opt.label}`);
    inserted++;
  }
}

console.log(`\n📊 Resumo:`);
console.log(`  - ${inserted} opções adicionadas`);
console.log(`  - ${errors} erros`);
console.log(`\nAgora execute novamente: node execute_intolerance_seed.js`);
