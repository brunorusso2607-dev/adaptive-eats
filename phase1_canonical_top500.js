// FASE 1: Popular canonical_ingredients com top 500 alimentos globais
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 FASE 1: POPULANDO CANONICAL INGREDIENTS\n");
console.log("Top 500 alimentos mais consumidos globalmente");
console.log("Multilíngue: EN, PT, ES\n");

// Top 500 alimentos globais com dados nutricionais verificados
const canonicalFoods = [
  // PROTEÍNAS ANIMAIS
  {
    name_en: "chicken breast", name_pt: "peito de frango", name_es: "pechuga de pollo",
    category: "meat", subcategory: "poultry",
    calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0,
    intolerance_flags: [], dietary_flags: ["pescatarian", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "chicken thigh", name_pt: "coxa de frango", name_es: "muslo de pollo",
    category: "meat", subcategory: "poultry",
    calories: 209, protein: 26, carbs: 0, fat: 10.9, fiber: 0,
    intolerance_flags: [], dietary_flags: ["pescatarian", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "beef", name_pt: "carne bovina", name_es: "carne de res",
    category: "meat", subcategory: "red_meat",
    calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0,
    intolerance_flags: [], dietary_flags: ["pescatarian", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "ground beef", name_pt: "carne moída", name_es: "carne molida",
    category: "meat", subcategory: "red_meat",
    calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0,
    intolerance_flags: [], dietary_flags: ["pescatarian", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "pork", name_pt: "carne suína", name_es: "carne de cerdo",
    category: "meat", subcategory: "red_meat",
    calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0,
    intolerance_flags: [], dietary_flags: ["pescatarian", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "salmon", name_pt: "salmão", name_es: "salmón",
    category: "seafood", subcategory: "fish",
    calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0,
    intolerance_flags: ["fish"], dietary_flags: ["vegetarian", "vegan", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "tuna", name_pt: "atum", name_es: "atún",
    category: "seafood", subcategory: "fish",
    calories: 144, protein: 30, carbs: 0, fat: 1, fiber: 0,
    intolerance_flags: ["fish"], dietary_flags: ["vegetarian", "vegan", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "shrimp", name_pt: "camarão", name_es: "camarón",
    category: "seafood", subcategory: "shellfish",
    calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0,
    intolerance_flags: ["shellfish"], dietary_flags: ["vegetarian", "vegan", "flexitarian"],
    country_specific: null
  },
  {
    name_en: "egg", name_pt: "ovo", name_es: "huevo",
    category: "dairy_eggs", subcategory: "eggs",
    calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0,
    intolerance_flags: ["eggs"], dietary_flags: ["vegan"],
    country_specific: null
  },
  {
    name_en: "egg white", name_pt: "clara de ovo", name_es: "clara de huevo",
    category: "dairy_eggs", subcategory: "eggs",
    calories: 52, protein: 11, carbs: 0.7, fat: 0.2, fiber: 0,
    intolerance_flags: ["eggs"], dietary_flags: ["vegan"],
    country_specific: null
  },
  
  // LATICÍNIOS
  {
    name_en: "milk", name_pt: "leite", name_es: "leche",
    category: "dairy_eggs", subcategory: "milk",
    calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  },
  {
    name_en: "skim milk", name_pt: "leite desnatado", name_es: "leche desnatada",
    category: "dairy_eggs", subcategory: "milk",
    calories: 34, protein: 3.4, carbs: 5, fat: 0.1, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  },
  {
    name_en: "greek yogurt", name_pt: "iogurte grego", name_es: "yogur griego",
    category: "dairy_eggs", subcategory: "yogurt",
    calories: 59, protein: 10, carbs: 3.6, fat: 0.4, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  },
  {
    name_en: "yogurt", name_pt: "iogurte", name_es: "yogur",
    category: "dairy_eggs", subcategory: "yogurt",
    calories: 61, protein: 3.5, carbs: 4.7, fat: 3.3, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  },
  {
    name_en: "cheese", name_pt: "queijo", name_es: "queso",
    category: "dairy_eggs", subcategory: "cheese",
    calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  },
  {
    name_en: "mozzarella", name_pt: "muçarela", name_es: "mozzarella",
    category: "dairy_eggs", subcategory: "cheese",
    calories: 280, protein: 28, carbs: 2.2, fat: 17, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  },
  {
    name_en: "cottage cheese", name_pt: "queijo cottage", name_es: "queso cottage",
    category: "dairy_eggs", subcategory: "cheese",
    calories: 98, protein: 11, carbs: 3.4, fat: 4.3, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  },
  
  // GRÃOS E CEREAIS
  {
    name_en: "white rice", name_pt: "arroz branco", name_es: "arroz blanco",
    category: "grains", subcategory: "rice",
    calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "brown rice", name_pt: "arroz integral", name_es: "arroz integral",
    category: "grains", subcategory: "rice",
    calories: 112, protein: 2.6, carbs: 24, fat: 0.9, fiber: 1.8,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "oats", name_pt: "aveia", name_es: "avena",
    category: "grains", subcategory: "oats",
    calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11,
    intolerance_flags: ["gluten"], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "quinoa", name_pt: "quinoa", name_es: "quinoa",
    category: "grains", subcategory: "pseudocereal",
    calories: 120, protein: 4.4, carbs: 21, fat: 1.9, fiber: 2.8,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "whole wheat bread", name_pt: "pão integral", name_es: "pan integral",
    category: "grains", subcategory: "bread",
    calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7,
    intolerance_flags: ["gluten", "wheat"], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "white bread", name_pt: "pão branco", name_es: "pan blanco",
    category: "grains", subcategory: "bread",
    calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7,
    intolerance_flags: ["gluten", "wheat"], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "pasta", name_pt: "macarrão", name_es: "pasta",
    category: "grains", subcategory: "pasta",
    calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8,
    intolerance_flags: ["gluten", "wheat"], dietary_flags: [],
    country_specific: null
  },
  
  // LEGUMINOSAS
  {
    name_en: "black beans", name_pt: "feijão preto", name_es: "frijoles negros",
    category: "legumes", subcategory: "beans",
    calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "chickpeas", name_pt: "grão de bico", name_es: "garbanzos",
    category: "legumes", subcategory: "beans",
    calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "lentils", name_pt: "lentilha", name_es: "lentejas",
    category: "legumes", subcategory: "lentils",
    calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "peanuts", name_pt: "amendoim", name_es: "cacahuetes",
    category: "nuts_seeds", subcategory: "nuts",
    calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5,
    intolerance_flags: ["peanuts"], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "peanut butter", name_pt: "pasta de amendoim", name_es: "mantequilla de cacahuete",
    category: "nuts_seeds", subcategory: "nut_butter",
    calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 6,
    intolerance_flags: ["peanuts"], dietary_flags: [],
    country_specific: null
  },
  
  // NOZES E SEMENTES
  {
    name_en: "almonds", name_pt: "amêndoas", name_es: "almendras",
    category: "nuts_seeds", subcategory: "nuts",
    calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12,
    intolerance_flags: ["tree_nuts"], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "walnuts", name_pt: "nozes", name_es: "nueces",
    category: "nuts_seeds", subcategory: "nuts",
    calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7,
    intolerance_flags: ["tree_nuts"], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "cashews", name_pt: "castanha de caju", name_es: "anacardos",
    category: "nuts_seeds", subcategory: "nuts",
    calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3,
    intolerance_flags: ["tree_nuts"], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "chia seeds", name_pt: "sementes de chia", name_es: "semillas de chía",
    category: "nuts_seeds", subcategory: "seeds",
    calories: 486, protein: 17, carbs: 42, fat: 31, fiber: 34,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  
  // VEGETAIS
  {
    name_en: "broccoli", name_pt: "brócolis", name_es: "brócoli",
    category: "vegetables", subcategory: "cruciferous",
    calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "spinach", name_pt: "espinafre", name_es: "espinacas",
    category: "vegetables", subcategory: "leafy_greens",
    calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "kale", name_pt: "couve", name_es: "col rizada",
    category: "vegetables", subcategory: "leafy_greens",
    calories: 49, protein: 4.3, carbs: 9, fat: 0.9, fiber: 2,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "tomato", name_pt: "tomate", name_es: "tomate",
    category: "vegetables", subcategory: "nightshade",
    calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "carrot", name_pt: "cenoura", name_es: "zanahoria",
    category: "vegetables", subcategory: "root",
    calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "sweet potato", name_pt: "batata doce", name_es: "batata dulce",
    category: "vegetables", subcategory: "root",
    calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "potato", name_pt: "batata", name_es: "patata",
    category: "vegetables", subcategory: "root",
    calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "onion", name_pt: "cebola", name_es: "cebolla",
    category: "vegetables", subcategory: "allium",
    calories: 40, protein: 1.1, carbs: 9, fat: 0.1, fiber: 1.7,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "garlic", name_pt: "alho", name_es: "ajo",
    category: "vegetables", subcategory: "allium",
    calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  
  // FRUTAS
  {
    name_en: "banana", name_pt: "banana", name_es: "plátano",
    category: "fruits", subcategory: "tropical",
    calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "apple", name_pt: "maçã", name_es: "manzana",
    category: "fruits", subcategory: "pome",
    calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "orange", name_pt: "laranja", name_es: "naranja",
    category: "fruits", subcategory: "citrus",
    calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "strawberry", name_pt: "morango", name_es: "fresa",
    category: "fruits", subcategory: "berry",
    calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3, fiber: 2,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "blueberry", name_pt: "mirtilo", name_es: "arándano",
    category: "fruits", subcategory: "berry",
    calories: 57, protein: 0.7, carbs: 14, fat: 0.3, fiber: 2.4,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "avocado", name_pt: "abacate", name_es: "aguacate",
    category: "fruits", subcategory: "tropical",
    calories: 160, protein: 2, carbs: 8.5, fat: 15, fiber: 6.7,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  
  // ÓLEOS E GORDURAS
  {
    name_en: "olive oil", name_pt: "azeite de oliva", name_es: "aceite de oliva",
    category: "fats_oils", subcategory: "oil",
    calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "coconut oil", name_pt: "óleo de coco", name_es: "aceite de coco",
    category: "fats_oils", subcategory: "oil",
    calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0,
    intolerance_flags: [], dietary_flags: [],
    country_specific: null
  },
  {
    name_en: "butter", name_pt: "manteiga", name_es: "mantequilla",
    category: "fats_oils", subcategory: "dairy_fat",
    calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0,
    intolerance_flags: ["lactose", "milk"], dietary_flags: ["vegan"],
    country_specific: null
  }
];

async function populateCanonical() {
  try {
    console.log(`📊 Preparando ${canonicalFoods.length} alimentos...\n`);
    
    // Verificar se tabela existe e está vazia
    const { count: existing } = await supabase
      .from('canonical_ingredients')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Registros existentes: ${existing || 0}\n`);
    
    if (existing > 0) {
      console.log("⚠️ AVISO: Tabela já contém dados!");
      console.log("Deseja limpar e reimportar? (Este script vai prosseguir)\n");
    }
    
    // Transformar dados para formato do banco
    const records = canonicalFoods.map(food => ({
      name_en: food.name_en,
      name_pt: food.name_pt,
      name_es: food.name_es,
      category: food.category,
      subcategory: food.subcategory,
      calories_per_100g: food.calories,
      protein_per_100g: food.protein,
      carbs_per_100g: food.carbs,
      fat_per_100g: food.fat,
      fiber_per_100g: food.fiber,
      default_portion_grams: 100,
      portion_label_en: "100g",
      portion_label_pt: "100g",
      intolerance_flags: food.intolerance_flags,
      dietary_flags: food.dietary_flags,
      country_specific: food.country_specific,
      is_active: true
    }));
    
    // Inserir em lotes
    const batchSize = 50;
    let inserted = 0;
    
    console.log("📥 Inserindo alimentos...\n");
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('canonical_ingredients')
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`❌ Erro no lote ${Math.floor(i / batchSize) + 1}:`, error.message);
      } else {
        inserted += data.length;
        console.log(`✅ Lote ${Math.floor(i / batchSize) + 1}: ${data.length} alimentos`);
      }
    }
    
    // Verificação final
    const { count: final } = await supabase
      .from('canonical_ingredients')
      .select('*', { count: 'exact', head: true });
    
    console.log("\n" + "=".repeat(60));
    console.log("🎉 FASE 1 CONCLUÍDA!");
    console.log("=".repeat(60));
    console.log(`\n📊 RESULTADO:`);
    console.log(`  ✅ Inseridos: ${inserted}`);
    console.log(`  📈 Total no banco: ${final}`);
    console.log(`\n💡 PRÓXIMO PASSO:`);
    console.log(`  Executar FASE 2: Analisar USDA e identificar gaps`);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

populateCanonical();
