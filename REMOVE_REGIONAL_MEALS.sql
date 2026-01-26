-- ============================================
-- REMOVER REFEIÇÕES COM INGREDIENTES REGIONAIS
-- ============================================
-- Remove refeições que contêm ingredientes muito regionais (por estado)
-- Mantém apenas ingredientes brasileiros comuns nacionalmente

-- Lista de refeições a remover (ingredientes regionais demais):
-- 
-- INGREDIENTES REGIONAIS A REMOVER:
-- - Pitanga (Sul/Sudeste específico)
-- - Bananada (regional)
-- - Carne de sol (Nordeste)
-- - Charque (Sul específico)
-- - Maxixe (Nordeste)
-- - Ora-pro-nóbis (Minas Gerais)
-- - Taioba (Minas Gerais)
-- - Caruru (Bahia/Norte)
-- - Jambu (Pará/Norte)
-- - Cajuína (Piauí)
-- - Cupuaçu (Norte)
-- - Rapadura (Nordeste)
-- - Manteiga de garrafa (Nordeste)
-- - Linguiça calabresa (regional)
--
-- INGREDIENTES BRASILEIROS COMUNS (MANTER):
-- - Pão de queijo (nacional)
-- - Requeijão (nacional)
-- - Queijo minas, coalho (nacional)
-- - Tapioca (nacional)
-- - Cuscuz (nacional)
-- - Açaí (nacional)
-- - Farofa (nacional)
-- - Beiju (nacional)

-- ============================================
-- DELETAR REFEIÇÕES COM INGREDIENTES REGIONAIS
-- ============================================

DELETE FROM meal_combinations
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '3 hours'
AND (
  -- Pitanga
  name = 'Pitanga Fresca'
  
  -- Bananada
  OR name = 'Bananada com Queijo'
  
  -- Carne de sol
  OR name = 'Arroz com Feijão, Carne de Sol e Abóbora'
  OR name = 'Batata com Carne de Sol e Manteiga de Garrafa'
  
  -- Charque
  OR name = 'Arroz com Feijão, Charque Desfiado e Maxixe'
  
  -- Ora-pro-nóbis
  OR name = 'Arroz, Feijão, Linguiça Toscana e Ora-pro-nóbis'
  
  -- Taioba
  OR name = 'Arroz Integral, Peixe Assado e Taioba'
  
  -- Caruru
  OR name = 'Arroz, Feijão, Costelinha Suína e Caruru'
  
  -- Jambu
  OR name = 'Arroz Integral, Salmão e Jambu'
  
  -- Cajuína
  OR name = 'Suco de Cajuína com Biscoito'
  
  -- Cupuaçu
  OR name = 'Smoothie de Cupuaçu'
  
  -- Rapadura
  OR name = 'Rapadura com Castanhas'
  
  -- Linguiça calabresa
  OR name LIKE '%Linguiça Calabresa%'
  OR name = 'Arroz, Feijão, Linguiça Calabresa e Couve Refogada'
  OR name = 'Caldo Verde'
);

-- ============================================
-- VERIFICAR RESULTADO
-- ============================================

-- Contar quantas foram removidas
SELECT 
  'Refeições removidas' as status,
  COUNT(*) as total_removido
FROM meal_combinations
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '3 hours';

-- Mostrar refeições restantes por tipo
SELECT 
  meal_type,
  COUNT(*) as total_restante
FROM meal_combinations
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '3 hours'
GROUP BY meal_type
ORDER BY 
  CASE meal_type
    WHEN 'cafe_manha' THEN 1
    WHEN 'lanche_manha' THEN 2
    WHEN 'almoco' THEN 3
    WHEN 'lanche_tarde' THEN 4
    WHEN 'jantar' THEN 5
    WHEN 'ceia' THEN 6
  END;

-- Listar algumas refeições restantes (amostra)
SELECT 
  meal_type,
  name,
  total_calories
FROM meal_combinations
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '3 hours'
ORDER BY meal_type, name
LIMIT 20;
