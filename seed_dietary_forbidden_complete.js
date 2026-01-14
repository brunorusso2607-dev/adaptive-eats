import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🥗 Populando ingredientes proibidos por dieta...\n");

// VEGANO - Ingredientes de origem animal (baseado na Foto 2 do Lovable)
const veganForbidden = [
  // Carnes e derivados
  'meat', 'beef', 'pork', 'lamb', 'veal', 'chicken', 'turkey', 'duck', 'goose', 'game meat',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'chorizo', 'prosciutto', 'pastrami',
  'carne', 'boi', 'porco', 'cordeiro', 'vitela', 'frango', 'peru', 'pato', 'ganso',
  'bacon', 'presunto', 'salsicha', 'linguiça', 'mortadela', 'salame', 'calabresa',
  
  // Peixes e frutos do mar
  'fish', 'salmon', 'tuna', 'cod', 'haddock', 'trout', 'sardine', 'anchovy', 'mackerel',
  'shrimp', 'prawn', 'lobster', 'crab', 'oyster', 'mussel', 'clam', 'scallop', 'squid', 'octopus',
  'peixe', 'salmão', 'atum', 'bacalhau', 'truta', 'sardinha', 'anchova', 'cavala',
  'camarão', 'lagosta', 'caranguejo', 'ostra', 'mexilhão', 'lula', 'polvo',
  
  // Laticínios
  'milk', 'dairy', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'ice cream',
  'whey', 'casein', 'lactose', 'buttermilk', 'sour cream', 'cottage cheese', 'cream cheese',
  'cheddar', 'mozzarella', 'parmesan', 'gouda', 'brie', 'feta', 'ricotta', 'mascarpone',
  'leite', 'laticínio', 'queijo', 'manteiga', 'creme', 'nata', 'iogurte', 'sorvete',
  'soro de leite', 'caseína', 'lactose', 'leitelho', 'requeijão', 'cream cheese',
  'cheddar', 'mussarela', 'parmesão', 'gouda', 'brie', 'feta', 'ricota', 'mascarpone',
  
  // Ovos
  'egg', 'eggs', 'egg white', 'egg yolk', 'albumin', 'mayonnaise',
  'ovo', 'ovos', 'clara', 'gema', 'albumina', 'maionese',
  
  // Mel e produtos de abelha
  'honey', 'beeswax', 'propolis', 'royal jelly', 'bee pollen',
  'mel', 'cera de abelha', 'própolis', 'geleia real', 'pólen',
  
  // Gelatina e derivados animais
  'gelatin', 'gelatine', 'collagen', 'isinglass', 'rennet', 'lard', 'tallow', 'suet',
  'gelatina', 'colágeno', 'coalho', 'banha', 'sebo',
  
  // Ingredientes específicos de origem animal (da Foto 2)
  'aged cheese', 'albumen powder', 'albumin', 'anchovy', 'anchovy paste',
  'anhydrous milk fat', 'animal albumin', 'animal fat', 'animal protein',
  'beef broth', 'beef fat', 'beef stock', 'bone char', 'bone meal',
  'butterfat', 'buttermilk powder', 'calcium caseinate', 'capric acid',
  'carmine', 'casein', 'caseinate', 'caviar', 'cheese powder',
  'chicken broth', 'chicken fat', 'chicken stock', 'chitosan',
  'cholesterol', 'clarified butter', 'clotted cream', 'cochineal',
  'cod liver oil', 'collagen hydrolysate', 'condensed milk',
  'cream powder', 'curd', 'dairy butter', 'dairy solids',
  'dried egg', 'dried milk', 'duck fat', 'egg lecithin',
  'egg powder', 'egg protein', 'egg solids', 'evaporated milk',
  'fish oil', 'fish sauce', 'ghee', 'goat cheese', 'goat milk',
  'goose fat', 'half and half', 'heavy cream', 'hydrolyzed collagen',
  'kefir', 'keratin', 'lactic acid', 'lactoglobulin', 'lactoferrin',
  'lactose', 'lanolin', 'lard', 'liver', 'meat extract',
  'milk chocolate', 'milk fat', 'milk powder', 'milk protein',
  'milk solids', 'nonfat dry milk', 'nonfat milk', 'oyster sauce',
  'pancreatin', 'pepsin', 'pork fat', 'poultry fat',
  'powdered milk', 'rennet', 'roe', 'sheep cheese', 'shellac',
  'skim milk', 'sodium caseinate', 'sour cream', 'stearic acid',
  'suet', 'tallow', 'vitamin D3', 'whey powder', 'whey protein',
  'whole milk', 'worcestershire sauce'
];

