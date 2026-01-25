-- Verificar dias gerados no plano mais recente

-- 1. Ver qual é o plano ativo
SELECT 
  id,
  name,
  start_date,
  end_date,
  created_at
FROM meal_plans
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- 2. Ver todos os dias gerados (day_of_week)
SELECT DISTINCT
  day_of_week,
  COUNT(*) as refeicoes_neste_dia
FROM meal_plan_items
WHERE meal_plan_id IN (
  SELECT id FROM meal_plans 
  WHERE user_id = (SELECT id FROM auth.users LIMIT 1) 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
)
GROUP BY day_of_week
ORDER BY day_of_week;

-- 3. Ver detalhes de cada dia
SELECT 
  day_of_week,
  meal_type,
  recipe_name,
  week_number
FROM meal_plan_items
WHERE meal_plan_id IN (
  SELECT id FROM meal_plans 
  WHERE user_id = (SELECT id FROM auth.users LIMIT 1) 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
)
ORDER BY day_of_week, meal_type;
