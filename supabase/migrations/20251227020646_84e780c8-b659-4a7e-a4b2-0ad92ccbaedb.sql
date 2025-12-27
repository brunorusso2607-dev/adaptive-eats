-- Add user_id column to ai_usage_logs
ALTER TABLE public.ai_usage_logs 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster queries by user
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);

-- Add comment for documentation
COMMENT ON COLUMN public.ai_usage_logs.user_id IS 'User who triggered the AI request (null for anonymous/system calls)';