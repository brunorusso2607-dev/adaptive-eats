-- Remove remaining allergies that should not be in the system
-- Keep only: lactose, gluten, fodmap in intolerances category

-- 1. Check what's currently in allergies
SELECT * FROM onboarding_options 
WHERE category = 'allergies'
ORDER BY sort_order;

-- 2. Delete all allergies except 'none' (we'll keep none as an option)
-- Actually, let's remove ALL allergies including 'none' since we have 'none' in intolerances
DELETE FROM onboarding_options 
WHERE category = 'allergies';

-- 3. Delete all sensitivities
DELETE FROM onboarding_options 
WHERE category = 'sensitivities';

-- 4. Also remove 'milk' from allergies if it exists (should use lactose in intolerances instead)
DELETE FROM intolerance_mappings 
WHERE intolerance_key IN ('milk', 'shellfish', 'none');

-- 5. Verify results
SELECT category, COUNT(*) as count
FROM onboarding_options 
WHERE category IN ('allergies', 'sensitivities')
GROUP BY category;

-- Expected: No results (both categories should be empty)
