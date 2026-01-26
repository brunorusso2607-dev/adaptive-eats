-- MIGRATION: Remove non-core intolerances
-- Execute this in Supabase SQL Editor
-- Keep only: lactose, gluten, fodmap

BEGIN;

-- 1. Remove from onboarding_options
DELETE FROM onboarding_options 
WHERE option_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 
  'seafood', 'fish', 'salicylate', 'salicylates', 
  'sulfite', 'sulfites', 'fructose', 'histamine'
)
AND category IN ('intolerances', 'allergies', 'sensitivities');

-- 2. Remove from intolerance_mappings
DELETE FROM intolerance_mappings 
WHERE intolerance_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
);

-- 3. Remove from intolerance_key_normalization
DELETE FROM intolerance_key_normalization 
WHERE canonical_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
);

-- 4. Remove from user_intolerances
DELETE FROM user_intolerances 
WHERE intolerance_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
);

-- 5. Clean blocked_for_intolerances in meal_combinations
UPDATE meal_combinations
SET blocked_for_intolerances = ARRAY(
  SELECT unnest(blocked_for_intolerances)
  EXCEPT
  SELECT unnest(ARRAY[
    'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
    'seafood', 'fish', 'salicylate', 'salicylates',
    'sulfite', 'sulfites', 'fructose', 'histamine'
  ])
)
WHERE blocked_for_intolerances && ARRAY[
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
];

-- 6. Clean blocked_for_intolerances in recipes
UPDATE recipes
SET blocked_for_intolerances = ARRAY(
  SELECT unnest(blocked_for_intolerances)
  EXCEPT
  SELECT unnest(ARRAY[
    'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
    'seafood', 'fish', 'salicylate', 'salicylates',
    'sulfite', 'sulfites', 'fructose', 'histamine'
  ])
)
WHERE blocked_for_intolerances && ARRAY[
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
];

COMMIT;

-- Verify results
SELECT 'onboarding_options' as table_name, COUNT(*) as remaining_count
FROM onboarding_options 
WHERE option_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
)
UNION ALL
SELECT 'intolerance_mappings', COUNT(*)
FROM intolerance_mappings 
WHERE intolerance_key IN (
  'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
  'seafood', 'fish', 'salicylate', 'salicylates',
  'sulfite', 'sulfites', 'fructose', 'histamine'
);

-- Expected result: all counts should be 0
