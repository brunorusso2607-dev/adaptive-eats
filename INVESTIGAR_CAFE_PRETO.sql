-- ============================================
-- INVESTIGAÇÃO: CAFÉ PRETO COM 491 KCAL
-- ============================================

-- 1. Verificar entrada na tabela foods
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
WHERE name ILIKE '%café%preto%' 
   OR name ILIKE '%coffee%black%'
   OR name_normalized ILIKE '%cafe%preto%'
ORDER BY search_count DESC;

-- 2. Verificar canonical_ingredients
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
WHERE name_pt ILIKE '%café%preto%' 
   OR name_en ILIKE '%coffee%black%'
   OR name_pt ILIKE '%café%'
ORDER BY name_pt;

-- 3. Verificar meal_combinations (pool) - café da manhã
SELECT 
    id,
    name,
    meal_type,
    components,
    total_calories,
    total_protein,
    total_carbs,
    total_fat,
    approval_status,
    is_active
FROM meal_combinations
WHERE meal_type = 'cafe_manha'
  AND is_active = true
  AND approval_status = 'approved'
  AND (
    name ILIKE '%café%preto%'
    OR components::text ILIKE '%café%preto%'
    OR components::text ILIKE '%cafe preto%'
  )
ORDER BY created_at DESC;

-- 4. Verificar meal_plan_items recentes do usuário
SELECT 
    id,
    recipe_name,
    meal_type,
    recipe_ingredients::text as ingredients_preview,
    recipe_calories,
    recipe_protein,
    recipe_carbs,
    recipe_fat,
    created_at
FROM meal_plan_items
WHERE meal_type = 'breakfast'
  AND recipe_name ILIKE '%café%'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Verificar se há algum alimento com calorias absurdas
SELECT 
    id,
    name,
    source,
    calories_per_100g,
    protein_per_100g,
    carbs_per_100g,
    fat_per_100g
FROM foods
WHERE (name ILIKE '%café%' OR name ILIKE '%coffee%')
  AND calories_per_100g > 100  -- Café não deve ter mais que 100 kcal/100g
ORDER BY calories_per_100g DESC;

-- 6. Buscar refeições com macros suspeitos (muito altos para café da manhã simples)
SELECT 
    id,
    name,
    meal_type,
    total_calories,
    total_protein,
    components::text as components_preview
FROM meal_combinations
WHERE meal_type = 'cafe_manha'
  AND is_active = true
  AND approval_status = 'approved'
  AND total_calories > 400  -- Café da manhã simples não deve ter mais que 400 kcal
ORDER BY total_calories DESC
LIMIT 20;
