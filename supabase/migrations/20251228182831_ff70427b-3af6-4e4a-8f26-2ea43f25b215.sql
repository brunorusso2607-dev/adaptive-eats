-- Add is_verified column to foods table
ALTER TABLE public.foods 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Add index for faster queries on verified foods
CREATE INDEX IF NOT EXISTS idx_foods_verified ON public.foods (is_verified) WHERE is_verified = true;