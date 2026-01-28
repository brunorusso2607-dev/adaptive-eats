-- ============================================
-- CORREÇÃO DE INTERNACIONALIZAÇÃO
-- Mapeamento de Intolerâncias
-- ============================================
-- 
-- OBJETIVO:
-- Corrigir alimentos que estão em português para inglês (global)
-- Manter apenas alimentos específicos do Brasil em português
--
-- IMPACTO:
-- - Glúten: 8 correções
-- - Lactose: 14 correções
-- - FODMAP: ~120 correções
-- - TOTAL: ~142 correções
--
-- REGRA:
-- - Alimentos globais → INGLÊS
-- - Alimentos específicos do Brasil → PORTUGUÊS
-- ============================================

BEGIN;

-- ============================================
-- BACKUP: Criar tabela temporária com dados atuais
-- ============================================
CREATE TEMP TABLE intolerance_mappings_backup AS 
SELECT * FROM intolerance_mappings;

-- ============================================
-- PARTE 1: GLÚTEN (8 correções)
-- ============================================

-- 1. trigo → wheat
UPDATE intolerance_mappings 
SET ingredient = 'wheat' 
WHERE intolerance_key = 'gluten' AND ingredient = 'trigo';

-- 2. centeio → rye
UPDATE intolerance_mappings 
SET ingredient = 'rye' 
WHERE intolerance_key = 'gluten' AND ingredient = 'centeio';

-- 3. cevada → barley
UPDATE intolerance_mappings 
SET ingredient = 'barley' 
WHERE intolerance_key = 'gluten' AND ingredient = 'cevada';

-- 4. malte → malt
UPDATE intolerance_mappings 
SET ingredient = 'malt' 
WHERE intolerance_key = 'gluten' AND ingredient = 'malte';

-- 5. aveia → oats
UPDATE intolerance_mappings 
SET ingredient = 'oats' 
WHERE intolerance_key = 'gluten' AND ingredient = 'aveia';

-- 6. farinha de trigo → wheat flour
UPDATE intolerance_mappings 
SET ingredient = 'wheat flour' 
WHERE intolerance_key = 'gluten' AND ingredient = 'farinha de trigo';

-- 7. glúten → gluten
UPDATE intolerance_mappings 
SET ingredient = 'gluten' 
WHERE intolerance_key = 'gluten' AND ingredient = 'glúten';

-- 8. cerveja → beer
UPDATE intolerance_mappings 
SET ingredient = 'beer' 
WHERE intolerance_key = 'gluten' AND ingredient = 'cerveja';

-- ============================================
-- PARTE 2: LACTOSE (14 correções)
-- ============================================

-- 1. leite → milk
UPDATE intolerance_mappings 
SET ingredient = 'milk' 
WHERE intolerance_key = 'lactose' AND ingredient = 'leite';

-- 2. leite integral → whole milk
UPDATE intolerance_mappings 
SET ingredient = 'whole milk' 
WHERE intolerance_key = 'lactose' AND ingredient = 'leite integral';

-- 3. leite desnatado → skim milk
UPDATE intolerance_mappings 
SET ingredient = 'skim milk' 
WHERE intolerance_key = 'lactose' AND ingredient = 'leite desnatado';

-- 4. queijo → cheese
UPDATE intolerance_mappings 
SET ingredient = 'cheese' 
WHERE intolerance_key = 'lactose' AND ingredient = 'queijo';

-- 5. queijo mussarela → mozzarella
UPDATE intolerance_mappings 
SET ingredient = 'mozzarella' 
WHERE intolerance_key = 'lactose' AND ingredient = 'queijo mussarela';

-- 6. iogurte → yogurt
UPDATE intolerance_mappings 
SET ingredient = 'yogurt' 
WHERE intolerance_key = 'lactose' AND ingredient = 'iogurte';

-- 7. iogurte natural → plain yogurt
UPDATE intolerance_mappings 
SET ingredient = 'plain yogurt' 
WHERE intolerance_key = 'lactose' AND ingredient = 'iogurte natural';

-- 8. creme de leite → cream
UPDATE intolerance_mappings 
SET ingredient = 'cream' 
WHERE intolerance_key = 'lactose' AND ingredient = 'creme de leite';

-- 9. manteiga → butter
UPDATE intolerance_mappings 
SET ingredient = 'butter' 
WHERE intolerance_key = 'lactose' AND ingredient = 'manteiga';

