-- Tabela para logs de health check do sistema
CREATE TABLE public.system_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_type TEXT NOT NULL, -- 'edge_function', 'database', 'frontend', 'api'
  target_name TEXT NOT NULL, -- nome da função/endpoint testado
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'warning', 'timeout'
  response_time_ms INTEGER,
  error_message TEXT,
  error_details JSONB,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para erros capturados do frontend
CREATE TABLE public.frontend_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  error_type TEXT NOT NULL, -- 'chunk_load', 'network', 'state_corruption', 'render', 'unhandled'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_name TEXT,
  page_url TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_system_health_logs_checked_at ON public.system_health_logs(checked_at DESC);
CREATE INDEX idx_system_health_logs_status ON public.system_health_logs(status);
CREATE INDEX idx_system_health_logs_target ON public.system_health_logs(target_name);
CREATE INDEX idx_frontend_error_logs_created_at ON public.frontend_error_logs(created_at DESC);
CREATE INDEX idx_frontend_error_logs_type ON public.frontend_error_logs(error_type);

-- Enable RLS
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frontend_error_logs ENABLE ROW LEVEL SECURITY;

-- Policies para system_health_logs
CREATE POLICY "Admins can view all health logs" 
  ON public.system_health_logs 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert health logs" 
  ON public.system_health_logs 
  FOR INSERT 
  WITH CHECK (true);

-- Policies para frontend_error_logs
CREATE POLICY "Admins can view all frontend errors" 
  ON public.frontend_error_logs 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert frontend errors" 
  ON public.frontend_error_logs 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Admins can delete old frontend errors" 
  ON public.frontend_error_logs 
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));