-- Verificar estado do pool de refeições aprovadas

-- 1. Total de refeições no pool
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = true THEN 1 END) as ativas,
  COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as aprovadas,
  COUNT(CASE WHEN is_active = true AND approval_status = 'approved' THEN 1 END) as ativas_e_aprovadas
FROM meal_combinations;

-- 2. Por tipo de refeição (aprovadas e ativas)
SELECT 
  meal_type,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE is_active = true 
  AND approval_status = 'approved'
GROUP BY meal_type
ORDER BY meal_type;

-- 3. Por país (aprovadas e ativas)
SELECT 
  country_codes,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE is_active = true 
  AND approval_status = 'approved'
GROUP BY country_codes
ORDER BY quantidade DESC;

-- 4. Verificar se tem refeições para Brasil
SELECT 
  meal_type,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE is_active = true 
  AND approval_status = 'approved'
  AND country_codes @> ARRAY['BR']
GROUP BY meal_type
ORDER BY meal_type;

-- 5. Listar algumas refeições de exemplo (aprovadas, ativas, Brasil)
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  approval_status,
  is_active,
  country_codes
FROM meal_combinations
WHERE is_active = true 
  AND approval_status = 'approved'
  AND country_codes @> ARRAY['BR']
LIMIT 10;
