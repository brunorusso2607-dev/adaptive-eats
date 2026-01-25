-- SIMPLE VERSION: First check what tables exist, then remove non-core intolerances
-- Execute this in Supabase SQL Editor

-- Check what tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'onboarding_options', 
    'intolerance_mappings', 
    'intolerance_key_normalization', 
    'user_intolerances',
    'meal_combinations',
    'recipes'
)
ORDER BY table_name;

-- After checking which tables exist, run only the DELETE statements for tables that exist
-- Example: If only 'onboarding_options' exists, run only this:

-- DELETE FROM onboarding_options 
-- WHERE option_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine')
-- AND category IN ('intolerances', 'allergies', 'sensitivities');
