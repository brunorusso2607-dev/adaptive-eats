-- ANÁLISE: As 20 refeições no pool foram criadas por TypeScript ou IA?
-- Evidências de TypeScript vs IA

-- 1. VERIFICAR MACROS PRECISOS (TACO/TBCA) vs MACROS SUSPEITOS
-- TypeScript: Macros precisos baseados em ingredientes reais
-- IA: Macros suspeitos, números redondos, ou impossíveis

SELECT 
  id,
  name,
  meal_type,
  total_calories,
  total_protein,
  total_carbs,
  total_fat,
  -- Verificar se macros são suspeitos (múltiplos de 5 ou 10)
  CASE 
    WHEN total_protein % 5 = 0 AND total_protein > 0 THEN 'SUSPEITO (múltiplo de 5)'
    WHEN total_carbs % 5 = 0 AND total_carbs > 0 THEN 'SUSPEITO (múltiplo de 5)'
    WHEN total_fat % 5 = 0 AND total_fat > 0 THEN 'SUSPEITO (múltiplo de 5)'
    ELSE 'PRECISO'
  END as protein_suspect,
  -- Verificar se calorias são redondas (sugere IA)
  CASE 
    WHEN total_calories % 50 = 0 AND total_calories > 100 THEN 'SUSPEITO (redondo)'
    ELSE 'PRECISO'
  END as calories_suspect
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;

-- 2. VERIFICAR PORÇÕES ESPECÍFICAS vs GENÉRICAS
-- TypeScript: Porções específicas (120g frango, 100g arroz)
-- IA: Porções genéricas (1 porção, 1 unidade, a gosto)

SELECT 
  id,
  name,
  meal_type,
  components,
  -- Contar porções genéricas
  CASE 
    WHEN components::text ILIKE '%1 porção%' THEN 'PORÇÃO GENÉRICA'
    WHEN components::text ILIKE '%a gosto%' THEN 'PORÇÃO GENÉRICA'
    WHEN components::text ILIKE '%unidade%' AND NOT components::text ILIKE '%120g%' AND NOT components::text ILIKE '%100g%' THEN 'PORÇÃO GENÉRICA'
    WHEN components::text ILIKE '%xícara%' AND NOT components::text ILIKE '%80g%' AND NOT components::text ILIKE '%50g%' THEN 'PORÇÃO GENÉRICA'
    ELSE 'PORÇÃO ESPECÍFICA'
  END as portion_type
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;

-- 3. VERIFICAR SE HÁ AGRUPAMENTOS (TypeScript) vs INGREDIENTES SEPARADOS (IA)
-- TypeScript: "Pão com ovo mexido", "Salada com azeite"
-- IA: Ingredientes listados separadamente

SELECT 
  id,
  name,
  meal_type,
  -- Verificar se nome indica agrupamento
  CASE 
    WHEN name ILIKE '% com %' THEN 'AGRUPADO'
    WHEN name ILIKE '%Salada de%' THEN 'AGRUPADO'
    WHEN name ILIKE '%Vitamina de%' THEN 'AGRUPADO'
    ELSE 'SEPARADO'
  END as grouping_type,
  -- Contar número de componentes
  jsonb_array_length(components) as num_components
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;

-- 4. VERIFICAR PRESENÇA DE REFEIÇÕES PROBLEMÁTICAS (IA) vs REFEIÇÕES VÁLIDAS (TypeScript)
-- TypeScript: Sem temperos isolados, sem azeite isolado, mínimo 2 componentes
-- IA: Pode gerar refeições problemáticas

SELECT 
  'TEMPEROS ISOLADOS' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND (
    name ILIKE '%Cenoura cozida%' OR
    name ILIKE '%Alface americana%' OR
    name ILIKE '%Tomate%' OR
    name ILIKE '%Cebola refogada%'
  )
  AND jsonb_array_length(components) = 1

UNION ALL

SELECT 
  'AZEITE ISOLADO' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND name ILIKE '%Azeite%'
  AND jsonb_array_length(components) = 1

UNION ALL

SELECT 
  'MENOS DE 2 COMPONENTES' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND jsonb_array_length(components) < 2
  AND name NOT ILIKE '%lasanha%'
  AND name NOT ILIKE '%feijoada%'
  AND name NOT ILIKE '%vitamina%'

