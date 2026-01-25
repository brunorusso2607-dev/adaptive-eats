-- ============================================================
-- AUDITORIA COMPLETA DE TODAS AS INTOLERÂNCIAS
-- ============================================================

-- 1. VERIFICAR REFEIÇÕES COM "SEM GLÚTEN" NO NOME
SELECT 
  'Refeições com "sem glúten" no nome' as categoria,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE 'gluten' = ANY(blocked_for_intolerances)) as marcadas_gluten,
  COUNT(*) FILTER (WHERE NOT ('gluten' = ANY(blocked_for_intolerances))) as nao_marcadas
FROM meal_combinations
WHERE name ILIKE '%sem glúten%' OR name ILIKE '%sem gluten%' OR name ILIKE '%gluten free%';

-- 2. VERIFICAR REFEIÇÕES COM INGREDIENTES SEM GLÚTEN NOS COMPONENTES
SELECT 
  'Refeições com pão sem glúten nos componentes' as categoria,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE 'gluten' = ANY(blocked_for_intolerances)) as marcadas_gluten,
  COUNT(*) FILTER (WHERE NOT ('gluten' = ANY(blocked_for_intolerances))) as nao_marcadas
FROM meal_combinations
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(components) AS comp
  WHERE comp->>'name' ILIKE '%sem glúten%'
     OR comp->>'name' ILIKE '%sem gluten%'
     OR comp->>'name' ILIKE '%gluten free%'
);

-- 3. LISTAR EXEMPLOS DE REFEIÇÕES "SEM GLÚTEN" QUE ESTÃO MARCADAS COM GLUTEN
SELECT 
  name,
  blocked_for_intolerances,
  components
FROM meal_combinations
WHERE (
  name ILIKE '%sem glúten%' 
  OR name ILIKE '%sem gluten%'
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE comp->>'name' ILIKE '%sem glúten%'
       OR comp->>'name' ILIKE '%sem gluten%'
  )
)
AND 'gluten' = ANY(blocked_for_intolerances)
LIMIT 10;

-- 4. VERIFICAR TODAS AS REFEIÇÕES COM OVO
SELECT 
  'Refeições com ovo' as categoria,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE 'egg' = ANY(blocked_for_intolerances)) as marcadas_egg,
  COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)) as marcadas_eggs,
  COUNT(*) FILTER (WHERE NOT ('egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances))) as nao_marcadas
FROM meal_combinations
WHERE name ILIKE '%ovo%' OR name ILIKE '%egg%';

-- 5. VERIFICAR REFEIÇÕES COM PÃO FRANCÊS
SELECT 
  'Refeições com pão francês' as categoria,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE 'gluten' = ANY(blocked_for_intolerances)) as marcadas_gluten,
  COUNT(*) FILTER (WHERE NOT ('gluten' = ANY(blocked_for_intolerances))) as nao_marcadas
FROM meal_combinations
WHERE name ILIKE '%pão francês%' OR name ILIKE '%pao frances%';

-- 6. ESTATÍSTICAS GERAIS
SELECT 
  COUNT(*) as total_refeicoes,
  COUNT(*) FILTER (WHERE blocked_for_intolerances IS NULL OR array_length(blocked_for_intolerances, 1) IS NULL) as sem_marcacao,
  COUNT(*) FILTER (WHERE blocked_for_intolerances IS NOT NULL AND array_length(blocked_for_intolerances, 1) > 0) as com_marcacao
FROM meal_combinations;
