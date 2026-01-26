-- ANÁLISE COMPLETA DO POOL DE REFEIÇÕES
-- Identificar problemas reportados pelo usuário

-- 1. TEMPEROS COMO REFEIÇÃO ISOLADA
-- Buscar refeições que contenham apenas temperos (cenoura, salsinha, couve crua, repolho roxo, vagem cozida)
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  components,
  jsonb_array_length(components) as num_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND (
    name ILIKE '%cenoura%'
    OR name ILIKE '%salsinha%'
    OR name ILIKE '%couve crua%'
    OR name ILIKE '%repolho%'
    OR name ILIKE '%vagem%'
  )
ORDER BY total_calories;

-- 2. GORDURAS ISOLADAS (Azeite, Manteiga)
-- Buscar refeições que contenham azeite ou manteiga como componente principal
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  components,
  jsonb_array_length(components) as num_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND (
    name ILIKE '%azeite%'
    OR name ILIKE '%manteiga%'
    OR name ILIKE '%óleo%'
  )
ORDER BY total_calories;

-- 3. ALIMENTOS SEM ACOMPANHAMENTO (Torrada sozinha, Pão sozinho)
-- Buscar refeições com apenas 1 componente
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  components,
  jsonb_array_length(components) as num_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND jsonb_array_length(components) = 1
ORDER BY meal_type, total_calories;

-- 4. REFEIÇÕES COM POUCOS COMPONENTES (potencialmente desorganizadas)
-- Buscar refeições com 2-3 componentes que podem estar desorganizadas
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  components,
  jsonb_array_length(components) as num_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND jsonb_array_length(components) BETWEEN 2 AND 3
  AND meal_type IN ('cafe_manha', 'breakfast')
ORDER BY total_calories
LIMIT 20;

-- 5. ALIMENTOS GENÉRICOS (Alface americana, Salada genérica)
-- Buscar refeições com nomes muito genéricos
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND (
    name ILIKE '%alface americana%'
    OR name ILIKE '%salada verde%'
    OR name ILIKE '%salada simples%'
  )
ORDER BY meal_type;

-- 6. RESUMO GERAL DO POOL
SELECT 
  meal_type,
  COUNT(*) as total_meals,
  AVG(total_calories) as avg_calories,
  MIN(total_calories) as min_calories,
  MAX(total_calories) as max_calories,
  AVG(jsonb_array_length(components)) as avg_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
GROUP BY meal_type
ORDER BY meal_type;
