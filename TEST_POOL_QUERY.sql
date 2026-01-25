-- Testar a mesma query que a função usa para buscar refeições do pool
SELECT 
  id, 
  name, 
  meal_type, 
  total_calories,
  country_codes
FROM meal_combinations
WHERE is_active = true
AND approval_status = 'approved'
AND 'BR' = ANY(country_codes)
LIMIT 10;

-- Contar total
SELECT COUNT(*) as total
FROM meal_combinations
WHERE is_active = true
AND approval_status = 'approved'
AND 'BR' = ANY(country_codes);
