-- ============================================
-- INVESTIGAÇÃO: ÁGUA COM 42 KCAL - SQL CORRIGIDO
-- ============================================

-- 1. VERIFICAR ESTRUTURA DA TABELA canonical_ingredients
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'canonical_ingredients'
ORDER BY ordinal_position;

-- 2. VERIFICAR ÁGUA EM FOODS (TACO/TBCA) - PRINCIPAL SUSPEITO
SELECT 
  'foods' as fonte,
  id,
  name,
  energy_kcal as calorias_por_100g,
  protein_g as proteina_por_100g,
  carbohydrate_g as carbs_por_100g,
  lipid_g as gordura_por_100g,
  country,
  source
FROM foods
WHERE (LOWER(name) LIKE '%água%' OR LOWER(name) LIKE '%water%' OR LOWER(name) LIKE '%agua%')
  AND source IN ('TBCA', 'taco', 'TACO')
ORDER BY country, source, name;

-- 3. VERIFICAR LARANJA EM FOODS (para comparar)
SELECT 
  'foods' as fonte,
  id,
  name,
  energy_kcal as calorias_por_100g,
  protein_g as proteina_por_100g,
  carbohydrate_g as carbs_por_100g,
  lipid_g as gordura_por_100g,
  country,
  source
FROM foods
WHERE (LOWER(name) LIKE '%laranja%' OR LOWER(name) LIKE '%orange%')
  AND source IN ('TBCA', 'taco', 'TACO')
  AND country = 'BR'
ORDER BY name
LIMIT 5;

-- 4. VERIFICAR ALIASES DE ÁGUA (pode ter mapeamento incorreto)
SELECT 
  ia.alias,
  ia.food_id,
  f.name as food_name,
  f.energy_kcal,
  f.source
FROM ingredient_aliases ia
JOIN foods f ON ia.food_id = f.id
WHERE LOWER(ia.alias) LIKE '%água%' 
   OR LOWER(ia.alias) LIKE '%water%'
   OR LOWER(ia.alias) LIKE '%agua%';

-- 5. BUSCAR QUALQUER ALIMENTO COM EXATAMENTE 42 KCAL/100G
-- (para ver se água está mapeada para algo com 42 kcal)
SELECT 
  name,
  energy_kcal,
  source,
  country
FROM foods
WHERE energy_kcal BETWEEN 40 AND 44
  AND source IN ('TBCA', 'taco', 'TACO')
  AND country = 'BR'
ORDER BY energy_kcal, name
LIMIT 20;

-- ============================================
-- INTERPRETAÇÃO ESPERADA:
-- ============================================
-- 
-- Se água tem 0 kcal (correto):
-- - Query 2 deve retornar água com energy_kcal = 0
-- 
-- Se água tem valor incorreto:
-- - Query 2 retorna água com energy_kcal > 0
-- - Solução: UPDATE para corrigir
--
-- Se água está mapeada para outro alimento:
-- - Query 4 mostra alias incorreto
-- - Solução: Corrigir ou deletar alias
--
-- Se há alimento com 42 kcal sendo confundido:
-- - Query 5 mostra candidatos
-- - Verificar se algum está sendo retornado no lugar de água
-- ============================================
