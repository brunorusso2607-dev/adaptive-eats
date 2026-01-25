-- Correção de refeições com ovo e glúten
-- Executar via: cat scripts/fix_meals.sql | npx supabase db execute --linked

-- 1. Atualizar refeições com ovo no nome
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE 
    WHEN blocked_for_intolerances IS NULL THEN ARRAY['egg']::text[]
    WHEN NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances)) 
      THEN array_append(blocked_for_intolerances, 'egg')
    ELSE blocked_for_intolerances
  END
WHERE (
  name ILIKE '%ovo%' OR 
  name ILIKE '%egg%' OR
  name ILIKE '%omelete%' OR
  name ILIKE '%omelet%'
)
AND NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances));

-- 2. Atualizar refeições com ovo nos componentes
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE 
    WHEN blocked_for_intolerances IS NULL THEN ARRAY['egg']::text[]
    WHEN NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances)) 
      THEN array_append(blocked_for_intolerances, 'egg')
    ELSE blocked_for_intolerances
  END
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(components) AS comp
  WHERE comp->>'name' ILIKE '%ovo%' 
     OR comp->>'name' ILIKE '%egg%'
     OR comp->>'name' ILIKE '%omelete%'
     OR comp->>'name' ILIKE '%omelet%'
)
AND NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances));

-- 3. Atualizar refeições com pão francês (glúten)
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE 
    WHEN blocked_for_intolerances IS NULL THEN ARRAY['gluten']::text[]
    WHEN NOT ('gluten' = ANY(blocked_for_intolerances)) 
      THEN array_append(blocked_for_intolerances, 'gluten')
    ELSE blocked_for_intolerances
  END
WHERE (
  name ILIKE '%pão francês%' OR 
  name ILIKE '%pao frances%'
)
AND NOT ('gluten' = ANY(blocked_for_intolerances));

-- 4. Atualizar refeições com pão francês nos componentes
UPDATE meal_combinations
SET blocked_for_intolerances = 
  CASE 
    WHEN blocked_for_intolerances IS NULL THEN ARRAY['gluten']::text[]
    WHEN NOT ('gluten' = ANY(blocked_for_intolerances)) 
      THEN array_append(blocked_for_intolerances, 'gluten')
    ELSE blocked_for_intolerances
  END
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(components) AS comp
  WHERE comp->>'name' ILIKE '%pão francês%'
     OR comp->>'name' ILIKE '%pao frances%'
)
AND NOT ('gluten' = ANY(blocked_for_intolerances));
