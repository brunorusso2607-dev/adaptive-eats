-- Tabela para armazenar logs de erros da IA
CREATE TABLE public.ai_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  request_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas rápidas
CREATE INDEX idx_ai_error_logs_created_at ON public.ai_error_logs(created_at DESC);
CREATE INDEX idx_ai_error_logs_function_name ON public.ai_error_logs(function_name);
CREATE INDEX idx_ai_error_logs_user_id ON public.ai_error_logs(user_id);

-- Habilitar RLS
ALTER TABLE public.ai_error_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver os logs
CREATE POLICY "Admins can view all AI error logs"
ON public.ai_error_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Edge functions (service role) podem inserir logs
CREATE POLICY "Service role can insert AI error logs"
ON public.ai_error_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir inserção anônima para edge functions
CREATE POLICY "Allow insert from service role"
ON public.ai_error_logs
FOR INSERT
TO anon
WITH CHECK (true);