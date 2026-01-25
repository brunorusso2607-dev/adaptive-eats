-- =====================================================
-- SEED: Popular dados de porção para canonical_ingredients
-- =====================================================

-- ===== OVOS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'ovo cozido',
  portion_unit_plural_pt = 'ovos cozidos',
  is_liquid = FALSE
WHERE name_pt ILIKE '%ovo cozido%' OR name_en ILIKE '%boiled egg%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'ovo mexido',
  portion_unit_plural_pt = 'ovos mexidos',
  is_liquid = FALSE
WHERE name_pt ILIKE '%ovo mexido%' OR name_en ILIKE '%scrambled egg%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'ovo frito',
  portion_unit_plural_pt = 'ovos fritos',
  is_liquid = FALSE
WHERE name_pt ILIKE '%ovo frito%' OR name_en ILIKE '%fried egg%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'ovo',
  portion_unit_plural_pt = 'ovos',
  is_liquid = FALSE
WHERE (name_pt ILIKE '%ovo%' OR name_en ILIKE '%egg%') 
  AND portion_unit = 'g';

-- ===== LATICÍNIOS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 150,
  portion_unit = 'pote',
  portion_unit_singular_pt = 'pote de iogurte',
  portion_unit_plural_pt = 'potes de iogurte',
  is_liquid = TRUE
WHERE name_pt ILIKE '%iogurte%' OR name_en ILIKE '%yogurt%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 200,
  portion_unit = 'copo',
  portion_unit_singular_pt = 'copo de leite',
  portion_unit_plural_pt = 'copos de leite',
  is_liquid = TRUE
WHERE (name_pt ILIKE '%leite%' OR name_en ILIKE '%milk%')
  AND name_pt NOT ILIKE '%coco%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 30,
  portion_unit = 'fatia',
  portion_unit_singular_pt = 'fatia de queijo',
  portion_unit_plural_pt = 'fatias de queijo',
  is_liquid = FALSE
WHERE name_pt ILIKE '%queijo%' OR name_en ILIKE '%cheese%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 20,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de requeijão',
  portion_unit_plural_pt = 'colheres de requeijão',
  is_liquid = FALSE
WHERE name_pt ILIKE '%requeijão%' OR name_pt ILIKE '%requeijao%';

-- ===== PÃES =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'pão francês',
  portion_unit_plural_pt = 'pães franceses',
  is_liquid = FALSE
WHERE name_pt ILIKE '%pão francês%' OR name_pt ILIKE '%pao frances%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 35,
  portion_unit = 'fatia',
  portion_unit_singular_pt = 'fatia de pão integral',
  portion_unit_plural_pt = 'fatias de pão integral',
  is_liquid = FALSE
WHERE name_pt ILIKE '%pão integral%' OR name_pt ILIKE '%pao integral%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 30,
  portion_unit = 'fatia',
  portion_unit_singular_pt = 'fatia de pão',
  portion_unit_plural_pt = 'fatias de pão',
  is_liquid = FALSE
WHERE (name_pt ILIKE '%pão%' OR name_pt ILIKE '%pao%' OR name_en ILIKE '%bread%')
  AND portion_unit = 'g';

UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'tapioca',
  portion_unit_plural_pt = 'tapiocas',
  is_liquid = FALSE
WHERE name_pt ILIKE '%tapioca%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 20,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'torrada',
  portion_unit_plural_pt = 'torradas',
  is_liquid = FALSE
WHERE name_pt ILIKE '%torrada%' OR name_en ILIKE '%toast%';

-- ===== CEREAIS E GRÃOS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 25,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de arroz',
  portion_unit_plural_pt = 'colheres de arroz',
  is_liquid = FALSE
WHERE name_pt ILIKE '%arroz%' OR name_en ILIKE '%rice%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 60,
  portion_unit = 'concha',
  portion_unit_singular_pt = 'concha de feijão',
  portion_unit_plural_pt = 'conchas de feijão',
  is_liquid = FALSE
WHERE name_pt ILIKE '%feijão%' OR name_pt ILIKE '%feijao%' OR name_en ILIKE '%bean%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 30,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de aveia',
  portion_unit_plural_pt = 'colheres de aveia',
  is_liquid = FALSE
