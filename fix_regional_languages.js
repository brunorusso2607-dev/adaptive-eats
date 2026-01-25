// Corrigir alimentos regionais brasileiros de 'pt' para 'br'
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔧 CORRIGINDO ALIMENTOS REGIONAIS BRASILEIROS\n");

// Lista completa de alimentos brasileiros que devem ter language = 'br'
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

async function fixRegionalLanguages() {
  try {
    console.log("📊 Buscando alimentos brasileiros com language 'pt'...\n");
    
    // Buscar todos os alimentos com language 'pt'
    const { data: ptFoods, error } = await supabase
      .from('food_decomposition_mappings')
      .select('*')
      .eq('language', 'pt');
    
    if (error) {
      console.error("❌ Erro:", error);
      return;
    }
    
    // Filtrar apenas os brasileiros
    const brazilianFoods = ptFoods.filter(food => 
      brazilianRegionalFoods.includes(food.food_name.toLowerCase())
    );
    
    console.log(`🇧🇷 Encontrados ${brazilianFoods.length} alimentos brasileiros para corrigir\n`);
    
    // Atualizar em lotes
    const batchSize = 20;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    for (let i = 0; i < brazilianFoods.length; i += batchSize) {
      const batch = brazilianFoods.slice(i, i + batchSize);
      
      for (const food of batch) {
        const { error } = await supabase
          .from('food_decomposition_mappings')
          .update({ language: 'br' })
          .eq('id', food.id);
        
        if (error) {
          console.error(`❌ Erro ao atualizar ${food.food_name}: ${error.message}`);
          totalErrors++;
        } else {
          console.log(`✅ ${food.food_name} atualizado para 'br'`);
          totalUpdated++;
        }
      }
    }
    
    // Verificação final
    console.log("\n📊 Verificação final...\n");
    
    const { count: ptCount } = await supabase
      .from('food_decomposition_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'pt');
    
    const { count: brCount } = await supabase
      .from('food_decomposition_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'br');
    
    const { count: enCount } = await supabase
      .from('food_decomposition_mappings')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'en');
    
    console.log("=".repeat(60));
    console.log("🎉 CORREÇÃO CONCLUÍDA!");
    console.log("=".repeat(60));
    console.log(`\n📊 RESULTADO:`);
    console.log(`  ✅ Atualizados: ${totalUpdated}`);
    console.log(`  ❌ Erros: ${totalErrors}`);
    
    console.log(`\n📊 DISTRIBUIÇÃO ATUAL:`);
    console.log(`  🇺🇸 Inglês (en): ${enCount}`);
    console.log(`  🇧🇷 Brasil (br): ${brCount}`);
    console.log(`  🇵🇹 Portugal (pt): ${ptCount}`);
    
    console.log(`\n✅ IMPACTO:`);
    console.log(`  🇧🇷 Alimentos brasileiros agora com language 'br'`);
    console.log(`  🍽️ Restrições dietéticas regionais corrigidas`);
    console.log(`  📱 Painel admin mostrará distribuição correta`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixRegionalLanguages();
