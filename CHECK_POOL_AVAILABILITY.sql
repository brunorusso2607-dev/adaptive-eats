-- Verificar disponibilidade de refeições no pool por tipo

-- 1. Total de refeições aprovadas e ativas no pool
SELECT 
  COUNT(*) as total_refeicoes_pool,
  COUNT(DISTINCT meal_type) as tipos_diferentes
FROM meal_combinations
WHERE approval_status = 'approved'
  AND is_active = true
  AND 'BR' = ANY(country_codes);

-- 2. Quantidade por tipo de refeição
SELECT 
  meal_type,
  COUNT(*) as quantidade,
  MIN(total_calories) as min_calorias,
  MAX(total_calories) as max_calorias,
  AVG(total_calories)::int as media_calorias
FROM meal_combinations
WHERE approval_status = 'approved'
  AND is_active = true
  AND 'BR' = ANY(country_codes)
GROUP BY meal_type
ORDER BY meal_type;

-- 3. Verificar se há refeições suficientes para 30 dias
-- (Precisa de pelo menos 30 refeições de cada tipo para não repetir)
SELECT 
  meal_type,
  COUNT(*) as quantidade,
  CASE 
    WHEN COUNT(*) >= 30 THEN '✅ Suficiente para 30 dias'
    WHEN COUNT(*) >= 7 THEN '⚠️ Suficiente para 1 semana'
    WHEN COUNT(*) >= 3 THEN '⚠️ Apenas 3 dias'
    ELSE '❌ Insuficiente'
  END as status
FROM meal_combinations
WHERE approval_status = 'approved'
  AND is_active = true
  AND 'BR' = ANY(country_codes)
GROUP BY meal_type
ORDER BY COUNT(*) ASC;

-- 4. Verificar se há refeições duplicadas sendo usadas
SELECT 
  meal_type,
  COUNT(*) as total,
  COUNT(DISTINCT title) as titulos_unicos,
  COUNT(*) - COUNT(DISTINCT title) as duplicados
FROM meal_combinations
WHERE approval_status = 'approved'
  AND is_active = true
  AND 'BR' = ANY(country_codes)
GROUP BY meal_type;
