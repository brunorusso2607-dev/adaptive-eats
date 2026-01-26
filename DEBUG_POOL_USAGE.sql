-- Debug: Por que o pool não está sendo usado?

-- 1. Verificar se há refeições compatíveis com BR
SELECT 
  meal_type,
  COUNT(*) as total,
  COUNT(CASE WHEN country_codes IS NULL THEN 1 END) as sem_pais,
  COUNT(CASE WHEN country_codes @> '["BR"]'::jsonb THEN 1 END) as com_br,
  COUNT(CASE WHEN country_codes = '[]'::jsonb THEN 1 END) as array_vazio
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
GROUP BY meal_type;

-- 2. Ver estrutura de uma refeição aprovada
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  country_codes,
  blocked_for_intolerances,
  dietary_tags
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
LIMIT 3;

-- 3. Verificar se há refeições bloqueadas por intolerâncias
SELECT 
  COUNT(*) as total_com_bloqueios,
  COUNT(DISTINCT meal_type) as tipos_com_bloqueios
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND blocked_for_intolerances IS NOT NULL
  AND jsonb_array_length(blocked_for_intolerances) > 0;
