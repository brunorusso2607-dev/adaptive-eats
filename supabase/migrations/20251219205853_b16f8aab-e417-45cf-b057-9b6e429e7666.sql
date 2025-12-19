-- Add weight loss tracking fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS weight_current NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS weight_goal NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female')),
ADD COLUMN IF NOT EXISTS activity_level TEXT DEFAULT 'moderate' CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active'));

-- Add comments for clarity
COMMENT ON COLUMN public.profiles.weight_current IS 'Current weight in kg';
COMMENT ON COLUMN public.profiles.weight_goal IS 'Target weight in kg';
COMMENT ON COLUMN public.profiles.height IS 'Height in cm';
COMMENT ON COLUMN public.profiles.age IS 'Age in years';
COMMENT ON COLUMN public.profiles.sex IS 'Biological sex (male/female) for metabolic calculations';
COMMENT ON COLUMN public.profiles.activity_level IS 'Physical activity level for TDEE calculation';