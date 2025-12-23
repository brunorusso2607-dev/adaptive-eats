-- Add column to store the full API key (encrypted at rest by Supabase)
ALTER TABLE public.api_integrations 
ADD COLUMN IF NOT EXISTS api_key_encrypted text;

-- Add comment for documentation
COMMENT ON COLUMN public.api_integrations.api_key_encrypted IS 'Full API key stored securely for use by edge functions';