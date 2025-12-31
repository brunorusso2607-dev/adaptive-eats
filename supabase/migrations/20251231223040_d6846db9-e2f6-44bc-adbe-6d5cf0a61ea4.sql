-- Tabela de idiomas suportados pelo sistema
CREATE TABLE public.supported_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- 'pt', 'en', 'es', 'de', 'fr', 'it'
  name TEXT NOT NULL, -- 'Português', 'English', etc.
  native_name TEXT NOT NULL, -- 'Português', 'English', 'Deutsch'
  is_base_language BOOLEAN NOT NULL DEFAULT false, -- PT é a base
  is_active BOOLEAN NOT NULL DEFAULT true,
  expansion_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  last_expansion_at TIMESTAMP WITH TIME ZONE,
  total_terms INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Anyone can view supported languages" 
ON public.supported_languages 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage supported languages" 
ON public.supported_languages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_supported_languages_updated_at
BEFORE UPDATE ON public.supported_languages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir idiomas iniciais (PT como base, outros pendentes)
INSERT INTO public.supported_languages (code, name, native_name, is_base_language, is_active, expansion_status, sort_order) VALUES
('pt', 'Português', 'Português', true, true, 'completed', 1),
('en', 'English', 'English', false, true, 'pending', 2),
('es', 'Español', 'Español', false, true, 'pending', 3),
('de', 'German', 'Deutsch', false, false, 'pending', 4),
('fr', 'French', 'Français', false, false, 'pending', 5),
('it', 'Italian', 'Italiano', false, false, 'pending', 6);