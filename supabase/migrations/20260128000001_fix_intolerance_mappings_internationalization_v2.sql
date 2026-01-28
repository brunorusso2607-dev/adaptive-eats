-- ============================================
-- CORREÇÃO DE INTERNACIONALIZAÇÃO V2
-- Mapeamento de Intolerâncias
-- ============================================
-- 
-- OBJETIVO:
-- Corrigir alimentos que estão em português para inglês (global)
-- Manter apenas alimentos específicos do Brasil em português
--
-- ESTRATÉGIA OTIMIZADA:
-- 1. Remover TODAS as duplicatas de uma vez (onde PT e EN coexistem)
-- 2. Fazer UPDATE em massa dos termos restantes em português
-- 
-- IMPACTO:
-- - Glúten: 8 correções
-- - Lactose: 14 correções
-- - FODMAP: ~120 correções
-- - TOTAL: ~142 correções
-- ============================================

BEGIN;

-- ============================================
-- BACKUP: Criar tabela temporária com dados atuais
-- ============================================
CREATE TEMP TABLE intolerance_mappings_backup AS 
SELECT * FROM intolerance_mappings;

-- ============================================
-- ETAPA 1: REMOVER DUPLICATAS (PT quando EN já existe)
-- ============================================

-- Remover todos os termos em português que têm equivalente em inglês já cadastrado
DELETE FROM intolerance_mappings 
WHERE (intolerance_key, ingredient) IN (
  -- GLÚTEN
  SELECT 'gluten', 'trigo' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'wheat')
  UNION ALL SELECT 'gluten', 'centeio' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'rye')
  UNION ALL SELECT 'gluten', 'cevada' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'barley')
  UNION ALL SELECT 'gluten', 'malte' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'malt')
  UNION ALL SELECT 'gluten', 'aveia' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'oats')
  UNION ALL SELECT 'gluten', 'farinha de trigo' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'wheat flour')
  UNION ALL SELECT 'gluten', 'glúten' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'gluten')
  UNION ALL SELECT 'gluten', 'cerveja' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'gluten' AND ingredient = 'beer')
  
  -- LACTOSE
  UNION ALL SELECT 'lactose', 'leite' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'milk')
  UNION ALL SELECT 'lactose', 'leite integral' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'whole milk')
  UNION ALL SELECT 'lactose', 'leite desnatado' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'skim milk')
  UNION ALL SELECT 'lactose', 'queijo' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'cheese')
  UNION ALL SELECT 'lactose', 'queijo mussarela' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'mozzarella')
  UNION ALL SELECT 'lactose', 'iogurte' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'yogurt')
  UNION ALL SELECT 'lactose', 'iogurte natural' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'plain yogurt')
  UNION ALL SELECT 'lactose', 'creme de leite' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'cream')
  UNION ALL SELECT 'lactose', 'manteiga' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'butter')
  UNION ALL SELECT 'lactose', 'nata' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'heavy cream')
  UNION ALL SELECT 'lactose', 'soro de leite' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'whey')
  UNION ALL SELECT 'lactose', 'leite condensado' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'condensed milk')
  UNION ALL SELECT 'lactose', 'sorvete' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'ice cream')
  UNION ALL SELECT 'lactose', 'ricota' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'lactose' AND ingredient = 'ricotta')
  
  -- FODMAP - Vegetais
  UNION ALL SELECT 'fodmap', 'alho' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'garlic')
  UNION ALL SELECT 'fodmap', 'alho picado' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'minced garlic')
  UNION ALL SELECT 'fodmap', 'alho frito' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'fried garlic')
  UNION ALL SELECT 'fodmap', 'cebola' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'onion')
  UNION ALL SELECT 'fodmap', 'cebola branca' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'white onion')
  UNION ALL SELECT 'fodmap', 'cebola roxa' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'red onion')
  UNION ALL SELECT 'fodmap', 'cebola refogada' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'sautéed onion')
  UNION ALL SELECT 'fodmap', 'cogumelo' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'mushroom')
  UNION ALL SELECT 'fodmap', 'couve-flor' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'cauliflower')
  UNION ALL SELECT 'fodmap', 'aspargo' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'asparagus')
  UNION ALL SELECT 'fodmap', 'alcachofra' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'artichoke')
  UNION ALL SELECT 'fodmap', 'repolho' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'cabbage')
  UNION ALL SELECT 'fodmap', 'brócolis' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'broccoli')
  UNION ALL SELECT 'fodmap', 'beterraba' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'beet')
  UNION ALL SELECT 'fodmap', 'salsão' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'celery')
  UNION ALL SELECT 'fodmap', 'erva-doce' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'fennel')
  
  -- FODMAP - Leguminosas
  UNION ALL SELECT 'fodmap', 'feijão' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'beans')
  UNION ALL SELECT 'fodmap', 'grão de bico' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'chickpea')
  UNION ALL SELECT 'fodmap', 'lentilha' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'lentil')
  UNION ALL SELECT 'fodmap', 'ervilha' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'pea')
  UNION ALL SELECT 'fodmap', 'fava' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'fava bean')
  
  -- FODMAP - Frutas (principais)
  UNION ALL SELECT 'fodmap', 'maçã' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'apple')
  UNION ALL SELECT 'fodmap', 'melancia' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'watermelon')
  UNION ALL SELECT 'fodmap', 'manga' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'mango')
  UNION ALL SELECT 'fodmap', 'pêssego' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'peach')
  UNION ALL SELECT 'fodmap', 'pera' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'pear')
  UNION ALL SELECT 'fodmap', 'ameixa' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'plum')
  UNION ALL SELECT 'fodmap', 'cereja' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'cherry')
  UNION ALL SELECT 'fodmap', 'damasco' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'apricot')
  UNION ALL SELECT 'fodmap', 'figo' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'fig')
  UNION ALL SELECT 'fodmap', 'tâmara' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'date')
  UNION ALL SELECT 'fodmap', 'abacate' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'avocado')
  
  -- FODMAP - Oleaginosas
  UNION ALL SELECT 'fodmap', 'castanha de caju' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'cashew')
  UNION ALL SELECT 'fodmap', 'pistache' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'pistachio')
  
  -- FODMAP - Adoçantes
  UNION ALL SELECT 'fodmap', 'mel' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'honey')
  UNION ALL SELECT 'fodmap', 'frutose' WHERE EXISTS (SELECT 1 FROM intolerance_mappings WHERE intolerance_key = 'fodmap' AND ingredient = 'fructose')
);

