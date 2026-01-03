
-- Remove unique constraint on onboarding_key to allow multiple database_keys per onboarding_key
-- This enables scenarios like "seafood" mapping to both "seafood" AND "shellfish"
ALTER TABLE intolerance_key_normalization 
DROP CONSTRAINT IF EXISTS intolerance_key_normalization_onboarding_key_key;

-- Add composite unique constraint instead (onboarding_key + database_key)
ALTER TABLE intolerance_key_normalization 
ADD CONSTRAINT intolerance_key_normalization_unique_pair UNIQUE (onboarding_key, database_key);
