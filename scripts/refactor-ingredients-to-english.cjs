// ═══════════════════════════════════════════════════════════════════════
// SCRIPT: Refactor meal-ingredients-db.ts to English keys
// ═══════════════════════════════════════════════════════════════════════
// This script converts Portuguese ingredient keys to English
// and adds multilingual display names (pt, en, es)
// ═══════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

// Mapping: Portuguese key → English key
const KEY_MAPPING = {
  // PROTEINS - POULTRY
  'frango_peito_grelhado': 'grilled_chicken_breast',
  'frango_coxa_assada': 'baked_chicken_thigh',
  'frango_desfiado': 'shredded_chicken',
  'frango_passarinho': 'fried_chicken_pieces',
  'sobrecoxa_assada': 'baked_chicken_drumstick',
  'peito_peru_fatiado': 'sliced_turkey_breast',
  
  // PROTEINS - BEEF
  'bife_alcatra_grelhado': 'grilled_sirloin_steak',
  'bife_patinho_grelhado': 'grilled_round_steak',
  'bife_alcatra_acebolado': 'sirloin_steak_with_onions',
  'carne_moida_refogada': 'sauteed_ground_beef',
  'file_mignon_grelhado': 'grilled_filet_mignon',
  'picanha_grelhada': 'grilled_picanha',
  'costela_assada': 'roasted_ribs',
  'carne_panela': 'pot_roast',
  'figado_bovino': 'beef_liver',
  'presunto_magro': 'lean_ham',
  
  // PROTEINS - FISH
  'tilapia_grelhada': 'grilled_tilapia',
  'salmao_grelhado': 'grilled_salmon',
  'pescada_grelhada': 'grilled_hake',
  'merluza_assada': 'baked_hake',
  'atum_lata': 'canned_tuna',
  'sardinha_lata': 'canned_sardines',
  'bacalhau_cozido': 'boiled_cod',
  'camarao_grelhado': 'grilled_shrimp',
  
  // PROTEINS - EGGS
  'ovo_mexido': 'scrambled_eggs',
  'ovo_cozido': 'boiled_eggs',
  'omelete_simples': 'plain_omelet',
  
  // PROTEINS - LEGUMES
  'lentilha_cozida': 'boiled_lentils',
  
  // CARBS - RICE
  'arroz_branco': 'white_rice',
  'arroz_integral': 'brown_rice',
  'arroz_parboilizado': 'parboiled_rice',
  
  // CARBS - POTATOES
  'batata_doce_cozida': 'boiled_sweet_potato',
  'batata_doce_assada': 'baked_sweet_potato',
  'batata_inglesa_cozida': 'boiled_potato',
  'batata_inglesa_assada': 'baked_potato',
  'pure_batata': 'mashed_potato',
  'mandioca_cozida': 'boiled_cassava',
  
  // CARBS - BREADS
  'pao_integral': 'whole_wheat_bread',
  'pao_frances': 'french_bread',
  'pao_forma_integral': 'whole_wheat_sandwich_bread',
  
  // CARBS - PASTA
  'macarrao_integral': 'whole_wheat_pasta',
  'macarrao_comum': 'pasta',
  
  // CARBS - OTHERS
  'tapioca': 'tapioca',
  'aveia': 'oats',
  'granola': 'granola',
  'cuscuz_milho': 'corn_couscous',
  'farofa': 'toasted_cassava_flour',
  'polenta': 'polenta',
  'nhoque': 'gnocchi',
  
  // LEGUMES
  'feijao': 'beans',
  
  // VEGETABLES - LEAFY
  'alface_americana': 'iceberg_lettuce',
  'alface_crespa': 'curly_lettuce',
  'rucula': 'arugula',
  'agriao': 'watercress',
  'espinafre_refogado': 'sauteed_spinach',
  'couve_refogada': 'sauteed_kale',
  
  // VEGETABLES - COOKED
  'brocolis_cozido': 'boiled_broccoli',
  'couve_flor_cozida': 'boiled_cauliflower',
  'cenoura_cozida': 'boiled_carrot',
  'abobrinha_refogada': 'sauteed_zucchini',
  'vagem_cozida': 'boiled_green_beans',
  'abobora_cozida': 'boiled_pumpkin',
  'chuchu_cozido': 'boiled_chayote',
  'quiabo_refogado': 'sauteed_okra',
  'berinjela_refogada': 'sauteed_eggplant',
  'beterraba_cozida': 'boiled_beet',
  'maxixe_refogado': 'sauteed_gherkin',
  'jilo_refogado': 'sauteed_scarlet_eggplant',
  'repolho_refogado': 'sauteed_cabbage',
  'acelga_refogada': 'sauteed_chard',
  
  // VEGETABLES - RAW
  'tomate': 'tomato',
  'pepino': 'cucumber',
  'pimentao_verde': 'green_bell_pepper',
  'pimentao_vermelho': 'red_bell_pepper',
  'pimentao_amarelo': 'yellow_bell_pepper',
  'cenoura_ralada': 'grated_carrot',
  
  // VEGETABLES - SEASONINGS
  'cebola_refogada': 'sauteed_onion',
  'alho_refogado': 'sauteed_garlic',
  'cheiro_verde': 'parsley_and_scallions',
  
  // FRUITS
  'banana_prata': 'silver_banana',
  'maca_vermelha': 'red_apple',
  'morango': 'strawberry',
  'mamao_papaia': 'papaya',
  'manga': 'mango',
  'pera': 'pear',
  'laranja': 'orange',
  'melancia': 'watermelon',
  'melao': 'melon',
  'abacaxi': 'pineapple',
  'goiaba': 'guava',
  'uva': 'grapes',
  'kiwi': 'kiwi',
  'tangerina': 'tangerine',
  'abacate': 'avocado',
  'acai_polpa': 'acai',
  
  // DAIRY
  'iogurte_natural': 'plain_yogurt',
  'iogurte_grego': 'greek_yogurt',
  'iogurte_desnatado': 'low_fat_yogurt',
  'iogurte_frutas': 'fruit_yogurt',
  'queijo_minas': 'minas_cheese',
  'queijo_cottage': 'cottage_cheese',
  'queijo_prato': 'prato_cheese',
  'queijo_mussarela': 'mozzarella_cheese',
  'ricota': 'ricotta',
  'requeijao_light': 'light_cream_cheese',
  'leite_desnatado': 'skim_milk',
  'leite_semidesnatado': 'semi_skimmed_milk',
  'leite_integral': 'whole_milk',
  
  // BEVERAGES
  'cafe_com_leite': 'coffee_with_milk',
  'cafe_preto': 'black_coffee',
  'cha_verde': 'green_tea',
  'cha_camomila': 'chamomile_tea',
  'cha_preto': 'black_tea',
  'cha_erva_doce': 'fennel_tea',
  'suco_laranja_natural': 'fresh_orange_juice',
  'suco_limao': 'lemon_juice',
  'agua_coco': 'coconut_water',
  'vitamina_banana': 'banana_smoothie',
  'cha_hibisco': 'hibiscus_tea',
  'cha_melissa': 'lemon_balm_tea',
  
  // FATS
  'azeite_oliva': 'olive_oil',
  'azeite_extra_virgem': 'extra_virgin_olive_oil',
  'castanha_para': 'brazil_nuts',
  'castanha_caju': 'cashew_nuts',
  'amendoim': 'peanuts',
  'nozes': 'walnuts',
  
  // SEEDS AND OTHERS
  'chia': 'chia_seeds',
  'linhaca': 'flaxseed',
  'gergelim': 'sesame_seeds',
  'mel': 'honey',
  'coco_ralado': 'shredded_coconut',
  'molho_tomate': 'tomato_sauce',
  'shoyu': 'soy_sauce',
  'vinagre': 'vinegar',
  
  // REGIONAL - Keep Portuguese keys but mark as regional
  'pao_de_queijo': 'pao_de_queijo',
  'requeijao': 'requeijao',
};

