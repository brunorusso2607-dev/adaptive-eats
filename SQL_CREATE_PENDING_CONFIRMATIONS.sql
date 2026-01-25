-- Migration: Add chat_pending_confirmations table
-- Execute este SQL no Supabase SQL Editor

-- Create table for pending confirmations
CREATE TABLE IF NOT EXISTS public.chat_pending_confirmations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    update_type text NOT NULL,
    update_value text NOT NULL,
    update_label text NOT NULL,
    action text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + interval '5 minutes') NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user 
    ON public.chat_pending_confirmations(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_confirmations_expires 
    ON public.chat_pending_confirmations(expires_at);

CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user_active 
    ON public.chat_pending_confirmations(user_id, expires_at) 
    WHERE expires_at > now();

-- Enable RLS
ALTER TABLE public.chat_pending_confirmations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own pending confirmations" ON public.chat_pending_confirmations;
DROP POLICY IF EXISTS "Service role can manage all pending confirmations" ON public.chat_pending_confirmations;

-- Create policies
CREATE POLICY "Users can view own pending confirmations"
    ON public.chat_pending_confirmations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all pending confirmations"
    ON public.chat_pending_confirmations
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_confirmations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.chat_pending_confirmations
    WHERE expires_at < now();
END;
$$;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_confirmations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM public.chat_pending_confirmations
    WHERE expires_at < now();
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS cleanup_on_insert ON public.chat_pending_confirmations;

-- Create trigger
CREATE TRIGGER cleanup_on_insert
    AFTER INSERT ON public.chat_pending_confirmations
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_cleanup_expired_confirmations();

-- Grant permissions
GRANT ALL ON public.chat_pending_confirmations TO service_role;
GRANT SELECT ON public.chat_pending_confirmations TO authenticated;

-- Verify
SELECT 'Tabela criada com sucesso!' as status, count(*) as pending_count 
FROM public.chat_pending_confirmations;
