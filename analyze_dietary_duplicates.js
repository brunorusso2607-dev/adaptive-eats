// Analisar duplicatas entre dados atuais e novos dados dietéticos
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🔍 ANÁLISE DE DUPLICATAS - DIETARY_FORBIDDEN_INGREDIENTS\n");

// Dados novos exportados do ReceitAI
const newDietaryData = {
  low_carb: {
    pt: ["angu", "açaí em pó adoçado", "açúcar de cana bruto", "açúcar mascavo artesanal", "bacaba em polpa adoçada", "beijinho", "brigadeiro", "buriti em polpa adoçada", "caldo de cana", "canjica (milho branco)", "cocada", "cupuaçu em pó adoçado", "curau", "cuscuz nordestino", "extrato de guaraná adoçado", "farinha de biju", "farinha de puba", "farinha de tapioca granulada", "fubá de moinho artesanal", "garapa", "guaraná em pó adoçado", "massa de mandioca fermentada", "mel de engenho", "melado de cana", "milho para canjica", "mungunzá", "pamonha", "paçoca", "polpa de açaí adoçada", "polpa de cupuaçu adoçada", "polvilho granulado", "pé de moleque", "rapadura", "tapioca granulada", "xarope de açaí", "xarope de guaraná"],
    en: ["agave syrup", "apple juice concentrate", "barley", "barley flour", "barley malt", "barley syrup", "bean flour", "beet sugar", "beet syrup", "brown rice syrup", "brown sugar", "cane sugar solids", "cane syrup", "caramelized flour", "cassava flour", "chickpea flour", "coconut sugar", "concentrated fruit juice", "corn", "corn dextrin", "corn fiber syrup", "corn flour", "corn powder", "corn solids", "corn starch", "corn sugar", "corn sweetener", "corn syrup", "cornmeal", "cream of rice", "dairy solids", "date powder", "date sugar", "dehydrated potato", "demerara sugar", "dextrin", "dextrins", "dextrose", "durum wheat semolina", "enriched flour", "erythritol (excess)", "evaporated cane juice", "food starch-modified", "fructose", "fructose solids", "fructose syrup", "fruit concentrate", "fruit purée", "fruit sugar", "galactose", "garbanzo flour", "glucose", "glucose solids", "glucose syrup", "golden malt extract", "golden syrup", "granulated sugar", "grape juice concentrate", "green banana flour", "grits", "high-fructose corn solids", "high-fructose corn syrups", "honey", "instant potato powder", "inverted sugar", "isoglucose", "isomaltitol", "juice solids", "lactitol", "lactose", "lactose powder", "liquid sugar", "malt", "malt extract", "malt syrup", "malted barley extract", "maltitol", "maltodextrin", "maltose", "manioc flour", "mannitol", "maple crystals", "maple sugar", "maple syrup", "milk solids", "modified corn starch", "modified starch", "modified tapioca starch", "modified wheat starch", "molasses", "navy bean flour", "oat fiber (high-carb source)", "oat flour", "oat powder", "oat syrup", "oats", "organic sugar", "oxidized starch", "palm sugar", "pea flour", "pea starch", "pear juice concentrate", "pinto bean flour", "potato flakes", "potato flour", "potato granules", "potato starch", "pregelatinized starch", "refined sugar", "refined wheat flour", "resistant corn starch", "resistant dextrin", "resistant wheat starch", "rice", "rice flour", "rice glucose syrup", "rice malt", "rice malt syrup", "rice powder", "rice solids", "rice starch", "rice syrup", "rice syrup solids", "rye", "rye flour", "rye powder", "semolina", "skim milk powder", "soluble corn fiber", "soluble tapioca fiber", "sorbitol", "sorghum flour", "soy flour", "soy powder", "spelt flour", "sucrose", "sugar", "sweet potato flour", "sweetened casein", "sweetened fruit pulp", "sweetened soy protein isolate", "sweetened whey", "tapioca dextrin", "tapioca flour", "tapioca solids", "tapioca starch", "tapioca syrup", "textured soy protein", "treacle", "trehalose", "wheat dextrin", "wheat flour", "wheat starch", "wheat starch solids", "whey permeate", "whey powder", "white sugar", "whole milk powder", "whole wheat flour", "xylitol", "yam flour"]
  },
  vegetarian: {
    pt: ["banha de porco", "buchada", "caldo de carne caseiro", "caldo de ossos caseiro", "carmim de cochonilha", "carne de sol", "carne seca", "carne-do-sertão", "carne-seca", "charque", "coalho animal artesanal", "colágeno animal artesanal", "corante de cochonilha", "coração de galinha", "dobradinha", "extrato de carne artesanal", "fígado", "gelatina bovina artesanal", "gordura bovina artesanal", "gordura de boi", "gordura de panela", "gordura suína artesanal", "jabá", "miúdos", "mocotó", "moela", "plasma animal", "rabada", "renina animal", "sangue animal", "sebo", "sebo bovino", "torresmo", "torresmo (como ingrediente)", "toucinho", "tripas naturais", "tutano", "ácido carmínico", "óleo de peixe artesanal"],
    en: ["albumin (animal-derived)", "anchovy", "anchovy extract", "anchovy paste", "animal blood", "animal collagen", "animal fat", "animal gelatin", "animal intestines", "animal lard", "animal plasma", "animal rennet", "animal-derived rennet", "bacon", "bacon fat", "beef base", "beef broth", "beef extract", "beef fat", "beef meat", "beef powder", "beef shortening", "beef stock concentrate", "beef tallow", "bone broth", "bone extract", "bone marrow extract", "bouillon base (meat-based)", "bovine gelatin", "carmine", "carminic acid", "caseinates (animal rennet)", "chicken base", "chicken broth", "chicken extract", "chicken fat", "chicken meat", "chicken powder", "chicken stock concentrate", "cochineal color", "cod", "collagen peptides (animal)", "crab", "crayfish", "cured meat", "dried fish", "dried meat", "duck meat", "egg-derived albumin (non-vegan)", "fish", "fish base", "fish broth", "fish collagen", "fish extract", "fish gelatin", "fish oil", "fish paste", "fish powder", "fish sauce", "fish stock concentrate", "game meat", "gelatin hydrolysate", "glycerin (animal-derived)", "goat meat", "goose meat", "hemoglobin", "herring", "isinglass", "l-cysteine (animal-derived)", "lamb meat", "lard shortening", "lobster", "meat base", "meat broth", "meat drippings", "meat stock", "minced meat", "mono- and diglycerides (animal)", "mussel", "mutton", "natural beef flavor", "natural casings", "natural chicken flavor", "natural flavor (animal)", "natural pork flavor", "natural seafood flavor", "octopus", "oily fish", "oleic acid (animal-derived)", "oyster", "pan drippings", "pepsin", "porcine gelatin", "pork fat", "pork lard", "pork meat", "pork powder", "pork shortening", "poultry fat", "prawn", "quail meat", "rabbit meat", "rendered animal fat", "rennet casein", "resinous glaze (animal)", "salmon", "salted fish", "salted meat", "sardine", "scallop", "sea bass", "seafood", "shellac (confectioner's glaze)", "shellfish", "shrimp", "smoked fish", "sole", "squid", "stearic acid (animal-derived)", "suet", "sun-dried meat", "tallow shortening", "tilapia", "trout", "tuna", "turkey fat", "turkey meat", "white fish", "wild boar meat", "worcestershire sauce (contains anchovies)"]
  },
  vegan: {
    pt: ["banha", "banha de porco", "buchada", "caldo de peixe", "camarão seco", "carne de sol", "carne seca", "charque", "concentrado de caldo de carne", "coração de galinha", "dobradinha", "fígado", "geleia real", "gordura de boi", "gordura de porco", "gordura de torresmo", "língua bovina", "miúdos", "mocotó", "moela", "pó de camarão", "pó de charque", "pólen de abelha", "queijo canastra", "queijo coalho", "queijo minas", "queijo serro", "rabada", "rabo de boi", "requeijão", "sebo", "sebo bovino", "sebo de carneiro", "sebo de porco", "soro de leite", "torresmo", "toucinho", "tutano"],
    en: ["aged cheese", "albumen powder", "albumin", "anchovy", "anchovy paste", "anhydrous milk fat", "animal albumin", "animal blood", "animal chymosin", "animal elastin", "animal fat", "animal gelatin", "animal intestine", "animal keratin", "animal plasma", "animal renin", "animal rennet", "animal tallow", "animal-derived enzymes", "animal-derived glycerin", "animal-derived l-cysteine", "animal-derived lecithin", "animal-derived mono- and diglycerides", "animal-derived oleic acid", "animal-derived probiotics", "animal-derived stearate", "animal-derived stearic acid", "bacon", "baking fat (animal-derived)", "bee honey", "beef", "beef broth", "beef dripping", "beef extract", "beef fat", "beef flavoring", "beef suet", "beeswax", "bone broth", "bone marrow", "bovine gelatin", "butter", "butterfat", "buttermilk powder", "calcium caseinate", "carmine", "carminic acid", "casein", "caseinate emulsifier (animal)", "cheese", "chewing gum base (animal)", "chicken base", "chicken broth", "chicken extract", "chicken flavoring", "chicken meat", "chicken powder (animal)", "clarified animal fat", "clarified butter", "cochineal carmine", "cochineal extract", "cod", "collagen", "collagen casing", "collagen peptides", "condensed milk", "confectioner's glaze (insect)", "confectionery gelatin", "crab", "crab meat", "crayfish", "cream", "cream cheese", "crustacean extract", "curd", "cured beef", "dairy cream", "dha (fish-derived)", "dried egg whites", "dried egg yolks", "dried fish", "dried meat", "dripping", "duck meat", "edible tallow", "egg", "egg solids", "egg white", "egg yolk", "epa (fish-derived)", "evaporated milk", "fish", "fish base", "fish broth", "fish extract", "fish liver oil", "fish oil", "fish sauce", "fresh cheese", "game meat", "gelatinized collagen", "ghee", "goat meat", "goose meat", "ground meat", "ham", "hemoglobin", "herring", "honey", "hydrolyzed collagen", "insect resin", "isinglass (fish gelatin)", "jerky", "kefir", "lactose", "lamb", "lamb meat", "lard", "lard bacon", "lard oil", "lard shortening", "lobster", "lysozyme", "marrow extract", "marrow fat", "marshmallow gelatin", "meat base", "meat broth", "meat extract", "meat seasoning (animal)", "meat stock", "milk", "milk cream", "milk fat", "milk protein", "milk solids", "mussel", "mutton", "mutton suet", "natural bacon flavor", "natural beef flavor", "natural butter flavor", "natural casings", "natural cheese flavor", "natural chicken flavor", "natural dairy flavor", "natural fish flavor", "natural ham flavor", "natural meat flavor", "natural seafood flavor", "octopus", "oily fish", "omega-3 (fish-derived)", "oyster", "oyster extract", "pepsin", "porcine gelatin", "pork", "pork belly", "pork dripping", "pork fat", "pork loin", "powdered milk", "prawn", "propolis", "quail meat", "rabbit meat", "red meat", "resinous glaze (insect)", "roe", "royal jelly", "salmon", "sardine", "scallop", "sea bass", "seafood", "seafood broth", "seafood flavoring", "shellfish", "shrimp", "shrimp paste", "shrimp powder", "skate", "skim milk powder", "smoked fish", "smoked meat", "snail", "sole", "squid", "steak", "stearate (animal-derived)", "stock base", "sturgeon", "suet", "sweetbreads", "tilapia", "tongue", "tripe", "trout", "tuna", "turkey meat", "venison", "vitamin d3 (animal-derived)", "whey", "whey protein", "whey protein isolate", "white fish", "whole milk", "whole milk powder", "yogurt", "yogurt powder"]
  },
  pescatarian: {
    pt: ["acém", "alcatra", "asa de frango", "bacon", "bife", "cabrito", "carne bovina", "carne de boi", "carne de porco", "carne de sol", "carne moída", "carne seca", "carne suína", "carneiro", "charque", "coelho", "contrafilé", "copa", "cordeiro", "costela", "coxa de frango", "coxão duro", "coxão mole", "filé mignon", "frango", "galinha", "hambúrguer de carne", "javali", "linguiça", "lombo", "maminha", "mortadela", "nuggets de frango", "paio", "patinho", "pato", "peito de frango", "peperoni", "pepperoni", "pernil", "peru", "picanha", "presunto", "salame", "salsicha", "sobrecoxa", "tender", "vitela"],
    en: ["bacon", "beef", "beef jerky", "bison", "boar", "bologna", "brain", "brisket", "buffalo", "chicken", "chicken breast", "chicken leg", "chicken thigh", "chicken wing", "chorizo", "corned beef", "dripping", "duck", "frankfurter", "gizzard", "goat", "goose", "ground beef", "ground chicken", "ground pork", "ground turkey", "ham", "heart", "hot dog", "jerky", "kidney", "lamb", "lard", "liver", "minced beef", "mortadella", "mutton", "ox", "pancetta", "pastrami", "pepperoni", "pheasant", "pork", "pork belly", "pork chop", "pork loin", "pork ribs", "prosciutto", "quail", "rabbit", "ribeye", "salami", "sausage", "schmaltz", "sirloin", "spam", "steak", "suet", "sweetbreads", "tallow", "tenderloin", "tongue", "trippe", "turkey", "turkey breast", "veal", "venison", "wild boar"]
  },
  ketogenic: {
    pt: ["angu", "arroz quebrado", "açaí com xarope de guaraná", "açúcar mascavo artesanal", "banana-da-terra", "banana-passa", "beijinho", "beiju", "bolo de fubá", "brigadeiro", "broa de milho", "caldo de mandioca", "canjica amarela", "canjica branca", "carimã", "cará seco", "cocada", "curau", "cuscuz de milho", "cuscuz nordestino", "farinha d'água", "farinha de feijão", "farinha de grão-de-bico", "farinha de mandioca tostada", "farinha de milho amarela", "farinha de milho branca", "farinha de pinhão", "farinha de tapioca granulada", "flocão de milho", "fubá mimoso", "fubá pré-cozido", "goma de tapioca hidratada", "inhame seco", "massa puba", "melado batido", "milho para canjica", "milho triturado grosso", "mingau de fubá", "mistura para pudim", "mungunzá", "pamonha", "paçoca", "pinhão", "pirão em pó", "polenta instantânea", "polpa de açaí adoçada", "pé de moleque", "quirera de arroz", "rapadura", "xerém"],
    en: ["agave syrup", "apple", "banana", "barley", "barley flour", "barley glucose syrup", "barley malt", "beans", "biscuit flour", "bread", "bread improver (sugar-based)", "breadcrumbs", "breakfast cereal", "breakfast cereal base", "brown sugar", "cake flour", "cane juice crystals", "cane molasses", "cane syrup", "caramelized flour", "cassava", "cassava flour", "cassava starch", "cheddar cheese powder (contains lactose)", "chickpeas", "coconut sugar", "concentrated fruit juice", "concentrated natural flavors", "condensed milk powder", "cookie flour", "corn", "corn fiber syrup", "corn flour", "corn powder", "corn starch", "corn sugar (u.s. labeling)", "corn syrup", "cornmeal", "cream of rice", "custard powder", "dates", "demerara sugar", "dextrin", "dextrins", "dextrose", "dough conditioner (sugar-based)", "dried fruit", "durum wheat semolina", "enriched flour", "erythritol (excess)", "evaporated cane juice", "evaporated milk powder", "extruded cereal flour", "fava beans", "fructose", "fructose syrup", "fruit concentrate", "fruit filling concentrate", "fruit purée", "fruit sugar", "galactose", "glucose", "glucose syrup", "golden syrup", "golden syrup solids", "granola", "granulated sugar", "grapes", "green banana flour", "grits", "high-fructose corn syrups", "honey", "hot chocolate mix", "instant mashed potato flakes", "inverted sugar", "isomaltitol", "lactitol", "lactose", "lactose powder", "lentils", "liquid sugar", "malt", "malt extract", "malt syrup solids", "malted barley extract", "maltitol", "maltodextrin", "maltose", "mandarin", "mango", "manioc", "manioc flour", "mannitol", "maple syrup", "melon", "milk sugar solids", "modified starch", "molasses", "noodles", "oat flour", "oat powder", "oats", "orange", "organic sugar", "oxidized starch", "palm sugar", "pancake mix", "papaya", "pasta", "pear", "peas", "pie filling base", "pineapple", "potato", "potato flakes", "potato flour", "potato starch", "powdered juice", "pregelatinized starch", "pudding mix", "raisins", "refined sugar", "refined wheat flour", "rice", "rice flour", "rice malt syrup", "rice powder", "rice starch", "rice syrup", "rice syrup solids", "rye", "rye flour", "rye powder", "self-rising flour", "semolina", "skim milk powder", "soluble tapioca fiber", "sorbitol", "sorghum flour", "soy flour", "soy powder", "spelt flour", "sucrose", "sugar", "sweet potato", "sweet potato flour", "sweetened casein", "sweetened cocoa powder", "sweetened fruit pulp", "sweetened peanut flour", "sweetened soy protein isolate", "sweetened whey", "tapioca flour", "tapioca starch", "taro", "textured soy protein", "treacle solids", "waffle mix", "watermelon", "wheat flour", "wheat glucose syrup", "wheat starch", "whey permeate", "whey powder", "white sugar", "whole corn", "whole milk powder", "whole wheat flour", "xylitol", "yam", "yam flour", "yuca"]
  },
  flexitarian: {
    pt: ["bacon", "cachorro quente", "carne enlatada", "copa", "hambúrguer industrializado", "hot dog", "linguiça", "mortadela", "nugget", "nuggets", "paio", "peperoni", "pepperoni", "presunto", "salame", "salsicha", "spam"],
    en: []
  }
};

