-- Verificar qual plano está ativo e suas datas

SELECT 
  mp.id,
  mp.name,
  mp.start_date,
  mp.end_date,
  mp.is_active,
  mp.created_at,
  COUNT(mpi.id) as total_items,
  COUNT(DISTINCT mpi.day_of_week) as dias_com_refeicoes
FROM meal_plans mp
LEFT JOIN meal_plan_items mpi ON mpi.meal_plan_id = mp.id
WHERE mp.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND mp.is_active = true
GROUP BY mp.id, mp.name, mp.start_date, mp.end_date, mp.is_active, mp.created_at
ORDER BY mp.created_at DESC
LIMIT 5;

-- Verificar refeições por dia do plano ativo
SELECT 
  mpi.day_of_week,
  mpi.meal_type,
  mpi.recipe_name,
  mp.start_date,
  mp.name as plan_name
FROM meal_plan_items mpi
JOIN meal_plans mp ON mp.id = mpi.meal_plan_id
WHERE mp.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND mp.is_active = true
ORDER BY mpi.day_of_week, 
  CASE mpi.meal_type
    WHEN 'breakfast' THEN 1
    WHEN 'morning_snack' THEN 2
    WHEN 'lunch' THEN 3
    WHEN 'afternoon_snack' THEN 4
    WHEN 'dinner' THEN 5
    WHEN 'supper' THEN 6
  END;
