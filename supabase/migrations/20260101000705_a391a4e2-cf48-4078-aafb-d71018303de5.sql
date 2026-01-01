-- Create table to manage onboarding category order
CREATE TABLE public.onboarding_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.onboarding_categories ENABLE ROW LEVEL SECURITY;

-- Create policies - public read, admin write
CREATE POLICY "Anyone can view onboarding categories" 
ON public.onboarding_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage onboarding categories" 
ON public.onboarding_categories 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_onboarding_categories_updated_at
BEFORE UPDATE ON public.onboarding_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories in order
INSERT INTO public.onboarding_categories (category_key, label, icon_name, description, sort_order) VALUES
('intolerances', 'Intolerâncias', 'wheat', 'Restrições alimentares por intolerância', 1),
('allergies', 'Alergias', 'alert-triangle', 'Alergias alimentares severas', 2),
('sensitivities', 'Sensibilidades', 'shield', 'Sensibilidades alimentares leves', 3),
('excluded_ingredients', 'Alimentos Excluídos', 'ban', 'Sugestões de alimentos que usuários podem não consumir', 4),
('dietary_preferences', 'Preferências Alimentares', 'utensils', 'Tipos de dieta', 5),
('nutritional_strategies', 'Estratégias Nutricionais', 'target', 'Objetivos nutricionais para cálculo de macros', 6);