-- 1. VERIFICAR SE EXISTEM REFEIÇÕES NO POOL
SELECT 
  'Total de refeições' as metrica,
  COUNT(*)::text as valor
FROM meal_combinations;

-- 2. VERIFICAR STATUS DE APROVAÇÃO
SELECT 
  approval_status,
  COUNT(*) as quantidade
FROM meal_combinations
GROUP BY approval_status;

-- 3. VERIFICAR PAÍS
SELECT 
  country_codes,
  COUNT(*) as quantidade
FROM meal_combinations
GROUP BY country_codes
LIMIT 10;

-- 4. VERIFICAR IS_ACTIVE
SELECT 
  is_active,
  COUNT(*) as quantidade
FROM meal_combinations
GROUP BY is_active;

-- 5. SE EXISTEM REFEIÇÕES, MOSTRAR EXEMPLO
SELECT id, name, meal_type, approval_status, is_active, country_codes
FROM meal_combinations
LIMIT 5;
