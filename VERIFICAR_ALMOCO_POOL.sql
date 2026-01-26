-- Verificar quantas refeições de almoço existem no pool
SELECT 
  COUNT(*) as total_almoco,
  COUNT(DISTINCT name) as nomes_unicos
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR']
  AND is_active = true;

-- Ver últimas 20 refeições de almoço geradas
SELECT 
  name,
  created_at,
  total_calories,
  components
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR']
  AND is_active = true
ORDER BY created_at DESC
LIMIT 20;
