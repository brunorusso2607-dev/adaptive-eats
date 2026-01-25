-- Verificar quantas refeições de almoço existem no pool
SELECT 
  COUNT(*) as total_almoco,
  COUNT(DISTINCT name) as nomes_unicos,
  COUNT(*) FILTER (WHERE is_active = true) as ativos,
  COUNT(*) FILTER (WHERE is_active = false) as inativos
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR'];

-- Ver distribuição por template/estrutura
SELECT 
  CASE 
    WHEN name LIKE '%Arroz com Feijão%' THEN 'arroz_feijao_proteina'
    WHEN name LIKE '%Batata%' OR name LIKE '%Mandioca%' THEN 'batata_proteina'
    WHEN name LIKE '%Macarrão%' THEN 'macarrao'
    ELSE 'outro'
  END as template_tipo,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR']
  AND is_active = true
GROUP BY template_tipo
ORDER BY quantidade DESC;

-- Ver últimas 10 refeições de almoço geradas
SELECT 
  name,
  created_at,
  components
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR']
  AND is_active = true
ORDER BY created_at DESC
LIMIT 10;

-- Verificar se há muitas combinações rejeitadas
SELECT 
  COUNT(*) as total_rejeitadas,
  COUNT(DISTINCT combination_hash) as hashes_unicos
FROM rejected_meal_combinations
WHERE meal_type = 'almoco'
  AND country_code = 'BR';

-- Calcular capacidade teórica vs real
-- Template 1: arroz_feijao_proteina
-- 3 arroz × 2 legumes × 16 proteínas × (24×23/2) vegetais × 2 azeite = 26,496
-- Template 2: batata_proteina  
-- 6 batatas × 10 proteínas × (13×12/2) vegetais = 4,680
-- Template 3: macarrao
-- 2 macarrão × 5 proteínas × 7 vegetais = 70
-- TOTAL TEÓRICO: 31,246 combinações

SELECT 
  'Capacidade teórica' as metrica,
  31246 as valor
UNION ALL
SELECT 
  'Refeições no pool',
  COUNT(*)::int
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR']
  AND is_active = true
UNION ALL
SELECT 
  'Percentual usado',
  ROUND((COUNT(*)::numeric / 31246 * 100)::numeric, 2)::int
FROM meal_combinations
WHERE meal_type = 'almoco'
  AND country_codes @> ARRAY['BR']
  AND is_active = true;
