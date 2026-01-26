-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA FOODS
-- ============================================

-- 1. Ver todas as colunas da tabela foods
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'foods'
ORDER BY ordinal_position;

-- 2. Ver exemplo de dados (1 linha) para entender estrutura
SELECT *
FROM foods
LIMIT 1;

-- 3. QUERY SIMPLIFICADA - Buscar água sem especificar colunas exatas
SELECT *
FROM foods
WHERE LOWER(name) LIKE '%água%' 
   OR LOWER(name) LIKE '%water%'
LIMIT 10;

-- 4. QUERY SIMPLIFICADA - Buscar alimentos com ~42 kcal
-- (tentando diferentes nomes de coluna possíveis)
SELECT *
FROM foods
WHERE (
  (calories_per_100g BETWEEN 40 AND 44) OR
  (energy_kcal BETWEEN 40 AND 44) OR
  (energy BETWEEN 40 AND 44) OR
  (kcal BETWEEN 40 AND 44)
)
AND country = 'BR'
LIMIT 10;
