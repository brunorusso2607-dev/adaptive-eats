-- Add feedback columns to ingredient_validation_history
ALTER TABLE public.ingredient_validation_history
ADD COLUMN user_feedback text CHECK (user_feedback IN ('helpful', 'not_helpful')),
ADD COLUMN feedback_at timestamp with time zone;

-- Create index for feedback analysis
CREATE INDEX idx_ingredient_validation_feedback ON public.ingredient_validation_history(user_feedback) WHERE user_feedback IS NOT NULL;

-- Allow users to update their own validations (for feedback)
CREATE POLICY "Users can update their own validations"
ON public.ingredient_validation_history
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);