-- Tabela para armazenar as opções de onboarding
CREATE TABLE public.onboarding_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL, -- 'intolerances', 'dietary_preferences', 'goals', 'calorie_goals', 'complexity', 'context'
  option_id text NOT NULL,
  label text NOT NULL,
  description text,
  emoji text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(category, option_id)
);

-- Enable RLS
ALTER TABLE public.onboarding_options ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos podem ler, apenas admins podem modificar
CREATE POLICY "Anyone can view active onboarding options"
ON public.onboarding_options
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all onboarding options"
ON public.onboarding_options
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert onboarding options"
ON public.onboarding_options
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update onboarding options"
ON public.onboarding_options
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete onboarding options"
ON public.onboarding_options
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_onboarding_options_updated_at
  BEFORE UPDATE ON public.onboarding_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais - Intolerâncias
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, sort_order) VALUES
('intolerances', 'gluten', 'Glúten', 'Trigo, cevada, centeio', '🌾', 1),
('intolerances', 'lactose', 'Lactose', 'Leite e derivados', '🥛', 2),
('intolerances', 'nuts', 'Oleaginosas', 'Castanhas, nozes, amêndoas', '🥜', 3),
('intolerances', 'seafood', 'Frutos do mar', 'Peixes, camarão, mariscos', '🦐', 4),
('intolerances', 'eggs', 'Ovos', 'Ovos e derivados', '🥚', 5),
('intolerances', 'soy', 'Soja', 'Soja e derivados', '🫘', 6),
('intolerances', 'none', 'Nenhuma', 'Não tenho intolerâncias', '✅', 7);

-- Inserir dados iniciais - Preferências Alimentares
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, sort_order) VALUES
('dietary_preferences', 'comum', 'Comum', 'Como de tudo sem restrições', '🍽️', 1),
('dietary_preferences', 'vegetariana', 'Vegetariana', 'Não como carnes', '🥗', 2),
('dietary_preferences', 'vegana', 'Vegana', 'Não como nada de origem animal', '🌱', 3),
('dietary_preferences', 'low_carb', 'Low Carb', 'Reduzo carboidratos', '🥩', 4);

-- Inserir dados iniciais - Objetivos
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, sort_order) VALUES
('goals', 'emagrecer', 'Emagrecer', 'Quero perder peso', '⬇️', 1),
('goals', 'manter', 'Manter peso', 'Quero manter meu peso atual', '⚖️', 2),
('goals', 'ganhar_peso', 'Ganhar peso', 'Quero ganhar massa', '⬆️', 3);

-- Inserir dados iniciais - Meta de Calorias
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, sort_order) VALUES
('calorie_goals', 'reduzir', 'Reduzir', 'Consumir menos calorias', '📉', 1),
('calorie_goals', 'manter', 'Manter', 'Manter consumo atual', '📊', 2),
('calorie_goals', 'aumentar', 'Aumentar', 'Consumir mais calorias', '📈', 3),
('calorie_goals', 'definir_depois', 'Definir depois', 'Vou decidir mais tarde', '⏳', 4);

-- Inserir dados iniciais - Complexidade de Receitas
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, sort_order) VALUES
('complexity', 'rapida', 'Rápidas', 'Receitas de até 20 minutos', '⚡', 1),
('complexity', 'equilibrada', 'Equilibradas', 'Receitas de 20-40 minutos', '⏱️', 2),
('complexity', 'elaborada', 'Elaboradas', 'Receitas mais complexas', '👨‍🍳', 3);

-- Inserir dados iniciais - Contexto
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, sort_order) VALUES
('context', 'individual', 'Individual', 'Cozinho só para mim', '👤', 1),
('context', 'familia', 'Família', 'Cozinho para a família', '👨‍👩‍👧‍👦', 2),
('context', 'modo_kids', 'Modo Kids', 'Receitas para crianças', '👶', 3);