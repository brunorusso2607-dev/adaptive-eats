-- Add approval_status column to meal_combinations
ALTER TABLE public.meal_combinations 
ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_meal_combinations_approval_status ON public.meal_combinations(approval_status);

-- Comment for documentation
COMMENT ON COLUMN public.meal_combinations.approval_status IS 'Status de aprovação: pending, approved, rejected';