-- Tabela para armazenar configurações de pixels
CREATE TABLE public.tracking_pixels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- 'facebook', 'google', 'tiktok', etc.
  pixel_id TEXT NOT NULL,
  api_token TEXT, -- Token da API de Conversão (criptografado em produção)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Índice para consultas
CREATE INDEX idx_tracking_pixels_platform ON public.tracking_pixels(platform);
CREATE INDEX idx_tracking_pixels_is_active ON public.tracking_pixels(is_active);

-- Habilitar RLS
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar pixels
CREATE POLICY "Admins can view all pixels"
ON public.tracking_pixels
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pixels"
ON public.tracking_pixels
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pixels"
ON public.tracking_pixels
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pixels"
ON public.tracking_pixels
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_tracking_pixels_updated_at
BEFORE UPDATE ON public.tracking_pixels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();