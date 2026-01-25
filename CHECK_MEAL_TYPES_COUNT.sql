-- Contar refeições por tipo no pool aprovado
SELECT 
  meal_type,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE is_active = true 
AND approval_status = 'approved'
GROUP BY meal_type
ORDER BY quantidade DESC;
