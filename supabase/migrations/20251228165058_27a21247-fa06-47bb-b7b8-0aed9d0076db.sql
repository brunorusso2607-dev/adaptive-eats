-- Add enabled_meals column to profiles table
-- This stores which meals the user wants to include in their meal plans
ALTER TABLE public.profiles 
ADD COLUMN enabled_meals text[] DEFAULT NULL;

-- If null, all meals are enabled (backward compatibility)
-- If set, only specified meal types are active for plan generation