UNION ALL

SELECT 
  'CALORIAS MUITO BAIXAS' as issue_type,
  COUNT(*) as count
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND total_calories < 50
  AND meal_type != 'ceia';

-- 5. VERIFICAR ESTRUTURA DOS COMPONENTES
-- TypeScript: Estrutura padronizada com type, name, portion_grams
-- IA: Estrutura variável ou campos faltando

SELECT 
  id,
  name,
  meal_type,
  -- Verificar estrutura dos componentes
  CASE 
    WHEN components->0->>'type' IS NOT NULL 
     AND components->0->>'name' IS NOT NULL 
     AND components->0->>'portion_grams' IS NOT NULL THEN 'ESTRUTURA TYPESCRIPT'
    ELSE 'ESTRUTURA INCOMPLETA'
  END as component_structure,
  -- Mostrar primeiro componente como exemplo
  components->0 as first_component_example
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;

-- 6. VERIFICAR SE HÁ PADRÕES DE NOMES (TypeScript) vs NOMES CRIATIVOS (IA)
-- TypeScript: Nomes padronizados baseados em templates
-- IA: Nomes mais criativos ou incomuns

SELECT 
  id,
  name,
  meal_type,
  -- Verificar se nome segue padrão de template
  CASE 
    WHEN name ILIKE 'Arroz com Feijão, %' THEN 'TEMPLATE TYPESCRIPT'
    WHEN name ILIKE '% com %' AND jsonb_array_length(components) = 2 THEN 'AGRUPAMENTO TYPESCRIPT'
    WHEN name ILIKE 'Salada de %' THEN 'TEMPLATE TYPESCRIPT'
    WHEN name ILIKE '% e %' AND jsonb_array_length(components) = 2 THEN 'AGRUPAMENTO TYPESCRIPT'
    WHEN name ILIKE 'Vitamina de %' THEN 'TEMPLATE TYPESCRIPT'
    ELSE 'NOME CRIATIVO (possível IA)'
  END as name_pattern
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
ORDER BY created_at DESC
LIMIT 20;

-- 7. RESUMO FINAL - EVIDÊNCIAS DE TYPESCRIPT vs IA
WITH analysis AS (
  SELECT 
    COUNT(*) as total_meals,
    SUM(CASE WHEN total_protein % 5 = 0 AND total_protein > 0 THEN 1 ELSE 0 END) as suspicious_protein,
    SUM(CASE WHEN total_carbs % 5 = 0 AND total_carbs > 0 THEN 1 ELSE 0 END) as suspicious_carbs,
    SUM(CASE WHEN total_fat % 5 = 0 AND total_fat > 0 THEN 1 ELSE 0 END) as suspicious_fat,
    SUM(CASE WHEN total_calories % 50 = 0 AND total_calories > 100 THEN 1 ELSE 0 END) as suspicious_calories,
    SUM(CASE WHEN name ILIKE '% com %' OR name ILIKE 'Salada de %' OR name ILIKE 'Vitamina de %' THEN 1 ELSE 0 END) as grouped_names,
    SUM(CASE WHEN jsonb_array_length(components) < 2 AND name NOT ILIKE '%lasanha%' AND name NOT ILIKE '%feijoada%' AND name NOT ILIKE '%vitamina%' THEN 1 ELSE 0 END) as single_components,
    AVG(jsonb_array_length(components)) as avg_components
  FROM meal_combinations
  WHERE is_active = true
    AND approval_status = 'approved'
)
SELECT 
  total_meals,
  suspicious_protein,
  suspicious_carbs,
  suspicious_fat,
  suspicious_calories,
  grouped_names,
  single_components,
  avg_components,
  -- Veredicto baseado nas evidências
  CASE 
    WHEN suspicious_protein = 0 AND suspicious_carbs = 0 AND suspicious_fat = 0 AND single_components = 0 AND grouped_names > 0 THEN '100% TYPESCRIPT'
    WHEN suspicious_protein > total_meals * 0.5 OR single_components > total_meals * 0.3 THEN 'PROVAVELMENTE IA'
    WHEN grouped_names > total_meals * 0.5 AND single_components = 0 THEN 'PROVAVELMENTE TYPESCRIPT'
    ELSE 'MISTURA OU INCERTO'
  END as veredicto
FROM analysis;
