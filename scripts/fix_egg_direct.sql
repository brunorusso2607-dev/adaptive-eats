-- ============================================================
-- CORREÇÃO DIRETA: Marcar todas as refeições com ovo
-- ============================================================

-- 1. Verificar estado atual
SELECT 
  COUNT(*) as total_com_ovo,
  COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)) as marcadas_egg,
  COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)) as marcadas_eggs,
  COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances))) as sem_marca
FROM meal_combinations
WHERE 
  name ILIKE '%ovo%' OR 
  name ILIKE '%egg%' OR
  name ILIKE '%omelete%' OR
  name ILIKE '%omelet%' OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE comp->>'name' ILIKE '%ovo%' 
       OR comp->>'name' ILIKE '%egg%'
       OR comp->>'name' ILIKE '%omelete%'
       OR comp->>'name' ILIKE '%omelet%'
  );

-- 2. Atualizar refeições com ovo no NOME que não estão marcadas
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

-- 3. Atualizar refeições com ovo nos COMPONENTES que não estão marcadas
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

-- 4. Verificar resultado final
SELECT 
  COUNT(*) as total_com_ovo,
  COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)) as marcadas_egg,
  COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)) as marcadas_eggs,
  COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances))) as sem_marca
FROM meal_combinations
WHERE 
  name ILIKE '%ovo%' OR 
  name ILIKE '%egg%' OR
  name ILIKE '%omelete%' OR
  name ILIKE '%omelet%' OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE comp->>'name' ILIKE '%ovo%' 
       OR comp->>'name' ILIKE '%egg%'
       OR comp->>'name' ILIKE '%omelete%'
       OR comp->>'name' ILIKE '%omelet%'
  );

-- 5. Mostrar exemplos de refeições corrigidas
SELECT name, blocked_for_intolerances
FROM meal_combinations
WHERE (
  name ILIKE '%ovo%' OR 
  name ILIKE '%egg%'
)
LIMIT 10;
