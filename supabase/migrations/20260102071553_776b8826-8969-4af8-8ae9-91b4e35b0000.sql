-- Add new source_type value for auto-skipped meals
-- No schema change needed since source_type is already a TEXT field
-- Just documenting the new value: 'auto_skipped'

-- Create table to track auto-skip notifications shown to users
CREATE TABLE IF NOT EXISTS public.auto_skip_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_item_id UUID NOT NULL REFERENCES public.meal_plan_items(id) ON DELETE CASCADE,
  skipped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meal_plan_item_id)
);

-- Enable RLS
ALTER TABLE public.auto_skip_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own auto-skip notifications"
  ON public.auto_skip_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as notified)
CREATE POLICY "Users can update their own auto-skip notifications"
  ON public.auto_skip_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service can insert auto-skip notifications
CREATE POLICY "Service can insert auto-skip notifications"
  ON public.auto_skip_notifications
  FOR INSERT
  WITH CHECK (true);

-- Service can delete old notifications
CREATE POLICY "Service can delete auto-skip notifications"
  ON public.auto_skip_notifications
  FOR DELETE
  USING (true);

-- Create index for faster lookups
CREATE INDEX idx_auto_skip_notifications_user_pending 
  ON public.auto_skip_notifications(user_id, notified_at) 
  WHERE notified_at IS NULL;