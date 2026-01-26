-- Verificar de onde vieram as refeições do último plano gerado
-- Buscar o plano mais recente
WITH ultimo_plano AS (
  SELECT id, created_at, user_id
  FROM meal_plans
  ORDER BY created_at DESC
  LIMIT 1
)
SELECT 
  mpi.id,
  mpi.day_of_week,
  mpi.week_number,
  mpi.meal_type,
  mpi.recipe_name,
  mpi.recipe_calories,
  mpi.from_pool,
  CASE 
    WHEN mpi.from_pool = true THEN '✅ POOL'
    WHEN mpi.from_pool = false THEN '❌ IA'
    ELSE '⚠️ NULL'
  END as origem
FROM meal_plan_items mpi
JOIN ultimo_plano up ON mpi.meal_plan_id = up.id
ORDER BY mpi.week_number, mpi.day_of_week, mpi.meal_type;

-- Contar por origem
WITH ultimo_plano AS (
  SELECT id FROM meal_plans ORDER BY created_at DESC LIMIT 1
)
SELECT 
  CASE 
    WHEN from_pool = true THEN 'POOL'
    WHEN from_pool = false THEN 'IA'
    ELSE 'NULL/DESCONHECIDO'
  END as origem,
  COUNT(*) as total_refeicoes
FROM meal_plan_items
WHERE meal_plan_id = (SELECT id FROM ultimo_plano)
GROUP BY from_pool
ORDER BY total_refeicoes DESC;
