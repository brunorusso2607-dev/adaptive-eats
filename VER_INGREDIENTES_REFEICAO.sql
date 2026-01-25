-- ============================================
-- VER INGREDIENTES DA REFEIÇÃO COM ÁGUA 42 KCAL
-- ============================================

SELECT 
  mpi.id,
  mpi.recipe_name,
  mpi.recipe_ingredients,
  mpi.recipe_calories,
  mpi.recipe_protein,
  mpi.recipe_carbs,
  mpi.recipe_fat,
  mpi.from_pool,
  mpi.created_at
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
  AND mpi.recipe_name ILIKE '%frango%'
  AND mpi.recipe_name ILIKE '%feijão%'
ORDER BY mpi.created_at DESC
LIMIT 1;

-- ============================================
-- ANÁLISE ESPERADA:
-- ============================================
-- 
-- O campo recipe_ingredients é um JSON array com estrutura:
-- [
--   {
--     "name": "Arroz integral",
--     "grams": 120,
--     "calories": 148,
--     ...
--   },
--   {
--     "name": "1 copo de água (opcional)",
--     "grams": 200,
--     "calories": 42,  <-- AQUI ESTÁ O PROBLEMA
--     ...
--   }
-- ]
--
-- Se água tem 42 kcal no JSON, o problema está em:
-- 1. Backend calculou errado ao gerar a refeição
-- 2. Frontend está mostrando valor do backend sem recalcular
--
-- Se água tem 0 kcal no JSON, o problema está em:
-- 1. Frontend calculando errado ao exibir
-- ============================================
