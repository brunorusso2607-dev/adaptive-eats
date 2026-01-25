-- ═══════════════════════════════════════════════════════════════════════
-- UPDATE INGREDIENT CATEGORIES
-- ═══════════════════════════════════════════════════════════════════════
-- Atualiza a categoria de todos os ingredientes existentes
-- ═══════════════════════════════════════════════════════════════════════

-- PROTEÍNAS
UPDATE public.ingredient_pool SET category = 'protein' WHERE ingredient_key IN (
  'grilled_chicken_breast', 'baked_chicken_thigh', 'shredded_chicken',
  'grilled_sirloin_steak', 'grilled_round_steak', 'sirloin_steak_with_onions',
  'sauteed_ground_beef', 'grilled_filet_mignon', 'grilled_tilapia',
  'grilled_salmon', 'grilled_hake', 'baked_hake', 'scrambled_eggs',
  'boiled_eggs', 'plain_omelet'
);

-- CARBOIDRATOS
UPDATE public.ingredient_pool SET category = 'carbs' WHERE ingredient_key IN (
  'white_rice', 'brown_rice', 'parboiled_rice', 'boiled_sweet_potato',
  'baked_sweet_potato', 'mashed_sweet_potato', 'boiled_potato',
  'mashed_potato', 'whole_wheat_bread', 'french_bread',
  'whole_wheat_sandwich_bread', 'pasta', 'whole_wheat_pasta',
  'cassava', 'boiled_cassava', 'beans', 'black_beans', 'oats',
  'tapioca', 'couscous', 'quinoa', 'pao_de_queijo',
  'gluten_free_bread', 'gluten_free_pasta', 'rice_flour', 'gluten_free_oats'
);

-- VEGETAIS
UPDATE public.ingredient_pool SET category = 'vegetable' WHERE ingredient_key IN (
  'boiled_broccoli', 'sauteed_kale', 'sauteed_spinach', 'boiled_green_beans',
  'sauteed_zucchini', 'sauteed_eggplant', 'boiled_cauliflower',
  'boiled_carrots', 'sauteed_cabbage', 'sauteed_chard', 'boiled_beets',
  'sauteed_okra', 'sauteed_chayote', 'boiled_pumpkin', 'arugula',
  'watercress', 'lettuce', 'tomato', 'cucumber', 'bell_pepper'
);

-- FRUTAS
UPDATE public.ingredient_pool SET category = 'fruit' WHERE ingredient_key IN (
  'banana', 'apple', 'papaya', 'orange', 'watermelon', 'melon',
  'strawberry', 'pineapple', 'mango', 'grape', 'pear', 'kiwi'
);

-- LATICÍNIOS
UPDATE public.ingredient_pool SET category = 'dairy' WHERE ingredient_key IN (
  'whole_milk', 'skim_milk', 'semi_skimmed_milk', 'plain_yogurt',
  'greek_yogurt', 'low_fat_yogurt', 'minas_cheese', 'cottage_cheese',
  'ricotta_cheese', 'mozzarella_cheese', 'prato_cheese', 'requeijao',
  'lactose_free_milk', 'almond_milk', 'oat_milk', 'soy_milk',
  'vegan_cheese', 'coconut_yogurt'
);

-- GORDURAS
UPDATE public.ingredient_pool SET category = 'fat' WHERE ingredient_key IN (
  'olive_oil', 'coconut_oil', 'butter', 'avocado'
);

-- SEMENTES/OLEAGINOSAS
UPDATE public.ingredient_pool SET category = 'seeds' WHERE ingredient_key IN (
  'chia_seeds', 'flaxseed', 'sesame_seeds', 'sunflower_seeds',
  'pumpkin_seeds', 'brazil_nuts', 'cashews', 'almonds', 'walnuts', 'peanuts'
);

-- BEBIDAS
UPDATE public.ingredient_pool SET category = 'beverage' WHERE ingredient_key IN (
  'orange_juice', 'lemon_juice', 'coconut_water', 'green_tea',
  'chamomile_tea', 'black_coffee', 'coffee_with_milk'
);

-- Verificar quantos ingredientes foram atualizados
SELECT 
  category,
  COUNT(*) as total
FROM public.ingredient_pool
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;

-- Verificar ingredientes sem categoria (devem ser 0)
SELECT 
  ingredient_key,
  display_name_pt
FROM public.ingredient_pool
WHERE category IS NULL
ORDER BY ingredient_key;
