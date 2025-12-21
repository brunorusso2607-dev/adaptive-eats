
-- Drop existing user_occurrences table and recreate with proper structure
DROP TABLE IF EXISTS public.user_occurrences;

-- Create activity_logs table for automatic logging
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  performed_by uuid NOT NULL,
  action_type text NOT NULL,
  action_description text NOT NULL,
  old_values jsonb DEFAULT NULL,
  new_values jsonb DEFAULT NULL,
  log_source text NOT NULL CHECK (log_source IN ('admin', 'user')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can insert logs
CREATE POLICY "Admins can insert activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can view their own logs
CREATE POLICY "Users can view their own activity logs"
ON public.activity_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own logs (for user actions)
CREATE POLICY "Users can insert their own activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id AND log_source = 'user');

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_performed_by ON public.activity_logs(performed_by);
CREATE INDEX idx_activity_logs_log_source ON public.activity_logs(log_source);
