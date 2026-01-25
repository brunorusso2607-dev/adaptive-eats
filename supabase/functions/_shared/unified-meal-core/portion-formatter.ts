/**
 * PORTION FORMATTER
 * 
 * Formatação de porções humanizadas com GRAMAS SEMPRE INCLUÍDAS
 * 
 * REGRA FUNDAMENTAL: Toda porção DEVE mostrar quantidade humanizada + gramas
 * Exemplos:
 * - "2 ovos cozidos (100g)"
 * - "2 fatias de pão integral (70g)"
 * - "1 copo de suco de laranja (200ml)"
 * - "4 colheres de arroz branco (100g)"
 * 
 * PRIORIDADE DE DADOS:
 * 1. Dados do canonical_ingredients (banco) - DINÂMICO
 * 2. PORTION_CONFIGS (hardcoded) - FALLBACK
 * 3. Genérico (apenas gramas) - ÚLTIMO RECURSO
 */

import { PortionDisplay, CanonicalPortionData } from './types.ts';
import { INGREDIENTS, type Ingredient } from '../meal-ingredients-db.ts';

// ============= CONFIGURAÇÃO DE PORÇÕES POR INGREDIENTE =============
export const PORTION_CONFIGS: Record<string, PortionConfig> = {
  // ===== OVOS =====
  'boiled_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo cozido',
    unit_name_plural: 'ovos cozidos',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 4,
  },
  'fried_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo frito',
    unit_name_plural: 'ovos fritos',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 3,
  },
  'scrambled_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo mexido',
    unit_name_plural: 'ovos mexidos',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 4,
  },
  'poached_eggs': {
    category: 'eggs',
    unit_name_singular: 'ovo poch\u00ea',
    unit_name_plural: 'ovos poch\u00ea',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 3,
  },
  'plain_omelet': {
    category: 'eggs',
    unit_name_singular: 'omelete',
    unit_name_plural: 'omeletes',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== PÃES =====
  'french_bread': {
    category: 'bread',
    unit_name_singular: 'pão francês',
    unit_name_plural: 'pães franceses',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'whole_wheat_bread': {
    category: 'bread',
    unit_name_singular: 'fatia de pão integral',
    unit_name_plural: 'fatias de pão integral',
    grams_per_unit: 35,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 3,
  },
  'white_bread': {
    category: 'bread',
    unit_name_singular: 'fatia de pão branco',
    unit_name_plural: 'fatias de pão branco',
    grams_per_unit: 30,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 3,
  },
  'toast': {
    category: 'bread',
    unit_name_singular: 'torrada',
    unit_name_plural: 'torradas',
    grams_per_unit: 20,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 4,
  },
  'tapioca': {
    category: 'bread',
    unit_name_singular: 'tapioca',
    unit_name_plural: 'tapiocas',
    grams_per_unit: 50,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'whole_wheat_sandwich_bread': {
    category: 'bread',
    unit_name_singular: 'fatia de p\u00e3o de forma integral',
    unit_name_plural: 'fatias de p\u00e3o de forma integral',
    grams_per_unit: 25,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 3,
  },
  'corn_couscous': {
    category: 'bread',
    unit_name_singular: 'por\u00e7\u00e3o de cuscuz',
    unit_name_plural: 'por\u00e7\u00f5es de cuscuz',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 1,
  },
  'gluten_free_bread': {
    category: 'bread',
    unit_name_singular: 'fatia de p\u00e3o sem gl\u00faten',
    unit_name_plural: 'fatias de p\u00e3o sem gl\u00faten',
    grams_per_unit: 25,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 3,
  },
  
  // ===== LÍQUIDOS =====
  'orange_juice': {
    category: 'juice',
    unit_name_singular: 'copo de suco de laranja',
    unit_name_plural: 'copos de suco de laranja',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'water': {
    category: 'water',
    unit_name_singular: 'copo de \u00e1gua',
    unit_name_plural: 'copos de \u00e1gua',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'coconut_water': {
    category: 'juice',
    unit_name_singular: 'copo de \u00e1gua de coco',
    unit_name_plural: 'copos de \u00e1gua de coco',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'milk': {
    category: 'milk',
    unit_name_singular: 'copo de leite',
    unit_name_plural: 'copos de leite',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'skim_milk': {
    category: 'milk',
    unit_name_singular: 'copo de leite desnatado',
    unit_name_plural: 'copos de leite desnatado',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'semi_skimmed_milk': {
    category: 'milk',
    unit_name_singular: 'copo de leite semidesnatado',
    unit_name_plural: 'copos de leite semidesnatado',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'whole_milk': {
    category: 'milk',
    unit_name_singular: 'copo de leite integral',
    unit_name_plural: 'copos de leite integral',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'black_coffee': {
    category: 'coffee',
    unit_name_singular: 'xícara de café',
    unit_name_plural: 'xícaras de café',
    grams_per_unit: 50,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'coffee_with_milk': {
    category: 'coffee',
    unit_name_singular: 'xícara de café com leite',
    unit_name_plural: 'xícaras de café com leite',
    grams_per_unit: 150,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'fresh_orange_juice': {
    category: 'juice',
    unit_name_singular: 'copo de suco de laranja natural',
    unit_name_plural: 'copos de suco de laranja natural',
    grams_per_unit: 200,
    unit_type: 'copo',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'chamomile_tea': {
    category: 'tea',
    unit_name_singular: 'xícara de chá de camomila',
    unit_name_plural: 'xícaras de chá de camomila',
    grams_per_unit: 200,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'green_tea': {
    category: 'tea',
    unit_name_singular: 'xícara de chá verde',
    unit_name_plural: 'xícaras de chá verde',
    grams_per_unit: 200,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'black_tea': {
    category: 'tea',
    unit_name_singular: 'xícara de chá preto',
    unit_name_plural: 'xícaras de chá preto',
    grams_per_unit: 200,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'fennel_tea': {
    category: 'tea',
    unit_name_singular: 'xícara de chá de erva-doce',
    unit_name_plural: 'xícaras de chá de erva-doce',
    grams_per_unit: 200,
    unit_type: 'xicara',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== ARROZ =====
  'white_rice': {
    category: 'rice',
    unit_name_singular: 'colher de sopa de arroz branco',
    unit_name_plural: 'colheres de sopa de arroz branco',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 6,
  },
  'brown_rice': {
    category: 'rice',
    unit_name_singular: 'colher de sopa de arroz integral',
    unit_name_plural: 'colheres de sopa de arroz integral',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 6,
  },
  'seven_grain_rice': {
    category: 'rice',
    unit_name_singular: 'colher de sopa de arroz 7 grãos',
    unit_name_plural: 'colheres de sopa de arroz 7 grãos',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 6,
  },
  
  // ===== FEIJÃO =====
  'beans': {
    category: 'beans',
    unit_name_singular: 'concha de feijão',
    unit_name_plural: 'conchas de feijão',
    grams_per_unit: 80,
    unit_type: 'concha',
    min_quantity: 1,
    max_quantity: 2,
  },
  'black_beans': {
    category: 'beans',
    unit_name_singular: 'concha de feijão preto',
    unit_name_plural: 'conchas de feijão preto',
    grams_per_unit: 80,
    unit_type: 'concha',
    min_quantity: 1,
    max_quantity: 2,
  },
  'white_beans': {
    category: 'beans',
    unit_name_singular: 'concha de feijão branco',
    unit_name_plural: 'conchas de feijão branco',
    grams_per_unit: 80,
    unit_type: 'concha',
    min_quantity: 1,
    max_quantity: 2,
  },
  
  // ===== PROTEÍNAS (sempre mostrar gramas) =====
  'grilled_chicken_breast': {
    category: 'poultry',
    unit_name_singular: 'peito de frango grelhado',
    unit_name_plural: 'peitos de frango grelhados',
    grams_per_unit: 120,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 200,
  },
  'grilled_steak': {
    category: 'beef',
    unit_name_singular: 'bife grelhado',
    unit_name_plural: 'bifes grelhados',
    grams_per_unit: 100,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 200,
  },
  'grilled_tilapia': {
    category: 'fish',
    unit_name_singular: 'tilápia grelhada',
    unit_name_plural: 'tilápias grelhadas',
    grams_per_unit: 150,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 120,
    max_quantity: 200,
  },
  
  // ===== FRUTAS =====
  'banana': {
    category: 'fruit',
    unit_name_singular: 'banana',
    unit_name_plural: 'bananas',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'silver_banana': {
    category: 'fruit',
    unit_name_singular: 'banana prata',
    unit_name_plural: 'bananas prata',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'apple': {
    category: 'fruit',
    unit_name_singular: 'ma\u00e7\u00e3',
    unit_name_plural: 'ma\u00e7\u00e3s',
    grams_per_unit: 150,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'red_apple': {
    category: 'fruit',
    unit_name_singular: 'ma\u00e7\u00e3 vermelha',
    unit_name_plural: 'ma\u00e7\u00e3s vermelhas',
    grams_per_unit: 130,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'orange': {
    category: 'fruit',
    unit_name_singular: 'laranja',
    unit_name_plural: 'laranjas',
    grams_per_unit: 180,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'papaya': {
    category: 'fruit',
    unit_name_singular: 'fatia de mam\u00e3o',
    unit_name_plural: 'fatias de mam\u00e3o',
    grams_per_unit: 150,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 2,
  },
  'melon': {
    category: 'fruit',
    unit_name_singular: 'fatia de mel\u00e3o',
    unit_name_plural: 'fatias de mel\u00e3o',
    grams_per_unit: 200,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 2,
  },
  'watermelon': {
    category: 'fruit',
    unit_name_singular: 'fatia de melancia',
    unit_name_plural: 'fatias de melancia',
    grams_per_unit: 200,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 2,
  },
  'mango': {
    category: 'fruit',
    unit_name_singular: 'manga',
    unit_name_plural: 'mangas',
    grams_per_unit: 150,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 1,
  },
  'strawberry': {
    category: 'fruit',
    unit_name_singular: 'por\u00e7\u00e3o de morangos',
    unit_name_plural: 'por\u00e7\u00f5es de morangos',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'kiwi': {
    category: 'fruit',
    unit_name_singular: 'kiwi',
    unit_name_plural: 'kiwis',
    grams_per_unit: 80,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'guava': {
    category: 'fruit',
    unit_name_singular: 'goiaba',
    unit_name_plural: 'goiabas',
    grams_per_unit: 150,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'pineapple': {
    category: 'fruit',
    unit_name_singular: 'fatia de abacaxi',
    unit_name_plural: 'fatias de abacaxi',
    grams_per_unit: 100,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 2,
  },
  'grapes': {
    category: 'fruit',
    unit_name_singular: 'cacho de uvas',
    unit_name_plural: 'cachos de uvas',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 1,
  },
  
  // ===== LATICÍNIOS =====
  'natural_yogurt': {
    category: 'yogurt',
    unit_name_singular: 'pote de iogurte natural',
    unit_name_plural: 'potes de iogurte natural',
    grams_per_unit: 170,
    unit_type: 'unidade',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 1,
  },
  'plain_yogurt': {
    category: 'yogurt',
    unit_name_singular: 'pote de iogurte natural',
    unit_name_plural: 'potes de iogurte natural',
    grams_per_unit: 150,
    unit_type: 'unidade',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 1,
  },
  'greek_yogurt': {
    category: 'yogurt',
    unit_name_singular: 'pote de iogurte grego',
    unit_name_plural: 'potes de iogurte grego',
    grams_per_unit: 150,
    unit_type: 'unidade',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 1,
  },
  'low_fat_yogurt': {
    category: 'yogurt',
    unit_name_singular: 'pote de iogurte desnatado',
    unit_name_plural: 'potes de iogurte desnatado',
    grams_per_unit: 150,
    unit_type: 'unidade',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 1,
  },
  'minas_cheese': {
    category: 'cheese',
    unit_name_singular: 'fatia de queijo minas',
    unit_name_plural: 'fatias de queijo minas',
    grams_per_unit: 30,
    unit_type: 'fatia',
    min_quantity: 1,
    max_quantity: 2,
  },
  'cottage_cheese': {
    category: 'cheese',
    unit_name_singular: 'colher de sopa de queijo cottage',
    unit_name_plural: 'colheres de sopa de queijo cottage',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 4,
  },
  'ricotta': {
    category: 'cheese',
    unit_name_singular: 'colher de sopa de ricota',
    unit_name_plural: 'colheres de sopa de ricota',
    grams_per_unit: 25,
    unit_type: 'colher_sopa',
    min_quantity: 2,
    max_quantity: 4,
  },
  
  // ===== CONDIMENTOS =====
  'olive_oil': {
    category: 'oil',
    unit_name_singular: 'colher de sopa de azeite',
    unit_name_plural: 'colheres de sopa de azeite',
    grams_per_unit: 10,
    unit_type: 'colher_sopa',
    display_unit: 'ml',
    min_quantity: 1,
    max_quantity: 2,
  },
  'butter': {
    category: 'fat',
    unit_name_singular: 'colher de chá de manteiga',
    unit_name_plural: 'colheres de chá de manteiga',
    grams_per_unit: 5,
    unit_type: 'colher_cha',
    min_quantity: 1,
    max_quantity: 3,
  },
  
  // ===== VEGETAIS (sempre em gramas) =====
  'iceberg_lettuce': {
    category: 'leafy',
    unit_name_singular: 'salada verde',
    unit_name_plural: 'saladas verdes',
    grams_per_unit: 50,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 30,
    max_quantity: 100,
  },
  'tomato': {
    category: 'vegetable',
    unit_name_singular: 'tomate',
    unit_name_plural: 'tomates',
    grams_per_unit: 80,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 3,
  },
  
  // ===== VEGETAIS COZIDOS =====
  'boiled_carrot': {
    category: 'vegetable',
    unit_name_singular: 'cenoura em rodelas',
    unit_name_plural: 'cenouras em rodelas',
    grams_per_unit: 50,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 40,
    max_quantity: 100,
  },
  'boiled_broccoli': {
    category: 'vegetable',
    unit_name_singular: 'brócolis no vapor',
    unit_name_plural: 'porções de brócolis',
    grams_per_unit: 80,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 60,
    max_quantity: 120,
  },
  'boiled_cauliflower': {
    category: 'vegetable',
    unit_name_singular: 'couve-flor no vapor',
    unit_name_plural: 'porções de couve-flor',
    grams_per_unit: 80,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 60,
    max_quantity: 120,
  },
  'boiled_green_beans': {
    category: 'vegetable',
    unit_name_singular: 'vagem no vapor',
    unit_name_plural: 'porções de vagem',
    grams_per_unit: 80,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 60,
    max_quantity: 120,
  },
  'sauteed_zucchini': {
    category: 'vegetable',
    unit_name_singular: 'abobrinha refogada',
    unit_name_plural: 'porções de abobrinha',
    grams_per_unit: 80,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 60,
    max_quantity: 120,
  },
  'sauteed_eggplant': {
    category: 'vegetable',
    unit_name_singular: 'berinjela refogada',
    unit_name_plural: 'porções de berinjela',
    grams_per_unit: 80,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 60,
    max_quantity: 120,
  },
  'sauteed_kale': {
    category: 'vegetable',
    unit_name_singular: 'couve refogada',
    unit_name_plural: 'porções de couve',
    grams_per_unit: 80,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 60,
    max_quantity: 120,
  },
  'sauteed_spinach': {
    category: 'vegetable',
    unit_name_singular: 'espinafre refogado',
    unit_name_plural: 'porções de espinafre',
    grams_per_unit: 80,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 60,
    max_quantity: 120,
  },
  
  // ===== CARBOIDRATOS =====
  'mashed_potato': {
    category: 'carb',
    unit_name_singular: 'purê de batata',
    unit_name_plural: 'porções de purê',
    grams_per_unit: 150,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 200,
  },
  'boiled_sweet_potato': {
    category: 'carb',
    unit_name_singular: 'batata doce cozida',
    unit_name_plural: 'porções de batata doce',
    grams_per_unit: 150,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 200,
  },
  
  // ===== PROTEÍNAS ADICIONAIS =====
  'grilled_salmon': {
    category: 'fish',
    unit_name_singular: 'salmão grelhado',
    unit_name_plural: 'porções de salmão',
    grams_per_unit: 120,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 180,
  },
  'grilled_hake': {
    category: 'fish',
    unit_name_singular: 'pescada grelhada',
    unit_name_plural: 'porções de pescada',
    grams_per_unit: 150,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 120,
    max_quantity: 200,
  },
  'baked_hake': {
    category: 'fish',
    unit_name_singular: 'merluza assada',
    unit_name_plural: 'porções de merluza',
    grams_per_unit: 150,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 120,
    max_quantity: 200,
  },
  'shredded_chicken': {
    category: 'poultry',
    unit_name_singular: 'frango desfiado',
    unit_name_plural: 'porções de frango desfiado',
    grams_per_unit: 100,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 80,
    max_quantity: 150,
  },
  'sauteed_ground_beef': {
    category: 'beef',
    unit_name_singular: 'carne moída refogada',
    unit_name_plural: 'porções de carne moída',
    grams_per_unit: 100,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 80,
    max_quantity: 150,
  },
  'grilled_sirloin_steak': {
    category: 'beef',
    unit_name_singular: 'bife de alcatra grelhado',
    unit_name_plural: 'bifes de alcatra',
    grams_per_unit: 120,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 180,
  },
  'sirloin_steak_with_onions': {
    category: 'beef',
    unit_name_singular: 'bife acebolado',
    unit_name_plural: 'bifes acebolados',
    grams_per_unit: 120,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 180,
  },
  
  // ===== FRUTAS ADICIONAIS =====
  'pear': {
    category: 'fruit',
    unit_name_singular: 'pêra',
    unit_name_plural: 'pêras',
    grams_per_unit: 150,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'tangerine': {
    category: 'fruit',
    unit_name_singular: 'tangerina',
    unit_name_plural: 'tangerinas',
    grams_per_unit: 130,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 2,
  },
  'avocado': {
    category: 'fruit',
    unit_name_singular: 'abacate',
    unit_name_plural: 'abacates',
    grams_per_unit: 100,
    unit_type: 'unidade',
    min_quantity: 1,
    max_quantity: 1,
  },
  'acai': {
    category: 'fruit',
    unit_name_singular: 'porção de açaí',
    unit_name_plural: 'porções de açaí',
    grams_per_unit: 100,
    unit_type: 'g',
    display_unit: 'g',
    min_quantity: 100,
    max_quantity: 200,
  },
};

// ============= INTERFACE =============
interface PortionConfig {
  category: string;
  unit_name_singular: string;
  unit_name_plural: string;
  grams_per_unit: number;
  unit_type: 'g' | 'ml' | 'unidade' | 'fatia' | 'colher_sopa' | 'colher_cha' | 'concha' | 'copo' | 'xicara';
  display_unit?: 'g' | 'ml';
  min_quantity: number;
  max_quantity: number;
}

// ============= FUNÇÃO PRINCIPAL =============
/**
 * Formata porção com quantidade humanizada + gramas SEMPRE
 * @param componentType - Tipo/categoria do componente (beverage, dairy, etc.) para detectar líquidos
 */
export function formatPortion(
  ingredientKey: string,
  grams: number,
  language: string = 'pt-BR',
  componentType?: string
): PortionDisplay {
  // 🔍 LOG DEBUG: Rastrear ingredient_key e tipo
  console.log(`[FORMAT-PORTION] ingredientKey: "${ingredientKey}", grams: ${grams}, componentType: "${componentType}"`);
  
  // ✅ DETECTAR LÍQUIDOS POR MÚLTIPLOS MÉTODOS
  const ingredient = INGREDIENTS[ingredientKey];
  
  // 1. Pelo unit do INGREDIENTS
  const isLiquidByUnit = ingredient?.unit === 'ml';
  
  // 2. Pelo nome/key do ingrediente (APENAS líquidos reais)
  // CUIDADO: "watercress" (agrião) NÃO é líquido, então usamos word boundaries
  const isLiquidByName = /\b(cha|chá|tea|suco|juice|agua|água|leite|milk|cafe|café|coffee|iogurte|yogurt|camomila|erva|hibisco)\b/i.test(ingredientKey) ||
    ingredientKey === 'water' || ingredientKey === 'coconut_water';
  
  // 3. ✅ Pela CATEGORIA/TIPO do componente (APENAS beverage é sempre líquido)
  // dairy NÃO é sempre líquido (queijo, ricota, etc são sólidos)
  const isLiquidByType = componentType === 'beverage';
  
  const isLiquid = isLiquidByUnit || isLiquidByName || isLiquidByType;
  
  console.log(`[FORMAT-PORTION] ingredient found: ${!!ingredient}, unit: ${ingredient?.unit}, isLiquidByUnit: ${isLiquidByUnit}, isLiquidByName: ${isLiquidByName}, isLiquidByType: ${isLiquidByType}, isLiquid: ${isLiquid}`);
  
  // Tentar encontrar config específico
  const config = PORTION_CONFIGS[ingredientKey];
  
  // Se não tem config, usar fallback genérico
  if (!config) {
    console.log(`[FORMAT-PORTION] ⚠️ Config NOT FOUND for "${ingredientKey}" - using generic fallback`);
    return formatGenericPortion(grams, ingredientKey, ingredient, isLiquid);
  }
  
  console.log(`[FORMAT-PORTION] ✅ Config FOUND for "${ingredientKey}", display_unit: ${config.display_unit || 'g'}`);
  
  // Calcular quantidade
  const quantity = Math.round(grams / config.grams_per_unit);
  
  // Determinar unidade de exibição
  let unit = config.unit_type;
  if (config.display_unit) {
    unit = config.display_unit;
  }
  
  // Construir label humanizado
  let label: string;
  
  if (unit === 'g' || unit === 'ml') {
    // Exibir apenas em gramas ou ml (sem quantidade)
    label = `${config.unit_name_singular} (${grams}${unit})`;
  } else {
    // SEMPRE exibir quantidade humanizada + gramas
    const name = quantity === 1 ? config.unit_name_singular : config.unit_name_plural;
    const unitDisplay = config.display_unit || 'g';
    label = `${quantity} ${name} (${grams}${unitDisplay})`;
  }
  
  return {
    quantity,
    unit,
    label,
  };
}

// ============= FALLBACK GENÉRICO =============
/**
 * Formatação genérica para ingredientes sem config específico
 * Detecta líquidos pelo INGREDIENTS[key].unit
 */
function formatGenericPortion(
  grams: number, 
  ingredientKey: string, 
  ingredient: Ingredient | undefined,
  isLiquid: boolean
): PortionDisplay {
  // Usar nome do INGREDIENTS se disponível, senão formatar do key
  const ingredientName = ingredient?.display_name_pt || 
    ingredientKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // ✅ USAR UNIT DO INGREDIENTS (ml para líquidos, g para sólidos)
  const unit = isLiquid ? 'ml' : 'g';
  
  console.log(`[FORMAT-GENERIC] "${ingredientName}" → ${grams}${unit} (isLiquid: ${isLiquid})`);
  
  return {
    quantity: grams,
    unit,
    label: `${ingredientName} (${grams}${unit})`,  // ✅ Nome + quantidade + unidade
  };
}

// ============= FUNÇÃO DINÂMICA (USA DADOS DO BANCO) =============
/**
 * Formata porção usando dados do canonical_ingredients (banco)
 * PRIORIDADE:
 * 1. Dados do banco (canonicalData) - DINÂMICO
 * 2. PORTION_CONFIGS (hardcoded) - FALLBACK
 * 3. Genérico (apenas gramas) - ÚLTIMO RECURSO
 * 
 * @param ingredientKey - Chave do ingrediente (ex: "boiled_eggs")
 * @param grams - Quantidade em gramas
 * @param language - Idioma (ex: "pt-BR")
 * @param componentType - Tipo do componente (ex: "beverage", "dairy")
 * @param canonicalData - Dados de porção do canonical_ingredients (opcional)
 */
export function formatPortionDynamic(
  ingredientKey: string,
  grams: number,
  language: string = 'pt-BR',
  componentType?: string,
  canonicalData?: CanonicalPortionData | null
): PortionDisplay {
  console.log(`[FORMAT-PORTION-DYNAMIC] ingredientKey: "${ingredientKey}", grams: ${grams}, hasCanonicalData: ${!!canonicalData}`);
  
  // ✅ PRIORIDADE 1: Dados do banco (canonical_ingredients)
  if (canonicalData && canonicalData.portion_unit && canonicalData.portion_unit !== 'g') {
    const defaultGrams = canonicalData.default_portion_grams || 100;
    const quantity = Math.max(1, Math.round(grams / defaultGrams));
    const unitName = quantity === 1 
      ? canonicalData.portion_unit_singular_pt 
      : canonicalData.portion_unit_plural_pt;
    const unit = canonicalData.is_liquid ? 'ml' : 'g';
    
    // Se não tem nome de unidade, usar fallback
    if (!unitName) {
      console.log(`[FORMAT-PORTION-DYNAMIC] ⚠️ No unit name for "${ingredientKey}", falling back`);
      return formatPortion(ingredientKey, grams, language, componentType);
    }
    
    const label = `${quantity} ${unitName} (${grams}${unit})`;
    console.log(`[FORMAT-PORTION-DYNAMIC] ✅ Using canonical data: "${label}"`);
    
    return {
      quantity,
      unit,
      label,
    };
  }
  
  // ✅ PRIORIDADE 2 e 3: Fallback para PORTION_CONFIGS ou genérico
  console.log(`[FORMAT-PORTION-DYNAMIC] No canonical data, falling back to formatPortion`);
  return formatPortion(ingredientKey, grams, language, componentType);
}

// ═══════════════════════════════════════════════════════════════════════
// HUMANIZAÇÃO DE NOMES - Torna nomes de ingredientes mais descritivos
// ═══════════════════════════════════════════════════════════════════════

// Mapeamento de nomes humanizados para ingredientes
const HUMANIZED_INGREDIENT_NAMES: Record<string, string> = {
  // Frutas - mais descritivas
  "kiwi": "Kiwi em peda\u00e7os",
  "strawberry": "Morangos frescos",
  "mango": "Manga em cubos",
  "papaya": "Mam\u00e3o papaia em fatias",
  "melon": "Mel\u00e3o em fatias",
  "watermelon": "Melancia em cubos",
  "pineapple": "Abacaxi em rodelas",
  "grapes": "Uvas frescas",
  "silver_banana": "Banana prata",
  "red_apple": "Ma\u00e7\u00e3 vermelha",
  "guava": "Goiaba madura",
  
  // Vegetais - mais descritivos
  "boiled_broccoli": "Br\u00f3colis no vapor",
  "boiled_carrot": "Cenoura em rodelas",
  "boiled_cauliflower": "Couve-flor no vapor",
  "boiled_green_beans": "Vagem no vapor",
  "boiled_beet": "Beterraba cozida em cubos",
  "boiled_pumpkin": "Ab\u00f3bora cozida",
  "boiled_chayote": "Chuchu cozido",
  "sauteed_spinach": "Espinafre refogado",
  "sauteed_kale": "Couve refogada",
  "sauteed_zucchini": "Abobrinha salteada",
  "sauteed_eggplant": "Berinjela salteada",
  "sauteed_okra": "Quiabo refogado",
  "sauteed_cabbage": "Repolho refogado",
  "sauteed_chard": "Acelga refogada",
  "iceberg_lettuce": "Salada de alface americana",
  "curly_lettuce": "Salada de alface crespa",
  "arugula": "Salada de r\u00facula",
  "watercress": "Salada de agri\u00e3o",
  "tomato": "Tomate em rodelas",
  "cucumber": "Pepino em fatias",
  
  // Ovos - com quantidade
  "boiled_eggs": "Ovos cozidos",
  "fried_eggs": "Ovos fritos",
  "scrambled_eggs": "Ovos mexidos",
  "poached_eggs": "Ovos poch\u00ea",
  "plain_omelet": "Omelete simples",
  
  // Laticínios
  "plain_yogurt": "Iogurte natural",
  "greek_yogurt": "Iogurte grego",
  "low_fat_yogurt": "Iogurte desnatado",
  "natural_yogurt": "Iogurte natural",
  
  // Bebidas
  "black_coffee": "Caf\u00e9 preto",
  "coffee_with_milk": "Caf\u00e9 com leite",
  "green_tea": "Ch\u00e1 verde",
  "chamomile_tea": "Ch\u00e1 de camomila",
  "fresh_orange_juice": "Suco de laranja natural",
  "coconut_water": "\u00c1gua de coco",
};

// Mapeamento para combinações especiais (iogurte + fruta)
const HUMANIZED_COMBINATIONS: Record<string, Record<string, string>> = {
  "iogurte": {
    "morango": "com peda\u00e7os de morango",
    "strawberry": "com peda\u00e7os de morango",
    "banana": "com banana em rodelas",
    "silver_banana": "com banana em rodelas",
    "acai": "com a\u00e7a\u00ed",
    "manga": "com manga em cubos",
    "mango": "com manga em cubos",
    "kiwi": "com kiwi em peda\u00e7os",
    "mamao": "com mam\u00e3o em cubos",
    "papaya": "com mam\u00e3o em cubos",
  }
};

/**
 * Humaniza o nome de um ingrediente individual
 */
export function humanizeIngredientName(ingredientKey: string, displayName: string): string {
  // Verificar se tem mapeamento específico
  if (HUMANIZED_INGREDIENT_NAMES[ingredientKey]) {
    return HUMANIZED_INGREDIENT_NAMES[ingredientKey];
  }
  
  // Retornar nome original se não tiver mapeamento
  return displayName;
}

/**
 * Humaniza o nome de uma refeição completa
 * Aplica regras de combinação e descrições mais naturais
 */
export function humanizeMealName(
  mealName: string, 
  components: Array<{name: string, type: string, ingredient_key?: string}>
): string {
  let humanizedName = mealName;
  
  // Regra 1: Se é apenas uma fruta, adicionar descrição
  if (components.length === 1 && components[0].type === 'fruit') {
    const fruitKey = components[0].ingredient_key || '';
    if (HUMANIZED_INGREDIENT_NAMES[fruitKey]) {
      return HUMANIZED_INGREDIENT_NAMES[fruitKey];
    }
  }
  
  // Regra 2: Combinações de iogurte + fruta
  const hasYogurt = components.some(c => 
    c.type === 'dairy' && (c.name.toLowerCase().includes('iogurte') || c.name.toLowerCase().includes('yogurt'))
  );
  
  if (hasYogurt) {
    const fruit = components.find(c => c.type === 'fruit');
    if (fruit) {
      const fruitKey = fruit.ingredient_key || '';
      const fruitLower = fruit.name.toLowerCase();
      
      // Verificar se tem combinação especial
      for (const [key, suffix] of Object.entries(HUMANIZED_COMBINATIONS["iogurte"] || {})) {
        if (fruitKey === key || fruitLower.includes(key)) {
          // Substituir "com {fruta}" por versão humanizada
          const fruitPattern = new RegExp(`com\\s+${fruit.name}`, 'i');
          if (fruitPattern.test(humanizedName)) {
            humanizedName = humanizedName.replace(fruitPattern, suffix);
          }
          break;
        }
      }
    }
  }
  
  return humanizedName;
}

/**
 * Formata a porção com quantidade no início para líquidos e ovos
 * Ex: "1 xícara de café com leite (150ml)", "2 ovos mexidos (100g)"
 */
export function formatPortionWithQuantity(
  ingredientKey: string,
  grams: number,
  language: string = 'pt-BR',
  componentType?: string
): string {
  const config = PORTION_CONFIGS[ingredientKey];
  
  if (!config) {
    // Fallback genérico
    const isLiquid = componentType === 'beverage' || componentType === 'dairy';
    return isLiquid ? `${grams}ml` : `${grams}g`;
  }
  
  const quantity = Math.max(1, Math.round(grams / config.grams_per_unit));
  const unitName = quantity === 1 ? config.unit_name_singular : config.unit_name_plural;
  const displayUnit = config.display_unit || (config.unit_type === 'copo' || config.unit_type === 'xicara' ? 'ml' : 'g');
  
  // Para líquidos, ovos e itens contáveis, incluir quantidade no início
  if (config.unit_type !== 'g') {
    return `${quantity} ${unitName} (${grams}${displayUnit})`;
  }
  
  // Para itens em gramas, usar formato simples
  return `${unitName} (${grams}${displayUnit})`;
}

