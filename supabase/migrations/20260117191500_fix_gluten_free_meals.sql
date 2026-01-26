-- ============================================================
-- CORREÇÃO DEFINITIVA: Refeições SEM GLÚTEN não devem ter 'gluten' em blocked_for_intolerances
-- ============================================================

-- PROBLEMA: Refeições com "Pão sem glúten" foram marcadas INCORRETAMENTE com 'gluten'
-- SOLUÇÃO: Remover 'gluten' de refeições que são SEGURAS para intolerantes

-- 1. REMOVER 'gluten' de refeições com "sem glúten" no NOME
UPDATE meal_combinations
SET blocked_for_intolerances = array_remove(blocked_for_intolerances, 'gluten')
WHERE (
  name ILIKE '%sem glúten%' 
  OR name ILIKE '%sem gluten%'
  OR name ILIKE '%gluten free%'
  OR name ILIKE '%gluten-free%'
  OR name ILIKE '%sin gluten%'
)
AND 'gluten' = ANY(blocked_for_intolerances);

-- 2. REMOVER 'gluten' de refeições com "pão sem glúten" nos COMPONENTES
UPDATE meal_combinations
SET blocked_for_intolerances = array_remove(blocked_for_intolerances, 'gluten')
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(components) AS comp
  WHERE comp->>'name' ILIKE '%sem glúten%'
     OR comp->>'name' ILIKE '%sem gluten%'
     OR comp->>'name' ILIKE '%gluten free%'
     OR comp->>'name' ILIKE '%gluten-free%'
     OR comp->>'name' ILIKE '%sin gluten%'
)
AND 'gluten' = ANY(blocked_for_intolerances);

-- 3. REMOVER 'gluten' de refeições com "macarrão sem glúten" nos componentes
UPDATE meal_combinations
SET blocked_for_intolerances = array_remove(blocked_for_intolerances, 'gluten')
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(components) AS comp
  WHERE comp->>'name' ILIKE '%macarrão sem glúten%'
     OR comp->>'name' ILIKE '%macarrao sem gluten%'
     OR comp->>'name' ILIKE '%pasta sem glúten%'
     OR comp->>'name' ILIKE '%gluten-free pasta%'
)
AND 'gluten' = ANY(blocked_for_intolerances);

-- 4. REMOVER 'gluten' de refeições com "aveia sem glúten" nos componentes
UPDATE meal_combinations
SET blocked_for_intolerances = array_remove(blocked_for_intolerances, 'gluten')
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(components) AS comp
  WHERE comp->>'name' ILIKE '%aveia sem glúten%'
     OR comp->>'name' ILIKE '%aveia sem gluten%'
     OR comp->>'name' ILIKE '%oat sem glúten%'
     OR comp->>'name' ILIKE '%gluten-free oat%'
)
AND 'gluten' = ANY(blocked_for_intolerances);

-- 5. ADICIONAR 'gluten' APENAS em refeições com pão NORMAL (não "sem glúten")
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE 
    WHEN blocked_for_intolerances IS NULL THEN ARRAY['gluten']::text[]
    WHEN NOT ('gluten' = ANY(blocked_for_intolerances)) 
      THEN array_append(blocked_for_intolerances, 'gluten')
    ELSE blocked_for_intolerances
  END
WHERE (
  -- Pão francês normal
  (name ILIKE '%pão francês%' OR name ILIKE '%pao frances%')
  AND name NOT ILIKE '%sem glúten%'
  AND name NOT ILIKE '%sem gluten%'
  
  -- OU tem pão francês nos componentes
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE (comp->>'name' ILIKE '%pão francês%' OR comp->>'name' ILIKE '%pao frances%')
    AND comp->>'name' NOT ILIKE '%sem glúten%'
    AND comp->>'name' NOT ILIKE '%sem gluten%'
  )
  
  -- OU tem pão integral
  OR name ILIKE '%pão integral%'
  OR name ILIKE '%pao integral%'
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE comp->>'name' ILIKE '%pão integral%'
       OR comp->>'name' ILIKE '%pao integral%'
  )
  
  -- OU tem macarrão normal (não sem glúten)
  OR (
    (name ILIKE '%macarrão%' OR name ILIKE '%macarrao%' OR name ILIKE '%pasta%')
    AND name NOT ILIKE '%sem glúten%'
    AND name NOT ILIKE '%sem gluten%'
  )
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE (comp->>'name' ILIKE '%macarrão%' OR comp->>'name' ILIKE '%macarrao%' OR comp->>'name' ILIKE '%pasta%')
    AND comp->>'name' NOT ILIKE '%sem glúten%'
    AND comp->>'name' NOT ILIKE '%sem gluten%'
  )
)
AND NOT ('gluten' = ANY(blocked_for_intolerances));
