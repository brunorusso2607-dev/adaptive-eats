-- ============================================================
-- MIGRAÇÃO: Padronizar chave de intolerância "eggs" para "egg"
-- Data: 17/01/2026
-- Objetivo: Corrigir inconsistência entre onboarding e sistema
-- ============================================================

-- 1. Atualizar onboarding_options (fonte da verdade)
UPDATE public.onboarding_options
SET option_id = 'egg'
WHERE category = 'allergies' AND option_id = 'eggs';

-- 2. Atualizar meal_combinations - substituir "eggs" por "egg" no array
UPDATE public.meal_combinations
SET blocked_for_intolerances = array_replace(blocked_for_intolerances, 'eggs', 'egg')
WHERE 'eggs' = ANY(blocked_for_intolerances);

-- 3. Atualizar intolerance_mappings (se existir)
UPDATE public.intolerance_mappings
SET intolerance_key = 'egg'
WHERE intolerance_key = 'eggs';

-- 4. Atualizar intolerance_key_normalization (se existir)
UPDATE public.intolerance_key_normalization
SET database_key = 'egg'
WHERE database_key = 'eggs';

UPDATE public.intolerance_key_normalization
SET onboarding_key = 'egg'
WHERE onboarding_key = 'eggs';

-- 5. Verificar resultados
SELECT 
  'meal_combinations' as tabela,
  COUNT(*) as total_com_egg,
  COUNT(*) FILTER (WHERE 'eggs' = ANY(blocked_for_intolerances)) as ainda_com_eggs
FROM public.meal_combinations
WHERE 'egg' = ANY(blocked_for_intolerances) OR 'eggs' = ANY(blocked_for_intolerances);

-- 6. Verificar onboarding_options
SELECT category, option_id, label
FROM public.onboarding_options
WHERE category = 'allergies' AND (option_id = 'egg' OR option_id = 'eggs');
