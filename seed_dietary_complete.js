import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🥗 PASSO 1: Inserindo perfis dietéticos...\n");

// Primeiro, inserir os perfis dietéticos
const profiles = [
  { key: 'vegan', name: 'Vegano', description: 'Sem produtos de origem animal', icon: 'leaf', is_active: true, sort_order: 1 },
  { key: 'vegetarian', name: 'Vegetariano', description: 'Sem carnes', icon: 'salad', is_active: true, sort_order: 2 },
  { key: 'pescatarian', name: 'Pescetariano', description: 'Sem carnes, com peixes', icon: 'fish', is_active: true, sort_order: 3 },
  { key: 'low_carb', name: 'Low Carb', description: 'Baixo carboidrato', icon: 'beef', is_active: true, sort_order: 4 },
  { key: 'keto', name: 'Cetogênico', description: 'Muito baixo carbo', icon: 'flame', is_active: true, sort_order: 5 },
  { key: 'flexitarian', name: 'Flexitariano', description: 'Vegetariano flexível', icon: 'leaf', is_active: true, sort_order: 6 }
];

for (const profile of profiles) {
  const { error } = await supabase.from('dietary_profiles').upsert(profile, { onConflict: 'key' });
  if (error && !error.message.includes('duplicate')) {
    console.error(`  ❌ ${profile.name}:`, error.message);
  } else {
    console.log(`  ✅ ${profile.name}`);
  }
}

console.log("\n🥗 PASSO 2: Inserindo ingredientes proibidos...\n");

// VEGANO - 241 ingredientes
const veganForbidden = [
  'meat', 'beef', 'pork', 'lamb', 'veal', 'chicken', 'turkey', 'duck', 'goose', 'game meat',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'chorizo', 'prosciutto', 'pastrami',
  'carne', 'boi', 'porco', 'cordeiro', 'vitela', 'frango', 'peru', 'pato', 'ganso',
  'fish', 'salmon', 'tuna', 'cod', 'haddock', 'trout', 'sardine', 'anchovy', 'mackerel',
  'shrimp', 'prawn', 'lobster', 'crab', 'oyster', 'mussel', 'clam', 'scallop', 'squid', 'octopus',
  'peixe', 'salmão', 'atum', 'bacalhau', 'truta', 'sardinha', 'camarão', 'lagosta', 'lula', 'polvo',
  'milk', 'dairy', 'cheese', 'butter', 'cream', 'yogurt', 'ice cream', 'whey', 'casein', 'lactose',
  'cheddar', 'mozzarella', 'parmesan', 'gouda', 'brie', 'feta', 'ricotta', 'mascarpone',
  'leite', 'queijo', 'manteiga', 'creme', 'iogurte', 'sorvete', 'soro de leite', 'caseína',
  'egg', 'eggs', 'egg white', 'egg yolk', 'albumin', 'mayonnaise', 'ovo', 'ovos', 'clara', 'gema', 'maionese',
  'honey', 'beeswax', 'propolis', 'royal jelly', 'mel', 'própolis', 'geleia real',
  'gelatin', 'gelatine', 'collagen', 'rennet', 'lard', 'tallow', 'gelatina', 'colágeno', 'banha',
  'aged cheese', 'albumen powder', 'albumin', 'anchovy paste', 'anhydrous milk fat', 'animal albumin',
  'animal fat', 'animal protein', 'beef broth', 'beef fat', 'beef stock', 'bone char', 'bone meal',
  'butterfat', 'buttermilk powder', 'calcium caseinate', 'carmine', 'caseinate', 'caviar',
  'cheese powder', 'chicken broth', 'chicken fat', 'chicken stock', 'chitosan', 'cholesterol',
  'clarified butter', 'clotted cream', 'cochineal', 'cod liver oil', 'collagen hydrolysate',
  'condensed milk', 'cream powder', 'curd', 'dairy butter', 'dairy solids', 'dried egg',
  'dried milk', 'duck fat', 'egg lecithin', 'egg powder', 'egg protein', 'egg solids',
  'evaporated milk', 'fish oil', 'fish sauce', 'ghee', 'goat cheese', 'goat milk', 'goose fat',
  'half and half', 'heavy cream', 'hydrolyzed collagen', 'kefir', 'keratin', 'lactic acid',
  'lactoglobulin', 'lactoferrin', 'lanolin', 'liver', 'meat extract', 'milk chocolate',
  'milk fat', 'milk powder', 'milk protein', 'milk solids', 'nonfat dry milk', 'nonfat milk',
  'oyster sauce', 'pancreatin', 'pepsin', 'pork fat', 'poultry fat', 'powdered milk',
  'roe', 'sheep cheese', 'shellac', 'skim milk', 'sodium caseinate', 'sour cream',
  'stearic acid', 'suet', 'vitamin D3', 'whey powder', 'whey protein', 'whole milk',
  'worcestershire sauce', 'presunto', 'salsicha', 'linguiça', 'mortadela', 'coalho',
  'caranguejo', 'ostra', 'mexilhão', 'requeijão', 'parmesão', 'mussarela', 'ricota',
  'albumina', 'caldo de carne', 'caldo de frango', 'molho de peixe', 'sebo'
];

