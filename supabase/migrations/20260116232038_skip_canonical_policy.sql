-- Skip canonical_ingredients policy creation to avoid conflicts
-- This migration does nothing but allows us to continue

SELECT 'Skipping canonical_ingredients policy - already exists' AS status;