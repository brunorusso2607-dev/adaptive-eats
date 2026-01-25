-- ============================================
-- VERIFICAR STATUS DO POOL DE REFEIÇÕES
-- ============================================

-- 1. VERIFICAR SE POOL TEM REFEIÇÕES APROVADAS
SELECT 
  mc.meal_type,
  COUNT(*) as total_refeicoes,
  SUM(CASE WHEN mc.is_approved = true THEN 1 ELSE 0 END) as aprovadas,
  SUM(CASE WHEN mc.country = 'BR' THEN 1 ELSE 0 END) as do_brasil,
  SUM(CASE WHEN mc.is_approved = true AND mc.country = 'BR' THEN 1 ELSE 0 END) as aprovadas_br
FROM meal_combinations mc
GROUP BY mc.meal_type
ORDER BY mc.meal_type;

-- ============================================
-- 2. TOTAL GERAL DO POOL
-- ============================================
SELECT 
  COUNT(*) as total_pool,
  COUNT(CASE WHEN is_approved = true THEN 1 END) as total_aprovadas,
  COUNT(CASE WHEN country = 'BR' THEN 1 END) as total_brasil,
  COUNT(CASE WHEN is_approved = true AND country = 'BR' THEN 1 END) as total_aprovadas_br
FROM meal_combinations;

-- ============================================
-- INTERPRETAÇÃO:
-- ============================================
-- 
-- Se POOL TEM REFEIÇÕES APROVADAS:
-- → Sistema usa pool (nível 1) ✅
-- → NUNCA chega na geração direta (nível 2)
-- → Comportamento CORRETO
--
-- Se POOL ESTÁ VAZIO:
-- → Sistema DEVERIA usar geração direta (nível 2)
-- → Se usar IA, há um BUG
--
-- PARA TESTAR GERAÇÃO DIRETA:
-- → Temporariamente marcar todas como is_approved = false
-- → Ou deletar refeições do pool
-- → Gerar novo plano
-- → Verificar se usa geração direta
-- ============================================
