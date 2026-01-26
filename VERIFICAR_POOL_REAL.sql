-- Verificar o que realmente existe no pool
SELECT 
  meal_type,
  COUNT(*) as total,
  MIN(total_calories) as min_cal,
  MAX(total_calories) as max_cal,
  ROUND(AVG(total_calories)) as avg_cal
FROM meal_combinations
WHERE is_approved = true
GROUP BY meal_type
ORDER BY meal_type;

-- Verificar especificamente evening_snack vs supper
SELECT 
  'evening_snack' as tipo,
  COUNT(*) as total
FROM meal_combinations
WHERE is_approved = true
  AND meal_type = 'evening_snack'
UNION ALL
SELECT 
  'supper' as tipo,
  COUNT(*) as total
FROM meal_combinations
WHERE is_approved = true
  AND meal_type = 'supper';

-- Ver refeições de supper com calorias na faixa 84-250 (target 167 ±50%)
SELECT 
  id,
  name,
  total_calories,
  total_protein,
  total_carbs,
  total_fat
FROM meal_combinations
WHERE is_approved = true
  AND meal_type = 'supper'
  AND total_calories BETWEEN 84 AND 250
ORDER BY total_calories;
