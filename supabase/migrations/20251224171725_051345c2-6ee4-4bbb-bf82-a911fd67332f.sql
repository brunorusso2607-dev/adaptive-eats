-- Add feedback_status field to meal_consumption table
ALTER TABLE public.meal_consumption 
ADD COLUMN IF NOT EXISTS feedback_status text NOT NULL DEFAULT 'pending';

-- Add constraint to ensure valid values
ALTER TABLE public.meal_consumption 
ADD CONSTRAINT meal_consumption_feedback_status_check 
CHECK (feedback_status IN ('pending', 'well', 'symptoms', 'auto_well'));

-- Create index for efficient querying of pending feedback
CREATE INDEX IF NOT EXISTS idx_meal_consumption_feedback_status 
ON public.meal_consumption(user_id, feedback_status, consumed_at);

-- Update existing records: if they have symptom logs, mark as 'symptoms', otherwise 'auto_well' for old ones
UPDATE public.meal_consumption mc
SET feedback_status = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.symptom_logs sl 
    WHERE sl.meal_consumption_id = mc.id
  ) THEN 'symptoms'
  WHEN mc.consumed_at < NOW() - INTERVAL '24 hours' THEN 'auto_well'
  ELSE 'pending'
END
WHERE mc.feedback_status = 'pending';