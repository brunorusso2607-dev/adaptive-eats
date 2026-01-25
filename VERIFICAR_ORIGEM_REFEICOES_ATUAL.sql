-- ============================================
-- SQL PARA VERIFICAR ORIGEM DAS REFEIÇÕES
-- Verifica se refeições vieram de: POOL, GERAÇÃO DIRETA ou IA
-- ============================================

-- 1. VERIFICAR REFEIÇÕES MAIS RECENTES (ÚLTIMA GERAÇÃO)
-- ============================================
SELECT 
  mpi.id,
  mpi.meal_type,
  mpi.recipe_name,
  mpi.recipe_calories,
  mpi.from_pool,
  mpi.created_at,
  mp.user_id,
  mp.name as plan_name,
  -- Análise de origem
  CASE 
    WHEN mpi.from_pool = true THEN '🟢 POOL'
    WHEN mpi.from_pool = false THEN '🔴 IA ou DIRETO'
    ELSE '⚪ DESCONHECIDO'
  END as origem_aparente,
  -- Análise de componentes (refeições diretas têm água/sobremesa)
  CASE 
    WHEN mpi.recipe_ingredients::text ILIKE '%água%' 
      OR mpi.recipe_ingredients::text ILIKE '%water%' THEN '💧 TEM ÁGUA'
    ELSE '❌ SEM ÁGUA'
  END as tem_agua,
  CASE 
    WHEN mpi.recipe_ingredients::text ILIKE '%sobremesa%' 
      OR mpi.recipe_ingredients::text ILIKE '%fruta%'
      OR mpi.recipe_ingredients::text ILIKE '%fruit%' THEN '🍎 TEM SOBREMESA/FRUTA'
    ELSE '❌ SEM SOBREMESA'
  END as tem_sobremesa,
  -- Contar componentes
  jsonb_array_length(mpi.recipe_ingredients) as num_componentes
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
ORDER BY mpi.created_at DESC
LIMIT 20;

-- ============================================
-- 2. ESTATÍSTICAS DE ORIGEM (PLANO ATIVO)
-- ============================================
SELECT 
  mpi.meal_type,
  COUNT(*) as total_refeicoes,
  SUM(CASE WHEN mpi.from_pool = true THEN 1 ELSE 0 END) as do_pool,
  SUM(CASE WHEN mpi.from_pool = false THEN 1 ELSE 0 END) as nao_pool,
  SUM(CASE WHEN mpi.recipe_ingredients::text ILIKE '%água%' 
            OR mpi.recipe_ingredients::text ILIKE '%water%' THEN 1 ELSE 0 END) as com_agua,
  SUM(CASE WHEN jsonb_array_length(mpi.recipe_ingredients) >= 5 THEN 1 ELSE 0 END) as complexas
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
GROUP BY mpi.meal_type
ORDER BY mpi.meal_type;

-- ============================================
-- 3. VERIFICAR REFEIÇÕES MAIS RECENTES (ÚLTIMA GERAÇÃO)
-- ============================================
SELECT 
  mpi.id,
  mpi.meal_type,
  mpi.recipe_name,
  mpi.from_pool,
  mpi.created_at,
  -- Ingredientes
  mpi.recipe_ingredients,
  -- Análise detalhada
  CASE 
    WHEN mpi.from_pool = true THEN '🟢 POOL'
    WHEN mpi.recipe_ingredients::text ILIKE '%água%' 
      OR mpi.recipe_ingredients::text ILIKE '%water%' THEN '🔵 GERAÇÃO DIRETA (tem água)'
    WHEN jsonb_array_length(mpi.recipe_ingredients) >= 5 THEN '🔵 GERAÇÃO DIRETA (complexa)'
    ELSE '🔴 IA (simples, sem água)'
  END as origem_provavel
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
ORDER BY mpi.created_at DESC
LIMIT 10;

