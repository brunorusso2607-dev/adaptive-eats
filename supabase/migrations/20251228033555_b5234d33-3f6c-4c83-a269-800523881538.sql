-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP calls if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;