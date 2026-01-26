-- Verificar status do pool de refeições

-- 1. Total de refeições aprovadas
SELECT 
  COUNT(*) as total_aprovadas,
  COUNT(DISTINCT meal_type) as tipos_diferentes,
  COUNT(DISTINCT country_codes) as paises_diferentes
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved';

-- 2. Refeições aprovadas por tipo
SELECT 
  meal_type,
  COUNT(*) as quantidade,
  AVG(total_calories) as calorias_media
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
GROUP BY meal_type
ORDER BY meal_type;

-- 3. Verificar se há refeições para o país BR
SELECT 
  meal_type,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND (country_codes IS NULL OR country_codes @> '["BR"]'::jsonb OR country_codes = '[]'::jsonb)
GROUP BY meal_type
ORDER BY meal_type;

-- 4. Primeiras 5 refeições aprovadas (para ver estrutura)
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
LIMIT 5;
