-- ============================================
-- VER INGREDIENTES DO ALMOÇO ESPECÍFICO
-- ============================================

-- Usando o ID do primeiro almoço da lista
WITH meal_data AS (
  SELECT 
    id,
    recipe_name,
    recipe_ingredients,
    from_pool
  FROM meal_plan_items
  WHERE id = '8bc2224f-7d5b-4ce4-98ba-e543d7c99e14'
)
SELECT 
  meal_data.recipe_name,
  meal_data.from_pool,
  ingredient->>'item' as ingrediente,
  ingredient->>'quantity' as quantidade,
  ingredient->>'unit' as unidade,
  (ingredient->>'calories')::numeric as calorias_salvas,
  (ingredient->>'protein')::numeric as proteina,
  (ingredient->>'carbs')::numeric as carbs,
  (ingredient->>'fat')::numeric as gordura
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
-- Esta query mostra TODOS os ingredientes salvos no banco
-- para esta refeição específica, incluindo suas calorias.
--
-- Se água aparecer com calorias > 0:
-- → Problema no BACKEND (geração ou cálculo)
--
-- Se água aparecer com calorias = 0:
-- → Problema no FRONTEND (exibição)
--
-- Se água NÃO aparecer:
-- → Água está sendo adicionada apenas no frontend
-- ============================================
