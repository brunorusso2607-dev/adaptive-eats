-- ============================================
-- INVESTIGAÇÃO FINAL: ÁGUA COM 42 KCAL
-- Usando nomes corretos de colunas
-- ============================================

-- 1. BUSCAR ÁGUA NA TABELA FOODS
SELECT 
  id,
  name,
  name_normalized,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  source,
  category
FROM foods
WHERE (LOWER(name) LIKE '%água%' OR LOWER(name) LIKE '%water%' OR LOWER(name) LIKE '%agua%')
ORDER BY source, name;

-- 2. BUSCAR LARANJA (para comparar - deve ter ~28 kcal/100g)
SELECT 
  id,
  name,
  calories_per_100g,
  source,
  category
FROM foods
WHERE LOWER(name) LIKE '%laranja%'
  AND source IN ('TBCA', 'taco', 'TACO')
ORDER BY calories_per_100g, name
LIMIT 10;

-- 3. BUSCAR ALIMENTOS COM EXATAMENTE ~42 KCAL/100G
-- (para ver se água está sendo confundida com algum deles)
SELECT 
  id,
  name,
  calories_per_100g,
  source,
  category
FROM foods
WHERE calories_per_100g BETWEEN 40 AND 44
  AND source IN ('TBCA', 'taco', 'TACO')
ORDER BY calories_per_100g, name
LIMIT 20;

-- 4. VERIFICAR ALIASES DE ÁGUA
SELECT 
  ia.alias,
  ia.food_id,
  f.name as food_name,
  f.calories_per_100g,
  f.source
FROM ingredient_aliases ia
JOIN foods f ON ia.food_id = f.id
WHERE LOWER(ia.alias) LIKE '%água%' 
   OR LOWER(ia.alias) LIKE '%water%'
   OR LOWER(ia.alias) LIKE '%agua%';

-- ============================================
-- ANÁLISE ESPERADA:
-- ============================================
-- 
-- Query 1: Deve mostrar água com 0 kcal
-- Se mostrar > 0, o banco está incorreto
--
-- Query 2: Laranja deve ter ~28 kcal/100g
-- 42 kcal para 150g = 28 kcal/100g ✅
--
-- Query 3: Mostra alimentos com ~42 kcal/100g
-- Se água aparecer aqui, está incorreto
--
-- Query 4: Verifica se há alias incorreto
-- mapeando "água" para outro alimento
-- ============================================