-- ============================================
-- ETAPA 2: UPDATE EM MASSA (PT → EN)
-- ============================================

-- GLÚTEN
UPDATE intolerance_mappings SET ingredient = 'wheat' WHERE intolerance_key = 'gluten' AND ingredient = 'trigo';
UPDATE intolerance_mappings SET ingredient = 'rye' WHERE intolerance_key = 'gluten' AND ingredient = 'centeio';
UPDATE intolerance_mappings SET ingredient = 'barley' WHERE intolerance_key = 'gluten' AND ingredient = 'cevada';
UPDATE intolerance_mappings SET ingredient = 'malt' WHERE intolerance_key = 'gluten' AND ingredient = 'malte';
UPDATE intolerance_mappings SET ingredient = 'oats' WHERE intolerance_key = 'gluten' AND ingredient = 'aveia';
UPDATE intolerance_mappings SET ingredient = 'wheat flour' WHERE intolerance_key = 'gluten' AND ingredient = 'farinha de trigo';
UPDATE intolerance_mappings SET ingredient = 'gluten' WHERE intolerance_key = 'gluten' AND ingredient = 'glúten';
UPDATE intolerance_mappings SET ingredient = 'beer' WHERE intolerance_key = 'gluten' AND ingredient = 'cerveja';

-- LACTOSE
UPDATE intolerance_mappings SET ingredient = 'milk' WHERE intolerance_key = 'lactose' AND ingredient = 'leite';
UPDATE intolerance_mappings SET ingredient = 'whole milk' WHERE intolerance_key = 'lactose' AND ingredient = 'leite integral';
UPDATE intolerance_mappings SET ingredient = 'skim milk' WHERE intolerance_key = 'lactose' AND ingredient = 'leite desnatado';
UPDATE intolerance_mappings SET ingredient = 'cheese' WHERE intolerance_key = 'lactose' AND ingredient = 'queijo';
UPDATE intolerance_mappings SET ingredient = 'mozzarella' WHERE intolerance_key = 'lactose' AND ingredient = 'queijo mussarela';
UPDATE intolerance_mappings SET ingredient = 'yogurt' WHERE intolerance_key = 'lactose' AND ingredient = 'iogurte';
UPDATE intolerance_mappings SET ingredient = 'plain yogurt' WHERE intolerance_key = 'lactose' AND ingredient = 'iogurte natural';
UPDATE intolerance_mappings SET ingredient = 'cream' WHERE intolerance_key = 'lactose' AND ingredient = 'creme de leite';
UPDATE intolerance_mappings SET ingredient = 'butter' WHERE intolerance_key = 'lactose' AND ingredient = 'manteiga';
UPDATE intolerance_mappings SET ingredient = 'heavy cream' WHERE intolerance_key = 'lactose' AND ingredient = 'nata';
UPDATE intolerance_mappings SET ingredient = 'whey' WHERE intolerance_key = 'lactose' AND ingredient = 'soro de leite';
UPDATE intolerance_mappings SET ingredient = 'condensed milk' WHERE intolerance_key = 'lactose' AND ingredient = 'leite condensado';
UPDATE intolerance_mappings SET ingredient = 'ice cream' WHERE intolerance_key = 'lactose' AND ingredient = 'sorvete';
UPDATE intolerance_mappings SET ingredient = 'ricotta' WHERE intolerance_key = 'lactose' AND ingredient = 'ricota';

