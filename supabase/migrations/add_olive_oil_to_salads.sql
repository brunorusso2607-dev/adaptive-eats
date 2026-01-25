-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT: Corrigir azeite nas refeições existentes
-- REGRA: Azeite SÓ deve aparecer quando tem SALADA (vegetais crus)
-- ═══════════════════════════════════════════════════════════════════════════

-- VEGETAIS DE SALADA (precisam de azeite):
-- alface, rúcula, agrião, tomate, pepino, pimentão

-- VEGETAIS COZIDOS/REFOGADOS (NÃO precisam de azeite):
-- jiló, berinjela, abobrinha, brócolis, couve-flor, cenoura, vagem, 
-- abóbora, chuchu, quiabo, beterraba, repolho, couve, espinafre, acelga

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 1: Ver refeições que TÊM salada mas NÃO têm azeite (precisam adicionar)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  'ADICIONAR AZEITE' as acao,
  id,
  name,
  meal_type
FROM meal_combinations
WHERE is_active = true
  AND (meal_type = 'almoco' OR meal_type = 'jantar')
  AND (
    components::text ILIKE '%alface%'
    OR components::text ILIKE '%lettuce%'
    OR components::text ILIKE '%arugula%'
    OR components::text ILIKE '%rucula%'
    OR components::text ILIKE '%watercress%'
    OR components::text ILIKE '%agriao%'
    OR components::text ILIKE '%tomate%'
    OR components::text ILIKE '%tomato%'
    OR components::text ILIKE '%pepino%'
    OR components::text ILIKE '%cucumber%'
    OR components::text ILIKE '%pimentao%'
    OR components::text ILIKE '%bell_pepper%'
  )
  AND components::text NOT ILIKE '%azeite%'
  AND components::text NOT ILIKE '%olive_oil%';

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 2: Ver refeições que TÊM azeite mas NÃO têm salada (precisam remover)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  'REMOVER AZEITE' as acao,
  id,
  name,
  meal_type
FROM meal_combinations
WHERE is_active = true
  AND (meal_type = 'almoco' OR meal_type = 'jantar')
  AND (
    components::text ILIKE '%azeite%'
    OR components::text ILIKE '%olive_oil%'
  )
  AND NOT (
    components::text ILIKE '%alface%'
    OR components::text ILIKE '%lettuce%'
    OR components::text ILIKE '%arugula%'
    OR components::text ILIKE '%rucula%'
    OR components::text ILIKE '%watercress%'
    OR components::text ILIKE '%agriao%'
    OR components::text ILIKE '%tomate%'
    OR components::text ILIKE '%tomato%'
    OR components::text ILIKE '%pepino%'
    OR components::text ILIKE '%cucumber%'
    OR components::text ILIKE '%pimentao%'
    OR components::text ILIKE '%bell_pepper%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 3: REMOVER AZEITE de refeições que NÃO têm salada
-- ═══════════════════════════════════════════════════════════════════════════

-- Componente de azeite a ser removido
-- {"type": "other", "name": "Azeite extra virgem", ...} ou similar

UPDATE meal_combinations
SET 
  components = (
    SELECT jsonb_agg(comp)
    FROM jsonb_array_elements(components) AS comp
    WHERE NOT (
      comp->>'type' = 'other' 
      AND (
        comp->>'name' ILIKE '%azeite%' 
        OR comp->>'ingredient_key' ILIKE '%olive_oil%'
      )
    )
  ),
  updated_at = NOW()
WHERE is_active = true
  AND (meal_type = 'almoco' OR meal_type = 'jantar')
  AND (
    components::text ILIKE '%azeite%'
    OR components::text ILIKE '%olive_oil%'
  )
  AND NOT (
    components::text ILIKE '%alface%'
    OR components::text ILIKE '%lettuce%'
    OR components::text ILIKE '%arugula%'
    OR components::text ILIKE '%rucula%'
    OR components::text ILIKE '%watercress%'
    OR components::text ILIKE '%agriao%'
    OR components::text ILIKE '%tomate%'
    OR components::text ILIKE '%tomato%'
    OR components::text ILIKE '%pepino%'
    OR components::text ILIKE '%cucumber%'
    OR components::text ILIKE '%pimentao%'
    OR components::text ILIKE '%bell_pepper%'
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTE 4: ADICIONAR AZEITE em refeições que TÊM salada mas não têm azeite
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE meal_combinations
SET 
  components = components || '[{"type": "other", "name": "Azeite extra virgem", "name_en": "Extra virgin olive oil", "portion_grams": 10, "portion_label": "colher de sopa de azeite (10ml)", "ingredient_key": "extra_virgin_olive_oil"}]'::jsonb,
  total_fat = COALESCE(total_fat, 0) + 10,
  total_calories = COALESCE(total_calories, 0) + 88,
  updated_at = NOW()
WHERE is_active = true
  AND (meal_type = 'almoco' OR meal_type = 'jantar')
  AND (
    components::text ILIKE '%alface%'
    OR components::text ILIKE '%lettuce%'
    OR components::text ILIKE '%arugula%'
    OR components::text ILIKE '%rucula%'
    OR components::text ILIKE '%watercress%'
    OR components::text ILIKE '%agriao%'
    OR components::text ILIKE '%tomate%'
    OR components::text ILIKE '%tomato%'
    OR components::text ILIKE '%pepino%'
    OR components::text ILIKE '%cucumber%'
    OR components::text ILIKE '%pimentao%'
    OR components::text ILIKE '%bell_pepper%'
  )
  AND components::text NOT ILIKE '%azeite%'
  AND components::text NOT ILIKE '%olive_oil%';

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
  meal_type,
  COUNT(*) as total,
  SUM(CASE WHEN components::text ILIKE '%azeite%' OR components::text ILIKE '%olive_oil%' THEN 1 ELSE 0 END) as com_azeite
FROM meal_combinations
WHERE is_active = true
  AND (meal_type = 'almoco' OR meal_type = 'jantar')
GROUP BY meal_type;
