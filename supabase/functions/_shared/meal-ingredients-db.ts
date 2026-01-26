// ═══════════════════════════════════════════════════════════════════════
// ADAPTIVE EATS - DATABASE DE INGREDIENTES (100+ ESPECÍFICOS)
// Todos os ingredientes com macros TACO/TBCA
// ═══════════════════════════════════════════════════════════════════════

export interface Ingredient {
  kcal: number;
  prot: number;
  carbs: number;
  fat: number;
  fiber: number;
  portion: number;
  unit?: 'ml' | 'g'; // Unidade de medida (ml para líquidos, g para sólidos). Default: 'g'
  contains: string[];
  display_name_pt: string; // Portuguese (Brazil)
  regional?: boolean; // True for regional products (e.g., pão de queijo, requeijão)
  country?: string; // Country code for regional products (e.g., 'BR', 'MX') // English (Global)
  display_name_es?: string; // Spanish (optional)
  display_name_en: string;
  never_use_alone?: boolean; // Ingrediente NUNCA deve ser oferecido isolado
  must_combine_with?: string[]; // Tipos de componentes que DEVEM acompanhar (ex: ['protein', 'vegetable'])
  ingredient_category?: 'seasoning' | 'fat_condiment' | 'sweetener' | 'garnish' | 'main'; // Categoria do ingrediente
  carb_category?: 'neutral_base' | 'accepted_whole' | 'restrictive_whole'; // Categoria de carboidrato para estratégia de integrais
}


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

