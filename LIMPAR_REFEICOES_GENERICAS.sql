-- ============================================
-- LIMPAR REFEIÇÕES COM NOMES GENÉRICOS
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. DELETAR REFEIÇÕES COM NOMES GENÉRICOS
DELETE FROM meal_combinations
WHERE 
  -- Padrão: "X com Y" sem especificação
  (name ILIKE '%com%' AND (
    -- Genéricos de café da manhã
    name ILIKE 'Aveia com%'
    OR name ILIKE 'Pão com%'
    OR name ILIKE 'Tapioca com%'
    OR name ILIKE 'Cuscuz com%'
    -- Genéricos de almoço/jantar
    OR name ILIKE 'Arroz com%'
    OR name ILIKE 'Macarrão com%'
    OR name ILIKE 'Batata com%'
    -- Genéricos de sopas
    OR name ILIKE 'Sopa de%'
    OR name ILIKE 'Caldo de%'
    -- Genéricos de omeletes
    OR name ILIKE 'Omelete com%'
    OR name ILIKE 'Omelete de%'
  ))
  -- Excluir refeições que já são descritivas
  AND name NOT ILIKE '%grelhado%'
  AND name NOT ILIKE '%refogado%'
  AND name NOT ILIKE '%cozido%'
  AND name NOT ILIKE '%frito%'
  AND name NOT ILIKE '%molho%'
  AND name NOT ILIKE '%vitamina%'
  AND name NOT ILIKE '%suco%'
  AND name NOT ILIKE '%recheada%'
  AND name NOT ILIKE '%desfiado%'
  AND name NOT ILIKE '%francês%'
  AND name NOT ILIKE '%integral%';

-- 2. VERIFICAR QUANTAS FORAM DELETADAS
SELECT 
  'Refeições restantes após limpeza' as status,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE meal_type = 'cafe_manha') as cafe_manha,
  COUNT(*) FILTER (WHERE meal_type = 'almoco') as almoco,
  COUNT(*) FILTER (WHERE meal_type = 'jantar') as jantar,
  COUNT(*) FILTER (WHERE meal_type = 'lanche_manha') as lanche_manha,
  COUNT(*) FILTER (WHERE meal_type = 'lanche_tarde') as lanche_tarde,
  COUNT(*) FILTER (WHERE meal_type = 'ceia') as ceia
FROM meal_combinations;

-- 3. EXEMPLOS DE REFEIÇÕES QUE PERMANECERAM (devem ser descritivas)
SELECT name, meal_type
FROM meal_combinations
ORDER BY created_at DESC
LIMIT 20;
