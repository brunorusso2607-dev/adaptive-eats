-- ============================================
-- INVESTIGAÇÃO: ÁGUA COM 42 KCAL (INCORRETO)
-- ============================================

-- 1. Verificar entrada de água na tabela foods
SELECT 
    id,
    name,
    name_normalized,
    source,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    is_verified
FROM foods 
WHERE name ILIKE '%água%' 
   OR name ILIKE '%water%'
   OR name_normalized ILIKE '%agua%'
ORDER BY search_count DESC
LIMIT 20;

-- 2. Verificar canonical_ingredients para água
SELECT 
    id,
    name_pt,
    name_en,
    category,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g,
    is_active
FROM canonical_ingredients 
WHERE name_pt ILIKE '%água%' 
   OR name_en ILIKE '%water%'
ORDER BY name_pt;

-- 3. Verificar se há entradas com calorias incorretas para água
SELECT 
    id,
    name,
    source,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g
FROM foods
WHERE (name ILIKE '%água%' OR name ILIKE '%water%')
  AND calories_per_100g > 5  -- Água não deve ter mais que 5 kcal/100g
ORDER BY calories_per_100g DESC;

-- 4. Verificar bebidas de baixa caloria com valores suspeitos
SELECT 
    id,
    name,
    source,
    calories_per_100g,
    protein_per_100g
FROM foods
WHERE (
    name ILIKE '%água%' 
    OR name ILIKE '%water%'
    OR name ILIKE '%chá%'
    OR name ILIKE '%tea%'
    OR name ILIKE '%café%'
    OR name ILIKE '%coffee%'
  )
  AND calories_per_100g > 10  -- Bebidas puras não devem ter mais que 10 kcal/100g
ORDER BY calories_per_100g DESC
LIMIT 30;
