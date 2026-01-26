-- Testar auto-detecção de blocked_for_intolerances
-- Buscar as 5 últimas refeições de café da manhã geradas

SELECT 
  name,
  blocked_for_intolerances,
  components::jsonb->0->>'name' as primeiro_componente,
  components::jsonb->1->>'name' as segundo_componente,
  components::jsonb->2->>'name' as terceiro_componente,
  created_at
FROM meal_combinations
WHERE meal_type = 'cafe_manha'
ORDER BY created_at DESC
LIMIT 5;

-- Verificar refeições que NÃO têm glúten (devem aparecer para intolerantes)
SELECT 
  name,
  blocked_for_intolerances,
  CASE 
    WHEN 'gluten' = ANY(blocked_for_intolerances) THEN '❌ TEM GLÚTEN'
    ELSE '✅ SEM GLÚTEN'
  END as status_gluten
FROM meal_combinations
WHERE meal_type = 'cafe_manha'
ORDER BY created_at DESC
LIMIT 10;

-- Verificar refeições que NÃO têm lactose (devem aparecer para intolerantes)
SELECT 
  name,
  blocked_for_intolerances,
  CASE 
    WHEN 'lactose' = ANY(blocked_for_intolerances) OR 'milk' = ANY(blocked_for_intolerances) THEN '❌ TEM LACTOSE'
    ELSE '✅ SEM LACTOSE'
  END as status_lactose
FROM meal_combinations
WHERE meal_type = 'cafe_manha'
ORDER BY created_at DESC
LIMIT 10;
