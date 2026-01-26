-- Ver detalhes do plano mais recente

-- 1. Informações do plano
SELECT 
  id,
  name,
  start_date,
  end_date,
  created_at,
  is_active
FROM meal_plans
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND is_active = true
ORDER BY created_at DESC
LIMIT 1;

-- 2. Quantos dias foram gerados
SELECT 
  day_of_week,
  COUNT(*) as refeicoes_no_dia,
  STRING_AGG(DISTINCT meal_type, ', ') as tipos_refeicao
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

-- 3. Total de itens criados
SELECT COUNT(*) as total_itens
FROM meal_plan_items
WHERE meal_plan_id IN (
  SELECT id FROM meal_plans 
  WHERE user_id = (SELECT id FROM auth.users LIMIT 1) 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
);
