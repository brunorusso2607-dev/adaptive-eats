import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9uemRrcHF0emZ4emNkeXhjemtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODMwMDM3NCwiZXhwIjoyMDgzODc2Mzc0fQ.KGVOkPLra7-EBr6MewnZJa2Kxg6lyxuJWKh-dw9Riu4';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log("🚀 POPULANDO TUDO MANUALMENTE...\n");

// ============================================================
// 1. SIMPLE MEALS - 50 REFEIÇÕES BRASILEIRAS
// ============================================================
console.log("🍽️ 1. CRIANDO SIMPLE MEALS (50 refeições)...");

const simpleMeals = [
  // CAFÉ DA MANHÃ (10)
  { name: "Pão integral com queijo branco", meal_type: "breakfast", calories: 280, protein: 15, carbs: 35, fat: 8, prep_time: 5, country_code: "BR" },
  { name: "Tapioca com queijo", meal_type: "breakfast", calories: 320, protein: 12, carbs: 45, fat: 10, prep_time: 10, country_code: "BR" },
  { name: "Omelete com legumes", meal_type: "breakfast", calories: 250, protein: 18, carbs: 8, fat: 16, prep_time: 15, country_code: "BR" },
  { name: "Iogurte com granola e frutas", meal_type: "breakfast", calories: 300, protein: 12, carbs: 42, fat: 9, prep_time: 5, country_code: "BR" },
  { name: "Mingau de aveia", meal_type: "breakfast", calories: 280, protein: 10, carbs: 45, fat: 7, prep_time: 10, country_code: "BR" },
  { name: "Pão francês com manteiga", meal_type: "breakfast", calories: 320, protein: 8, carbs: 50, fat: 10, prep_time: 5, country_code: "BR" },
  { name: "Vitamina de banana com aveia", meal_type: "breakfast", calories: 350, protein: 14, carbs: 55, fat: 8, prep_time: 5, country_code: "BR" },
  { name: "Crepioca com frango", meal_type: "breakfast", calories: 380, protein: 25, carbs: 35, fat: 14, prep_time: 15, country_code: "BR" },
  { name: "Panqueca de banana", meal_type: "breakfast", calories: 290, protein: 12, carbs: 40, fat: 9, prep_time: 10, country_code: "BR" },
  { name: "Café com leite e biscoito integral", meal_type: "breakfast", calories: 250, protein: 8, carbs: 38, fat: 7, prep_time: 5, country_code: "BR" },

  // ALMOÇO (20)
  { name: "Arroz, feijão, frango grelhado e salada", meal_type: "lunch", calories: 650, protein: 45, carbs: 75, fat: 15, prep_time: 30, country_code: "BR" },
  { name: "Macarrão integral com molho de tomate", meal_type: "lunch", calories: 480, protein: 18, carbs: 75, fat: 12, prep_time: 25, country_code: "BR" },
  { name: "Peixe grelhado com batata doce", meal_type: "lunch", calories: 520, protein: 40, carbs: 55, fat: 12, prep_time: 35, country_code: "BR" },
  { name: "Strogonoff de frango com arroz", meal_type: "lunch", calories: 680, protein: 38, carbs: 70, fat: 22, prep_time: 40, country_code: "BR" },
  { name: "Feijoada light", meal_type: "lunch", calories: 720, protein: 42, carbs: 65, fat: 28, prep_time: 60, country_code: "BR" },
  { name: "Carne moída com legumes", meal_type: "lunch", calories: 580, protein: 35, carbs: 45, fat: 22, prep_time: 30, country_code: "BR" },
  { name: "Frango xadrez com arroz", meal_type: "lunch", calories: 620, protein: 40, carbs: 68, fat: 16, prep_time: 35, country_code: "BR" },
  { name: "Escondidinho de frango", meal_type: "lunch", calories: 650, protein: 38, carbs: 60, fat: 24, prep_time: 45, country_code: "BR" },
  { name: "Salada completa com grão de bico", meal_type: "lunch", calories: 420, protein: 22, carbs: 48, fat: 14, prep_time: 20, country_code: "BR" },
  { name: "Omelete com salada", meal_type: "lunch", calories: 380, protein: 28, carbs: 15, fat: 22, prep_time: 15, country_code: "BR" },
  { name: "Risoto de frango", meal_type: "lunch", calories: 580, protein: 32, carbs: 65, fat: 18, prep_time: 40, country_code: "BR" },
  { name: "Bife acebolado com arroz e feijão", meal_type: "lunch", calories: 720, protein: 48, carbs: 70, fat: 22, prep_time: 30, country_code: "BR" },
  { name: "Lasanha de frango", meal_type: "lunch", calories: 650, protein: 35, carbs: 58, fat: 26, prep_time: 50, country_code: "BR" },
  { name: "Sopa de legumes com carne", meal_type: "lunch", calories: 380, protein: 28, carbs: 35, fat: 12, prep_time: 40, country_code: "BR" },
  { name: "Arroz integral com lentilha", meal_type: "lunch", calories: 450, protein: 20, carbs: 72, fat: 8, prep_time: 30, country_code: "BR" },
  { name: "Tilápia grelhada com quinoa", meal_type: "lunch", calories: 480, protein: 38, carbs: 52, fat: 10, prep_time: 30, country_code: "BR" },
  { name: "Frango assado com legumes", meal_type: "lunch", calories: 520, protein: 42, carbs: 38, fat: 18, prep_time: 45, country_code: "BR" },
  { name: "Panqueca de carne", meal_type: "lunch", calories: 580, protein: 32, carbs: 55, fat: 20, prep_time: 35, country_code: "BR" },
  { name: "Arroz de forno com frango", meal_type: "lunch", calories: 620, protein: 36, carbs: 68, fat: 18, prep_time: 40, country_code: "BR" },
  { name: "Cuscuz paulista", meal_type: "lunch", calories: 550, protein: 28, carbs: 65, fat: 16, prep_time: 35, country_code: "BR" },

  // LANCHE DA TARDE (10)
  { name: "Frutas picadas", meal_type: "afternoon_snack", calories: 120, protein: 2, carbs: 28, fat: 1, prep_time: 5, country_code: "BR" },
  { name: "Mix de castanhas", meal_type: "afternoon_snack", calories: 180, protein: 6, carbs: 8, fat: 15, prep_time: 0, country_code: "BR" },
  { name: "Iogurte natural", meal_type: "afternoon_snack", calories: 150, protein: 8, carbs: 18, fat: 4, prep_time: 0, country_code: "BR" },
  { name: "Pão integral com pasta de amendoim", meal_type: "afternoon_snack", calories: 280, protein: 12, carbs: 32, fat: 12, prep_time: 5, country_code: "BR" },
  { name: "Barra de cereal", meal_type: "afternoon_snack", calories: 120, protein: 3, carbs: 22, fat: 3, prep_time: 0, country_code: "BR" },
  { name: "Queijo branco com torradas", meal_type: "afternoon_snack", calories: 200, protein: 14, carbs: 18, fat: 8, prep_time: 5, country_code: "BR" },
  { name: "Smoothie de frutas", meal_type: "afternoon_snack", calories: 220, protein: 8, carbs: 42, fat: 3, prep_time: 5, country_code: "BR" },
  { name: "Biscoito integral com chá", meal_type: "afternoon_snack", calories: 150, protein: 4, carbs: 26, fat: 4, prep_time: 5, country_code: "BR" },
  { name: "Banana com aveia", meal_type: "afternoon_snack", calories: 180, protein: 5, carbs: 35, fat: 3, prep_time: 5, country_code: "BR" },
  { name: "Wrap de frango light", meal_type: "afternoon_snack", calories: 320, protein: 22, carbs: 35, fat: 10, prep_time: 10, country_code: "BR" },

  // JANTAR (10)
  { name: "Sopa de legumes", meal_type: "dinner", calories: 280, protein: 12, carbs: 38, fat: 8, prep_time: 30, country_code: "BR" },
  { name: "Salada Caesar com frango", meal_type: "dinner", calories: 420, protein: 32, carbs: 22, fat: 22, prep_time: 20, country_code: "BR" },
  { name: "Omelete com salada verde", meal_type: "dinner", calories: 320, protein: 24, carbs: 12, fat: 20, prep_time: 15, country_code: "BR" },
  { name: "Peixe grelhado com legumes", meal_type: "dinner", calories: 380, protein: 35, carbs: 25, fat: 14, prep_time: 25, country_code: "BR" },
  { name: "Frango grelhado com brócolis", meal_type: "dinner", calories: 420, protein: 42, carbs: 18, fat: 18, prep_time: 25, country_code: "BR" },
  { name: "Sanduíche natural", meal_type: "dinner", calories: 350, protein: 18, carbs: 42, fat: 12, prep_time: 10, country_code: "BR" },
  { name: "Caldo verde", meal_type: "dinner", calories: 320, protein: 15, carbs: 35, fat: 12, prep_time: 35, country_code: "BR" },
  { name: "Wrap integral com atum", meal_type: "dinner", calories: 380, protein: 28, carbs: 38, fat: 12, prep_time: 10, country_code: "BR" },
  { name: "Salada de atum com grão de bico", meal_type: "dinner", calories: 420, protein: 32, carbs: 35, fat: 16, prep_time: 15, country_code: "BR" },
  { name: "Creme de abóbora", meal_type: "dinner", calories: 280, protein: 8, carbs: 42, fat: 8, prep_time: 30, country_code: "BR" }
];

