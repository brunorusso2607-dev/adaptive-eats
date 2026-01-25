-- ============================================
-- VER INGREDIENTES EXPANDIDOS (CADA UM SEPARADO)
-- ============================================

-- Usar o ID da refeição que você viu no resultado anterior
-- Substitua 'SEU_ID_AQUI' pelo ID real (ex: 5b2212cf-7d95-4ccc-b8ba...)

WITH meal_data AS (
  SELECT 
    mpi.id,
    mpi.recipe_name,
    mpi.recipe_ingredients,
    mpi.from_pool
  FROM meal_plan_items mpi
  JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
  WHERE mp.is_active = true
    AND mpi.recipe_name ILIKE '%frango%'
    AND mpi.recipe_name ILIKE '%feijão%'
  ORDER BY mpi.created_at DESC
  LIMIT 1
)
SELECT 
  meal_data.recipe_name,
  meal_data.from_pool,
  ingredient->>'item' as ingrediente_nome,
  ingredient->>'quantity' as quantidade,
  ingredient->>'unit' as unidade,
  (ingredient->>'calories')::numeric as calorias_salvas,
  (ingredient->>'protein')::numeric as proteina_salva,
  (ingredient->>'carbs')::numeric as carbs_salvos,
  (ingredient->>'fat')::numeric as gordura_salva
FROM meal_data,
     jsonb_array_elements(meal_data.recipe_ingredients) as ingredient
ORDER BY 
  CASE 
    WHEN ingredient->>'item' ILIKE '%água%' THEN 1
    WHEN ingredient->>'item' ILIKE '%water%' THEN 1
    ELSE 2
  END,
  ingredient->>'item';

-- ============================================
-- ANÁLISE:
-- ============================================
-- 
-- Esta query mostra CADA ingrediente em uma linha separada
-- com suas calorias, proteínas, carbs e gordura SALVAS no banco.
--
-- Se água aparecer com calorias > 0:
-- → Problema no BACKEND (calculateRealMacros ou geração da refeição)
--
-- Se água aparecer com calorias = 0:
-- → Problema no FRONTEND (useIngredientCalories calculando errado)
--
-- IMPORTANTE: Água deve estar no topo da lista para fácil identificação
-- ============================================
