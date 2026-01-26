-- ============================================
-- SCRIPT PARA LIMPAR REFEIÇÕES COM PROBLEMAS
-- Execute no Supabase SQL Editor
-- ============================================

-- 1. VISUALIZAR refeições com "xícara" para sólidos (antes de deletar)
SELECT 
  id,
  name,
  meal_type,
  components::text as components_preview,
  created_at
FROM meal_combinations
WHERE 
  components::text ILIKE '%xícara%'
  AND (
    components::text ILIKE '%frango%'
    OR components::text ILIKE '%carne%'
    OR components::text ILIKE '%peixe%'
    OR components::text ILIKE '%bife%'
    OR components::text ILIKE '%legumes%'
    OR components::text ILIKE '%brócolis%'
    OR components::text ILIKE '%brocolis%'
    OR components::text ILIKE '%couve%'
    OR components::text ILIKE '%salada%'
  )
ORDER BY created_at DESC;

-- 2. CONTAR quantas refeições serão afetadas
SELECT COUNT(*) as total_problematicas
FROM meal_combinations
WHERE 
  components::text ILIKE '%xícara%'
  AND (
    components::text ILIKE '%frango%'
    OR components::text ILIKE '%carne%'
    OR components::text ILIKE '%peixe%'
    OR components::text ILIKE '%bife%'
    OR components::text ILIKE '%legumes%'
    OR components::text ILIKE '%brócolis%'
    OR components::text ILIKE '%brocolis%'
    OR components::text ILIKE '%couve%'
    OR components::text ILIKE '%salada%'
  );

-- ============================================
-- OPÇÃO A: DELETAR refeições problemáticas
-- (Recomendado - as novas gerações serão corretas)
-- ============================================

-- DESCOMENTE PARA EXECUTAR:
/*
DELETE FROM meal_combinations
WHERE 
  components::text ILIKE '%xícara%'
  AND (
    components::text ILIKE '%frango%'
    OR components::text ILIKE '%carne%'
    OR components::text ILIKE '%peixe%'
    OR components::text ILIKE '%bife%'
    OR components::text ILIKE '%legumes%'
    OR components::text ILIKE '%brócolis%'
    OR components::text ILIKE '%brocolis%'
    OR components::text ILIKE '%couve%'
    OR components::text ILIKE '%salada%'
  );
*/

-- ============================================
-- OPÇÃO B: DELETAR TODAS as refeições antigas
-- (Limpa tudo e começa do zero)
-- ============================================

-- DESCOMENTE PARA EXECUTAR:
/*
DELETE FROM meal_combinations;
*/

-- ============================================
-- 3. VERIFICAR resultado após limpeza
-- ============================================

SELECT 
  meal_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE components::text ILIKE '%xícara%') as com_xicara
FROM meal_combinations
GROUP BY meal_type
ORDER BY meal_type;