// VEGETARIANO - 79 ingredientes
const vegetarianForbidden = [
  'meat', 'beef', 'pork', 'lamb', 'veal', 'chicken', 'turkey', 'duck', 'goose', 'game meat',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'chorizo', 'prosciutto',
  'carne', 'boi', 'porco', 'cordeiro', 'vitela', 'frango', 'peru', 'pato', 'ganso',
  'fish', 'salmon', 'tuna', 'cod', 'trout', 'sardine', 'anchovy', 'mackerel',
  'shrimp', 'prawn', 'lobster', 'crab', 'oyster', 'mussel', 'clam', 'squid', 'octopus',
  'peixe', 'salmão', 'atum', 'bacalhau', 'truta', 'sardinha', 'camarão', 'lagosta', 'lula', 'polvo',
  'gelatin', 'gelatine', 'isinglass', 'rennet', 'gelatina', 'coalho',
  'beef broth', 'beef stock', 'chicken broth', 'chicken stock', 'fish sauce', 'oyster sauce',
  'anchovy paste', 'worcestershire sauce', 'caldo de carne', 'caldo de frango', 'molho de peixe',
  'presunto', 'salsicha', 'linguiça', 'mortadela', 'caranguejo', 'ostra', 'mexilhão'
];

// PESCETARIANO - 34 ingredientes
const pescatarianForbidden = [
  'meat', 'beef', 'pork', 'lamb', 'veal', 'chicken', 'turkey', 'duck', 'goose',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'chorizo',
  'carne', 'boi', 'porco', 'cordeiro', 'vitela', 'frango', 'peru', 'pato',
  'beef broth', 'beef stock', 'chicken broth', 'chicken stock',
  'caldo de carne', 'caldo de frango', 'presunto', 'salsicha', 'linguiça', 'mortadela'
];

async function insertForbiddenIngredients(dietaryKey, ingredients) {
  console.log(`📋 Inserindo ${ingredients.length} ingredientes para ${dietaryKey.toUpperCase()}...`);
  
  let inserted = 0;
  const batchSize = 50;
  
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize).map(ing => ({
      dietary_key: dietaryKey,
      ingredient: ing,
      language: 'en'
    }));
    
    const { error } = await supabase
      .from('dietary_forbidden_ingredients')
      .upsert(batch, { onConflict: 'dietary_key,ingredient,language', ignoreDuplicates: true });
    
    if (!error || error.message.includes('duplicate')) {
      inserted += batch.length;
    } else {
      console.error(`  ⚠️ Erro:`, error.message.substring(0, 100));
    }
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`  ✅ ${inserted} ingredientes inseridos\n`);
  return inserted;
}

let total = 0;
total += await insertForbiddenIngredients('vegan', veganForbidden);
total += await insertForbiddenIngredients('vegetarian', vegetarianForbidden);
total += await insertForbiddenIngredients('pescatarian', pescatarianForbidden);

console.log(`\n🎉 CONCLUÍDO! ${total} ingredientes proibidos inseridos no total.\n`);
console.log("📋 Próximo passo: Acesse Admin → Proibidos por Dieta e verifique se aparecem os dados.");
