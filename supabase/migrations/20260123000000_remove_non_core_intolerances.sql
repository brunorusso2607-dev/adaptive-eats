-- Migration: Remove non-core intolerances
-- Data: 2026-01-23
-- Keep only: lactose, gluten, fodmap

BEGIN;

-- 1. Remove from onboarding_options
DELETE FROM onboarding_options 
WHERE option_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine')
AND category IN ('intolerances', 'allergies', 'sensitivities');

-- ═══════════════════════════════════════════════════════════════════════
-- 2. Remove from intolerance_mappings
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM intolerance_mappings 
WHERE intolerance_key IN ('egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite');

-- ═══════════════════════════════════════════════════════════════════════
-- 3. REMOVER DE intolerance_key_normalization
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM intolerance_key_normalization 
WHERE canonical_key IN ('egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite');

-- ═══════════════════════════════════════════════════════════════════════
-- 4. REMOVER DE user_intolerances (sem usuários ativos)
-- ═══════════════════════════════════════════════════════════════════════

DELETE FROM user_intolerances 
WHERE intolerance_key IN ('egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite');

-- ═══════════════════════════════════════════════════════════════════════
-- 5. LIMPAR blocked_for_intolerances em meal_combinations
-- ═══════════════════════════════════════════════════════════════════════

UPDATE meal_combinations
SET blocked_for_intolerances = ARRAY(
  SELECT unnest(blocked_for_intolerances)
  EXCEPT
  SELECT unnest(ARRAY['egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite'])
)
WHERE blocked_for_intolerances && ARRAY['egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite'];

-- ═══════════════════════════════════════════════════════════════════════
-- 6. LIMPAR blocked_for_intolerances em recipes
-- ═══════════════════════════════════════════════════════════════════════

UPDATE recipes
SET blocked_for_intolerances = ARRAY(
  SELECT unnest(blocked_for_intolerances)
  EXCEPT
  SELECT unnest(ARRAY['egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite'])
)
WHERE blocked_for_intolerances && ARRAY['egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite'];

-- ═══════════════════════════════════════════════════════════════════════
-- 7. VALIDAÇÃO PÓS-MIGRATION
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Verificar onboarding_options
  SELECT COUNT(*) INTO v_count FROM onboarding_options 
  WHERE option_key IN ('egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERRO: Ainda existem % registros em onboarding_options', v_count;
  END IF;
  
  -- Verificar intolerance_mappings
  SELECT COUNT(*) INTO v_count FROM intolerance_mappings 
  WHERE intolerance_key IN ('egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERRO: Ainda existem % registros em intolerance_mappings', v_count;
  END IF;
  
  -- Verificar user_intolerances
  SELECT COUNT(*) INTO v_count FROM user_intolerances 
  WHERE intolerance_key IN ('egg', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'sulfite');
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'ERRO: Ainda existem % registros em user_intolerances', v_count;
  END IF;
  
  RAISE NOTICE 'SUCESSO: Todas as intolerâncias não-core foram removidas do banco de dados';
END $$;

COMMIT;