console.log('🔄 Starting refactoring process...\n');
console.log(`📊 Total mappings: ${Object.keys(KEY_MAPPING).length}\n`);

// Read original file
const originalPath = path.join(__dirname, '..', 'supabase', 'functions', '_shared', 'meal-ingredients-db.ts');
let content = fs.readFileSync(originalPath, 'utf8');

console.log('✅ Original file loaded\n');

// Update interface
content = content.replace(
  'display_name: string;',
  'display_name_pt: string; // Portuguese (Brazil)\n  display_name_en: string; // English (Global)\n  display_name_es?: string; // Spanish (optional)'
);

content = content.replace(
  'display_name_en: string;',
  'regional?: boolean; // True for regional products (e.g., pão de queijo, requeijão)\n  country?: string; // Country code for regional products (e.g., \'BR\', \'MX\')'
);

console.log('✅ Interface updated\n');

// Replace each ingredient key and update display_name → display_name_pt
let replacedCount = 0;
for (const [oldKey, newKey] of Object.entries(KEY_MAPPING)) {
  const oldPattern = new RegExp(`\\b${oldKey}:\\s*\\{`, 'g');
  const newPattern = `${newKey}: {`;
  
  if (content.match(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    replacedCount++;
  }
}

console.log(`✅ Replaced ${replacedCount} ingredient keys\n`);

// Replace display_name → display_name_pt
content = content.replace(/display_name: "/g, 'display_name_pt: "');

console.log('✅ Updated display_name → display_name_pt\n');

// Add helper function at the beginning
const helperFunction = `
// Helper function to get ingredient name by locale
export function getIngredientName(ingredientKey: string, locale: string = 'pt'): string {
  const ingredient = INGREDIENTS[ingredientKey];
  if (!ingredient) return ingredientKey;
  
  // Map locale to display_name field
  const localeMap: Record<string, keyof Ingredient> = {
    'pt': 'display_name_pt',
    'pt-BR': 'display_name_pt',
    'br': 'display_name_pt',
    'en': 'display_name_en',
    'en-US': 'display_name_en',
    'es': 'display_name_es',
    'es-MX': 'display_name_es',
    'mx': 'display_name_es',
  };
  
  const displayKey = localeMap[locale] || 'display_name_en';
  return (ingredient[displayKey] as string) || ingredient.display_name_en;
}
`;

content = content.replace(
  'export const INGREDIENTS',
  helperFunction + '\nexport const INGREDIENTS'
);

console.log('✅ Added helper function getIngredientName()\n');

// Write refactored file
const outputPath = path.join(__dirname, '..', 'supabase', 'functions', '_shared', 'meal-ingredients-db-refactored.ts');
fs.writeFileSync(outputPath, content, 'utf8');

console.log('✅ Refactored file saved to: meal-ingredients-db-refactored.ts\n');
console.log('📝 Next steps:');
console.log('1. Review the refactored file');
console.log('2. Manually add display_name_es for Spanish translations');
console.log('3. Mark regional products (pao_de_queijo, requeijao) with regional: true, country: "BR"');
console.log('4. Replace meal-ingredients-db.ts with the refactored version');
console.log('5. Update advanced-meal-generator.ts to use new keys\n');
console.log('✨ Refactoring complete!');
