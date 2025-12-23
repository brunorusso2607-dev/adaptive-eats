
-- Remove context column from profiles (app is individual by default)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS context;

-- Deactivate all context-related onboarding options
UPDATE public.onboarding_options 
SET is_active = false 
WHERE category = 'contexts';
