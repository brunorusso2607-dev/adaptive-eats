-- MIGRATION: Remove dietary preferences completely
-- Core will only track intolerances + weight goal
-- Execute this in Supabase SQL Editor

BEGIN;

-- 1. Remove dietary_preferences from onboarding_options
DELETE FROM onboarding_options 
WHERE category = 'dietary_preferences';

-- 2. Remove dietary_preferences category from onboarding_categories
DELETE FROM onboarding_categories 
WHERE category_key = 'dietary_preferences';

-- 3. Remove from dietary_forbidden_ingredients table (if exists)
DROP TABLE IF EXISTS dietary_forbidden_ingredients CASCADE;

-- 4. Update profiles table - set all dietary_preference to NULL or 'omnivore'
UPDATE profiles 
SET dietary_preference = 'omnivore' 
WHERE dietary_preference IS NOT NULL;

-- 5. Remove allergies and sensitivities from profiles (set to empty arrays)
UPDATE profiles
SET 
  allergies = '[]'::jsonb,
  sensitivities = '[]'::jsonb
WHERE allergies IS NOT NULL OR sensitivities IS NOT NULL;

-- 6. Verify results
SELECT 'Remaining dietary_preferences in onboarding_options' as status, COUNT(*) as count
FROM onboarding_options 
WHERE category = 'dietary_preferences'

UNION ALL

SELECT 'Remaining dietary_preferences category', COUNT(*)
FROM onboarding_categories 
WHERE category_key = 'dietary_preferences'

UNION ALL

SELECT 'Profiles with non-omnivore preference', COUNT(*)
FROM profiles 
WHERE dietary_preference IS NOT NULL AND dietary_preference != 'omnivore';

-- Expected: all counts should be 0

COMMIT;
