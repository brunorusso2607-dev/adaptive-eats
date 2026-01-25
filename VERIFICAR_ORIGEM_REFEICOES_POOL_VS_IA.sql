-- ============================================
-- VERIFICAR ORIGEM DAS REFEIÇÕES: POOL vs IA
-- ============================================

-- 1. Resumo geral: quantas refeições vieram do pool vs IA
SELECT 
    CASE 
        WHEN from_pool = true THEN 'POOL'
        WHEN from_pool = false THEN 'IA (Gemini)'
        ELSE 'NÃO MARCADO'
    END as origem,
    COUNT(*) as total_refeicoes,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM meal_plan_items WHERE meal_plan_id IN (
        SELECT id FROM meal_plans WHERE user_id = auth.uid() AND is_active = true ORDER BY created_at DESC LIMIT 1
    )), 2) as percentual
FROM meal_plan_items
WHERE meal_plan_id IN (
    SELECT id FROM meal_plans WHERE user_id = auth.uid() AND is_active = true ORDER BY created_at DESC LIMIT 1
)
GROUP BY from_pool
ORDER BY total_refeicoes DESC;

-- 2. Detalhamento por tipo de refeição
SELECT 
    meal_type,
    CASE 
        WHEN from_pool = true THEN 'POOL'
        WHEN from_pool = false THEN 'IA'
        ELSE 'NÃO MARCADO'
    END as origem,
    COUNT(*) as quantidade
FROM meal_plan_items
WHERE meal_plan_id IN (
    SELECT id FROM meal_plans WHERE user_id = auth.uid() AND is_active = true ORDER BY created_at DESC LIMIT 1
)
GROUP BY meal_type, from_pool
ORDER BY meal_type, quantidade DESC;

-- 3. Listar todas as refeições com sua origem
SELECT 
    day_of_week,
    week_number,
    meal_type,
    recipe_name,
    CASE 
        WHEN from_pool = true THEN '✅ POOL'
        WHEN from_pool = false THEN '🤖 IA (Gemini)'
        ELSE '❓ NÃO MARCADO'
    END as origem,
    recipe_calories as calorias,
    created_at
FROM meal_plan_items
WHERE meal_plan_id IN (
    SELECT id FROM meal_plans WHERE user_id = auth.uid() AND is_active = true ORDER BY created_at DESC LIMIT 1
)
ORDER BY week_number, day_of_week, 
    CASE meal_type
        WHEN 'breakfast' THEN 1
        WHEN 'morning_snack' THEN 2
        WHEN 'lunch' THEN 3
        WHEN 'afternoon_snack' THEN 4
        WHEN 'dinner' THEN 5
        WHEN 'supper' THEN 6
    END;

-- 4. Verificar se há inconsistências (refeições sem marcação)
SELECT 
    COUNT(*) as refeicoes_sem_marcacao,
    ARRAY_AGG(recipe_name) as exemplos
FROM meal_plan_items
WHERE meal_plan_id IN (
    SELECT id FROM meal_plans WHERE user_id = auth.uid() AND is_active = true ORDER BY created_at DESC LIMIT 1
)
AND from_pool IS NULL;

-- 5. Estatísticas por semana
SELECT 
    week_number as semana,
    COUNT(*) as total_refeicoes,
    COUNT(*) FILTER (WHERE from_pool = true) as do_pool,
    COUNT(*) FILTER (WHERE from_pool = false) as da_ia,
    COUNT(*) FILTER (WHERE from_pool IS NULL) as sem_marcacao,
    ROUND(COUNT(*) FILTER (WHERE from_pool = true) * 100.0 / COUNT(*), 2) as percentual_pool
FROM meal_plan_items
WHERE meal_plan_id IN (
    SELECT id FROM meal_plans WHERE user_id = auth.uid() AND is_active = true ORDER BY created_at DESC LIMIT 1
)
GROUP BY week_number
ORDER BY week_number;

-- 6. Verificar se badge POOL está sendo exibido corretamente
-- (comparar campo from_pool com o que aparece na UI)
SELECT 
    'RESUMO PARA DEBUG' as info,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE from_pool = true) as marcado_como_pool,
    COUNT(*) FILTER (WHERE from_pool = false) as marcado_como_ia,
    COUNT(*) FILTER (WHERE from_pool IS NULL) as sem_marcacao
FROM meal_plan_items
WHERE meal_plan_id IN (
    SELECT id FROM meal_plans WHERE user_id = auth.uid() AND is_active = true ORDER BY created_at DESC LIMIT 1
);
