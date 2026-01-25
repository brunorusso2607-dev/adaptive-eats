-- EXECUTAR MANUALMENTE NO SUPABASE SQL EDITOR
-- Dashboard: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/sql

-- Migration: Add chat_pending_confirmations table for managing multi-step confirmations
-- Created: 2026-01-17
-- Purpose: Store pending profile update confirmations to maintain state between messages

-- Create table for pending confirmations
CREATE TABLE IF NOT EXISTS public.chat_pending_confirmations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    update_type text NOT NULL, -- 'restricao', 'objetivo', 'dieta', 'peso', 'peso_meta', etc.
    update_value text NOT NULL, -- 'lactose', 'ganhar', '75', etc.
    update_label text NOT NULL, -- 'Lactose', 'Ganhar peso', '75kg', etc.
    action text NOT NULL, -- 'atualizacao' or 'remocao'
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + interval '5 minutes') NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user 
    ON public.chat_pending_confirmations(user_id);

CREATE INDEX IF NOT EXISTS idx_pending_confirmations_expires 
    ON public.chat_pending_confirmations(expires_at);

CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user_active 
    ON public.chat_pending_confirmations(user_id, expires_at) 
    WHERE expires_at > now();

-- Add RLS policies
ALTER TABLE public.chat_pending_confirmations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own pending confirmations
DROP POLICY IF EXISTS "Users can view own pending confirmations" ON public.chat_pending_confirmations;
CREATE POLICY "Users can view own pending confirmations"
    ON public.chat_pending_confirmations
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service role can manage all pending confirmations
DROP POLICY IF EXISTS "Service role can manage all pending confirmations" ON public.chat_pending_confirmations;
CREATE POLICY "Service role can manage all pending confirmations"
    ON public.chat_pending_confirmations
    FOR ALL
    USING (auth.role() = 'service_role');

-- Create function to clean up expired confirmations
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

-- Create trigger to auto-cleanup on insert (optional, for maintenance)
DROP TRIGGER IF EXISTS cleanup_on_insert ON public.chat_pending_confirmations;
CREATE TRIGGER cleanup_on_insert
    AFTER INSERT ON public.chat_pending_confirmations
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.trigger_cleanup_expired_confirmations();

CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_confirmations()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Clean up expired confirmations when a new one is inserted
    DELETE FROM public.chat_pending_confirmations
    WHERE expires_at < now();
    
    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT ALL ON public.chat_pending_confirmations TO service_role;
GRANT SELECT ON public.chat_pending_confirmations TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.chat_pending_confirmations IS 
'Stores pending profile update confirmations from Chef IA chat. 
Allows maintaining state between messages for multi-step confirmation flows.
Records expire after 5 minutes.';

-- Verify table was created
SELECT 'Table created successfully!' as status, count(*) as pending_count 
FROM public.chat_pending_confirmations;
