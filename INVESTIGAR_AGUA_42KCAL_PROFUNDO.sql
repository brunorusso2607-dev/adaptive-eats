-- ============================================
-- INVESTIGAÇÃO PROFUNDA: ÁGUA COM 42 KCAL
-- Por que água está mostrando 42 kcal se TACO/TBCA são fonte verdadeira?
-- ============================================

-- 1. VERIFICAR ÁGUA EM CANONICAL_INGREDIENTS (fonte primária)
SELECT 
  'canonical_ingredients' as fonte,
  name,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  country
FROM canonical_ingredients
WHERE LOWER(name) LIKE '%água%' 
   OR LOWER(name) LIKE '%water%'
   OR LOWER(name) LIKE '%agua%';

-- ============================================
-- 2. VERIFICAR ÁGUA EM FOODS (TACO/TBCA)
SELECT 
  'foods (TACO/TBCA)' as fonte,
  id,
  name,
  energy_kcal,
  protein_g,
  carbohydrate_g,
  lipid_g,
  country,
  source
FROM foods
WHERE LOWER(name) LIKE '%água%' 
   OR LOWER(name) LIKE '%water%'
   OR LOWER(name) LIKE '%agua%'
ORDER BY country, source;

-- ============================================
-- 3. VERIFICAR LARANJA EM CANONICAL_INGREDIENTS
-- (A imagem mostra "1 laranja média (sobremesa) 150g — 42 kcal")
SELECT 
  'canonical_ingredients' as fonte,
  name,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  country
FROM canonical_ingredients
WHERE LOWER(name) LIKE '%laranja%' 
   OR LOWER(name) LIKE '%orange%';

-- ============================================
-- 4. VERIFICAR LARANJA EM FOODS (TACO/TBCA)
SELECT 
  'foods (TACO/TBCA)' as fonte,
  id,
  name,
  energy_kcal,
  protein_g,
  carbohydrate_g,
  lipid_g,
  country,
  source
FROM foods
WHERE LOWER(name) LIKE '%laranja%' 
   OR LOWER(name) LIKE '%orange%'
ORDER BY country, source;

-- ============================================
-- 5. VERIFICAR REFEIÇÃO ESPECÍFICA (ALMOÇO COM ÁGUA 42 KCAL)
-- Buscar a refeição que está mostrando água com 42 kcal
SELECT 
  mpi.id,
  mpi.recipe_name,
  mpi.recipe_ingredients,
  mpi.recipe_calories,
  mpi.recipe_protein,
  mpi.recipe_carbs,
  mpi.recipe_fat
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
  AND mpi.recipe_name ILIKE '%frango%'
  AND mpi.recipe_name ILIKE '%feijão%'
ORDER BY mpi.created_at DESC
LIMIT 1;

-- ============================================
-- HIPÓTESES:
-- ============================================
-- 
-- HIPÓTESE 1: Água no banco tem valor incorreto
-- - canonical_ingredients ou foods tem água com calorias
-- - Solução: Corrigir valor no banco
--
-- HIPÓTESE 2: Frontend está pegando valor errado
-- - useIngredientCalories pegando laranja ao invés de água
-- - Confusão de índices ou nomes
-- - Solução: Verificar mapeamento no frontend
--
-- HIPÓTESE 3: Cálculo está somando errado
-- - calculateRealMacros somando calorias de outro ingrediente
-- - Bug no cálculo proporcional
-- - Solução: Verificar lógica de cálculo
--
-- HIPÓTESE 4: Cache ou fallback incorreto
-- - Sistema usando valor antigo em cache
-- - Fallback para valor incorreto
-- - Solução: Limpar cache, verificar fallback
--
-- OBSERVAÇÃO IMPORTANTE:
-- A imagem mostra "1 copo de água (opcional) (200g) — 42 kcal (TBCA)"
-- E também "1 laranja média (sobremesa) (150g) — 42 kcal (TBCA)"
-- 
-- SUSPEITA: Água está pegando calorias da LARANJA!
-- 42 kcal para 150g de laranja = 28 kcal/100g (correto para laranja)
-- Mas água está mostrando 42 kcal para 200g (incorreto)
-- 
-- POSSÍVEL CAUSA: Bug no mapeamento de ingredientes
-- ============================================
