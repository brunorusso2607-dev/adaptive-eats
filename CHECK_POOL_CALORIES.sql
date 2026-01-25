-- Verificar distribuição de calorias das refeições do pool

SELECT 
  meal_type,
  COUNT(*) as quantidade,
  MIN(total_calories) as min_cal,
  MAX(total_calories) as max_cal,
  AVG(total_calories) as media_cal,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_calories) as mediana_cal
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
GROUP BY meal_type
ORDER BY meal_type;

-- Ver exemplos de cada tipo
SELECT 
  meal_type,
  name,
  total_calories
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY meal_type, total_calories
LIMIT 50;