-- 10. nata → heavy cream
UPDATE intolerance_mappings 
SET ingredient = 'heavy cream' 
WHERE intolerance_key = 'lactose' AND ingredient = 'nata';

-- 11. soro de leite → whey
UPDATE intolerance_mappings 
SET ingredient = 'whey' 
WHERE intolerance_key = 'lactose' AND ingredient = 'soro de leite';

-- 12. leite condensado → condensed milk
UPDATE intolerance_mappings 
SET ingredient = 'condensed milk' 
WHERE intolerance_key = 'lactose' AND ingredient = 'leite condensado';

-- 13. sorvete → ice cream
UPDATE intolerance_mappings 
SET ingredient = 'ice cream' 
WHERE intolerance_key = 'lactose' AND ingredient = 'sorvete';

-- 14. ricota → ricotta
UPDATE intolerance_mappings 
SET ingredient = 'ricotta' 
WHERE intolerance_key = 'lactose' AND ingredient = 'ricota';

-- MANTER EM PORTUGUÊS (específicos do Brasil):
-- requeijão, queijo minas, queijo coalho, doce de leite

-- ============================================
-- PARTE 3: FODMAP - VEGETAIS (16 correções)
-- ============================================

-- 1. alho → garlic
UPDATE intolerance_mappings 
SET ingredient = 'garlic' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'alho';

-- 2. alho picado → minced garlic
UPDATE intolerance_mappings 
SET ingredient = 'minced garlic' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'alho picado';

-- 3. alho frito → fried garlic
UPDATE intolerance_mappings 
SET ingredient = 'fried garlic' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'alho frito';

-- 4. cebola → onion
UPDATE intolerance_mappings 
SET ingredient = 'onion' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola';

-- 5. cebola branca → white onion
UPDATE intolerance_mappings 
SET ingredient = 'white onion' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola branca';

-- 6. cebola roxa → red onion
UPDATE intolerance_mappings 
SET ingredient = 'red onion' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola roxa';

-- 7. cebola refogada → sautéed onion
UPDATE intolerance_mappings 
SET ingredient = 'sautéed onion' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cebola refogada';

-- 8. cogumelo → mushroom
UPDATE intolerance_mappings 
SET ingredient = 'mushroom' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cogumelo';

-- 9. couve-flor → cauliflower
UPDATE intolerance_mappings 
SET ingredient = 'cauliflower' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'couve-flor';

-- 10. aspargo → asparagus
UPDATE intolerance_mappings 
SET ingredient = 'asparagus' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'aspargo';

-- 11. alcachofra → artichoke
UPDATE intolerance_mappings 
SET ingredient = 'artichoke' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'alcachofra';

-- 12. repolho → cabbage
UPDATE intolerance_mappings 
SET ingredient = 'cabbage' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'repolho';

-- 13. brócolis → broccoli
UPDATE intolerance_mappings 
SET ingredient = 'broccoli' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'brócolis';

-- 14. beterraba → beet
UPDATE intolerance_mappings 
SET ingredient = 'beet' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'beterraba';

-- 15. salsão → celery
UPDATE intolerance_mappings 
SET ingredient = 'celery' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'salsão';

-- 16. erva-doce → fennel
UPDATE intolerance_mappings 
SET ingredient = 'fennel' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'erva-doce';

-- ============================================
-- PARTE 4: FODMAP - LEGUMINOSAS (5 correções)
-- ============================================

-- 1. feijão → beans
UPDATE intolerance_mappings 
SET ingredient = 'beans' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'feijão';

-- 2. grão de bico → chickpea
UPDATE intolerance_mappings 
SET ingredient = 'chickpea' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'grão de bico';

-- 3. lentilha → lentil
UPDATE intolerance_mappings 
SET ingredient = 'lentil' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'lentilha';

-- 4. ervilha → pea
UPDATE intolerance_mappings 
SET ingredient = 'pea' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'ervilha';

-- 5. fava → fava bean
UPDATE intolerance_mappings 
SET ingredient = 'fava bean' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'fava';

-- ============================================
-- PARTE 5: FODMAP - FRUTAS (31 correções)
-- ============================================

-- 1. maçã → apple
UPDATE intolerance_mappings 
SET ingredient = 'apple' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'maçã';

-- 2. melancia → watermelon
UPDATE intolerance_mappings 
SET ingredient = 'watermelon' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'melancia';

-- 3. manga → mango
UPDATE intolerance_mappings 
SET ingredient = 'mango' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'manga';

-- 4. pêssego → peach
UPDATE intolerance_mappings 
SET ingredient = 'peach' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'pêssego';

