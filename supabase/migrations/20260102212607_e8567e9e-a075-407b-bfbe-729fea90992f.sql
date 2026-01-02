-- Criar tabela para gerenciar países disponíveis no onboarding
CREATE TABLE public.onboarding_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  flag_emoji TEXT NOT NULL DEFAULT '🏳️',
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_countries ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view active countries"
ON public.onboarding_countries
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all countries"
ON public.onboarding_countries
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert countries"
ON public.onboarding_countries
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update countries"
ON public.onboarding_countries
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete countries"
ON public.onboarding_countries
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_onboarding_countries_updated_at
BEFORE UPDATE ON public.onboarding_countries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir países iniciais (BR ativo, outros inativos)
INSERT INTO public.onboarding_countries (country_code, country_name, flag_emoji, is_active, sort_order) VALUES
('BR', 'Brasil', '🇧🇷', true, 1),
('US', 'Estados Unidos', '🇺🇸', false, 2),
('PT', 'Portugal', '🇵🇹', false, 3),
('MX', 'México', '🇲🇽', false, 4),
('ES', 'Espanha', '🇪🇸', false, 5),
('AR', 'Argentina', '🇦🇷', false, 6),
('CO', 'Colômbia', '🇨🇴', false, 7),
('FR', 'França', '🇫🇷', false, 8),
('DE', 'Alemanha', '🇩🇪', false, 9),
('IT', 'Itália', '🇮🇹', false, 10),
('GB', 'Reino Unido', '🇬🇧', false, 11);

-- Inserir feature flag para controlar visibilidade da página de país
INSERT INTO public.feature_flags (feature_key, display_name, description, is_enabled) VALUES
('show_country_selection', 'Seleção de País no Onboarding', 'Quando desativado, a página de seleção de país é pulada e o usuário é definido automaticamente como BR', false)
ON CONFLICT (feature_key) DO NOTHING;