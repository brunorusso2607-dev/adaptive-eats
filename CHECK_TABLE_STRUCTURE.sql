-- First, let's check what tables actually exist and their structure
-- Execute this in Supabase SQL Editor

-- 1. List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. Check structure of onboarding_options
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'onboarding_options' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check structure of intolerance_mappings  
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'intolerance_mappings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Show some sample data from onboarding_options
SELECT * FROM onboarding_options 
WHERE category IN ('intolerances', 'allergies', 'sensitivities') 
LIMIT 5;

-- 5. Show some sample data from intolerance_mappings
SELECT * FROM intolerance_mappings 
LIMIT 5;
