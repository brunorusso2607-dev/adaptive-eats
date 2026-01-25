-- Ver distribuição de calorias das 24 refeições de ceia
SELECT 
  id,
  name,
  total_calories,
  CASE 
    WHEN total_calories BETWEEN 84 AND 250 THEN '✅ DENTRO (84-250)'
    WHEN total_calories < 84 THEN '❌ ABAIXO (< 84)'
    WHEN total_calories > 250 THEN '❌ ACIMA (> 250)'
  END as faixa_167_target
FROM meal_combinations
WHERE meal_type = 'ceia'
ORDER BY total_calories;

-- Resumo
SELECT 
  COUNT(*) as total_ceia,
  COUNT(CASE WHEN total_calories BETWEEN 84 AND 250 THEN 1 END) as dentro_faixa,
  COUNT(CASE WHEN total_calories < 84 THEN 1 END) as abaixo,
  COUNT(CASE WHEN total_calories > 250 THEN 1 END) as acima,
  MIN(total_calories) as min_cal,
  MAX(total_calories) as max_cal,
  ROUND(AVG(total_calories)) as media_cal
FROM meal_combinations
WHERE meal_type = 'ceia';