WHERE name_pt ILIKE '%aveia%' OR name_en ILIKE '%oat%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 30,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de granola',
  portion_unit_plural_pt = 'colheres de granola',
  is_liquid = FALSE
WHERE name_pt ILIKE '%granola%';

-- ===== SEMENTES E OLEAGINOSAS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 10,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de chia',
  portion_unit_plural_pt = 'colheres de chia',
  is_liquid = FALSE
WHERE name_pt ILIKE '%chia%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 10,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de linhaça',
  portion_unit_plural_pt = 'colheres de linhaça',
  is_liquid = FALSE
WHERE name_pt ILIKE '%linhaça%' OR name_pt ILIKE '%linhaca%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 30,
  portion_unit = 'punhado',
  portion_unit_singular_pt = 'punhado de castanha',
  portion_unit_plural_pt = 'punhados de castanha',
  is_liquid = FALSE
WHERE name_pt ILIKE '%castanha%' OR name_en ILIKE '%nut%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 30,
  portion_unit = 'punhado',
  portion_unit_singular_pt = 'punhado de amêndoa',
  portion_unit_plural_pt = 'punhados de amêndoa',
  is_liquid = FALSE
WHERE name_pt ILIKE '%amêndoa%' OR name_pt ILIKE '%amendoa%' OR name_en ILIKE '%almond%';

-- ===== FRUTAS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 100,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'banana',
  portion_unit_plural_pt = 'bananas',
  is_liquid = FALSE
WHERE name_pt ILIKE '%banana%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 150,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'maçã',
  portion_unit_plural_pt = 'maçãs',
  is_liquid = FALSE
WHERE name_pt ILIKE '%maçã%' OR name_pt ILIKE '%maca%' OR name_en ILIKE '%apple%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 150,
  portion_unit = 'fatia',
  portion_unit_singular_pt = 'fatia de mamão',
  portion_unit_plural_pt = 'fatias de mamão',
  is_liquid = FALSE
WHERE name_pt ILIKE '%mamão%' OR name_pt ILIKE '%mamao%' OR name_en ILIKE '%papaya%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 100,
  portion_unit = 'fatia',
  portion_unit_singular_pt = 'fatia de melancia',
  portion_unit_plural_pt = 'fatias de melancia',
  is_liquid = FALSE
WHERE name_pt ILIKE '%melancia%' OR name_en ILIKE '%watermelon%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 100,
  portion_unit = 'fatia',
  portion_unit_singular_pt = 'fatia de abacaxi',
  portion_unit_plural_pt = 'fatias de abacaxi',
  is_liquid = FALSE
WHERE name_pt ILIKE '%abacaxi%' OR name_en ILIKE '%pineapple%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 100,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'laranja',
  portion_unit_plural_pt = 'laranjas',
  is_liquid = FALSE
WHERE name_pt ILIKE '%laranja%' AND name_pt NOT ILIKE '%suco%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 100,
  portion_unit = 'cacho',
  portion_unit_singular_pt = 'cacho de uva',
  portion_unit_plural_pt = 'cachos de uva',
  is_liquid = FALSE
WHERE name_pt ILIKE '%uva%' OR name_en ILIKE '%grape%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 100,
  portion_unit = 'unidade',
  portion_unit_singular_pt = 'manga',
  portion_unit_plural_pt = 'mangas',
  is_liquid = FALSE
WHERE name_pt ILIKE '%manga%' OR name_en ILIKE '%mango%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 100,
  portion_unit = 'punhado',
  portion_unit_singular_pt = 'punhado de morango',
  portion_unit_plural_pt = 'punhados de morango',
  is_liquid = FALSE
WHERE name_pt ILIKE '%morango%' OR name_en ILIKE '%strawberry%';

-- ===== BEBIDAS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 200,
  portion_unit = 'copo',
  portion_unit_singular_pt = 'copo de suco',
  portion_unit_plural_pt = 'copos de suco',
  is_liquid = TRUE
WHERE name_pt ILIKE '%suco%' OR name_en ILIKE '%juice%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'xícara',
  portion_unit_singular_pt = 'xícara de café',
  portion_unit_plural_pt = 'xícaras de café',
  is_liquid = TRUE
