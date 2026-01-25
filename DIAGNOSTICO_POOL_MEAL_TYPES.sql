-- ============================================
-- DIAGNÓSTICO: MEAL TYPES NO POOL
-- ============================================

-- 1. Verificar quais meal_types existem no pool
SELECT DISTINCT meal_type 
FROM meal_combinations 
WHERE country_code = 'BR' 
  AND is_approved = true
ORDER BY meal_type;

-- 2. Contar refeições por tipo
SELECT 
  meal_type,
  COUNT(*) as total_refeicoes,
  MIN(total_calories) as min_calorias,
  MAX(total_calories) as max_calorias,
  ROUND(AVG(total_calories)) as media_calorias
FROM meal_combinations
WHERE country_code = 'BR'
  AND is_approved = true
GROUP BY meal_type
ORDER BY meal_type;

-- 3. Verificar especificamente SUPPER (ceia/evening_snack)
SELECT 
  id,
  name,
  total_calories,
  total_protein,
  total_carbs,
  total_fat
FROM meal_combinations
WHERE country_code = 'BR'
  AND is_approved = true
  AND meal_type = 'supper'
ORDER BY total_calories;

-- 4. Verificar se existe 'evening_snack' no pool
SELECT COUNT(*) as count_evening_snack
FROM meal_combinations
WHERE country_code = 'BR'
  AND is_approved = true
  AND meal_type = 'evening_snack';

-- 5. Verificar distribuição de calorias para SUPPER
-- Target típico: 167 kcal
-- Faixa aceita (±50%): 84-250 kcal
SELECT 
  COUNT(*) as total_supper,
  COUNT(CASE WHEN total_calories >= 84 AND total_calories <= 250 THEN 1 END) as dentro_faixa_167,
  COUNT(CASE WHEN total_calories < 84 THEN 1 END) as abaixo_84,
  COUNT(CASE WHEN total_calories > 250 THEN 1 END) as acima_250
FROM meal_combinations
WHERE country_code = 'BR'
  AND is_approved = true
  AND meal_type = 'supper';
