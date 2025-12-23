-- Remove calorie_goal column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS calorie_goal;

-- Deactivate calorie_goal onboarding options
UPDATE public.onboarding_options 
SET is_active = false 
WHERE category = 'calorie_goal';