-- Add is_recipe column to foods table
ALTER TABLE public.foods 
ADD COLUMN is_recipe boolean NOT NULL DEFAULT false;

-- Add index for faster filtering
CREATE INDEX idx_foods_is_recipe ON public.foods(is_recipe);

-- Add comment explaining the field
COMMENT ON COLUMN public.foods.is_recipe IS 'Indica se o item é uma receita pronta (true) ou um ingrediente real (false)';