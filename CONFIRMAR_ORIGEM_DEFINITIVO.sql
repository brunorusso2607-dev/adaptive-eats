-- ============================================
-- CONFIRMAR ORIGEM DAS REFEIÇÕES - DEFINITIVO
-- ============================================

-- Verificar refeições do sábado (24/01)
SELECT 
  mpi.meal_type,
  mpi.recipe_name,
  mpi.from_pool,
  jsonb_array_length(mpi.recipe_ingredients) as num_componentes,
  mpi.recipe_ingredients,
  -- Análise de origem
  CASE 
    WHEN mpi.from_pool = true THEN '🟢 POOL (meal_combinations)'
    WHEN jsonb_array_length(mpi.recipe_ingredients) >= 4 THEN '🔵 GERAÇÃO DIRETA (templates inteligentes)'
    WHEN jsonb_array_length(mpi.recipe_ingredients) >= 3 THEN '🟡 GERAÇÃO DIRETA ou IA (ambíguo)'
    ELSE '🔴 IA (Gemini - último recurso)'
  END as origem_real,
  -- Características
  CASE 
    WHEN mpi.recipe_name ILIKE '%com%' AND mpi.recipe_name ILIKE '%e%' THEN '✅ Nome completo (DIRETO)'
    ELSE '⚠️ Nome simples'
  END as qualidade_nome
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
  AND mpi.created_at >= NOW() - INTERVAL '1 hour'  -- Última hora
ORDER BY mpi.meal_type;

-- ============================================
-- INTERPRETAÇÃO:
-- ============================================
-- 
-- 🟢 POOL: from_pool = true
-- 🔵 GERAÇÃO DIRETA: from_pool = false + 4+ componentes + nome completo
-- 🔴 IA: from_pool = false + poucos componentes + nome simples
--
-- SUAS REFEIÇÕES:
-- - "Arroz com Feijão, Sobrecoxa assada e Salada" = 4+ componentes = DIRETO
-- - "Iogurte grego com Banana prata e Chia" = Nome completo = DIRETO
-- - "Pão de forma integral com Requeijão light" = Nome completo = DIRETO
--
-- LOGS CONFIRMAM:
-- ✅ NÍVEL 2: breakfast from DIRECT generation
-- ✅ NÍVEL 2: morning_snack from DIRECT generation
-- ============================================
