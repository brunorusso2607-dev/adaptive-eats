-- Add fields for plan duplication and temporal locking
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS unlocks_at timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source_plan_id uuid DEFAULT NULL REFERENCES public.meal_plans(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_meal_plans_unlocks_at ON public.meal_plans(unlocks_at) WHERE unlocks_at IS NOT NULL;