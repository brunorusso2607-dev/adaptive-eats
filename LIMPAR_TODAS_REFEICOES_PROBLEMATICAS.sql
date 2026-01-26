-- ============================================
-- LIMPAR TODAS AS REFEIÇÕES PROBLEMÁTICAS
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. DELETAR REFEIÇÕES COM OS 5 PROBLEMAS IDENTIFICADOS
DELETE FROM meal_combinations
WHERE 
  -- Problema 1: Pão francês para intolerante a glúten (validação falhou)
  (name ILIKE '%pão francês%' AND 'gluten' = ANY(blocked_for_intolerances))
  OR
  -- Problema 2: Refeições repetidas (v2, v3)
  (name ILIKE '%(v2)%' OR name ILIKE '%(v3)%' OR name ILIKE '%versão%')
  OR
  -- Problema 3: "Pão" genérico sem especificar tipo
  (name ILIKE '%pão %' AND name NOT ILIKE '%pão francês%' AND name NOT ILIKE '%pão de forma%' AND name NOT ILIKE '%pão integral%' AND name NOT ILIKE '%pão sírio%' AND name NOT ILIKE '%pão sem%')
  OR
  -- Problema 4: Excesso de frituras
  (name ILIKE '%ovo frito%' OR name ILIKE '%frango frito%' OR name ILIKE '%batata frita%')
  OR
  -- Problema 5: Nomes genéricos (falta criatividade)
  (name ILIKE 'Aveia com%' AND name NOT ILIKE '%vitamina%')
  OR (name ILIKE 'Pão com%' AND name NOT ILIKE '%francês%' AND name NOT ILIKE '%forma%')
  OR (name ILIKE 'Arroz com%' AND name NOT ILIKE '%grelhado%' AND name NOT ILIKE '%refogado%')
  OR (name ILIKE 'Tapioca com%' AND name NOT ILIKE '%recheada%')
  OR (name ILIKE 'Omelete com%' AND name NOT ILIKE '%de %')
  OR (name ILIKE 'Sopa de%' AND components::text NOT ILIKE '%frango%' AND components::text NOT ILIKE '%carne%');

-- 2. VERIFICAR QUANTAS FORAM DELETADAS
SELECT 
  'Refeições restantes após limpeza completa' as status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE meal_type = 'cafe_manha') as cafe_manha,
  COUNT(*) FILTER (WHERE meal_type = 'almoco') as almoco,
  COUNT(*) FILTER (WHERE meal_type = 'jantar') as jantar,
  COUNT(*) FILTER (WHERE meal_type = 'lanche_manha') as lanche_manha,
  COUNT(*) FILTER (WHERE meal_type = 'lanche_tarde') as lanche_tarde,
  COUNT(*) FILTER (WHERE meal_type = 'ceia') as ceia
FROM meal_combinations;

-- 3. VERIFICAR SE AINDA HÁ REFEIÇÕES COM PROBLEMAS
SELECT 
  'Verificação de problemas remanescentes' as status,
  COUNT(*) FILTER (WHERE name ILIKE '%(v2)%') as com_v2,
  COUNT(*) FILTER (WHERE name ILIKE '%ovo frito%') as com_fritura,
  COUNT(*) FILTER (WHERE name ILIKE 'Aveia com%' AND name NOT ILIKE '%vitamina%') as genericos
FROM meal_combinations;

-- 4. EXEMPLOS DE REFEIÇÕES QUE PERMANECERAM (devem estar corretas)
SELECT name, meal_type, created_at
FROM meal_combinations
ORDER BY created_at DESC
LIMIT 30;
