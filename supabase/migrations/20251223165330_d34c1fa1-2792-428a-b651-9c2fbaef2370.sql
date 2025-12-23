-- Add kids_mode column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN kids_mode boolean DEFAULT false;