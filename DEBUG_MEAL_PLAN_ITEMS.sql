-- Debug: Verificar meal_plan_items do plano ativo

-- 1. Plano ativo
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

-- 2. Items do plano ativo (primeiros 10)
SELECT 
  mpi.day_of_week,
  mpi.week_number,
  mpi.meal_type,
  mpi.recipe_name,
  mp.start_date,
  -- Calcular data real do item
  (mp.start_date::date + mpi.day_of_week) as data_calculada
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
  END
LIMIT 20;

-- 3. Contar items por day_of_week
SELECT 
  mpi.day_of_week,
  mpi.week_number,
  COUNT(*) as total_refeicoes,
  mp.start_date,
  (mp.start_date::date + mpi.day_of_week) as data_real
FROM meal_plan_items mpi
JOIN meal_plans mp ON mp.id = mpi.meal_plan_id
WHERE mp.user_id = (SELECT id FROM auth.users LIMIT 1)
  AND mp.is_active = true
GROUP BY mpi.day_of_week, mpi.week_number, mp.start_date
ORDER BY mpi.day_of_week;
