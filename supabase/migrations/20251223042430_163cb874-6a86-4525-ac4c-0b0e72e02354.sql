-- Add icon_name column to onboarding_options
ALTER TABLE public.onboarding_options 
ADD COLUMN icon_name text;