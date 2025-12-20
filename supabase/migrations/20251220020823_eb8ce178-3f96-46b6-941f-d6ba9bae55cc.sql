-- Create weight_history table to track weight changes over time
CREATE TABLE public.weight_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  goal_weight NUMERIC,
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own weight history" 
ON public.weight_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight records" 
ON public.weight_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight records" 
ON public.weight_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_weight_history_user_date ON public.weight_history(user_id, recorded_at DESC);