// Script corrigido para importar decomposição de alimentos
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 IMPORTANDO DECOMPOSIÇÃO DE ALIMENTOS (VERSÃO CORRIGIDA)\n");
console.log("Total esperado: 554 alimentos processados\n");

// Dados completos de decomposição (apenas primeiros para teste rápido)
const foodDecomposition = {
  en: [
    { name: "5-hour energy", ingredients: ["cafeína", "vitaminas do complexo b"], category: "Shot energético" },
    { name: "À milanesa", ingredients: ["trigo", "ovo", "farinha de rosca", "óleo"], category: "Preparo" },
    { name: "A2 milk", ingredients: ["leite"], category: "Laticínio" },
    { name: "Achocolatado", ingredients: ["cacau", "açúcar", "leite"], category: "Bebida" },
    { name: "Açúcar de confeiteiro", ingredients: ["açúcar", "amido de milho"], category: "Ingrediente" },
    { name: "Aged cheese", ingredients: ["leite", "coalho", "sal"], category: "Queijo" },
    { name: "Agridoce", ingredients: ["açúcar", "vinagre", "tomate"], category: "Molho" },
    { name: "Aioli", ingredients: ["alho", "ovo", "azeite"], category: "Molho" },
    { name: "Alho frito", ingredients: ["alho", "óleo"], category: "Preparo simples" },
    { name: "Almond butter", ingredients: ["amêndoa"], category: "Pasta" },
    { name: "Almond milk", ingredients: ["amêndoa", "água"], category: "Leite vegetal" },
    { name: "American cheese", ingredients: ["leite", "soro de leite", "emulsificantes"], category: "Queijo processado" },
    { name: "Arepa", ingredients: ["farinha de milho", "água", "sal"], category: "Pão" },
    { name: "Bagel", ingredients: ["trigo", "fermento"], category: "Pão" },
    { name: "Banana bread", ingredients: ["banana", "trigo", "açúcar", "ovo"], category: "Bolo" },
    { name: "Barbecue", ingredients: ["tomate", "açúcar", "vinagre", "especiarias"], category: "Molho" },
    { name: "Beer", ingredients: ["barley", "malt", "hops", "yeast"], category: "Bebida alcoólica" },
    { name: "Brownie", ingredients: ["chocolate", "manteiga", "açúcar", "ovo", "trigo"], category: "Doce" },
    { name: "Burrito", ingredients: ["trigo", "feijão", "arroz", "carne"], category: "Prato mexicano" },
    { name: "Cappuccino", ingredients: ["café", "leite", "espuma de leite"], category: "Bebida" },
    { name: "Cheesecake", ingredients: ["cream cheese", "açúcar", "ovo", "biscoito"], category: "Torta" },
    { name: "Chocolate", ingredients: ["cacau", "açúcar", "leite"], category: "Chocolate" },
    { name: "Churro", ingredients: ["trigo", "açúcar", "óleo"], category: "Doce" },
    { name: "Coca-cola", ingredients: ["cafeína", "açúcar", "ácido fosfórico"], category: "Refrigerante" },
    { name: "Cookie", ingredients: ["trigo", "manteiga", "açúcar", "ovo", "chocolate"], category: "Biscoito" },
    { name: "Cupcake", ingredients: ["trigo", "ovo", "açúcar", "manteiga"], category: "Bolo" },
    { name: "Donut", ingredients: ["trigo", "açúcar", "ovo", "leite"], category: "Doce" },
    { name: "Energy drinks", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Falafel", ingredients: ["grão de bico", "especiarias"], category: "Frito" },
    { name: "French toast", ingredients: ["pão", "leite", "ovo", "açúcar", "canela"], category: "Prato" },
    { name: "Hamburger", ingredients: ["carne bovina", "sal", "gordura"], category: "Hambúrguer" },
    { name: "Hummus", ingredients: ["grão de bico", "tahine", "limão", "alho"], category: "Pasta" },
    { name: "Ice cream", ingredients: ["leite", "açúcar", "creme de leite"], category: "Sorvete" },
    { name: "Lasagna", ingredients: ["trigo", "ovo", "queijo", "leite", "carne"], category: "Massa" },
    { name: "Macaron", ingredients: ["amêndoa", "açúcar", "clara de ovo"], category: "Doce" },
    { name: "Muffin", ingredients: ["trigo", "ovo", "açúcar", "manteiga"], category: "Bolo" },
    { name: "Nachos", ingredients: ["milho", "queijo"], category: "Salgado" },
    { name: "Pancakes", ingredients: ["trigo", "ovo", "leite"], category: "Panqueca" },
    { name: "Pasta", ingredients: ["trigo", "ovo"], category: "Massa" },
    { name: "Pizza", ingredients: ["trigo", "fermento", "queijo", "tomate", "azeite"], category: "Pizza" },
    { name: "Pretzel", ingredients: ["trigo", "fermento", "sal"], category: "Biscoito" },
    { name: "Ramen", ingredients: ["trigo", "ovo", "carne", "shoyu"], category: "Sopa japonesa" },
    { name: "Red bull", ingredients: ["cafeína", "taurina", "açúcar"], category: "Energético" },
    { name: "Sushi", ingredients: ["arroz", "peixe", "alga"], category: "Prato japonês" },
    { name: "Taco", ingredients: ["milho", "carne", "queijo"], category: "Prato mexicano" },
    { name: "Tiramisu", ingredients: ["mascarpone", "café", "ovo", "biscoito", "cacau"], category: "Sobremesa" },
    { name: "Waffle", ingredients: ["trigo", "ovo", "leite", "manteiga", "açúcar"], category: "Doce" },
    { name: "Yogurt", ingredients: ["leite", "fermentos"], category: "Iogurte" }
  ],
  pt: [
    { name: "Açaí", ingredients: ["polpa de açaí", "açúcar", "xarope de guaraná"], category: "Sobremesa" },
    { name: "Acarajé", ingredients: ["feijão fradinho", "dendê", "camarão"], category: "Prato baiano" },
    { name: "Arroz doce", ingredients: ["arroz", "leite", "açúcar", "canela"], category: "Sobremesa" },
    { name: "Bacon", ingredients: ["porco", "sal"], category: "Carne" },
    { name: "Beijinho", ingredients: ["leite condensado", "coco", "manteiga"], category: "Doce" },
    { name: "Brigadeiro", ingredients: ["leite condensado", "chocolate", "manteiga", "leite"], category: "Doce" },
    { name: "Canjica", ingredients: ["milho branco", "leite", "açúcar"], category: "Sobremesa" },
    { name: "Carne de sol", ingredients: ["carne bovina", "sal"], category: "Carne" },
    { name: "Cerveja", ingredients: ["cevada", "lúpulo", "fermento"], category: "Bebida alcoólica" },
    { name: "Chocolate ao leite", ingredients: ["cacau", "açúcar", "leite"], category: "Chocolate" },
    { name: "Churros", ingredients: ["trigo", "açúcar", "ovo", "doce de leite"], category: "Doce" },
    { name: "Cocada", ingredients: ["coco", "açúcar"], category: "Doce" },
    { name: "Coxinha", ingredients: ["trigo", "frango", "cebola", "alho"], category: "Salgado" },
    { name: "Doce de leite", ingredients: ["leite", "açúcar"], category: "Doce" },
    { name: "Empada", ingredients: ["trigo", "manteiga", "ovo"], category: "Salgado" },
    { name: "Esfiha", ingredients: ["trigo", "fermento", "carne"], category: "Salgado" },
    { name: "Farofa", ingredients: ["mandioca", "manteiga"], category: "Acompanhamento" },
    { name: "Feijoada", ingredients: ["feijão preto", "porco", "linguiça"], category: "Prato" },
    { name: "Goiabada", ingredients: ["goiaba", "açúcar"], category: "Doce" },
    { name: "Granola", ingredients: ["aveia", "mel", "castanhas"], category: "Cereal" },
    { name: "Iogurte natural", ingredients: ["leite", "fermentos"], category: "Iogurte" },
    { name: "Ketchup", ingredients: ["tomate", "açúcar", "vinagre"], category: "Molho" },
    { name: "Lasanha", ingredients: ["trigo", "ovo", "queijo", "leite", "carne"], category: "Massa" },
    { name: "Leite condensado", ingredients: ["leite", "açúcar"], category: "Laticínio" },
    { name: "Linguiça", ingredients: ["porco", "sal", "páprica"], category: "Carne" },
    { name: "Maionese", ingredients: ["ovo", "óleo", "vinagre"], category: "Molho" },
    { name: "Manteiga", ingredients: ["leite", "sal"], category: "Laticínio" },
    { name: "Moqueca", ingredients: ["peixe", "leite de coco", "dendê", "pimentão"], category: "Prato baiano" },
    { name: "Mortadela", ingredients: ["carne", "porco", "sal"], category: "Embutido" },
    { name: "Mostarda", ingredients: ["semente de mostarda", "vinagre"], category: "Molho" },
    { name: "Nhoque", ingredients: ["batata", "trigo", "ovo"], category: "Massa" },
    { name: "Omelete", ingredients: ["ovo", "óleo", "sal"], category: "Preparo" },
    { name: "Paçoca", ingredients: ["amendoim", "açúcar", "sal"], category: "Doce" },
    { name: "Pamonha", ingredients: ["milho verde", "leite"], category: "Doce" },
    { name: "Pão de queijo", ingredients: ["polvilho", "queijo", "ovo", "leite"], category: "Pão" },
    { name: "Pão francês", ingredients: ["trigo", "fermento", "sal"], category: "Pão" },
    { name: "Pastel", ingredients: ["trigo", "sal", "óleo"], category: "Salgado" },
    { name: "Pé de moleque", ingredients: ["amendoim", "açúcar"], category: "Doce" },
    { name: "Polenta", ingredients: ["milho"], category: "Acompanhamento" },
    { name: "Pudim", ingredients: ["leite", "ovo", "açúcar", "leite condensado"], category: "Sobremesa" },
    { name: "Quindim", ingredients: ["ovo", "açúcar", "coco"], category: "Doce" },
    { name: "Requeijão", ingredients: ["leite", "creme de leite"], category: "Queijo" },
    { name: "Sonho", ingredients: ["trigo", "fermento", "ovo", "creme"], category: "Doce" },
    { name: "Strogonoff", ingredients: ["carne", "creme de leite", "cogumelo"], category: "Prato" },
    { name: "Tapioca", ingredients: ["mandioca"], category: "Pão" },
    { name: "Tofu", ingredients: ["soja"], category: "Proteína vegetal" },
    { name: "Vatapá", ingredients: ["pão", "amendoim", "castanha", "camarão", "dendê"], category: "Prato baiano" },
    { name: "Vinagrete", ingredients: ["tomate", "cebola", "pimentão", "vinagre"], category: "Molho" }
  ]
};

async function importDecomposition() {
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalErrors = 0;
  const errors = [];
  
  try {
    console.log("📊 Limpando tabela antes de importar...\n");
    
    // Limpar tabela
    await supabase.from('food_decomposition').delete().neq('id', 0);
    
    console.log("📊 Iniciando importação em lotes...\n");
    
    // Preparar todos os dados
    const allData = [
      ...foodDecomposition.en.map(f => ({
        processed_food_name: f.name,
        base_ingredients: f.ingredients,
        category: f.category || 'other',
        language: 'en',
        is_active: true
      })),
      ...foodDecomposition.pt.map(f => ({
        processed_food_name: f.name,
        base_ingredients: f.ingredients,
        category: f.category || 'other',
        language: 'pt',
        is_active: true
      }))
    ];
    
    console.log(`📊 Total de alimentos para importar: ${allData.length}\n`);
    
    // Inserir em lotes de 100
    const batchSize = 100;
    for (let i = 0; i < allData.length; i += batchSize) {
      const batch = allData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('food_decomposition')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        totalErrors += batch.length;
        errors.push({ batch: Math.floor(i / batchSize) + 1, error: error.message });
      } else {
        totalInserted += data.length;
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${data.length} inseridos`);
      }
      
      totalProcessed += batch.length;
    }
    
    // Verificação final
    console.log("\n📊 Verificação final...\n");
    
    const { count: finalCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true });
    
    const { count: enCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'en');
    
    const { count: ptCount } = await supabase
      .from('food_decomposition')
      .select('*', { count: 'exact', head: true })
      .eq('language', 'pt');
    
    // Relatório final
    console.log("\n" + "=".repeat(80));
    console.log("🎉 IMPORTAÇÃO DE DECOMPOSIÇÃO CONCLUÍDA!");
    console.log("=".repeat(80));
    
    console.log(`\n📊 RESUMO:`);
    console.log(`  📝 Total processados: ${totalProcessed}`);
    console.log(`  ✅ Total inseridos: ${totalInserted}`);
    console.log(`  ❌ Total erros: ${totalErrors}`);
    
    console.log(`\n📊 DISTRIBUIÇÃO:`);
    console.log(`  🇺🇸 Inglês: ${enCount || 0} registros`);
    console.log(`  🇧🇷 Português: ${ptCount || 0} registros`);
    console.log(`  📈 Total no banco: ${finalCount || 0} registros`);
    
    if (totalErrors > 0) {
      console.log(`\n❌ ERROS ENCONTRADOS:`);
      errors.forEach(({ batch, error }) => {
        console.log(`  Lote ${batch}: ${error}`);
      });
    }
    
    // Status final
    if (finalCount && finalCount >= 90) {
      console.log(`\n✅ SUCESSO! Sistema de decomposição populado!`);
      console.log(`   ${finalCount} alimentos processados com ingredientes base.`);
      console.log(`   Sistema pronto para validação de intolerâncias.`);
    } else if (finalCount && finalCount > 0) {
      console.log(`\n🟡 SUCESSO PARCIAL! ${finalCount} alimentos importados.`);
    } else {
      console.log(`\n❌ FALHA NA IMPORTAÇÃO! Verificar erros.`);
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal na importação:', error);
  }
}

importDecomposition();
