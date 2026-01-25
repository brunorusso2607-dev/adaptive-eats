-- Ultra Simple Migration: Remove non-core intolerances
-- Execute this in Supabase SQL Editor

-- Just try to delete from onboarding_options first
DELETE FROM onboarding_options 
WHERE option_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine')
AND category IN ('intolerances', 'allergies', 'sensitivities');

-- If the above works, then try this one too:
DELETE FROM intolerance_mappings 
WHERE intolerance_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine');

-- Check results
SELECT 'onboarding_options' as table_name, COUNT(*) as remaining_count
FROM onboarding_options 
WHERE option_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine')
AND category IN ('intolerances', 'allergies', 'sensitivities')
UNION ALL
SELECT 'intolerance_mappings', COUNT(*)
FROM intolerance_mappings 
WHERE intolerance_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine');
