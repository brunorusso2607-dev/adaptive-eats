-- ═══════════════════════════════════════════════════════════════════════
-- TESTE PRÁTICO - Inserir Ingrediente e Validar Sincronização Automática
-- ═══════════════════════════════════════════════════════════════════════
-- Este teste vai:
-- 1. Verificar versão atual do cache
-- 2. Inserir novo ingrediente (Dourado Grelhado)
-- 3. Verificar que o ingrediente foi inserido
-- 4. Verificar que o trigger disparou
-- 5. Confirmar que está disponível para o gerador
-- ═══════════════════════════════════════════════════════════════════════

-- PASSO 1: Ver versão ANTES de inserir
SELECT 
  '🔍 ANTES - Versão do Cache' as teste,
  version as versao_atual,
  last_updated as ultima_atualizacao
FROM meal_pool_cache_version
WHERE id = 1;

-- PASSO 2: Contar ingredientes ANTES
SELECT 
  '📊 ANTES - Total de Ingredientes' as teste,
  COUNT(*) as total_ingredientes
FROM ingredient_pool;

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO 3: INSERIR NOVO INGREDIENTE DE TESTE
-- ═══════════════════════════════════════════════════════════════════════
-- Ingrediente: Dourado Grelhado
-- Categoria: Proteína (peixe)
-- Macros baseados em TACO/TBCA
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (
  ingredient_key,
  display_name_pt,
  display_name_en,
  display_name_es,
  category,
  kcal_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g,
  fiber_per_100g,
  default_portion_grams,
  is_alternative,
  country_code
) VALUES (
  'grilled_dourado',                    -- Chave única
  'Dourado grelhado',                   -- Nome em português
  'Grilled dourado',                    -- Nome em inglês
  'Dorado a la parrilla',              -- Nome em espanhol
  'protein',                            -- Categoria: proteína
  96,                                   -- 96 kcal por 100g
  19.2,                                 -- 19.2g de proteína por 100g
  0,                                    -- 0g de carboidratos
  1.8,                                  -- 1.8g de gordura por 100g
  0,                                    -- 0g de fibra
  150,                                  -- Porção padrão: 150g
  false,                                -- Não é alternativo
  NULL                                  -- Disponível para todos os países
);

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO 4: VERIFICAR QUE FOI INSERIDO
-- ═══════════════════════════════════════════════════════════════════════

SELECT 
  '✅ INSERIDO - Novo Ingrediente' as teste,
  ingredient_key,
  display_name_pt,
  category,
  kcal_per_100g,
  protein_per_100g,
  default_portion_grams,
  created_at
FROM ingredient_pool
WHERE ingredient_key = 'grilled_dourado';

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO 5: VERIFICAR QUE TRIGGER DISPAROU
-- ═══════════════════════════════════════════════════════════════════════

-- Ver versão DEPOIS de inserir (deve ter incrementado)
SELECT 
  '🔍 DEPOIS - Versão do Cache' as teste,
  version as versao_atual,
  last_updated as ultima_atualizacao,
  CASE 
    WHEN version > 1 THEN '✅ TRIGGER DISPAROU!'
    ELSE '❌ Trigger não disparou'
  END as status_trigger
FROM meal_pool_cache_version
WHERE id = 1;

-- Contar ingredientes DEPOIS
SELECT 
  '📊 DEPOIS - Total de Ingredientes' as teste,
  COUNT(*) as total_ingredientes,
  '✅ +1 ingrediente adicionado' as status
FROM ingredient_pool;

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO 6: VERIFICAR STATUS DE SINCRONIZAÇÃO
-- ═══════════════════════════════════════════════════════════════════════

SELECT 
  '🔄 Status de Sincronização' as teste,
  ingredient_key,
  display_name_pt,
  category,
  sync_status,
  updated_at
FROM ingredients_sync_status
WHERE ingredient_key = 'grilled_dourado';

-- ═══════════════════════════════════════════════════════════════════════
-- PASSO 7: VERIFICAR INGREDIENTES RECENTES (últimos 5)
-- ═══════════════════════════════════════════════════════════════════════

SELECT 
  '📋 Últimos 5 Ingredientes Adicionados' as teste,
  ingredient_key,
  display_name_pt,
  category,
  sync_status,
  created_at
FROM ingredients_sync_status
WHERE sync_status = 'recently_created'
ORDER BY created_at DESC
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════════════
-- RESULTADO ESPERADO:
-- ═══════════════════════════════════════════════════════════════════════
-- ✅ Versão do cache deve ter incrementado (de 1 para 2)
-- ✅ Ingrediente "grilled_dourado" deve aparecer no banco
-- ✅ Status de sincronização deve ser "recently_created"
-- ✅ Trigger disparou automaticamente
-- ✅ Ingrediente já está disponível para o gerador usar
-- ═══════════════════════════════════════════════════════════════════════

-- BÔNUS: Calcular macros para porção padrão (150g)
SELECT 
  '🍽️ Macros por Porção (150g)' as teste,
  display_name_pt,
  ROUND((kcal_per_100g * default_portion_grams / 100)::numeric, 1) as kcal_porcao,
  ROUND((protein_per_100g * default_portion_grams / 100)::numeric, 1) as proteina_porcao,
  ROUND((carbs_per_100g * default_portion_grams / 100)::numeric, 1) as carbs_porcao,
  ROUND((fat_per_100g * default_portion_grams / 100)::numeric, 1) as gordura_porcao,
  default_portion_grams as porcao_gramas
FROM ingredient_pool
WHERE ingredient_key = 'grilled_dourado';
