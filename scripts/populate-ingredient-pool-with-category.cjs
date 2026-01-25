// ═══════════════════════════════════════════════════════════════════════
// SCRIPT: Populate ingredient_pool table WITH CATEGORIES
// ═══════════════════════════════════════════════════════════════════════
// Popula a tabela ingredient_pool com todos os ingredientes do
// meal-ingredients-db.ts incluindo suas categorias
// ═══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

console.log('🔄 Starting ingredient pool population with categories...\n');

// Mapeamento manual de ingredientes para categorias
// Baseado na estrutura do meal-ingredients-db.ts
const INGREDIENT_CATEGORIES = {
  // PROTEÍNAS
  grilled_chicken_breast: 'protein',
  baked_chicken_thigh: 'protein',
  shredded_chicken: 'protein',
  grilled_sirloin_steak: 'protein',
  grilled_round_steak: 'protein',
  sirloin_steak_with_onions: 'protein',
  sauteed_ground_beef: 'protein',
  grilled_filet_mignon: 'protein',
  grilled_tilapia: 'protein',
  grilled_salmon: 'protein',
  grilled_hake: 'protein',
  baked_hake: 'protein',
  scrambled_eggs: 'protein',
  boiled_eggs: 'protein',
  plain_omelet: 'protein',
  
  // CARBOIDRATOS
  white_rice: 'carbs',
  brown_rice: 'carbs',
  parboiled_rice: 'carbs',
  boiled_sweet_potato: 'carbs',
  baked_sweet_potato: 'carbs',
  mashed_sweet_potato: 'carbs',
  boiled_potato: 'carbs',
  mashed_potato: 'carbs',
  whole_wheat_bread: 'carbs',
  french_bread: 'carbs',
  whole_wheat_sandwich_bread: 'carbs',
  pasta: 'carbs',
  whole_wheat_pasta: 'carbs',
  cassava: 'carbs',
  boiled_cassava: 'carbs',
  beans: 'carbs',
  black_beans: 'carbs',
  oats: 'carbs',
  tapioca: 'carbs',
  couscous: 'carbs',
  quinoa: 'carbs',
  
  // VEGETAIS
  boiled_broccoli: 'vegetable',
  sauteed_kale: 'vegetable',
  sauteed_spinach: 'vegetable',
  boiled_green_beans: 'vegetable',
  sauteed_zucchini: 'vegetable',
  sauteed_eggplant: 'vegetable',
  boiled_cauliflower: 'vegetable',
  boiled_carrots: 'vegetable',
  sauteed_cabbage: 'vegetable',
  sauteed_chard: 'vegetable',
  boiled_beets: 'vegetable',
  sauteed_okra: 'vegetable',
  sauteed_chayote: 'vegetable',
  boiled_pumpkin: 'vegetable',
  arugula: 'vegetable',
  watercress: 'vegetable',
  lettuce: 'vegetable',
  tomato: 'vegetable',
  cucumber: 'vegetable',
  bell_pepper: 'vegetable',
  
  // FRUTAS
  banana: 'fruit',
  apple: 'fruit',
  papaya: 'fruit',
  orange: 'fruit',
  watermelon: 'fruit',
  melon: 'fruit',
  strawberry: 'fruit',
  pineapple: 'fruit',
  mango: 'fruit',
  grape: 'fruit',
  pear: 'fruit',
  kiwi: 'fruit',
  
  // LATICÍNIOS
  whole_milk: 'dairy',
  skim_milk: 'dairy',
  semi_skimmed_milk: 'dairy',
  plain_yogurt: 'dairy',
  greek_yogurt: 'dairy',
  low_fat_yogurt: 'dairy',
  minas_cheese: 'dairy',
  cottage_cheese: 'dairy',
  ricotta_cheese: 'dairy',
  mozzarella_cheese: 'dairy',
  prato_cheese: 'dairy',
  
  // GORDURAS
  olive_oil: 'fat',
  coconut_oil: 'fat',
  butter: 'fat',
  avocado: 'fat',
  
  // SEMENTES/OLEAGINOSAS
  chia_seeds: 'seeds',
  flaxseed: 'seeds',
  sesame_seeds: 'seeds',
  sunflower_seeds: 'seeds',
  pumpkin_seeds: 'seeds',
  brazil_nuts: 'seeds',
  cashews: 'seeds',
  almonds: 'seeds',
  walnuts: 'seeds',
  peanuts: 'seeds',
  
  // BEBIDAS
  orange_juice: 'beverage',
  lemon_juice: 'beverage',
  coconut_water: 'beverage',
  green_tea: 'beverage',
  chamomile_tea: 'beverage',
  black_coffee: 'beverage',
  coffee_with_milk: 'beverage',
  
  // REGIONAIS BRASIL
  pao_de_queijo: 'carbs',
  requeijao: 'dairy',
};

