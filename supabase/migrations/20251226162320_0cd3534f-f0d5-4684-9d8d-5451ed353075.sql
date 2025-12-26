-- Add country field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN country text DEFAULT 'BR';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.country IS 'ISO 3166-1 alpha-2 country code (e.g., BR, US, JP, MX)';