-- 5. pera → pear
UPDATE intolerance_mappings 
SET ingredient = 'pear' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'pera';

-- 6. ameixa → plum
UPDATE intolerance_mappings 
SET ingredient = 'plum' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'ameixa';

-- 7. cereja → cherry
UPDATE intolerance_mappings 
SET ingredient = 'cherry' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cereja';

-- 8. damasco → apricot
UPDATE intolerance_mappings 
SET ingredient = 'apricot' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'damasco';

-- 9. figo → fig
UPDATE intolerance_mappings 
SET ingredient = 'fig' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'figo';

-- 10. tâmara → date
UPDATE intolerance_mappings 
SET ingredient = 'date' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'tâmara';

-- 11. abacate → avocado
UPDATE intolerance_mappings 
SET ingredient = 'avocado' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'abacate';

-- 12. lichia → lychee
UPDATE intolerance_mappings 
SET ingredient = 'lychee' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'lichia';

-- 13. caqui → persimmon
UPDATE intolerance_mappings 
SET ingredient = 'persimmon' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'caqui';

-- 14. amora → blackberry
UPDATE intolerance_mappings 
SET ingredient = 'blackberry' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'amora';

-- 15. framboesa → raspberry
UPDATE intolerance_mappings 
SET ingredient = 'raspberry' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'framboesa';

-- 16. morango → strawberry
UPDATE intolerance_mappings 
SET ingredient = 'strawberry' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'morango';

-- 17. uva → grape
UPDATE intolerance_mappings 
SET ingredient = 'grape' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'uva';

-- 18. laranja → orange
UPDATE intolerance_mappings 
SET ingredient = 'orange' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'laranja';

-- 19. limão → lemon
UPDATE intolerance_mappings 
SET ingredient = 'lemon' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'limão';

-- 20. tangerina → tangerine
UPDATE intolerance_mappings 
SET ingredient = 'tangerine' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'tangerina';

-- 21. kiwi → kiwi (já está correto, mas garantir)
-- Não precisa correção

-- 22. abacaxi → pineapple
UPDATE intolerance_mappings 
SET ingredient = 'pineapple' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'abacaxi';

-- 23. mamão → papaya
UPDATE intolerance_mappings 
SET ingredient = 'papaya' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'mamão';

-- 24. goiaba → guava
UPDATE intolerance_mappings 
SET ingredient = 'guava' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'goiaba';

-- 25. maracujá → passion fruit
UPDATE intolerance_mappings 
SET ingredient = 'passion fruit' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'maracujá';

-- 26. coco → coconut
UPDATE intolerance_mappings 
SET ingredient = 'coconut' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'coco';

-- 27. melão → melon
UPDATE intolerance_mappings 
SET ingredient = 'melon' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'melão';

-- 28. romã → pomegranate
UPDATE intolerance_mappings 
SET ingredient = 'pomegranate' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'romã';

-- 29. carambola → starfruit
UPDATE intolerance_mappings 
SET ingredient = 'starfruit' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'carambola';

-- 30. pitaya → dragon fruit
UPDATE intolerance_mappings 
SET ingredient = 'dragon fruit' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'pitaya';

-- 31. jaca → jackfruit
UPDATE intolerance_mappings 
SET ingredient = 'jackfruit' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'jaca';

-- MANTER EM PORTUGUÊS (variedades brasileiras):
-- banana nanica, banana prata, banana madura

-- ============================================
-- PARTE 6: FODMAP - OLEAGINOSAS (2 correções)
-- ============================================

-- 1. castanha de caju → cashew
UPDATE intolerance_mappings 
SET ingredient = 'cashew' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'castanha de caju';

-- 2. pistache → pistachio
UPDATE intolerance_mappings 
SET ingredient = 'pistachio' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'pistache';

-- ============================================
-- PARTE 7: FODMAP - LATICÍNIOS (3 correções)
-- ============================================

-- 1. leite → milk (se ainda não foi corrigido)
UPDATE intolerance_mappings 
SET ingredient = 'milk' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'leite';

-- 2. iogurte → yogurt (se ainda não foi corrigido)
UPDATE intolerance_mappings 
SET ingredient = 'yogurt' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'iogurte';

-- 3. sorvete → ice cream (se ainda não foi corrigido)
UPDATE intolerance_mappings 
SET ingredient = 'ice cream' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'sorvete';

-- ============================================
-- PARTE 8: FODMAP - ADOÇANTES (2 correções)
-- ============================================

