-- Verificar estrutura dos componentes nas refeições do pool
-- Para entender como os alimentos estão organizados

-- Ver exemplos de componentes de diferentes tipos de refeição
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  components,
  jsonb_array_length(components) as num_components,
  components->0 as first_component,
  components->1 as second_component
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY meal_type, jsonb_array_length(components)
LIMIT 10;

-- Ver refeições com componentes específicos problemáticos
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND components::text ILIKE '%azeite%'
LIMIT 5;