-- ============================================
-- 4. ANÁLISE DETALHADA DE INGREDIENTES
-- ============================================
SELECT 
  mpi.meal_type,
  mpi.recipe_name,
  mpi.from_pool,
  mpi.created_at,
  -- Extrair ingredientes
  jsonb_array_length(mpi.recipe_ingredients) as num_ingredientes,
  mpi.recipe_ingredients,
  -- Verificações específicas
  CASE 
    WHEN mpi.recipe_ingredients::text ILIKE '%água%' THEN '✅ TEM ÁGUA'
    WHEN mpi.recipe_ingredients::text ILIKE '%water%' THEN '✅ TEM WATER'
    ELSE '❌ SEM ÁGUA'
  END as check_agua,
  CASE 
    WHEN mpi.recipe_ingredients::text ILIKE '%sobremesa%' THEN '✅ TEM SOBREMESA'
    WHEN mpi.recipe_ingredients::text ILIKE '%fruta%' THEN '✅ TEM FRUTA'
    ELSE '❌ SEM SOBREMESA'
  END as check_sobremesa
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
ORDER BY mpi.created_at DESC
LIMIT 10;

-- ============================================
-- 5. COMPARAR COM POOL (verificar se refeição existe no pool)
-- ============================================
SELECT 
  mpi.meal_type,
  mpi.recipe_name,
  mpi.from_pool as marcado_como_pool,
  mpi.created_at,
  -- Verificar se existe no pool
  EXISTS(
    SELECT 1 FROM meal_combinations mc
    WHERE mc.name = mpi.recipe_name
      AND mc.meal_type = mpi.meal_type
      AND mc.is_approved = true
  ) as existe_no_pool_real,
  -- Análise
  CASE 
    WHEN mpi.from_pool = true AND EXISTS(
      SELECT 1 FROM meal_combinations mc
      WHERE mc.name = mpi.recipe_name
        AND mc.meal_type = mpi.meal_type
        AND mc.is_approved = true
    ) THEN '✅ POOL (confirmado)'
    WHEN mpi.from_pool = true AND NOT EXISTS(
      SELECT 1 FROM meal_combinations mc
      WHERE mc.name = mpi.recipe_name
        AND mc.meal_type = mpi.meal_type
        AND mc.is_approved = true
    ) THEN '⚠️ MARCADO COMO POOL MAS NÃO EXISTE'
    WHEN mpi.from_pool = false THEN '🔵 GERADO (direto ou IA)'
    ELSE '⚪ DESCONHECIDO'
  END as analise_origem
FROM meal_plan_items mpi
JOIN meal_plans mp ON mpi.meal_plan_id = mp.id
WHERE mp.is_active = true
ORDER BY mpi.created_at DESC
LIMIT 10;

-- ============================================
-- 6. VERIFICAR DISPONIBILIDADE DO POOL
-- ============================================
SELECT 
  mc.meal_type,
  COUNT(*) as total_no_pool,
  COUNT(CASE WHEN mc.is_approved = true THEN 1 END) as aprovadas,
  COUNT(CASE WHEN mc.country = 'BR' THEN 1 END) as do_brasil
FROM meal_combinations mc
GROUP BY mc.meal_type
ORDER BY mc.meal_type;

-- ============================================
-- INTERPRETAÇÃO DOS RESULTADOS:
-- ============================================
-- 
-- 🟢 POOL: from_pool = true E existe em meal_combinations
-- 🔵 GERAÇÃO DIRETA: from_pool = false E tem água/sobremesa E >= 5 componentes
-- 🔴 IA: from_pool = false E sem água E poucos componentes
--
-- CARACTERÍSTICAS DA GERAÇÃO DIRETA:
-- - Sempre inclui água
-- - Geralmente inclui sobremesa (frutas)
-- - Múltiplos vegetais (2-3 tipos)
-- - 5+ componentes
-- - Nomes descritivos completos
--
-- CARACTERÍSTICAS DA IA:
-- - Sem água
-- - Sem sobremesa
-- - Poucos componentes (3-4)
-- - Nomes genéricos
-- ============================================
