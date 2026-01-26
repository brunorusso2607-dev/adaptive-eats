-- ============================================
-- LISTAR TODAS AS REFEIÇÕES DO PLANO ATIVO
-- ============================================

SELECT 
  mpi.id,
  mpi.meal_type,
  mpi.recipe_name,
  jsonb_array_length(mpi.recipe_ingredients) as num_ingredientes,
  mpi.from_pool,
  mpi.created_at
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
ORDER BY mpi.meal_type;

-- ============================================
-- DEPOIS, PARA VER INGREDIENTES DE UMA REFEIÇÃO ESPECÍFICA:
-- Copie o ID da refeição que mostra água com 42 kcal
-- e execute a query abaixo substituindo o ID
-- ============================================

/*
WITH meal_data AS (
  SELECT recipe_ingredients
  FROM meal_plan_items
  WHERE id = 'COLE_O_ID_AQUI'
)
SELECT 
  ingredient->>'item' as ingrediente,
  ingredient->>'quantity' as quantidade,
  (ingredient->>'calories')::numeric as calorias
FROM meal_data,
     jsonb_array_elements(meal_data.recipe_ingredients) as ingredient;
*/