const { data: existingMeals } = await supabase.from('simple_meals').select('name');
const existingNames = new Set(existingMeals?.map(m => m.name) || []);
const newMeals = simpleMeals.filter(m => !existingNames.has(m.name));

if (newMeals.length > 0) {
  const { error } = await supabase.from('simple_meals').insert(newMeals);
  if (error) {
    console.log(`  ❌ Erro: ${error.message}`);
  } else {
    console.log(`  ✅ ${newMeals.length} refeições inseridas`);
  }
} else {
  console.log(`  ⚠️ Todas as refeições já existem`);
}

// ============================================================
// 2. FOOD DECOMPOSITION MAPPINGS - 50 ALIMENTOS
// ============================================================
console.log("\n🍕 2. CRIANDO FOOD DECOMPOSITION (50 alimentos)...");

const decompositions = [
  // Alimentos processados comuns
  { food_name: "pizza", ingredients: ["queijo", "trigo", "tomate", "azeite"], language: "pt" },
  { food_name: "pizza", ingredients: ["cheese", "wheat", "tomato", "olive oil"], language: "en" },
  { food_name: "hamburguer", ingredients: ["carne", "pão", "queijo", "alface", "tomate"], language: "pt" },
  { food_name: "hamburger", ingredients: ["beef", "bread", "cheese", "lettuce", "tomato"], language: "en" },
  { food_name: "lasanha", ingredients: ["trigo", "queijo", "carne", "tomate"], language: "pt" },
  { food_name: "lasagna", ingredients: ["wheat", "cheese", "beef", "tomato"], language: "en" },
  { food_name: "macarrão ao molho", ingredients: ["trigo", "tomate", "azeite"], language: "pt" },
  { food_name: "pasta with sauce", ingredients: ["wheat", "tomato", "olive oil"], language: "en" },
  { food_name: "sorvete", ingredients: ["leite", "açúcar"], language: "pt" },
  { food_name: "ice cream", ingredients: ["milk", "sugar"], language: "en" },
  { food_name: "chocolate ao leite", ingredients: ["leite", "cacau", "açúcar"], language: "pt" },
  { food_name: "milk chocolate", ingredients: ["milk", "cocoa", "sugar"], language: "en" },
  { food_name: "bolo", ingredients: ["trigo", "ovo", "leite", "açúcar"], language: "pt" },
  { food_name: "cake", ingredients: ["wheat", "egg", "milk", "sugar"], language: "en" },
  { food_name: "pão", ingredients: ["trigo", "fermento"], language: "pt" },
  { food_name: "bread", ingredients: ["wheat", "yeast"], language: "en" },
  { food_name: "biscoito", ingredients: ["trigo", "açúcar"], language: "pt" },
  { food_name: "cookie", ingredients: ["wheat", "sugar"], language: "en" },
  { food_name: "cerveja", ingredients: ["malte", "cevada", "lúpulo"], language: "pt" },
  { food_name: "beer", ingredients: ["malt", "barley", "hops"], language: "en" },
  { food_name: "molho de soja", ingredients: ["soja", "trigo", "sal"], language: "pt" },
  { food_name: "soy sauce", ingredients: ["soy", "wheat", "salt"], language: "en" },
  { food_name: "maionese", ingredients: ["ovo", "óleo", "vinagre"], language: "pt" },
  { food_name: "mayonnaise", ingredients: ["egg", "oil", "vinegar"], language: "en" },
  { food_name: "queijo", ingredients: ["leite"], language: "pt" },
  { food_name: "cheese", ingredients: ["milk"], language: "en" },
  { food_name: "iogurte", ingredients: ["leite"], language: "pt" },
  { food_name: "yogurt", ingredients: ["milk"], language: "en" },
  { food_name: "manteiga", ingredients: ["leite"], language: "pt" },
  { food_name: "butter", ingredients: ["milk"], language: "en" },
  { food_name: "creme de leite", ingredients: ["leite"], language: "pt" },
  { food_name: "cream", ingredients: ["milk"], language: "en" },
  { food_name: "requeijão", ingredients: ["leite"], language: "pt" },
  { food_name: "cream cheese", ingredients: ["milk"], language: "en" },
  { food_name: "empanado", ingredients: ["trigo", "ovo"], language: "pt" },
  { food_name: "breaded", ingredients: ["wheat", "egg"], language: "en" },
  { food_name: "torta", ingredients: ["trigo", "ovo", "manteiga"], language: "pt" },
  { food_name: "pie", ingredients: ["wheat", "egg", "butter"], language: "en" },
  { food_name: "croissant", ingredients: ["trigo", "manteiga"], language: "pt" },
  { food_name: "croissant", ingredients: ["wheat", "butter"], language: "en" },
  { food_name: "waffle", ingredients: ["trigo", "ovo", "leite"], language: "pt" },
  { food_name: "waffle", ingredients: ["wheat", "egg", "milk"], language: "en" },
  { food_name: "panqueca", ingredients: ["trigo", "ovo", "leite"], language: "pt" },
  { food_name: "pancake", ingredients: ["wheat", "egg", "milk"], language: "en" },
  { food_name: "quiche", ingredients: ["trigo", "ovo", "queijo"], language: "pt" },
  { food_name: "quiche", ingredients: ["wheat", "egg", "cheese"], language: "en" },
  { food_name: "coxinha", ingredients: ["trigo", "frango"], language: "pt" },
  { food_name: "pastel", ingredients: ["trigo", "óleo"], language: "pt" },
  { food_name: "esfiha", ingredients: ["trigo", "carne"], language: "pt" },
  { food_name: "brigadeiro", ingredients: ["leite condensado", "chocolate"], language: "pt" }
];

const { data: existingDecomp } = await supabase.from('food_decomposition_mappings').select('food_name, language');
const existingDecompKeys = new Set(existingDecomp?.map(d => `${d.food_name}_${d.language}`) || []);
const newDecomps = decompositions.filter(d => !existingDecompKeys.has(`${d.food_name}_${d.language}`));

if (newDecomps.length > 0) {
  const { error } = await supabase.from('food_decomposition_mappings').insert(newDecomps);
  if (error) {
    console.log(`  ❌ Erro: ${error.message}`);
  } else {
    console.log(`  ✅ ${newDecomps.length} decomposições inseridas`);
  }
} else {
  console.log(`  ⚠️ Todas as decomposições já existem`);
}

console.log("\n" + "=".repeat(60));
console.log("🎉 POPULAÇÃO MANUAL CONCLUÍDA!");
console.log("=".repeat(60));
console.log("\n✅ Sistema agora tem:");
console.log("  - 50+ refeições brasileiras");
console.log("  - 50 decomposições de alimentos");
console.log("  - Todos os dados de configuração");
console.log("\n💡 Próximo: Expandir intolerance_mappings com mais ingredientes");
console.log("\n✨ Concluído!");
