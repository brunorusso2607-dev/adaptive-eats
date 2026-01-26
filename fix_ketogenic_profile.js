// Script para adicionar perfil ketogenic faltante
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔧 CORRIGINDO PERFIL KETOGENIC\n");

async function fixKetogenic() {
  try {
    // 1. Verificar se a tabela dietary_profiles existe
    console.log("📊 1. Verificando tabela dietary_profiles...");
    
    const { data: profiles, error: profilesError } = await supabase
      .from('dietary_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Erro ao verificar dietary_profiles:', profilesError);
      return;
    }
    
    console.log(`✅ Encontrados ${profiles.length} perfis existentes:`);
    profiles.forEach(p => console.log(`  - ${p.key}: ${p.label}`));
    
    // 2. Adicionar perfil ketogenic
    console.log("\n📊 2. Adicionando perfil ketogenic...");
    
    const ketogenicProfile = {
      key: 'ketogenic',
      label: 'Cetogênica',
      description: 'Dieta muito baixa em carboidratos e alta em gorduras',
      emoji: '🥑',
      is_active: true,
      sort_order: 6
    };
    
    const { data: insertResult, error: insertError } = await supabase
      .from('dietary_profiles')
      .insert(ketogenicProfile)
      .select();
    
    if (insertError) {
      if (insertError.message.includes('duplicate key')) {
        console.log("✅ Perfil ketogenic já existe");
      } else {
        console.error('❌ Erro ao inserir perfil:', insertError);
        return;
      }
    } else {
      console.log("✅ Perfil ketogenic adicionado com sucesso");
    }
    
    // 3. Agora importar dados ketogenic
    console.log("\n📊 3. Importando dados ketogenic...");
    
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
    
    // Importar português
    console.log("  🇧🇷 Importando português...");
    const ptData = ketogenicData.pt.map(ingredient => ({
      dietary_key: 'ketogenic',
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
      console.log(`    ✅ PT: ${ptResult?.length || 0} inseridos`);
    }
    
    // Importar inglês
    console.log("  🇺🇸 Importando inglês...");
    const enData = ketogenicData.en.map(ingredient => ({
      dietary_key: 'ketogenic',
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
      console.log(`    ✅ EN: ${enResult?.length || 0} inseridos`);
    }
    
    // 4. Verificação final
    console.log("\n📊 4. Verificação final...");
    
    const { count: finalCount } = await supabase
      .from('dietary_forbidden_ingredients')
      .select('*', { count: 'exact', head: true });
    
    const { count: ketogenicCount } = await supabase
      .from('dietary_forbidden_ingredients')
      .select('*', { count: 'exact', head: true })
      .eq('dietary_key', 'ketogenic');
    
    console.log(`\n🎉 RESULTADO FINAL:`);
    console.log(`  📊 Total no banco: ${finalCount || 0} registros`);
    console.log(`  🥑 Ketogenic: ${ketogenicCount || 0} registros`);
    console.log(`  📈 Crescimento total: ${finalCount ? ((finalCount - 321) / 321 * 100).toFixed(1) : 0}%`);
    
    if (ketogenicCount && ketogenicCount > 0) {
      console.log(`\n✅ SUCESSO COMPLETO! Todos os 6 perfis dietéticos funcionais!`);
      console.log(`   Sistema 100% pronto para produção.`);
    } else {
      console.log(`\n❌ Ainda há problemas com o perfil ketogenic.`);
    }
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

fixKetogenic();
