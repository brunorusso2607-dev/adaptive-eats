-- ============================================================
-- CORREÇÃO FINAL E DEFINITIVA: Refeições com OVO
-- ============================================================

-- PROBLEMA: Filtro "Sem Ovo" ainda mostra refeições com ovo
-- CAUSA: Refeições não estão marcadas com 'egg' em blocked_for_intolerances

-- 1. MARCAR TODAS as refeições com "ovo" no NOME
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE 
    WHEN blocked_for_intolerances IS NULL THEN ARRAY['egg']::text[]
    WHEN NOT ('egg' = ANY(blocked_for_intolerances)) 
      THEN array_append(blocked_for_intolerances, 'egg')
    ELSE blocked_for_intolerances
  END
WHERE (
  name ILIKE '%ovo%' 
  OR name ILIKE '%egg%'
  OR name ILIKE '%omelete%'
  OR name ILIKE '%omelet%'
  OR name ILIKE '%gemada%'
  OR name ILIKE '%quindim%'
)
AND NOT ('egg' = ANY(blocked_for_intolerances));

-- 2. MARCAR TODAS as refeições com "ovo" nos COMPONENTES
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE 
    WHEN blocked_for_intolerances IS NULL THEN ARRAY['egg']::text[]
    WHEN NOT ('egg' = ANY(blocked_for_intolerances)) 
      THEN array_append(blocked_for_intolerances, 'egg')
    ELSE blocked_for_intolerances
  END
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(components) AS comp
  WHERE comp->>'name' ILIKE '%ovo%'
     OR comp->>'name' ILIKE '%egg%'
     OR comp->>'name' ILIKE '%omelete%'
     OR comp->>'name' ILIKE '%omelet%'
     OR comp->>'name' ILIKE '%gemada%'
     OR comp->>'name' ILIKE '%quindim%'
)
AND NOT ('egg' = ANY(blocked_for_intolerances));

-- 3. REMOVER 'eggs' (plural) se existir e garantir que tem 'egg' (singular)
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE
    WHEN 'eggs' = ANY(blocked_for_intolerances) AND NOT ('egg' = ANY(blocked_for_intolerances))
      THEN array_append(array_remove(blocked_for_intolerances, 'eggs'), 'egg')
    WHEN 'eggs' = ANY(blocked_for_intolerances) AND 'egg' = ANY(blocked_for_intolerances)
      THEN array_remove(blocked_for_intolerances, 'eggs')
    ELSE blocked_for_intolerances
  END
WHERE 'eggs' = ANY(blocked_for_intolerances);
