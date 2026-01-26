-- FINAL MIGRATION: Remove non-core intolerances
-- Based on actual database structure
-- Execute this in Supabase SQL Editor

-- 1. Delete from onboarding_options
DELETE FROM onboarding_options 
WHERE option_id IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 
  'seafood', 'fish', 'salicylate', 'salicylates', 
  'sulfite', 'sulfites', 'fructose', 'histamine'
)
AND category IN ('intolerances', 'allergies', 'sensitivities');

-- 2. Delete from intolerance_mappings
DELETE FROM intolerance_mappings 
WHERE intolerance_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
);

-- 3. Verify results
SELECT 'Remaining in onboarding_options' as status, COUNT(*) as count
FROM onboarding_options 
WHERE option_id IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
)
AND category IN ('intolerances', 'allergies', 'sensitivities')

UNION ALL

SELECT 'Remaining in intolerance_mappings', COUNT(*)
FROM intolerance_mappings 
WHERE intolerance_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
);

-- Expected result: both counts should be 0