async function analyzeDuplicates() {
  try {
    console.log("📊 1. Buscando dados atuais no banco...\n");
    
    // Buscar dados atuais
    const { data: currentData, error } = await supabase
      .from('dietary_forbidden_ingredients')
      .select('dietary_key, ingredient, language');
    
    if (error) {
      console.error('❌ Erro ao buscar dados atuais:', error);
      return;
    }
    
    console.log(`📊 Dados atuais encontrados: ${currentData.length} registros\n`);
    
    // Agrupar dados atuais por dietary_key e language
    const currentByDietLanguage = {};
    currentData.forEach(item => {
      const key = `${item.dietary_key}_${item.language}`;
      if (!currentByDietLanguage[key]) {
        currentByDietLanguage[key] = new Set();
      }
      currentByDietLanguage[key].add(item.ingredient.toLowerCase());
    });
    
    console.log("📊 2. Analisando duplicatas...\n");
    
    let totalNew = 0;
    let totalDuplicates = 0;
    let totalUnique = 0;
    
    const duplicateReport = {};
    
    // Analisar cada perfil dietético
    for (const [dietaryKey, languages] of Object.entries(newDietaryData)) {
      console.log(`\n🔍 Analisando: ${dietaryKey.toUpperCase()}`);
      
      duplicateReport[dietaryKey] = {
        pt: { total: 0, duplicates: 0, unique: 0, duplicateList: [] },
        en: { total: 0, duplicates: 0, unique: 0, duplicateList: [] }
      };
      
      // Analisar português
      if (languages.pt) {
        const key = `${dietaryKey}_pt`;
        const currentIngredients = currentByDietLanguage[key] || new Set();
        
        languages.pt.forEach(ingredient => {
          totalNew++;
          duplicateReport[dietaryKey].pt.total++;
          
          if (currentIngredients.has(ingredient.toLowerCase())) {
            totalDuplicates++;
            duplicateReport[dietaryKey].pt.duplicates++;
            duplicateReport[dietaryKey].pt.duplicateList.push(ingredient);
          } else {
            totalUnique++;
            duplicateReport[dietaryKey].pt.unique++;
          }
        });
      }
      
      // Analisar inglês
      if (languages.en && languages.en.length > 0) {
        const key = `${dietaryKey}_en`;
        const currentIngredients = currentByDietLanguage[key] || new Set();
        
        languages.en.forEach(ingredient => {
          totalNew++;
          duplicateReport[dietaryKey].en.total++;
          
          if (currentIngredients.has(ingredient.toLowerCase())) {
            totalDuplicates++;
            duplicateReport[dietaryKey].en.duplicates++;
            duplicateReport[dietaryKey].en.duplicateList.push(ingredient);
          } else {
            totalUnique++;
            duplicateReport[dietaryKey].en.unique++;
          }
        });
      }
    }
    
    // Relatório detalhado
    console.log("\n" + "=".repeat(80));
    console.log("📋 RELATÓRIO DE DUPLICATAS");
    console.log("=".repeat(80));
    
    console.log(`\n📊 RESUMO GERAL:`);
    console.log(`  Total novos dados: ${totalNew}`);
    console.log(`  Duplicatas: ${totalDuplicates}`);
    console.log(`  Únicos para adicionar: ${totalUnique}`);
    console.log(`  Taxa de duplicação: ${((totalDuplicates / totalNew) * 100).toFixed(1)}%`);
    
    console.log(`\n📊 DETALHAMENTO POR PERFIL:`);
    
    for (const [dietaryKey, report] of Object.entries(duplicateReport)) {
      console.log(`\n  ${dietaryKey.toUpperCase()}:`);
      
      if (report.pt.total > 0) {
        console.log(`    🇧🇷 Português: ${report.pt.total} total | ${report.pt.duplicates} duplicatas | ${report.pt.unique} únicos`);
        if (report.pt.duplicateList.length > 0 && report.pt.duplicateList.length <= 5) {
          console.log(`       Duplicatas: ${report.pt.duplicateList.join(', ')}`);
        } else if (report.pt.duplicateList.length > 5) {
          console.log(`       Duplicatas (primeiras 5): ${report.pt.duplicateList.slice(0, 5).join(', ')}...`);
        }
      }
      
      if (report.en.total > 0) {
        console.log(`    🇺🇸 Inglês: ${report.en.total} total | ${report.en.duplicates} duplicatas | ${report.en.unique} únicos`);
        if (report.en.duplicateList.length > 0 && report.en.duplicateList.length <= 5) {
          console.log(`       Duplicatas: ${report.en.duplicateList.join(', ')}`);
        } else if (report.en.duplicateList.length > 5) {
          console.log(`       Duplicatas (primeiras 5): ${report.en.duplicateList.slice(0, 5).join(', ')}...`);
        }
      }
    }
    
    // Análise de impacto
    console.log("\n" + "=".repeat(80));
    console.log("🎯 ANÁLISE DE IMPACTO");
    console.log("=".repeat(80));
    
    if (totalDuplicates === 0) {
      console.log("\n✅ NENHUMA DUPLICATA! Todos os ${totalNew} ingredientes são novos.");
      console.log("   Recomendação: Importar todos os dados.");
    } else if (totalDuplicates < totalNew * 0.3) {
      console.log(`\n✅ POUCAS DUPLICATAS (${((totalDuplicates / totalNew) * 100).toFixed(1)}%)`);
      console.log(`   ${totalUnique} de ${totalNew} ingredientes são novos.`);
      console.log("   Recomendação: Importar com tratamento de duplicatas.");
    } else if (totalDuplicates < totalNew * 0.7) {
      console.log(`\n⚠️  DUPLICATAS MODERADAS (${((totalDuplicates / totalNew) * 100).toFixed(1)}%)`);
      console.log(`   ${totalUnique} de ${totalNew} ingredientes são novos.`);
      console.log("   Recomendação: Importar apenas os únicos ou atualizar existentes.");
    } else {
      console.log(`\n❌ MUITAS DUPLICATAS (${((totalDuplicates / totalNew) * 100).toFixed(1)}%)`);
      console.log(`   Apenas ${totalUnique} de ${totalNew} ingredientes são novos.`);
      console.log("   Recomendação: Avaliar necessidade de importação.");
    }
    
    // Verificar perfis mais críticos
    console.log("\n📊 PERFIS COM MAIOR IMPACTO:");
    const sortedProfiles = Object.entries(duplicateReport)
      .map(([key, data]) => ({
        profile: key,
        unique: (data.pt.unique || 0) + (data.en.unique || 0),
        total: (data.pt.total || 0) + (data.en.total || 0)
      }))
      .sort((a, b) => b.unique - a.unique);
    
    sortedProfiles.slice(0, 3).forEach(({ profile, unique, total }) => {
      const percentage = total > 0 ? ((unique / total) * 100).toFixed(1) : 0;
      console.log(`  ${profile}: ${unique}/${total} novos (${percentage}%)`);
    });
    
  } catch (error) {
    console.error('❌ Erro na análise:', error);
  }
}

analyzeDuplicates();