-- FODMAP - Vegetais
UPDATE intolerance_mappings SET ingredient = 'garlic' WHERE intolerance_key = 'fodmap' AND ingredient = 'alho';
UPDATE intolerance_mappings SET ingredient = 'minced garlic' WHERE intolerance_key = 'fodmap' AND ingredient = 'alho picado';
UPDATE intolerance_mappings SET ingredient = 'fried garlic' WHERE intolerance_key = 'fodmap' AND ingredient = 'alho frito';
UPDATE intolerance_mappings SET ingredient = 'onion' WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola';
UPDATE intolerance_mappings SET ingredient = 'white onion' WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola branca';
UPDATE intolerance_mappings SET ingredient = 'red onion' WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola roxa';
UPDATE intolerance_mappings SET ingredient = 'sautéed onion' WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola refogada';
UPDATE intolerance_mappings SET ingredient = 'mushroom' WHERE intolerance_key = 'fodmap' AND ingredient = 'cogumelo';
UPDATE intolerance_mappings SET ingredient = 'cauliflower' WHERE intolerance_key = 'fodmap' AND ingredient = 'couve-flor';
UPDATE intolerance_mappings SET ingredient = 'asparagus' WHERE intolerance_key = 'fodmap' AND ingredient = 'aspargo';
UPDATE intolerance_mappings SET ingredient = 'artichoke' WHERE intolerance_key = 'fodmap' AND ingredient = 'alcachofra';
UPDATE intolerance_mappings SET ingredient = 'cabbage' WHERE intolerance_key = 'fodmap' AND ingredient = 'repolho';
UPDATE intolerance_mappings SET ingredient = 'broccoli' WHERE intolerance_key = 'fodmap' AND ingredient = 'brócolis';
UPDATE intolerance_mappings SET ingredient = 'beet' WHERE intolerance_key = 'fodmap' AND ingredient = 'beterraba';
UPDATE intolerance_mappings SET ingredient = 'celery' WHERE intolerance_key = 'fodmap' AND ingredient = 'salsão';
UPDATE intolerance_mappings SET ingredient = 'fennel' WHERE intolerance_key = 'fodmap' AND ingredient = 'erva-doce';

