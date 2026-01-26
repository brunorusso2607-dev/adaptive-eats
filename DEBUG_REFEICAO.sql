-- ============================================
-- DEBUG: VERIFICAR SE REFEIÇÃO EXISTE E TEM INGREDIENTES
-- ============================================

-- Verificar se a refeição existe
SELECT 
  id,
  recipe_name,
  recipe_ingredients,
  jsonb_array_length(recipe_ingredients) as num_ingredientes,
  from_pool
FROM meal_plan_items
WHERE id = '8bc2224f-7d5b-4ce4-98ba-e543d7c99e14';

-- ============================================
-- Se retornar a refeição mas recipe_ingredients for NULL ou vazio:
-- → Ingredientes não foram salvos no banco
-- → Problema na geração ou salvamento da refeição
--
-- Se retornar a refeição com recipe_ingredients preenchido:
-- → Vamos expandir o JSON para ver os ingredientes
-- ============================================
