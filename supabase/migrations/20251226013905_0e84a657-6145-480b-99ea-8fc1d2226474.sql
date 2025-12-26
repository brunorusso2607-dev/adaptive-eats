-- Criar tabela para histórico de validações de ingredientes
CREATE TABLE public.ingredient_validation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ingredients TEXT[] NOT NULL,
  is_valid BOOLEAN NOT NULL,
  confidence TEXT,
  message TEXT,
  problematic_pair TEXT[],
  suggestions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ingredient_validation_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can insert their own validations"
  ON public.ingredient_validation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own validations"
  ON public.ingredient_validation_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Permitir edge functions inserir (service role)
CREATE POLICY "Service can insert validations"
  ON public.ingredient_validation_history
  FOR INSERT
  WITH CHECK (true);

-- Criar índice para busca por ingredientes
CREATE INDEX idx_validation_ingredients ON public.ingredient_validation_history USING GIN(ingredients);

-- Criar índice para busca por usuário
CREATE INDEX idx_validation_user ON public.ingredient_validation_history(user_id);