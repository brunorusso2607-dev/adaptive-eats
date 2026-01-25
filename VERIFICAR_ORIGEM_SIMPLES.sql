-- ============================================
-- VERIFICAR ORIGEM DAS REFEIÇÕES - VERSÃO SIMPLIFICADA
-- ============================================

-- 1. RESUMO GERAL - Plano mais recente
SELECT 
    CASE 
        WHEN from_pool = true THEN 'POOL'
        WHEN from_pool = false THEN 'IA (Gemini)'
        ELSE 'NÃO MARCADO'
    END as origem,
    COUNT(*) as total_refeicoes,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentual
FROM meal_plan_items
WHERE meal_plan_id = (
    SELECT id FROM meal_plans 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1
)
GROUP BY from_pool
ORDER BY total_refeicoes DESC;

-- 2. DETALHAMENTO POR TIPO DE REFEIÇÃO
SELECT 
    meal_type,
    CASE 
        WHEN from_pool = true THEN 'POOL'
        WHEN from_pool = false THEN 'IA'
        ELSE 'NÃO MARCADO'
    END as origem,
    COUNT(*) as quantidade
FROM meal_plan_items
WHERE meal_plan_id = (
    SELECT id FROM meal_plans 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1
)
GROUP BY meal_type, from_pool
ORDER BY meal_type, quantidade DESC;

-- 3. ESTATÍSTICAS POR SEMANA
SELECT 
    week_number as semana,
    COUNT(*) as total_refeicoes,
    COUNT(*) FILTER (WHERE from_pool = true) as do_pool,
    COUNT(*) FILTER (WHERE from_pool = false) as da_ia,
    COUNT(*) FILTER (WHERE from_pool IS NULL) as sem_marcacao,
    ROUND(COUNT(*) FILTER (WHERE from_pool = true) * 100.0 / COUNT(*), 2) as percentual_pool
FROM meal_plan_items
WHERE meal_plan_id = (
    SELECT id FROM meal_plans 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1
)
GROUP BY week_number
ORDER BY week_number;

-- 4. LISTAR PRIMEIRAS 20 REFEIÇÕES COM ORIGEM
SELECT 
    day_of_week,
    week_number,
    meal_type,
    recipe_name,
    CASE 
        WHEN from_pool = true THEN '✅ POOL'
        WHEN from_pool = false THEN '🤖 IA'
        ELSE '❓ SEM MARCAÇÃO'
    END as origem,
    recipe_calories as calorias
FROM meal_plan_items
WHERE meal_plan_id = (
    SELECT id FROM meal_plans 
    WHERE is_active = true 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY week_number, day_of_week
LIMIT 20;

-- 5. VERIFICAR SE HÁ PLANO ATIVO
SELECT 
    id,
    user_id,
    start_date,
    end_date,
    is_active,
    created_at,
    (SELECT COUNT(*) FROM meal_plan_items WHERE meal_plan_id = meal_plans.id) as total_refeicoes
FROM meal_plans
WHERE is_active = true
ORDER BY created_at DESC
LIMIT 5;
