-- Criar tabela para gerenciar integrações de API
CREATE TABLE public.api_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  api_key_masked text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.api_integrations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar
CREATE POLICY "Admins can view integrations"
  ON public.api_integrations FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert integrations"
  ON public.api_integrations FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update integrations"
  ON public.api_integrations FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete integrations"
  ON public.api_integrations FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_api_integrations_updated_at
  BEFORE UPDATE ON public.api_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();