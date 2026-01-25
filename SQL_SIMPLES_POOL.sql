-- Ver 5 refeições de exemplo para entender a estrutura
SELECT * FROM meal_combinations LIMIT 5;

-- Contar por meal_type (sem filtros)
SELECT 
  meal_type,
  COUNT(*) as total
FROM meal_combinations
GROUP BY meal_type
ORDER BY meal_type;
