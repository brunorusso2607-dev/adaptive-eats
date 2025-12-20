-- Add completed_at field to meal_plan_items to track when each meal was completed
ALTER TABLE public.meal_plan_items 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add status field to meal_plans to track overall plan status
-- 'active' = in progress, 'completed' = all meals done, 'expired' = month ended without completion
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired'));

-- Add completion_percentage to meal_plans for quick access
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;