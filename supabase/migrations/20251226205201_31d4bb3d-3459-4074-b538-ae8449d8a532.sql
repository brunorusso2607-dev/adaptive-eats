-- Tabela de configuração do Spoonacular
CREATE TABLE public.spoonacular_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_masked text,
  api_key_encrypted text,
  daily_limit integer NOT NULL DEFAULT 15,
  is_auto_enabled boolean NOT NULL DEFAULT false,
  auto_run_hour integer NOT NULL DEFAULT 3,
  current_region_index integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de histórico de importações
CREATE TABLE public.spoonacular_import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region text NOT NULL,
  cuisine text NOT NULL,
  recipes_imported integer NOT NULL DEFAULT 0,
  recipes_failed integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de fila de regiões
CREATE TABLE public.spoonacular_region_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  region_name text NOT NULL,
  region_code text NOT NULL,
  cuisines text[] NOT NULL DEFAULT '{}',
  priority integer NOT NULL DEFAULT 0,
  total_imported integer NOT NULL DEFAULT 0,
  last_import_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  use_ai_fallback boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spoonacular_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spoonacular_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spoonacular_region_queue ENABLE ROW LEVEL SECURITY;

-- Policies for spoonacular_config (admin only)
CREATE POLICY "Admins can view spoonacular config"
  ON public.spoonacular_config FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert spoonacular config"
  ON public.spoonacular_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update spoonacular config"
  ON public.spoonacular_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete spoonacular config"
  ON public.spoonacular_config FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for spoonacular_import_logs (admin only)
CREATE POLICY "Admins can view import logs"
  ON public.spoonacular_import_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert import logs"
  ON public.spoonacular_import_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update import logs"
  ON public.spoonacular_import_logs FOR UPDATE
  USING (true);

-- Policies for spoonacular_region_queue (admin only)
CREATE POLICY "Admins can view region queue"
  ON public.spoonacular_region_queue FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert region queue"
  ON public.spoonacular_region_queue FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update region queue"
  ON public.spoonacular_region_queue FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete region queue"
  ON public.spoonacular_region_queue FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default regions
INSERT INTO public.spoonacular_region_queue (region_name, region_code, cuisines, priority, use_ai_fallback) VALUES
  ('Brasil', 'BR', ARRAY['brazilian', 'latin american'], 1, true),
  ('Estados Unidos', 'US', ARRAY['american'], 2, false),
  ('Europa', 'EU', ARRAY['italian', 'french', 'german', 'spanish', 'greek', 'british', 'mediterranean'], 3, false),
  ('América Latina', 'LATAM', ARRAY['mexican', 'caribbean'], 4, false);

-- Trigger para updated_at
CREATE TRIGGER update_spoonacular_config_updated_at
  BEFORE UPDATE ON public.spoonacular_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spoonacular_region_queue_updated_at
  BEFORE UPDATE ON public.spoonacular_region_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();