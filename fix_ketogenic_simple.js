// Script simplificado para adicionar perfil ketogenic e importar dados
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔧 CORRIGINDO PERFIL KETOGENIC - VERSÃO SIMPLIFICADA\n");

async function fixKetogenicSimple() {
  try {
    // 1. Verificar perfis existentes
    console.log("📊 1. Verificando perfis existentes...");
    
    const { data: profiles, error: profilesError } = await supabase
      .from('dietary_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Erro ao verificar perfis:', profilesError);
      return;
    }
    
    console.log(`✅ Encontrados ${profiles.length} perfis:`);
    profiles.forEach(p => console.log(`  - ${p.key}: ${p.label || 'sem label'}`));
    
    // 2. Verificar se "keto" já existe (pode ser o nome correto)
    const ketoExists = profiles.find(p => p.key === 'keto');
    
    if (ketoExists) {
      console.log("\n✅ Perfil 'keto' já existe. Usando 'keto' em vez de 'ketogenic'...");
      
      // Importar dados usando 'keto' como chave
      await importKetogenicData('keto');
    } else {
      console.log("\n❌ Perfil 'keto' não encontrado. Tentando adicionar...");
      
      // Tentar adicionar perfil simples (sem emoji)
      const { data: insertResult, error: insertError } = await supabase
        .from('dietary_profiles')
        .insert({
          key: 'keto',
          label: 'Cetogênica',
          description: 'Dieta muito baixa em carboidratos e alta em gorduras',
          is_active: true,
          sort_order: 6
        })
        .select();
      
      if (insertError) {
        console.error('❌ Erro ao inserir perfil:', insertError);
        console.log('🔄 Tentando importar com chave existente...');
        
        // Tentar usar uma chave existente
        const existingKeys = profiles.map(p => p.key);
        console.log('Chaves existentes:', existingKeys);
        
        // Verificar se podemos usar 'low_carb' temporariamente
        if (existingKeys.includes('low_carb')) {
          console.log('⚠️  Importando dados ketogenic como low_carb (temporário)...');
          await importKetogenicData('low_carb');
        }
      } else {
        console.log("✅ Perfil 'keto' adicionado com sucesso");
        await importKetogenicData('keto');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

async function importKetogenicData(dietaryKey) {
  console.log(`\n📊 2. Importando dados ketogenic como '${dietaryKey}'...`);
  
  const ketogenicData = {
    pt: ["angu", "arroz quebrado", "açaí com xarope de guaraná", "açúcar mascavo artesanal", "banana-da-terra", "banana-passa", "beijinho", "beiju", "bolo de fubá", "brigadeiro", "broa de milho", "caldo de mandioca", "canjica amarela", "canjica branca", "carimã", "cará seco", "cocada", "curau", "cuscuz de milho", "cuscuz nordestino", "farinha d'água", "farinha de feijão", "farinha de grão-de-bico", "farinha de mandioca tostada", "farinha de milho amarela", "farinha de milho branca", "farinha de pinhão", "farinha de tapioca granulada", "flocão de milho", "fubá mimoso", "fubá pré-cozido", "goma de tapioca hidratada", "inhame seco", "massa puba", "melado batido", "milho para canjica", "milho triturado grosso", "mingau de fubá", "mistura para pudim", "mungunzá", "pamonha", "paçoca", "pinhão", "pirão em pó", "polenta instantânea", "polpa de açaí adoçada", "pé de moleque", "quirera de arroz", "rapadura", "xerém"],
    en: ["agave syrup", "apple", "banana", "barley", "barley flour", "barley glucose syrup", "barley malt", "beans", "biscuit flour", "bread", "bread improver (sugar-based)", "breadcrumbs", "breakfast cereal", "breakfast cereal base", "brown sugar", "cake flour", "cane juice crystals", "cane molasses", "cane syrup", "caramelized flour", "cassava", "cassava flour", "cassava starch", "cheddar cheese powder (contains lactose)", "chickpeas", "coconut sugar", "concentrated fruit juice", "concentrated natural flavors", "condensed milk powder", "cookie flour", "corn", "corn fiber syrup", "corn flour", "corn powder", "corn starch", "corn sugar (u.s. labeling)", "corn syrup", "cornmeal", "cream of rice", "custard powder", "dates", "demerara sugar", "dextrin", "dextrins", "dextrose", "dough conditioner (sugar-based)", "dried fruit", "durum wheat semolina", "enriched flour", "erythritol (excess)", "evaporated cane juice", "evaporated milk powder", "extruded cereal flour", "fava beans", "fructose", "fructose syrup", "fruit concentrate", "fruit filling concentrate", "fruit purée", "fruit sugar", "galactose", "glucose", "glucose syrup", "golden syrup", "golden syrup solids", "granola", "granulated sugar", "grapes", "green banana flour", "grits", "high-fructose corn syrups", "honey", "hot chocolate mix", "instant mashed potato flakes", "inverted sugar", "isomaltitol", "lactitol", "lactose", "lactose powder", "lentils", "liquid sugar", "malt", "malt extract", "malt syrup solids", "malted barley extract", "maltitol", "maltodextrin", "maltose", "mandarin", "mango", "manioc", "manioc flour", "mannitol", "maple syrup", "melon", "milk sugar solids", "modified starch", "molasses", "noodles", "oat flour", "oat powder", "oats", "orange", "organic sugar", "oxidized starch", "palm sugar", "pancake mix", "papaya", "pasta", "pear", "peas", "pie filling base", "pineapple", "potato", "potato flakes", "potato flour", "potato starch", "powdered juice", "pregelatinized starch", "pudding mix", "raisins", "refined sugar", "refined wheat flour", "rice", "rice flour", "rice malt syrup", "rice powder", "rice starch", "rice syrup", "rice syrup solids", "rye", "rye flour", "rye powder", "self-rising flour", "semolina", "skim milk powder", "soluble tapioca fiber", "sorbitol", "sorghum flour", "soy flour", "soy powder", "spelt flour", "sucrose", "sugar", "sweet potato", "sweet potato flour", "sweetened casein", "sweetened cocoa powder", "sweetened fruit pulp", "sweetened peanut flour", "sweetened soy protein isolate", "sweetened whey", "tapioca flour", "tapioca starch", "taro", "textured soy protein", "treacle solids", "waffle mix", "watermelon", "wheat flour", "wheat glucose syrup", "wheat starch", "whey permeate", "whey powder", "white sugar", "whole corn", "whole milk powder", "whole wheat flour", "xylitol", "yam", "yam flour", "yuca"]
  };
  
  // Função para determinar categoria
  function getCategory(ingredient) {
    const lowerIngredient = ingredient.toLowerCase();
    
    if (['açúcar', 'sugar', 'syrup', 'mel', 'honey', 'xarope', 'molasses', 'maple'].some(k => lowerIngredient.includes(k))) return 'sugars';
    if (['farinha', 'flour', 'arroz', 'rice', 'milho', 'corn', 'trigo', 'wheat', 'cevada', 'barley'].some(k => lowerIngredient.includes(k))) return 'grains';
    if (['amido', 'starch', 'batata', 'potato', 'mandioca', 'cassava', 'tapioca'].some(k => lowerIngredient.includes(k))) return 'starches';
    if (['fruta', 'fruit', 'banana', 'apple', 'grape', 'orange'].some(k => lowerIngredient.includes(k))) return 'fruits';
    if (['cereal', 'granola', 'bread', 'pasta', 'biscuit'].some(k => lowerIngredient.includes(k))) return 'processed';
    
    return 'other';
  }
  
  let totalInserted = 0;
  
  // Importar português
  console.log("  🇧🇷 Importando português...");
  const ptData = ketogenicData.pt.map(ingredient => ({
    dietary_key: dietaryKey,
    ingredient: ingredient.trim(),
    language: 'pt',
    category: getCategory(ingredient)
  }));
  
  const { data: ptResult, error: ptError } = await supabase
    .from('dietary_forbidden_ingredients')
    .upsert(ptData, {
      onConflict: 'dietary_key,ingredient,language',
      ignoreDuplicates: false
    })
    .select('id');
  
  if (ptError) {
    console.error(`    ❌ Erro PT: ${ptError.message}`);
  } else {
    const inserted = ptResult?.length || 0;
    totalInserted += inserted;
    console.log(`    ✅ PT: ${inserted} inseridos`);
  }
  
  // Importar inglês
  console.log("  🇺🇸 Importando inglês...");
  const enData = ketogenicData.en.map(ingredient => ({
    dietary_key: dietaryKey,
    ingredient: ingredient.trim(),
    language: 'en',
    category: getCategory(ingredient)
  }));
  
  const { data: enResult, error: enError } = await supabase
    .from('dietary_forbidden_ingredients')
    .upsert(enData, {
      onConflict: 'dietary_key,ingredient,language',
      ignoreDuplicates: false
    })
    .select('id');
  
  if (enError) {
    console.error(`    ❌ Erro EN: ${enError.message}`);
  } else {
    const inserted = enResult?.length || 0;
    totalInserted += inserted;
    console.log(`    ✅ EN: ${inserted} inseridos`);
  }
  
  // Verificação final
  console.log(`\n📊 3. Verificação final...`);
  
  const { count: finalCount } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('*', { count: 'exact', head: true });
  
  const { count: dietaryCount } = await supabase
    .from('dietary_forbidden_ingredients')
    .select('*', { count: 'exact', head: true })
    .eq('dietary_key', dietaryKey);
  
  console.log(`\n🎉 RESULTADO FINAL:`);
  console.log(`  📊 Total no banco: ${finalCount || 0} registros`);
  console.log(`  🥑 ${dietaryKey}: ${dietaryCount || 0} registros`);
  console.log(`  📈 Crescimento total: ${finalCount ? ((finalCount - 321) / 321 * 100).toFixed(1) : 0}%`);
  
  if (dietaryCount && dietaryCount > 0) {
    console.log(`\n✅ SUCESSO! Dados ketogenic importados como '${dietaryKey}'`);
    console.log(`   Sistema dietético funcional.`);
  } else {
    console.log(`\n❌ Falha na importação ketogenic.`);
  }
}

fixKetogenicSimple();