-- 1. mel → honey
UPDATE intolerance_mappings 
SET ingredient = 'honey' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'mel';

-- 2. frutose → fructose
UPDATE intolerance_mappings 
SET ingredient = 'fructose' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'frutose';

-- ============================================
-- PARTE 9: FODMAP - GRÃOS (2 correções)
-- ============================================

-- 1. centeio → rye (se ainda não foi corrigido)
UPDATE intolerance_mappings 
SET ingredient = 'rye' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'centeio';

-- 2. cevada → barley (se ainda não foi corrigido)
UPDATE intolerance_mappings 
SET ingredient = 'barley' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cevada';

-- ============================================
-- PARTE 10: FODMAP - OUTROS (10 correções)
-- ============================================

-- 1. açúcar → sugar
UPDATE intolerance_mappings 
SET ingredient = 'sugar' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'açúcar';

-- 2. xarope de milho → corn syrup
UPDATE intolerance_mappings 
SET ingredient = 'corn syrup' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'xarope de milho';

-- 3. chiclete → gum
UPDATE intolerance_mappings 
SET ingredient = 'gum' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'chiclete';

-- 4. vinho → wine
UPDATE intolerance_mappings 
SET ingredient = 'wine' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'vinho';

-- 5. cerveja → beer (se ainda não foi corrigido)
UPDATE intolerance_mappings 
SET ingredient = 'beer' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cerveja';

-- 6. suco → juice
UPDATE intolerance_mappings 
SET ingredient = 'juice' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'suco';

-- 7. chá → tea
UPDATE intolerance_mappings 
SET ingredient = 'tea' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'chá';

-- 8. café → coffee
UPDATE intolerance_mappings 
SET ingredient = 'coffee' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'café';

-- 9. chocolate → chocolate (já está correto)
-- Não precisa correção

-- 10. cacau → cocoa
UPDATE intolerance_mappings 
SET ingredient = 'cocoa' 
WHERE intolerance_key = 'fodmap' AND ingredient = 'cacau';

-- ============================================
-- VERIFICAÇÃO: Contar correções realizadas
-- ============================================

-- Criar tabela de resumo
CREATE TEMP TABLE correction_summary AS
SELECT 
  'gluten' as intolerance,
  COUNT(*) as corrections
FROM intolerance_mappings_backup b
WHERE b.intolerance_key = 'gluten'
  AND NOT EXISTS (
    SELECT 1 FROM intolerance_mappings m 
    WHERE m.intolerance_key = b.intolerance_key 
    AND m.ingredient = b.ingredient
  )
UNION ALL
SELECT 
  'lactose' as intolerance,
  COUNT(*) as corrections
FROM intolerance_mappings_backup b
WHERE b.intolerance_key = 'lactose'
  AND NOT EXISTS (
    SELECT 1 FROM intolerance_mappings m 
    WHERE m.intolerance_key = b.intolerance_key 
    AND m.ingredient = b.ingredient
  )
UNION ALL
SELECT 
  'fodmap' as intolerance,
  COUNT(*) as corrections
FROM intolerance_mappings_backup b
WHERE b.intolerance_key = 'fodmap'
  AND NOT EXISTS (
    SELECT 1 FROM intolerance_mappings m 
    WHERE m.intolerance_key = b.intolerance_key 
    AND m.ingredient = b.ingredient
  );

-- Mostrar resumo
DO $$
DECLARE
  gluten_count INT;
  lactose_count INT;
  fodmap_count INT;
  total_count INT;
BEGIN
  SELECT corrections INTO gluten_count FROM correction_summary WHERE intolerance = 'gluten';
  SELECT corrections INTO lactose_count FROM correction_summary WHERE intolerance = 'lactose';
  SELECT corrections INTO fodmap_count FROM correction_summary WHERE intolerance = 'fodmap';
  total_count := gluten_count + lactose_count + fodmap_count;
  
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESUMO DAS CORREÇÕES';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Glúten: % correções', gluten_count;
  RAISE NOTICE 'Lactose: % correções', lactose_count;
  RAISE NOTICE 'FODMAP: % correções', fodmap_count;
  RAISE NOTICE 'TOTAL: % correções', total_count;
  RAISE NOTICE '============================================';
END $$;

COMMIT;

-- ============================================
-- ROLLBACK EM CASO DE ERRO
-- ============================================
-- Se algo der errado, execute:
-- ROLLBACK;
-- E depois restaure do backup:
-- INSERT INTO intolerance_mappings SELECT * FROM intolerance_mappings_backup;
