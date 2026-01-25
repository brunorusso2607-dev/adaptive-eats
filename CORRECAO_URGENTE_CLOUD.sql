-- ============================================
-- CORREÇÃO URGENTE - EXECUTAR NO SUPABASE CLOUD
-- SQL Editor: https://supabase.com/dashboard/project/SEU_PROJECT/sql
-- ============================================

-- 1. DELETAR REFEIÇÕES COM PROBLEMAS
DELETE FROM meal_combinations
WHERE 
  -- Problema 1: Molho separado
  (name ILIKE '%molho%' AND components::text ILIKE '%"name":"Molho%')
  OR
  -- Problema 2: Xícara para sólidos
  (components::text ILIKE '%xícara%' AND (
    components::text ILIKE '%brócolis%'
    OR components::text ILIKE '%brocolis%'
    OR components::text ILIKE '%frango%'
    OR components::text ILIKE '%carne%'
    OR components::text ILIKE '%legumes%'
  ))
  OR
  -- Problema 3: Queijo como proteína principal (sem outra proteína)
  (components::text ILIKE '%queijo branco%' 
   AND components::text NOT ILIKE '%frango%'
   AND components::text NOT ILIKE '%carne%'
   AND components::text NOT ILIKE '%peixe%'
   AND components::text NOT ILIKE '%ovo%'
   AND meal_type IN ('almoco', 'jantar'));

-- 2. VERIFICAR QUANTAS FORAM DELETADAS
SELECT 
  'Refeições restantes' as status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE meal_type = 'almoco') as almoco,
  COUNT(*) FILTER (WHERE meal_type = 'jantar') as jantar
FROM meal_combinations;
