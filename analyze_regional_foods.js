// Análise de alimentos regionais brasileiros que estão com language errada
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 ANÁLISE DE ALIMENTOS REGIONAIS BRASILEIROS\n");

// Lista de alimentos regionais brasileiros que devem ter language = 'br'
const brazilianRegionalFoods = [
  "açaí", "acarajé", "arroz carreteiro", "arroz doce", "baião de dois", 
  "beijinho", "bobó de camarão", "bolacha", "bolo de rolo", "brigadeiro", 
  "broa de milho", "cajuzinho", "canjica", "carne de sol", "caruru", 
  "castanha de baru", "cocada", "coxinha", "crepe", "croissant", 
  "curau", "cuscuz", "cuscuz de milho", "cuscuz de trigo", "doce de amendoim", 
  "doce de leite", "empada", "empadão", "escondidinho", "esfiha", "farofa", 
  "feijoada", "focaccia", "galinhada", "goiabada", "granola", "guacamole", 
  "iogurte desnatado", "iogurte grego", "iogurte natural", "jabá", "ketchup", 
  "lasanha", "leite condensado", "leite de soja", "linguiça", "maionese", 
  "maionese caseira", "maionese de soja", "manteiga", "maria mole", "mingau", 
  "mingau de fubá", "mingau de milho", "molho bechamel", "molho branco", 
  "molho de soja", "molho de tomate", "molho pesto", "molho rosé", "molho teriyaki", 
  "moqueca", "moqueca de camarão", "moqueca de peixe", "mortadela", "mostarda", 
  "muesli", "nhoque", "nougat de amendoim", "omelete", "paçoca", "paçoca de colher", 
  "pamonha", "pamonha doce", "pão de forma", "pão de mel", "pão de queijo", 
  "pão francês", "pão integral", "pastel", "pato no tucupi", "pé de moleque", 
  "pirão de peixe", "polenta", "pudim", "quiche", "quindim", "ravioli", "requeijão", 
  "risole", "romeu e julieta", "rosca", "sonho", "strogonoff", "suco de laranja", 
  "suco de uva", "suflê", "tacacá", "tahine", "tapioca", "tempeh", "tofu", 
  "tofu frito", "tofu grelhado", "torrone de amendoim", "tropeiro", "tutu", 
  "vatapá", "vinagrete", "vitamina de frutas", "waffle"
];

async function analyzeRegionalFoods() {
  try {
    console.log("📊 Buscando alimentos com language 'pt'...\n");
    
    // Buscar todos os alimentos com language 'pt'
    const { data: ptFoods, error } = await supabase
      .from('food_decomposition_mappings')
      .select('*')
      .eq('language', 'pt');
    
    if (error) {
      console.error("❌ Erro:", error);
      return;
    }
    
    console.log(`📊 Encontrados ${ptFoods.length} alimentos com language 'pt'\n`);
    
    // Identificar quais são regionais brasileiros
    const brazilianFoods = ptFoods.filter(food => 
      brazilianRegionalFoods.includes(food.food_name.toLowerCase())
    );
    
    console.log("🇧🇷 ALIMENTOS REGIONAIS BRASILEIROS COM LANGUAGE ERRADA:");
    console.log("=".repeat(60));
    
    brazilianFoods.forEach((food, index) => {
      console.log(`${index + 1}. ${food.food_name}`);
      console.log(`   Ingredientes: ${food.base_ingredients.join(', ')}`);
      console.log(`   ID: ${food.id}`);
      console.log("");
    });
    
    console.log("=".repeat(60));
    console.log(`📊 RESUMO:`);
    console.log(`   🇧🇷 Alimentos brasileiros com language 'pt': ${brazilianFoods.length}`);
    console.log(`   📝 Total alimentos com language 'pt': ${ptFoods.length}`);
    console.log(`   🔄 Precisam ser corrigidos para language 'br'`);
    
    if (brazilianFoods.length > 0) {
      console.log(`\n✅ PRÓXIMO PASSO:`);
      console.log(`   Corrigir ${brazilianFoods.length} alimentos para language 'br'`);
      console.log(`   Isso afeta as restrições dietéticas regionais`);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

analyzeRegionalFoods();
