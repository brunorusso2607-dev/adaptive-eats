-- Tabela de fila para importação de alimentos USDA
CREATE TABLE public.usda_import_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_term TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'foundation',
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  usda_fdc_id TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_usda_import_queue_status ON public.usda_import_queue(status);
CREATE INDEX idx_usda_import_queue_priority ON public.usda_import_queue(priority DESC);
CREATE INDEX idx_usda_import_queue_category ON public.usda_import_queue(category);

-- Constraint para status válidos
ALTER TABLE public.usda_import_queue 
ADD CONSTRAINT usda_import_queue_status_check 
CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped'));

-- Enable RLS
ALTER TABLE public.usda_import_queue ENABLE ROW LEVEL SECURITY;

-- Policies - apenas admins podem gerenciar
CREATE POLICY "Admins can view import queue"
ON public.usda_import_queue
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert import queue"
ON public.usda_import_queue
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update import queue"
ON public.usda_import_queue
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete import queue"
ON public.usda_import_queue
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role pode gerenciar (para edge functions)
CREATE POLICY "Service can manage import queue"
ON public.usda_import_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_usda_import_queue_updated_at
BEFORE UPDATE ON public.usda_import_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de log de importações
CREATE TABLE public.usda_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL,
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_success INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para logs
ALTER TABLE public.usda_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view import logs"
ON public.usda_import_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert import logs"
ON public.usda_import_logs
FOR INSERT
WITH CHECK (true);