export const INGREDIENTS: Record<string, Ingredient> = {
  // PROTEÍNAS - AVES
  grilled_chicken_breast: { kcal: 159, prot: 32, carbs: 0, fat: 3.2, fiber: 0, portion: 120, contains: [], display_name_pt: "Peito de frango grelhado", display_name_en: "Grilled chicken breast" },
  baked_chicken_thigh: { kcal: 185, prot: 26, carbs: 0, fat: 8.5, fiber: 0, portion: 120, contains: [], display_name_pt: "Coxa de frango assada", display_name_en: "Baked chicken thigh" },
  shredded_chicken: { kcal: 159, prot: 32, carbs: 0, fat: 3.2, fiber: 0, portion: 100, contains: [], display_name_pt: "Frango desfiado", display_name_en: "Shredded chicken" },
  
  // PROTEÍNAS - CARNES BOVINAS
  grilled_sirloin_steak: { kcal: 163, prot: 26, carbs: 0, fat: 6, fiber: 0, portion: 120, contains: [], display_name_pt: "Bife de alcatra grelhado", display_name_en: "Grilled sirloin steak" },
  grilled_round_steak: { kcal: 140, prot: 28, carbs: 0, fat: 3, fiber: 0, portion: 120, contains: [], display_name_pt: "Bife de patinho grelhado", display_name_en: "Grilled round steak" },
  sirloin_steak_with_onions: { kcal: 170, prot: 25, carbs: 2, fat: 7, fiber: 0.5, portion: 120, contains: [], display_name_pt: "Bife de alcatra acebolado", display_name_en: "Sirloin steak with onions" },
  sauteed_ground_beef: { kcal: 215, prot: 21, carbs: 2, fat: 14, fiber: 0.5, portion: 100, contains: [], display_name_pt: "Carne moída refogada", display_name_en: "Sautéed ground beef" },
  grilled_filet_mignon: { kcal: 155, prot: 28, carbs: 0, fat: 4.5, fiber: 0, portion: 120, contains: [], display_name_pt: "Filé mignon grelhado", display_name_en: "Grilled filet mignon" },
  
  // PROTEÍNAS - PEIXES
  grilled_tilapia: { kcal: 96, prot: 20, carbs: 0, fat: 1.7, fiber: 0, portion: 150, contains: [], display_name_pt: "Tilápia grelhada", display_name_en: "Grilled tilapia" },
  grilled_salmon: { kcal: 208, prot: 25, carbs: 0, fat: 11, fiber: 0, portion: 120, contains: [], display_name_pt: "Salmão grelhado", display_name_en: "Grilled salmon" },
  grilled_hake: { kcal: 85, prot: 18, carbs: 0, fat: 1.2, fiber: 0, portion: 150, contains: [], display_name_pt: "Pescada grelhada", display_name_en: "Grilled hake" },
  baked_hake: { kcal: 90, prot: 19, carbs: 0, fat: 1.5, fiber: 0, portion: 150, contains: [], display_name_pt: "Merluza assada", display_name_en: "Baked hake" },
  
  // PROTEÍNAS - OVOS
  scrambled_eggs: { kcal: 143, prot: 13, carbs: 0.7, fat: 9.5, fiber: 0, portion: 100, contains: ["ovo"], display_name_pt: "Ovo mexido", display_name_en: "Scrambled eggs" },
  boiled_eggs: { kcal: 155, prot: 13, carbs: 1.1, fat: 11, fiber: 0, portion: 100, contains: ["ovo"], display_name_pt: "Ovo cozido", display_name_en: "Boiled eggs" },
  plain_omelet: { kcal: 154, prot: 13, carbs: 1.5, fat: 10, fiber: 0, portion: 100, contains: ["ovo"], display_name_pt: "Omelete simples", display_name_en: "Plain omelet" },
  
  // PROTEÍNAS - EMBUTIDOS
  sliced_turkey_breast: { kcal: 104, prot: 22, carbs: 1, fat: 1.5, fiber: 0, portion: 50, contains: [], display_name_pt: "Peito de peru fatiado", display_name_en: "Sliced turkey breast" },
  lean_ham: { kcal: 145, prot: 19, carbs: 2, fat: 7, fiber: 0, portion: 30, contains: [], display_name_pt: "Presunto magro", display_name_en: "Lean ham" },
  
  // PROTEÍNAS - CARNES ESPECIAIS
  grilled_picanha: { kcal: 210, prot: 26, carbs: 0, fat: 11, fiber: 0, portion: 120, contains: [], display_name_pt: "Picanha grelhada", display_name_en: "Grilled picanha" },
  roasted_ribs: { kcal: 290, prot: 24, carbs: 0, fat: 21, fiber: 0, portion: 120, contains: [], display_name_pt: "Costela assada", display_name_en: "Roasted ribs" },
  pot_roast: { kcal: 180, prot: 24, carbs: 3, fat: 8, fiber: 0.5, portion: 120, contains: [], display_name_pt: "Carne de panela", display_name_en: "Pot roast" },
  beef_liver: { kcal: 135, prot: 20, carbs: 5, fat: 3.5, fiber: 0, portion: 100, contains: [], display_name_pt: "Fígado bovino", display_name_en: "Beef liver" },
  fried_chicken_pieces: { kcal: 200, prot: 25, carbs: 0, fat: 11, fiber: 0, portion: 120, contains: [], display_name_pt: "Frango à passarinho", display_name_en: "Fried chicken pieces" },
  baked_chicken_drumstick: { kcal: 190, prot: 24, carbs: 0, fat: 10, fiber: 0, portion: 120, contains: [], display_name_pt: "Sobrecoxa assada", display_name_en: "Baked chicken drumstick" },
  
  // PROTEÍNAS - PEIXES E FRUTOS DO MAR
  canned_tuna: { kcal: 116, prot: 26, carbs: 0, fat: 0.8, fiber: 0, portion: 100, contains: [], display_name_pt: "Atum em lata", display_name_en: "Canned tuna" },
  canned_sardines: { kcal: 208, prot: 25, carbs: 0, fat: 11, fiber: 0, portion: 100, contains: [], display_name_pt: "Sardinha em lata", display_name_en: "Canned sardines" },
  boiled_cod: { kcal: 135, prot: 29, carbs: 0, fat: 1.5, fiber: 0, portion: 120, contains: [], display_name_pt: "Bacalhau cozido", display_name_en: "Boiled cod" },
  grilled_shrimp: { kcal: 99, prot: 21, carbs: 0, fat: 1.5, fiber: 0, portion: 100, contains: ["crustaceos"], display_name_pt: "Camarão grelhado", display_name_en: "Grilled shrimp" },
  
  // PROTEÍNAS - VEGETAIS
  boiled_lentils: { kcal: 93, prot: 6.3, carbs: 16, fat: 0.4, fiber: 5.2, portion: 100, contains: [], display_name_pt: "Lentilha cozida", display_name_en: "Boiled lentils" },
  
  // CARBOIDRATOS - ARROZ
  white_rice: { kcal: 128, prot: 2.5, carbs: 28, fat: 0.2, fiber: 0.5, portion: 100, contains: [], display_name_pt: "Arroz branco", display_name_en: "White rice", carb_category: 'neutral_base' },
  brown_rice: { kcal: 123, prot: 2.6, carbs: 25.8, fat: 1, fiber: 2.7, portion: 100, contains: [], display_name_pt: "Arroz integral", display_name_en: "Brown rice", carb_category: 'restrictive_whole' },
  parboiled_rice: { kcal: 123, prot: 2.5, carbs: 26.2, fat: 0.3, fiber: 1.4, portion: 100, contains: [], display_name_pt: "Arroz parboilizado", display_name_en: "Parboiled rice", carb_category: 'accepted_whole' },
  
  // CARBOIDRATOS - BATATAS
  boiled_sweet_potato: { kcal: 77, prot: 0.6, carbs: 18.4, fat: 0.1, fiber: 2.2, portion: 150, contains: [], display_name_pt: "Batata doce cozida", display_name_en: "Boiled sweet potato", carb_category: 'accepted_whole' },
  baked_sweet_potato: { kcal: 90, prot: 2, carbs: 20.7, fat: 0.2, fiber: 3, portion: 150, contains: [], display_name_pt: "Batata doce assada", display_name_en: "Baked sweet potato", carb_category: 'accepted_whole' },
  boiled_potato: { kcal: 52, prot: 1.2, carbs: 11.9, fat: 0.1, fiber: 1.3, portion: 150, contains: [], display_name_pt: "Batata inglesa cozida", display_name_en: "Boiled potato", carb_category: 'neutral_base' },
  baked_potato: { kcal: 93, prot: 2.5, carbs: 21.2, fat: 0.1, fiber: 1.8, portion: 150, contains: [], display_name_pt: "Batata inglesa assada", display_name_en: "Baked potato", carb_category: 'neutral_base' },
  mashed_potato: { kcal: 83, prot: 1.8, carbs: 17.5, fat: 0.9, fiber: 1.5, portion: 150, contains: ["lactose"], display_name_pt: "Purê de batata", display_name_en: "Mashed potato", carb_category: 'neutral_base' },
  boiled_cassava: { kcal: 125, prot: 0.6, carbs: 30.1, fat: 0.3, fiber: 1.6, portion: 150, contains: [], display_name_pt: "Mandioca cozida", display_name_en: "Boiled cassava", carb_category: 'neutral_base' },
  
  // CARBOIDRATOS - PÃES
  whole_wheat_bread: { kcal: 253, prot: 9.4, carbs: 49, fat: 3.4, fiber: 6.9, portion: 50, contains: ["gluten"], display_name_pt: "Pão integral", display_name_en: "Whole wheat bread", carb_category: 'accepted_whole' },
  french_bread: { kcal: 300, prot: 8, carbs: 58, fat: 3.6, fiber: 2.3, portion: 50, contains: ["gluten"], display_name_pt: "Pão francês", display_name_en: "French bread", carb_category: 'neutral_base' },
  whole_wheat_sandwich_bread: { kcal: 240, prot: 10, carbs: 45, fat: 3, fiber: 7, portion: 50, contains: ["gluten"], display_name_pt: "Pão de forma integral", display_name_en: "Whole wheat sandwich bread", carb_category: 'restrictive_whole' },
  
  // CARBOIDRATOS - OUTROS
  tapioca: { kcal: 357, prot: 0.6, carbs: 88.7, fat: 0.2, fiber: 0.9, portion: 50, contains: [], display_name_pt: "Tapioca", display_name_en: "Tapioca", carb_category: 'neutral_base' },
  oats: { kcal: 394, prot: 13.9, carbs: 66.6, fat: 8.5, fiber: 9.1, portion: 30, contains: [], display_name_pt: "Aveia", display_name_en: "Oats", carb_category: 'accepted_whole' },
  granola: { kcal: 471, prot: 12, carbs: 64, fat: 18, fiber: 7, portion: 30, contains: [], display_name_pt: "Granola", display_name_en: "Granola", carb_category: 'accepted_whole' },
  corn_couscous: { kcal: 112, prot: 2.3, carbs: 25, fat: 0.2, fiber: 1.5, portion: 100, contains: [], display_name_pt: "Cuscuz de milho", display_name_en: "Corn couscous", carb_category: 'accepted_whole' },
  whole_wheat_pasta: { kcal: 124, prot: 5, carbs: 26, fat: 0.5, fiber: 3.5, portion: 100, contains: ["gluten"], display_name_pt: "Macarrão integral", display_name_en: "Whole wheat pasta", carb_category: 'restrictive_whole' },
  pasta: { kcal: 131, prot: 4.5, carbs: 28, fat: 0.4, fiber: 1.2, portion: 100, contains: ["gluten"], display_name_pt: "Macarrão", display_name_en: "Pasta", carb_category: 'neutral_base' },
  toasted_cassava_flour: { kcal: 365, prot: 1.5, carbs: 82, fat: 1.5, fiber: 3, portion: 50, contains: [], display_name_pt: "Farofa", display_name_en: "Toasted cassava flour", carb_category: 'neutral_base' },
  polenta: { kcal: 70, prot: 1.6, carbs: 15.5, fat: 0.2, fiber: 1, portion: 150, contains: [], display_name_pt: "Polenta", display_name_en: "Polenta", carb_category: 'neutral_base' },
  gnocchi: { kcal: 148, prot: 3.5, carbs: 32, fat: 0.5, fiber: 1.5, portion: 150, contains: ["gluten"], display_name_pt: "Nhoque", display_name_en: "Gnocchi", carb_category: 'neutral_base' },
  
  // LEGUMINOSAS
  beans: { kcal: 76, prot: 4.8, carbs: 13.6, fat: 0.5, fiber: 8.5, portion: 100, contains: [], display_name_pt: "Feijão", display_name_en: "Beans" },
  
  // VEGETAIS - FOLHAS
  iceberg_lettuce: { kcal: 15, prot: 1.4, carbs: 2.9, fat: 0.2, fiber: 2.1, portion: 50, contains: [], display_name_pt: "Alface americana", display_name_en: "Iceberg lettuce", never_use_alone: true, must_combine_with: ['vegetable'], ingredient_category: 'garnish' },
  curly_lettuce: { kcal: 15, prot: 1.4, carbs: 2.9, fat: 0.2, fiber: 2.1, portion: 50, contains: [], display_name_pt: "Alface crespa", display_name_en: "Curly lettuce", never_use_alone: true, must_combine_with: ['vegetable'], ingredient_category: 'garnish' },
  arugula: { kcal: 25, prot: 2.6, carbs: 3.7, fat: 0.7, fiber: 1.6, portion: 40, contains: [], display_name_pt: "Rúcula", display_name_en: "Arugula" },
  watercress: { kcal: 11, prot: 2.3, carbs: 1.3, fat: 0.1, fiber: 0.5, portion: 40, contains: [], display_name_pt: "Agrião", display_name_en: "Watercress" },
  sauteed_spinach: { kcal: 35, prot: 3.5, carbs: 4, fat: 1.5, fiber: 2.5, portion: 80, contains: [], display_name_pt: "Espinafre refogado", display_name_en: "Sautéed spinach" },
  sauteed_kale: { kcal: 45, prot: 2.5, carbs: 5.5, fat: 2, fiber: 3.8, portion: 80, contains: [], display_name_pt: "Couve refogada", display_name_en: "Sautéed kale" },
  
  // VEGETAIS - LEGUMES COZIDOS
  boiled_broccoli: { kcal: 34, prot: 2.8, carbs: 6.6, fat: 0.4, fiber: 2.6, portion: 80, contains: [], display_name_pt: "Brócolis cozido", display_name_en: "Boiled broccoli" },
  boiled_cauliflower: { kcal: 25, prot: 2, carbs: 5, fat: 0.3, fiber: 2.5, portion: 80, contains: [], display_name_pt: "Couve-flor cozida", display_name_en: "Boiled cauliflower" },
  boiled_carrot: { kcal: 41, prot: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, portion: 50, contains: [], display_name_pt: "Cenoura cozida", display_name_en: "Boiled carrot" },
  sauteed_zucchini: { kcal: 20, prot: 1.2, carbs: 4.3, fat: 0.2, fiber: 1.1, portion: 80, contains: [], display_name_pt: "Abobrinha refogada", display_name_en: "Sautéed zucchini" },
  boiled_green_beans: { kcal: 31, prot: 1.8, carbs: 7, fat: 0.1, fiber: 2.7, portion: 80, contains: [], display_name_pt: "Vagem cozida", display_name_en: "Boiled green beans" },
  boiled_pumpkin: { kcal: 26, prot: 1, carbs: 6.5, fat: 0.1, fiber: 1.1, portion: 100, contains: [], display_name_pt: "Abóbora cozida", display_name_en: "Boiled pumpkin" },
  boiled_chayote: { kcal: 19, prot: 0.8, carbs: 4.5, fat: 0.1, fiber: 1.3, portion: 100, contains: [], display_name_pt: "Chuchu cozido", display_name_en: "Boiled chayote" },
  sauteed_okra: { kcal: 33, prot: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2, portion: 80, contains: [], display_name_pt: "Quiabo refogado", display_name_en: "Sautéed okra" },
  sauteed_eggplant: { kcal: 24, prot: 1, carbs: 5.7, fat: 0.2, fiber: 2.5, portion: 80, contains: [], display_name_pt: "Berinjela refogada", display_name_en: "Sautéed eggplant" },
  boiled_beet: { kcal: 49, prot: 1.9, carbs: 11.1, fat: 0.2, fiber: 2.5, portion: 80, contains: [], display_name_pt: "Beterraba cozida", display_name_en: "Boiled beet" },
  sauteed_gherkin: { kcal: 18, prot: 0.7, carbs: 4.2, fat: 0.1, fiber: 1.5, portion: 80, contains: [], display_name_pt: "Maxixe refogado", display_name_en: "Sautéed gherkin" },
  sauteed_scarlet_eggplant: { kcal: 27, prot: 1.4, carbs: 6, fat: 0.2, fiber: 2.8, portion: 80, contains: [], display_name_pt: "Jiló refogado", display_name_en: "Sautéed scarlet eggplant" },
  sauteed_cabbage: { kcal: 22, prot: 1.1, carbs: 5.1, fat: 0.1, fiber: 2.3, portion: 80, contains: [], display_name_pt: "Repolho refogado", display_name_en: "Sautéed cabbage" },
  sauteed_chard: { kcal: 19, prot: 1.8, carbs: 3.7, fat: 0.2, fiber: 1.6, portion: 80, contains: [], display_name_pt: "Acelga refogada", display_name_en: "Sautéed chard" },
  
  // VEGETAIS - SALADA CRUA
  tomato: { kcal: 18, prot: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, portion: 80, contains: [], display_name_pt: "Tomate", display_name_en: "Tomato", never_use_alone: true, must_combine_with: ['vegetable'], ingredient_category: 'garnish' },
  cucumber: { kcal: 15, prot: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, portion: 80, contains: [], display_name_pt: "Pepino", display_name_en: "Cucumber", never_use_alone: true, must_combine_with: ['vegetable'], ingredient_category: 'garnish' },
  green_bell_pepper: { kcal: 20, prot: 0.9, carbs: 4.6, fat: 0.2, fiber: 1.7, portion: 50, contains: [], display_name_pt: "Pimentão verde", display_name_en: "Green bell pepper" },
  red_bell_pepper: { kcal: 31, prot: 1, carbs: 7.2, fat: 0.3, fiber: 2.1, portion: 50, contains: [], display_name_pt: "Pimentão vermelho", display_name_en: "Red bell pepper" },
  yellow_bell_pepper: { kcal: 27, prot: 1, carbs: 6.3, fat: 0.2, fiber: 1.7, portion: 50, contains: [], display_name_pt: "Pimentão amarelo", display_name_en: "Yellow bell pepper" },
  grated_carrot: { kcal: 41, prot: 0.9, carbs: 9.6, fat: 0.2, fiber: 2.8, portion: 50, contains: [], display_name_pt: "Cenoura ralada", display_name_en: "Grated carrot", never_use_alone: true, must_combine_with: ['vegetable'], ingredient_category: 'garnish' },
  
  // VEGETAIS - TEMPEROS/AROMÁTICOS
  sauteed_onion: { kcal: 40, prot: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, portion: 30, contains: [], display_name_pt: "Cebola refogada", display_name_en: "Sautéed onion", never_use_alone: true, must_combine_with: ['protein', 'carb'], ingredient_category: 'seasoning' },
  sauteed_garlic: { kcal: 149, prot: 6.4, carbs: 33.1, fat: 0.5, fiber: 2.1, portion: 5, contains: [], display_name_pt: "Alho refogado", display_name_en: "Sautéed garlic", never_use_alone: true, must_combine_with: ['protein', 'carb'], ingredient_category: 'seasoning' },
  parsley_and_scallions: { kcal: 36, prot: 3, carbs: 6.3, fat: 0.8, fiber: 3.3, portion: 10, contains: [], display_name_pt: "Cheiro verde", display_name_en: "Parsley and scallions", never_use_alone: true, must_combine_with: ['protein', 'carb'], ingredient_category: 'seasoning' },
  
  // FRUTAS
  silver_banana: { kcal: 89, prot: 1.1, carbs: 22.8, fat: 0.3, fiber: 2.6, portion: 100, contains: [], display_name_pt: "Banana prata", display_name_en: "Silver banana" },
  red_apple: { kcal: 52, prot: 0.3, carbs: 13.8, fat: 0.2, fiber: 2.4, portion: 130, contains: [], display_name_pt: "Maçã vermelha", display_name_en: "Red apple" },
  strawberry: { kcal: 32, prot: 0.7, carbs: 7.7, fat: 0.3, fiber: 2, portion: 100, contains: [], display_name_pt: "Morango", display_name_en: "Strawberry" },
  papaya: { kcal: 43, prot: 0.5, carbs: 11.3, fat: 0.1, fiber: 1.7, portion: 150, contains: [], display_name_pt: "Mamão papaia", display_name_en: "Papaya" },
  mango: { kcal: 60, prot: 0.8, carbs: 15, fat: 0.4, fiber: 1.6, portion: 150, contains: [], display_name_pt: "Manga", display_name_en: "Mango" },
  pear: { kcal: 57, prot: 0.4, carbs: 15.2, fat: 0.1, fiber: 3.1, portion: 150, contains: [], display_name_pt: "Pêra", display_name_en: "Pear" },
  orange: { kcal: 47, prot: 0.9, carbs: 11.7, fat: 0.1, fiber: 2.4, portion: 180, contains: [], display_name_pt: "Laranja", display_name_en: "Orange" },
  watermelon: { kcal: 30, prot: 0.6, carbs: 7.6, fat: 0.2, fiber: 0.4, portion: 200, contains: [], display_name_pt: "Melancia", display_name_en: "Watermelon" },
  melon: { kcal: 29, prot: 0.7, carbs: 7.5, fat: 0.1, fiber: 0.3, portion: 200, contains: [], display_name_pt: "Melão", display_name_en: "Melon" },
  pineapple: { kcal: 48, prot: 0.5, carbs: 12.3, fat: 0.1, fiber: 1, portion: 150, contains: [], display_name_pt: "Abacaxi", display_name_en: "Pineapple" },
  guava: { kcal: 54, prot: 1.1, carbs: 14.3, fat: 0.4, fiber: 6.2, portion: 150, contains: [], display_name_pt: "Goiaba", display_name_en: "Guava" },
  grapes: { kcal: 69, prot: 0.7, carbs: 18.1, fat: 0.2, fiber: 0.9, portion: 100, contains: [], display_name_pt: "Uva", display_name_en: "Grapes" },
  kiwi: { kcal: 61, prot: 1.1, carbs: 14.7, fat: 0.5, fiber: 3, portion: 100, contains: [], display_name_pt: "Kiwi", display_name_en: "Kiwi" },
  tangerine: { kcal: 53, prot: 0.8, carbs: 13.3, fat: 0.3, fiber: 1.8, portion: 130, contains: [], display_name_pt: "Tangerina", display_name_en: "Tangerine" },
  avocado: { kcal: 160, prot: 2, carbs: 8.5, fat: 14.7, fiber: 6.7, portion: 100, contains: [], display_name_pt: "Abacate", display_name_en: "Avocado" },
  acai: { kcal: 58, prot: 0.8, carbs: 6.2, fat: 3.9, fiber: 2.6, portion: 100, contains: [], display_name_pt: "Açaí", display_name_en: "Açaí" },
  
  // LATICÍNIOS
  plain_yogurt: { kcal: 61, prot: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, portion: 150, unit: 'ml', contains: ["lactose"], display_name_pt: "Iogurte natural", display_name_en: "Plain yogurt" },
  greek_yogurt: { kcal: 97, prot: 9, carbs: 3.6, fat: 5, fiber: 0, portion: 150, unit: 'ml', contains: ["lactose"], display_name_pt: "Iogurte grego", display_name_en: "Greek yogurt" },
  low_fat_yogurt: { kcal: 43, prot: 4.3, carbs: 6, fat: 0.2, fiber: 0, portion: 150, unit: 'ml', contains: ["lactose"], display_name_pt: "Iogurte desnatado", display_name_en: "Low-fat yogurt" },
  fruit_yogurt: { kcal: 90, prot: 3, carbs: 16, fat: 1.5, fiber: 0.5, portion: 150, unit: 'ml', contains: ["lactose"], display_name_pt: "Iogurte com frutas", display_name_en: "Fruit yogurt" },
  minas_cheese: { kcal: 264, prot: 17.4, carbs: 3.1, fat: 20.8, fiber: 0, portion: 30, contains: ["lactose"], display_name_pt: "Queijo minas", display_name_en: "Minas cheese" },
  cottage_cheese: { kcal: 98, prot: 11.1, carbs: 3.4, fat: 4.3, fiber: 0, portion: 50, contains: ["lactose"], display_name_pt: "Queijo cottage", display_name_en: "Cottage cheese" },
  prato_cheese: { kcal: 360, prot: 25.8, carbs: 1.2, fat: 28.5, fiber: 0, portion: 30, contains: ["lactose"], display_name_pt: "Queijo prato", display_name_en: "Prato cheese" },
  mozzarella_cheese: { kcal: 280, prot: 18.1, carbs: 3.1, fat: 22.4, fiber: 0, portion: 30, contains: ["lactose"], display_name_pt: "Queijo mussarela", display_name_en: "Mozzarella cheese" },
  ricotta: { kcal: 138, prot: 11.3, carbs: 3.4, fat: 9, fiber: 0, portion: 50, contains: ["lactose"], display_name_pt: "Ricota", display_name_en: "Ricotta" },
  light_cream_cheese: { kcal: 180, prot: 10, carbs: 4, fat: 14, fiber: 0, portion: 30, contains: ["lactose"], display_name_pt: "Requeijão light", display_name_en: "Light cream cheese" },
  skim_milk: { kcal: 35, prot: 3.4, carbs: 4.9, fat: 0.2, fiber: 0, portion: 200, unit: 'ml', contains: ["lactose"], display_name_pt: "Leite desnatado", display_name_en: "Skim milk" },
  semi_skimmed_milk: { kcal: 49, prot: 3.3, carbs: 4.8, fat: 1.9, fiber: 0, portion: 200, unit: 'ml', contains: ["lactose"], display_name_pt: "Leite semidesnatado", display_name_en: "Semi-skimmed milk" },
  whole_milk: { kcal: 61, prot: 3.2, carbs: 4.6, fat: 3.5, fiber: 0, portion: 200, unit: 'ml', contains: ["lactose"], display_name_pt: "Leite integral", display_name_en: "Whole milk" },
  
  // BEBIDAS
  coffee_with_milk: { kcal: 35, prot: 1.8, carbs: 2.7, fat: 2, fiber: 0, portion: 200, unit: 'ml', contains: ["lactose"], display_name_pt: "Café com leite", display_name_en: "Coffee with milk" },
  black_coffee: { kcal: 2, prot: 0.1, carbs: 0, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Café preto", display_name_en: "Black coffee" },
  green_tea: { kcal: 1, prot: 0, carbs: 0, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá verde", display_name_en: "Green tea" },
  chamomile_tea: { kcal: 1, prot: 0, carbs: 0.2, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de camomila", display_name_en: "Chamomile tea" },
  black_tea: { kcal: 1, prot: 0, carbs: 0.3, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá preto", display_name_en: "Black tea" },
  fennel_tea: { kcal: 2, prot: 0, carbs: 0.5, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de erva-doce", display_name_en: "Fennel tea" },
  fresh_orange_juice: { kcal: 45, prot: 0.7, carbs: 10.4, fat: 0.2, fiber: 0.2, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de laranja natural", display_name_en: "Fresh orange juice" },
  lemon_juice: { kcal: 22, prot: 0.4, carbs: 7, fat: 0.2, fiber: 0.4, portion: 200, unit: 'ml', contains: [], display_name_pt: "Suco de limão", display_name_en: "Lemon juice" },
  coconut_water: { kcal: 19, prot: 0.7, carbs: 3.7, fat: 0.2, fiber: 1.1, portion: 200, unit: 'ml', contains: [], display_name_pt: "Água de coco", display_name_en: "Coconut water" },
  banana_smoothie: { kcal: 128, prot: 4.5, carbs: 26.7, fat: 1.2, fiber: 2.6, portion: 250, unit: 'ml', contains: ["lactose"], display_name_pt: "Vitamina de banana", display_name_en: "Banana smoothie" },
  hibiscus_tea: { kcal: 1, prot: 0, carbs: 0.2, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de hibisco", display_name_en: "Hibiscus tea" },
  lemon_balm_tea: { kcal: 1, prot: 0, carbs: 0.2, fat: 0, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Chá de melissa", display_name_en: "Lemon balm tea" },
  
  // GORDURAS
  olive_oil: { kcal: 884, prot: 0, carbs: 0, fat: 100, fiber: 0, portion: 10, contains: [], display_name_pt: "Azeite de oliva", display_name_en: "Olive oil", never_use_alone: true, must_combine_with: ['vegetable', 'protein'], ingredient_category: 'fat_condiment' },
  extra_virgin_olive_oil: { kcal: 884, prot: 0, carbs: 0, fat: 100, fiber: 0, portion: 10, contains: [], display_name_pt: "Azeite extra virgem", display_name_en: "Extra virgin olive oil", never_use_alone: true, must_combine_with: ['vegetable', 'protein'], ingredient_category: 'fat_condiment' },
  brazil_nuts: { kcal: 656, prot: 14.3, carbs: 12.3, fat: 63.5, fiber: 7.5, portion: 20, contains: [], display_name_pt: "Castanha do Pará", display_name_en: "Brazil nuts" },
  cashew_nuts: { kcal: 553, prot: 18.2, carbs: 30.2, fat: 43.8, fiber: 3.3, portion: 20, contains: [], display_name_pt: "Castanha de caju", display_name_en: "Cashew nuts" },
  peanuts: { kcal: 544, prot: 27.2, carbs: 20.3, fat: 43.9, fiber: 8, portion: 20, contains: [], display_name_pt: "Amendoim", display_name_en: "Peanuts" },
  walnuts: { kcal: 654, prot: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, portion: 20, contains: [], display_name_pt: "Nozes", display_name_en: "Walnuts" },
  
  // SEMENTES E OUTROS
  chia_seeds: { kcal: 486, prot: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4, portion: 10, contains: [], display_name_pt: "Chia", display_name_en: "Chia seeds" },
  flaxseed: { kcal: 495, prot: 14.1, carbs: 28.9, fat: 42.2, fiber: 33.5, portion: 10, contains: [], display_name_pt: "Linhaça", display_name_en: "Flaxseed" },
  sesame_seeds: { kcal: 573, prot: 17.7, carbs: 23.4, fat: 49.7, fiber: 11.8, portion: 10, contains: [], display_name_pt: "Gergelim", display_name_en: "Sesame seeds" },
  honey: { kcal: 304, prot: 0.3, carbs: 82.4, fat: 0, fiber: 0.2, portion: 20, contains: [], display_name_pt: "Mel", display_name_en: "Honey", never_use_alone: true, must_combine_with: ['dairy', 'grain'], ingredient_category: 'sweetener' },
  shredded_coconut: { kcal: 354, prot: 3.3, carbs: 15.2, fat: 33.5, fiber: 9, portion: 20, contains: [], display_name_pt: "Coco ralado", display_name_en: "Shredded coconut" },
  tomato_sauce: { kcal: 29, prot: 1.2, carbs: 6.7, fat: 0.2, fiber: 1.5, portion: 50, contains: [], display_name_pt: "Molho de tomate", display_name_en: "Tomato sauce" },
  soy_sauce: { kcal: 53, prot: 5.6, carbs: 4.9, fat: 0.1, fiber: 0.8, portion: 15, contains: [], display_name_pt: "Shoyu", display_name_en: "Soy sauce" },
  vinegar: { kcal: 19, prot: 0, carbs: 0.9, fat: 0, fiber: 0, portion: 15, contains: [], display_name_pt: "Vinagre", display_name_en: "Vinegar" },

  // 
  // ALTERNATIVAS PARA INTOLERANCIAS
  // 

  // LACTOSE - Leites
  lactose_free_milk: { kcal: 61, prot: 3.2, carbs: 4.6, fat: 3.5, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Leite sem lactose", display_name_en: "Lactose-free milk" },
  lactose_free_coffee_with_milk: { kcal: 35, prot: 1.8, carbs: 2.7, fat: 2, fiber: 0, portion: 200, unit: 'ml', contains: [], display_name_pt: "Cafe com leite sem lactose", display_name_en: "Coffee with lactose-free milk" },

  // LACTOSE - Queijos
  lactose_free_minas_cheese: { kcal: 264, prot: 17.4, carbs: 3.1, fat: 20.8, fiber: 0, portion: 30, contains: [], display_name_pt: "Queijo minas sem lactose", display_name_en: "Lactose-free minas cheese" },
  lactose_free_cream_cheese: { kcal: 180, prot: 10, carbs: 4, fat: 14, fiber: 0, portion: 30, contains: [], display_name_pt: "Requeijao sem lactose", display_name_en: "Lactose-free cream cheese" },
  lactose_free_cottage: { kcal: 98, prot: 11.1, carbs: 3.4, fat: 4.3, fiber: 0, portion: 50, contains: [], display_name_pt: "Cottage sem lactose", display_name_en: "Lactose-free cottage cheese" },
  lactose_free_ricotta: { kcal: 138, prot: 11.3, carbs: 3.4, fat: 9, fiber: 0, portion: 50, contains: [], display_name_pt: "Ricota sem lactose", display_name_en: "Lactose-free ricotta" },

  // LACTOSE - Iogurtes
  lactose_free_yogurt: { kcal: 61, prot: 3.5, carbs: 4.7, fat: 3.3, fiber: 0, portion: 150, unit: 'ml', contains: [], display_name_pt: "Iogurte sem lactose", display_name_en: "Lactose-free yogurt" },

  // GLUTEN - Paes
  gluten_free_bread: { kcal: 240, prot: 8, carbs: 45, fat: 3, fiber: 7, portion: 50, contains: [], display_name_pt: "Pao sem gluten", display_name_en: "Gluten-free bread" },

  // GLUTEN - Massas
  gluten_free_pasta: { kcal: 131, prot: 4.5, carbs: 28, fat: 0.4, fiber: 1.2, portion: 100, contains: [], display_name_pt: "Macarrao sem gluten", display_name_en: "Gluten-free pasta" },

  // GLUTEN - Aveia
  gluten_free_oats: { kcal: 394, prot: 13.9, carbs: 66.6, fat: 8.5, fiber: 9.1, portion: 30, contains: [], display_name_pt: "Aveia sem gluten", display_name_en: "Gluten-free oats" },
};

