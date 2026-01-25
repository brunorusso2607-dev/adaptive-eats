-- ============================================
-- VERIFICAR PROBLEMA: GERA APENAS UMA VEZ
-- ============================================

-- 1. Verificar quantas refeições existem por tipo
SELECT 
  meal_type,
  COUNT(*) as total_refeicoes,
  COUNT(DISTINCT name) as nomes_unicos,
  COUNT(*) - COUNT(DISTINCT name) as duplicatas
FROM meal_combinations
WHERE is_active = true
GROUP BY meal_type
ORDER BY meal_type;

-- 2. Verificar se há nomes duplicados que podem estar causando erro
SELECT 
  name,
  meal_type,
  COUNT(*) as vezes_repetido
FROM meal_combinations
WHERE is_active = true
GROUP BY name, meal_type
HAVING COUNT(*) > 1
ORDER BY vezes_repetido DESC
LIMIT 20;

-- 3. Verificar últimas inserções e erros
SELECT 
  meal_type,
  COUNT(*) as total,
  MAX(created_at) as ultima_insercao,
  MIN(created_at) as primeira_insercao
FROM meal_combinations
WHERE is_active = true
GROUP BY meal_type
ORDER BY ultima_insercao DESC;

-- 4. Verificar se há constraint de unique que pode estar bloqueando
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'meal_combinations'::regclass
  AND contype IN ('u', 'p'); -- unique ou primary key

-- 5. Verificar índices que podem estar causando conflito
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'meal_combinations';