// VEGETARIANO - Carnes e peixes (sem laticínios e ovos)
const vegetarianForbidden = [
  // Todas as carnes
  'meat', 'beef', 'pork', 'lamb', 'veal', 'chicken', 'turkey', 'duck', 'goose', 'game meat',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'chorizo', 'prosciutto',
  'carne', 'boi', 'porco', 'cordeiro', 'vitela', 'frango', 'peru', 'pato', 'ganso',
  'bacon', 'presunto', 'salsicha', 'linguiça', 'mortadela', 'salame',
  
  // Todos os peixes e frutos do mar
  'fish', 'salmon', 'tuna', 'cod', 'trout', 'sardine', 'anchovy',
  'shrimp', 'prawn', 'lobster', 'crab', 'oyster', 'mussel', 'clam', 'squid', 'octopus',
  'peixe', 'salmão', 'atum', 'bacalhau', 'truta', 'sardinha',
  'camarão', 'lagosta', 'caranguejo', 'ostra', 'mexilhão', 'lula', 'polvo',
  
  // Gelatina (origem animal)
  'gelatin', 'gelatine', 'isinglass', 'rennet',
  'gelatina', 'coalho',
  
  // Caldos e extratos de carne/peixe
  'beef broth', 'beef stock', 'chicken broth', 'chicken stock',
  'fish sauce', 'oyster sauce', 'anchovy paste', 'worcestershire sauce',
  'caldo de carne', 'caldo de frango', 'caldo de peixe', 'molho de peixe'
];

// PESCETARIANO - Carnes (sem peixes)
const pescatarianForbidden = [
  'meat', 'beef', 'pork', 'lamb', 'veal', 'chicken', 'turkey', 'duck', 'goose',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'chorizo',
  'carne', 'boi', 'porco', 'cordeiro', 'vitela', 'frango', 'peru', 'pato',
  'bacon', 'presunto', 'salsicha', 'linguiça', 'mortadela',
  'beef broth', 'beef stock', 'chicken broth', 'chicken stock',
  'caldo de carne', 'caldo de frango'
];

async function insertForbiddenIngredients(profile, ingredients, language = 'en') {
  console.log(`\n📋 Inserindo ${ingredients.length} ingredientes para ${profile.toUpperCase()} (${language})...`);
  
  let inserted = 0;
  let skipped = 0;
  
  const batchSize = 50;
  for (let i = 0; i < ingredients.length; i += batchSize) {
    const batch = ingredients.slice(i, i + batchSize).map(ing => ({
      dietary_key: profile,
      ingredient: ing,
      language: language
    }));
    
    const { error } = await supabase
      .from('dietary_forbidden_ingredients')
      .upsert(batch, { onConflict: 'dietary_key,ingredient,language', ignoreDuplicates: true });
    
    if (!error || error.message.includes('duplicate')) {
      inserted += batch.length;
    } else {
      console.error(`  ⚠️ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error.message.substring(0, 100));
      skipped += batch.length;
    }
    
    // Pequeno delay para não sobrecarregar
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`  ✅ ${inserted} ingredientes inseridos, ${skipped} pulados`);
  return inserted;
}

async function run() {
  let totalInserted = 0;
  
  // Vegano
  totalInserted += await insertForbiddenIngredients('vegan', veganForbidden, 'en');
  
  // Vegetariano
  totalInserted += await insertForbiddenIngredients('vegetarian', vegetarianForbidden, 'en');
  
  // Pescetariano
  totalInserted += await insertForbiddenIngredients('pescatarian', pescatarianForbidden, 'en');
  
  console.log(`\n🎉 CONCLUÍDO! Total de ${totalInserted} ingredientes proibidos inseridos.\n`);
  console.log("📋 Próximo passo: Acesse Admin → Proibidos por Dieta e verifique se aparecem os dados.");
}

run().catch(err => {
  console.error("❌ Erro:", err);
  process.exit(1);
});
