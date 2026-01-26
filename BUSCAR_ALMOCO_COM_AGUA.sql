-- ============================================
-- BUSCAR ALMOÇO COM ÁGUA (LUNCH)
-- ============================================

-- Primeiro, listar todos os almoços
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
  AND mpi.meal_type = 'lunch'
ORDER BY mpi.created_at DESC;

-- ============================================
-- ANÁLISE:
-- O screenshot original mostrava um ALMOÇO com:
-- - Arroz integral (120g)
-- - Salada de alface, tomate cereja, pepino e cenoura ralada com azeite (150g) — 14 kcal (TBCA)
-- - 1 laranja média (sobremesa) (150g) — 42 kcal (TBCA)
-- - 1 copo de água (opcional) (200g) — 42 kcal (TBCA) ← PROBLEMA
-- - Feijão carioca (100g) — 318 kcal (TBCA)
-- - Filé de frango grelhado ao limão (180g) — 203 kcal (TBCA)
--
-- Procure por uma refeição com nome similar a:
-- "Arroz com Feijão, Filé de frango grelhado e Salada"
-- ou
-- "Arroz integral com Feijão carioca, Filé de frango e Salada"
-- ============================================
