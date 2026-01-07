-- Tabela para pool de combinações de refeições pré-validadas
-- Módulo SEPARADO do gerador de plano alimentar
CREATE TABLE public.meal_combinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Identificação
  name TEXT NOT NULL,
  description TEXT,
  
  -- Tipo de refeição
  meal_type TEXT NOT NULL, -- cafe_manha, almoco, lanche_tarde, jantar, ceia
  
  -- Componentes da refeição (estruturados)
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Exemplo: [
  --   {"type": "protein", "name": "Ovos mexidos", "portion_grams": 150, "portion_label": "2 ovos"},
  --   {"type": "carb", "name": "Pão integral", "portion_grams": 50, "portion_label": "1 fatia"},
  --   {"type": "beverage", "name": "Café preto", "portion_ml": 200, "portion_label": "1 xícara"},
  --   {"type": "fruit", "name": "Banana", "portion_grams": 120, "portion_label": "1 unidade"}
  -- ]
  
  -- Macros PRÉ-CALCULADOS (consultados do TBCA/TACO na geração)
  total_calories INTEGER NOT NULL DEFAULT 0,
  total_protein NUMERIC NOT NULL DEFAULT 0,
  total_carbs NUMERIC NOT NULL DEFAULT 0,
  total_fat NUMERIC NOT NULL DEFAULT 0,
  total_fiber NUMERIC DEFAULT 0,
  
  -- Fonte dos macros
  macro_source TEXT DEFAULT 'tbca', -- tbca, taco, usda, ai_estimated
  macro_confidence TEXT DEFAULT 'high', -- high, medium, low
  
  -- Regionalização
  country_codes TEXT[] NOT NULL DEFAULT '{BR}'::text[],
  language_code TEXT NOT NULL DEFAULT 'pt',
  
  -- Compatibilidade dietética
  dietary_tags TEXT[] DEFAULT '{}'::text[],
  -- Ex: ['sem_gluten', 'sem_lactose', 'vegetariano', 'low_carb']
  
  -- Tags de intolerâncias que BLOQUEIAM esta refeição
  blocked_for_intolerances TEXT[] DEFAULT '{}'::text[],
  -- Ex: ['gluten', 'lactose'] = quem tem essas intolerâncias NÃO pode comer
  
  -- Flexibilidade (opções alternativas)
  flexible_options JSONB DEFAULT '{}'::jsonb,
  -- Ex: {"fruit": ["banana", "maçã", "pera"], "beverage": ["café", "chá"]}
  
  -- Instruções de preparo (opcional)
  instructions JSONB DEFAULT '[]'::jsonb,
  prep_time_minutes INTEGER DEFAULT 15,
  
  -- Controle
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Origem
  source TEXT DEFAULT 'ai_generated', -- ai_generated, manual, imported
  generated_by TEXT, -- função que gerou
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para busca eficiente
CREATE INDEX idx_meal_combinations_meal_type ON public.meal_combinations(meal_type);
CREATE INDEX idx_meal_combinations_country ON public.meal_combinations USING GIN(country_codes);
CREATE INDEX idx_meal_combinations_dietary ON public.meal_combinations USING GIN(dietary_tags);
CREATE INDEX idx_meal_combinations_blocked ON public.meal_combinations USING GIN(blocked_for_intolerances);
CREATE INDEX idx_meal_combinations_active ON public.meal_combinations(is_active) WHERE is_active = true;
CREATE INDEX idx_meal_combinations_calories ON public.meal_combinations(total_calories);

-- Índice único para evitar duplicatas
CREATE UNIQUE INDEX idx_meal_combinations_unique_name_type 
ON public.meal_combinations(LOWER(name), meal_type, country_codes) 
WHERE is_active = true;

-- Habilitar RLS
ALTER TABLE public.meal_combinations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view active meal combinations"
ON public.meal_combinations
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all meal combinations"
ON public.meal_combinations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert meal combinations"
ON public.meal_combinations
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update meal combinations"
ON public.meal_combinations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete meal combinations"
ON public.meal_combinations
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert meal combinations"
ON public.meal_combinations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update meal combinations"
ON public.meal_combinations
FOR UPDATE
USING (true);

-- Trigger para updated_at
CREATE TRIGGER update_meal_combinations_updated_at
BEFORE UPDATE ON public.meal_combinations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.meal_combinations IS 'Pool de combinações de refeições pré-validadas com macros calculados. Módulo separado do gerador de plano alimentar.';
COMMENT ON COLUMN public.meal_combinations.components IS 'Array de componentes: {type, name, portion_grams/ml, portion_label}';
COMMENT ON COLUMN public.meal_combinations.flexible_options IS 'Opções alternativas por tipo de componente para variedade';
COMMENT ON COLUMN public.meal_combinations.blocked_for_intolerances IS 'Intolerâncias que impedem consumo desta refeição';