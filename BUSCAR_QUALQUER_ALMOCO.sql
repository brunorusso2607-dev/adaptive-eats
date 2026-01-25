-- ============================================
-- BUSCAR QUALQUER ALMOÇO QUE EXISTE AGORA
-- ============================================

-- Pegar o primeiro almoço do plano ativo (qualquer um)
SELECT 
  id,
  recipe_name,
  recipe_ingredients::text as ingredientes_json,
  jsonb_array_length(recipe_ingredients) as num_ingredientes,
  from_pool,
  created_at
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
  AND mpi.meal_type = 'lunch'
ORDER BY mpi.created_at DESC
LIMIT 1;

-- ============================================
-- DEPOIS, COPIE O ID E EXECUTE ESTA QUERY:
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
     jsonb_array_elements(meal_data.recipe_ingredients) as ingredient
ORDER BY 
  CASE 
    WHEN ingredient->>'item' ILIKE '%água%' THEN 1
    WHEN ingredient->>'item' ILIKE '%water%' THEN 1
    ELSE 2
  END;
*/