WHERE name_pt ILIKE '%café%' OR name_pt ILIKE '%cafe%' OR name_en ILIKE '%coffee%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 200,
  portion_unit = 'xícara',
  portion_unit_singular_pt = 'xícara de chá',
  portion_unit_plural_pt = 'xícaras de chá',
  is_liquid = TRUE
WHERE name_pt ILIKE '%chá%' OR name_pt ILIKE '%cha %' OR name_en ILIKE '%tea%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 200,
  portion_unit = 'copo',
  portion_unit_singular_pt = 'copo de água',
  portion_unit_plural_pt = 'copos de água',
  is_liquid = TRUE
WHERE name_pt ILIKE '%água%' OR name_pt ILIKE '%agua%' OR name_en ILIKE '%water%';

-- ===== PROTEÍNAS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 120,
  portion_unit = 'filé',
  portion_unit_singular_pt = 'filé de frango',
  portion_unit_plural_pt = 'filés de frango',
  is_liquid = FALSE
WHERE name_pt ILIKE '%frango%' OR name_en ILIKE '%chicken%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 120,
  portion_unit = 'bife',
  portion_unit_singular_pt = 'bife',
  portion_unit_plural_pt = 'bifes',
  is_liquid = FALSE
WHERE name_pt ILIKE '%bife%' OR name_pt ILIKE '%carne%' OR name_en ILIKE '%beef%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 120,
  portion_unit = 'filé',
  portion_unit_singular_pt = 'filé de peixe',
  portion_unit_plural_pt = 'filés de peixe',
  is_liquid = FALSE
WHERE name_pt ILIKE '%peixe%' OR name_pt ILIKE '%tilápia%' OR name_pt ILIKE '%salmão%' 
   OR name_en ILIKE '%fish%' OR name_en ILIKE '%salmon%';

-- ===== VEGETAIS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'porção',
  portion_unit_singular_pt = 'porção de salada',
  portion_unit_plural_pt = 'porções de salada',
  is_liquid = FALSE
WHERE name_pt ILIKE '%salada%' OR name_pt ILIKE '%alface%' OR name_en ILIKE '%salad%' OR name_en ILIKE '%lettuce%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 50,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de legume',
  portion_unit_plural_pt = 'colheres de legume',
  is_liquid = FALSE
WHERE (name_pt ILIKE '%brócolis%' OR name_pt ILIKE '%cenoura%' OR name_pt ILIKE '%abobrinha%' 
    OR name_pt ILIKE '%vagem%' OR name_pt ILIKE '%couve%')
  AND portion_unit = 'g';

-- ===== GORDURAS =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 10,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de azeite',
  portion_unit_plural_pt = 'colheres de azeite',
  is_liquid = TRUE
WHERE name_pt ILIKE '%azeite%' OR name_en ILIKE '%olive oil%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 10,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de manteiga',
  portion_unit_plural_pt = 'colheres de manteiga',
  is_liquid = FALSE
WHERE name_pt ILIKE '%manteiga%' OR name_en ILIKE '%butter%';

UPDATE canonical_ingredients SET 
  default_portion_grams = 15,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de pasta de amendoim',
  portion_unit_plural_pt = 'colheres de pasta de amendoim',
  is_liquid = FALSE
WHERE name_pt ILIKE '%pasta de amendoim%' OR name_en ILIKE '%peanut butter%';

-- ===== DOCES =====
UPDATE canonical_ingredients SET 
  default_portion_grams = 15,
  portion_unit = 'colher',
  portion_unit_singular_pt = 'colher de mel',
  portion_unit_plural_pt = 'colheres de mel',
  is_liquid = TRUE
WHERE name_pt ILIKE '%mel%' OR name_en ILIKE '%honey%';

-- Verificar quantos foram atualizados
SELECT 
  portion_unit,
  COUNT(*) as total,
  STRING_AGG(name_pt, ', ' ORDER BY name_pt) as exemplos
FROM canonical_ingredients
WHERE portion_unit != 'g'
GROUP BY portion_unit
ORDER BY total DESC;