-- FODMAP - Leguminosas
UPDATE intolerance_mappings SET ingredient = 'beans' WHERE intolerance_key = 'fodmap' AND ingredient = 'feijão';
UPDATE intolerance_mappings SET ingredient = 'chickpea' WHERE intolerance_key = 'fodmap' AND ingredient = 'grão de bico';
UPDATE intolerance_mappings SET ingredient = 'lentil' WHERE intolerance_key = 'fodmap' AND ingredient = 'lentilha';
UPDATE intolerance_mappings SET ingredient = 'pea' WHERE intolerance_key = 'fodmap' AND ingredient = 'ervilha';
UPDATE intolerance_mappings SET ingredient = 'fava bean' WHERE intolerance_key = 'fodmap' AND ingredient = 'fava';

-- FODMAP - Frutas
UPDATE intolerance_mappings SET ingredient = 'apple' WHERE intolerance_key = 'fodmap' AND ingredient = 'maçã';
UPDATE intolerance_mappings SET ingredient = 'watermelon' WHERE intolerance_key = 'fodmap' AND ingredient = 'melancia';
UPDATE intolerance_mappings SET ingredient = 'mango' WHERE intolerance_key = 'fodmap' AND ingredient = 'manga';
UPDATE intolerance_mappings SET ingredient = 'peach' WHERE intolerance_key = 'fodmap' AND ingredient = 'pêssego';
UPDATE intolerance_mappings SET ingredient = 'pear' WHERE intolerance_key = 'fodmap' AND ingredient = 'pera';
UPDATE intolerance_mappings SET ingredient = 'plum' WHERE intolerance_key = 'fodmap' AND ingredient = 'ameixa';
UPDATE intolerance_mappings SET ingredient = 'cherry' WHERE intolerance_key = 'fodmap' AND ingredient = 'cereja';
UPDATE intolerance_mappings SET ingredient = 'apricot' WHERE intolerance_key = 'fodmap' AND ingredient = 'damasco';
UPDATE intolerance_mappings SET ingredient = 'fig' WHERE intolerance_key = 'fodmap' AND ingredient = 'figo';
UPDATE intolerance_mappings SET ingredient = 'date' WHERE intolerance_key = 'fodmap' AND ingredient = 'tâmara';
UPDATE intolerance_mappings SET ingredient = 'avocado' WHERE intolerance_key = 'fodmap' AND ingredient = 'abacate';

-- FODMAP - Oleaginosas
UPDATE intolerance_mappings SET ingredient = 'cashew' WHERE intolerance_key = 'fodmap' AND ingredient = 'castanha de caju';
UPDATE intolerance_mappings SET ingredient = 'pistachio' WHERE intolerance_key = 'fodmap' AND ingredient = 'pistache';

-- FODMAP - Adoçantes
UPDATE intolerance_mappings SET ingredient = 'honey' WHERE intolerance_key = 'fodmap' AND ingredient = 'mel';
UPDATE intolerance_mappings SET ingredient = 'fructose' WHERE intolerance_key = 'fodmap' AND ingredient = 'frutose';

-- ============================================
-- VERIFICAÇÃO: Contar correções realizadas
-- ============================================
DO $$
DECLARE
  total_corrections INT;
BEGIN
  SELECT COUNT(*) INTO total_corrections
  FROM intolerance_mappings_backup b
  WHERE NOT EXISTS (
    SELECT 1 FROM intolerance_mappings m 
    WHERE m.intolerance_key = b.intolerance_key 
    AND m.ingredient = b.ingredient
  );
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESUMO DAS CORREÇÕES';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total de correções aplicadas: %', total_corrections;
  RAISE NOTICE '============================================';
END $$;

COMMIT;