// Read meal-ingredients-db.ts
const dbPath = path.join(__dirname, '..', 'supabase', 'functions', '_shared', 'meal-ingredients-db.ts');
const content = fs.readFileSync(dbPath, 'utf8');

// Extract all ingredients
const ingredientMatches = content.matchAll(/(\w+):\s*\{\s*kcal:\s*([\d.]+),\s*prot:\s*([\d.]+),\s*carbs:\s*([\d.]+),\s*fat:\s*([\d.]+),\s*fiber:\s*([\d.]+),\s*portion:\s*([\d.]+).*?display_name_pt:\s*"([^"]+)".*?display_name_en:\s*"([^"]+)"/gs);

const baseIngredients = [];
for (const match of ingredientMatches) {
  const [, key, kcal, prot, carbs, fat, fiber, portion, namePt, nameEn] = match;
  
  // Determina categoria (usa mapeamento ou 'other' como fallback)
  const category = INGREDIENT_CATEGORIES[key] || 'other';
  
  baseIngredients.push({
    ingredient_key: key,
    display_name_pt: namePt,
    display_name_en: nameEn,
    is_alternative: false,
    country_code: null,
    category: category,
    kcal_per_100g: parseFloat(kcal),
    protein_per_100g: parseFloat(prot),
    carbs_per_100g: parseFloat(carbs),
    fat_per_100g: parseFloat(fat),
    fiber_per_100g: parseFloat(fiber),
    default_portion_grams: parseFloat(portion),
  });
}

console.log(`✅ Extracted ${baseIngredients.length} base ingredients\n`);

// Alternative ingredients for intolerances
const alternativeIngredients = [
  // SEM LACTOSE
  {
    ingredient_key: 'lactose_free_milk',
    display_name_pt: 'Leite sem lactose',
    display_name_en: 'Lactose-free milk',
    display_name_es: 'Leche sin lactosa',
    is_alternative: true,
    country_code: null,
    category: 'dairy',
    safe_for_intolerances: ['lactose'],
    replaces_ingredients: ['whole_milk', 'skim_milk', 'semi_skimmed_milk'],
    kcal_per_100g: 61,
    protein_per_100g: 3.2,
    carbs_per_100g: 4.6,
    fat_per_100g: 3.5,
    fiber_per_100g: 0,
    default_portion_grams: 200,
  },
  {
    ingredient_key: 'almond_milk',
    display_name_pt: 'Leite de amêndoas',
    display_name_en: 'Almond milk',
    display_name_es: 'Leche de almendras',
    is_alternative: true,
    country_code: null,
    category: 'dairy',
    safe_for_intolerances: ['lactose'],
    replaces_ingredients: ['whole_milk', 'skim_milk', 'semi_skimmed_milk'],
    kcal_per_100g: 24,
    protein_per_100g: 1,
    carbs_per_100g: 1,
    fat_per_100g: 2,
    fiber_per_100g: 0.5,
    default_portion_grams: 200,
  },
  {
    ingredient_key: 'oat_milk',
    display_name_pt: 'Leite de aveia',
    display_name_en: 'Oat milk',
    display_name_es: 'Leche de avena',
    is_alternative: true,
    country_code: null,
    category: 'dairy',
    safe_for_intolerances: ['lactose'],
    replaces_ingredients: ['whole_milk', 'skim_milk', 'semi_skimmed_milk'],
    kcal_per_100g: 47,
    protein_per_100g: 1,
    carbs_per_100g: 6.7,
    fat_per_100g: 1.5,
    fiber_per_100g: 0.8,
    default_portion_grams: 200,
  },
  {
    ingredient_key: 'soy_milk',
    display_name_pt: 'Leite de soja',
    display_name_en: 'Soy milk',
    display_name_es: 'Leche de soja',
    is_alternative: true,
    country_code: null,
    category: 'dairy',
    safe_for_intolerances: ['lactose'],
    replaces_ingredients: ['whole_milk', 'skim_milk', 'semi_skimmed_milk'],
    kcal_per_100g: 54,
    protein_per_100g: 3.3,
    carbs_per_100g: 6,
    fat_per_100g: 1.8,
    fiber_per_100g: 0.6,
    default_portion_grams: 200,
  },
  {
    ingredient_key: 'vegan_cheese',
    display_name_pt: 'Queijo vegano',
    display_name_en: 'Vegan cheese',
    display_name_es: 'Queso vegano',
    is_alternative: true,
    country_code: null,
    category: 'dairy',
    safe_for_intolerances: ['lactose'],
    replaces_ingredients: ['minas_cheese', 'mozzarella_cheese', 'prato_cheese'],
    kcal_per_100g: 280,
    protein_per_100g: 1,
    carbs_per_100g: 4,
    fat_per_100g: 28,
    fiber_per_100g: 0,
    default_portion_grams: 30,
  },
  {
    ingredient_key: 'coconut_yogurt',
    display_name_pt: 'Iogurte de coco',
    display_name_en: 'Coconut yogurt',
    display_name_es: 'Yogur de coco',
    is_alternative: true,
    country_code: null,
    category: 'dairy',
    safe_for_intolerances: ['lactose'],
    replaces_ingredients: ['plain_yogurt', 'greek_yogurt', 'low_fat_yogurt'],
    kcal_per_100g: 90,
    protein_per_100g: 1,
    carbs_per_100g: 6,
    fat_per_100g: 7,
    fiber_per_100g: 1,
    default_portion_grams: 150,
  },
  
  // SEM GLÚTEN
  {
    ingredient_key: 'gluten_free_bread',
    display_name_pt: 'Pão sem glúten',
    display_name_en: 'Gluten-free bread',
    display_name_es: 'Pan sin gluten',
    is_alternative: true,
    country_code: null,
    category: 'carbs',
    safe_for_intolerances: ['gluten'],
    replaces_ingredients: ['whole_wheat_bread', 'french_bread', 'whole_wheat_sandwich_bread'],
    kcal_per_100g: 240,
    protein_per_100g: 8,
    carbs_per_100g: 45,
    fat_per_100g: 3,
    fiber_per_100g: 7,
    default_portion_grams: 50,
  },
  {
    ingredient_key: 'gluten_free_pasta',
    display_name_pt: 'Macarrão sem glúten',
    display_name_en: 'Gluten-free pasta',
    display_name_es: 'Pasta sin gluten',
    is_alternative: true,
    country_code: null,
    category: 'carbs',
    safe_for_intolerances: ['gluten'],
    replaces_ingredients: ['pasta', 'whole_wheat_pasta'],
    kcal_per_100g: 131,
    protein_per_100g: 4.5,
    carbs_per_100g: 28,
    fat_per_100g: 0.4,
    fiber_per_100g: 1.2,
    default_portion_grams: 100,
  },
  {
    ingredient_key: 'rice_flour',
    display_name_pt: 'Farinha de arroz',
    display_name_en: 'Rice flour',
    display_name_es: 'Harina de arroz',
    is_alternative: true,
    country_code: null,
    category: 'carbs',
    safe_for_intolerances: ['gluten'],
    replaces_ingredients: ['wheat_flour'],
    kcal_per_100g: 366,
    protein_per_100g: 6,
    carbs_per_100g: 80,
    fat_per_100g: 1.4,
    fiber_per_100g: 2.4,
    default_portion_grams: 50,
  },
  {
    ingredient_key: 'gluten_free_oats',
    display_name_pt: 'Aveia sem glúten',
    display_name_en: 'Gluten-free oats',
    display_name_es: 'Avena sin gluten',
    is_alternative: true,
    country_code: null,
    category: 'carbs',
    safe_for_intolerances: ['gluten'],
    replaces_ingredients: ['oats'],
    kcal_per_100g: 394,
    protein_per_100g: 13.9,
    carbs_per_100g: 66.6,
    fat_per_100g: 8.5,
    fiber_per_100g: 9.1,
    default_portion_grams: 30,
  },
];

console.log(`✅ Prepared ${alternativeIngredients.length} alternative ingredients\n`);

// Generate SQL INSERT statements
const generateInsert = (ingredient) => {
  const values = [
    `'${ingredient.ingredient_key}'`,
    `'${ingredient.display_name_pt.replace(/'/g, "''")}'`,
    `'${ingredient.display_name_en.replace(/'/g, "''")}'`,
    ingredient.display_name_es ? `'${ingredient.display_name_es.replace(/'/g, "''")}'` : 'NULL',
    ingredient.is_alternative,
    ingredient.country_code ? `'${ingredient.country_code}'` : 'NULL',
    ingredient.category ? `'${ingredient.category}'` : 'NULL',
    ingredient.safe_for_intolerances ? `ARRAY[${ingredient.safe_for_intolerances.map(i => `'${i}'`).join(', ')}]` : 'NULL',
    ingredient.replaces_ingredients ? `ARRAY[${ingredient.replaces_ingredients.map(i => `'${i}'`).join(', ')}]` : 'NULL',
    ingredient.kcal_per_100g || 'NULL',
    ingredient.protein_per_100g || 'NULL',
    ingredient.carbs_per_100g || 'NULL',
    ingredient.fat_per_100g || 'NULL',
    ingredient.fiber_per_100g || 'NULL',
    ingredient.default_portion_grams || 'NULL',
  ];
  
  return `INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, safe_for_intolerances, replaces_ingredients, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES (${values.join(', ')}) ON CONFLICT (ingredient_key) DO NOTHING;`;
};

// Write SQL file
const sqlStatements = [
  '-- ═══════════════════════════════════════════════════════════════════════',
  '-- POPULATE ingredient_pool WITH CATEGORIES',
  '-- ═══════════════════════════════════════════════════════════════════════',
  '-- Auto-generated by populate-ingredient-pool-with-category.cjs',
  '-- ═══════════════════════════════════════════════════════════════════════',
  '',
  '-- Base ingredients (universal)',
  ...baseIngredients.map(generateInsert),
  '',
  '-- Alternative ingredients (for intolerances)',
  ...alternativeIngredients.map(generateInsert),
];

const outputPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260123_populate_ingredient_pool_with_category.sql');
fs.writeFileSync(outputPath, sqlStatements.join('\n'), 'utf8');

console.log(`✅ SQL file generated: ${outputPath}\n`);
console.log(`📊 Summary:`);
console.log(`   - Base ingredients: ${baseIngredients.length}`);
console.log(`   - Alternative ingredients: ${alternativeIngredients.length}`);
console.log(`   - Total: ${baseIngredients.length + alternativeIngredients.length}\n`);
console.log('✨ Population script complete!');
