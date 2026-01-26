-- ============================================================
-- 🔧 CORREÇÃO CRÍTICA: Marcar refeições com ovo
-- ============================================================
-- INSTRUÇÕES:
-- 1. Abra https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/sql/new
-- 2. Cole este SQL completo
-- 3. Clique em "Run" (ou F5)
-- 4. Verifique os resultados
-- ============================================================

-- PASSO 1: Ver estado atual
DO $$
DECLARE
  total_com_ovo INT;
  marcadas_egg INT;
  marcadas_eggs INT;
  sem_marca INT;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)),
    COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)),
    COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances)))
  INTO total_com_ovo, marcadas_egg, marcadas_eggs, sem_marca
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
  
  RAISE NOTICE '📊 ESTADO ATUAL:';
  RAISE NOTICE '  Total de refeições com ovo: %', total_com_ovo;
  RAISE NOTICE '  Marcadas com "egg": %', marcadas_egg;
  RAISE NOTICE '  Marcadas com "eggs": %', marcadas_eggs;
  RAISE NOTICE '  SEM MARCA: % ⚠️', sem_marca;
END $$;

-- PASSO 2: Atualizar refeições com ovo no NOME
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

-- PASSO 3: Atualizar refeições com ovo nos COMPONENTES
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

-- PASSO 4: Verificar resultado
DO $$
DECLARE
  total_com_ovo INT;
  marcadas_egg INT;
  marcadas_eggs INT;
  sem_marca INT;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)),
    COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)),
    COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances)))
  INTO total_com_ovo, marcadas_egg, marcadas_eggs, sem_marca
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
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ RESULTADO FINAL:';
  RAISE NOTICE '  Total de refeições com ovo: %', total_com_ovo;
  RAISE NOTICE '  Marcadas com "egg": %', marcadas_egg;
  RAISE NOTICE '  Marcadas com "eggs": %', marcadas_eggs;
  RAISE NOTICE '  SEM MARCA: %', sem_marca;
  
  IF sem_marca = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SUCESSO! Todas as refeições com ovo estão marcadas!';
  ELSE
    RAISE WARNING '⚠️  Ainda existem % refeições sem marca!', sem_marca;
  END IF;
END $$;

-- PASSO 5: Mostrar exemplos de refeições corrigidas
SELECT 
  name as "Refeição",
  blocked_for_intolerances as "Bloqueado Para"
FROM meal_combinations
WHERE (
  name ILIKE '%ovo%' OR 
  name ILIKE '%egg%'
)
ORDER BY name
LIMIT 10;
