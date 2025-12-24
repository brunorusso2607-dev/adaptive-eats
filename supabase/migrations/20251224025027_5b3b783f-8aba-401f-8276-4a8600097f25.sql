-- Create table for user feedback on AI analysis errors
CREATE TABLE public.ai_analysis_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL, -- 'food', 'label', 'fridge'
  feedback_type TEXT NOT NULL, -- 'wrong_ingredient', 'missed_allergen', 'false_alert', 'other'
  description TEXT,
  analysis_data JSONB, -- Store the original analysis for review
  image_reference TEXT, -- Optional: store image hash or reference
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_analysis_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can submit their own feedback"
ON public.ai_analysis_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.ai_analysis_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.ai_analysis_feedback
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback"
ON public.ai_analysis_feedback
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));