-- Criar tabela nutritional_strategies para gerenciar estratégias nutricionais
CREATE TABLE public.nutritional_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  calorie_modifier INTEGER, -- modificador de calorias (ex: -500, 0, +400). NULL para dieta flexível
  protein_per_kg NUMERIC, -- gramas de proteína por kg de peso corporal. NULL para dieta flexível
  carb_ratio NUMERIC, -- percentual de carboidratos (0.45 = 45%). NULL para dieta flexível
  fat_ratio NUMERIC, -- percentual de gordura (0.30 = 30%). NULL para dieta flexível
  is_flexible BOOLEAN NOT NULL DEFAULT false, -- se true, usuário define metas manualmente
  icon TEXT, -- emoji ou nome do ícone
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nutritional_strategies ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view active nutritional strategies"
ON public.nutritional_strategies
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all nutritional strategies"
ON public.nutritional_strategies
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert nutritional strategies"
ON public.nutritional_strategies
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update nutritional strategies"
ON public.nutritional_strategies
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete nutritional strategies"
ON public.nutritional_strategies
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_nutritional_strategies_updated_at
BEFORE UPDATE ON public.nutritional_strategies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna strategy_id no profiles (nullable para compatibilidade)
ALTER TABLE public.profiles 
ADD COLUMN strategy_id UUID REFERENCES public.nutritional_strategies(id) ON DELETE SET NULL;

-- Comentário para documentação
COMMENT ON TABLE public.nutritional_strategies IS 'Estratégias nutricionais configuráveis (emagrecer, cutting, manter, fitness, bulk, dieta flexível)';
COMMENT ON COLUMN public.nutritional_strategies.calorie_modifier IS 'Ajuste calórico em relação ao TDEE. Negativo = déficit, Positivo = superávit, NULL = usuário define';
COMMENT ON COLUMN public.nutritional_strategies.protein_per_kg IS 'Gramas de proteína por kg de peso corporal. NULL = usuário define';
COMMENT ON COLUMN public.nutritional_strategies.is_flexible IS 'Se true, o usuário define manualmente suas metas calóricas e de macros';