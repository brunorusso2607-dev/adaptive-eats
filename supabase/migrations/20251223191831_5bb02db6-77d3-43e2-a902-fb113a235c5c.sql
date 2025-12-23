-- Add excluded_ingredients column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS excluded_ingredients text[] DEFAULT '{}'::text[];