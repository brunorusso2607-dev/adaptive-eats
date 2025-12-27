-- Adicionar colunas de rastreamento na tabela simple_meals
ALTER TABLE public.simple_meals 
ADD COLUMN IF NOT EXISTS source_module text DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS usage_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone;

-- Criar índices para otimizar buscas
CREATE INDEX IF NOT EXISTS idx_simple_meals_source_module ON public.simple_meals(source_module);
CREATE INDEX IF NOT EXISTS idx_simple_meals_meal_type_country ON public.simple_meals(meal_type, country_code);
CREATE INDEX IF NOT EXISTS idx_simple_meals_usage_count ON public.simple_meals(usage_count DESC);

-- Comentários para documentação
COMMENT ON COLUMN public.simple_meals.source_module IS 'Origem da receita: admin, surpreenda_me, plano_ia, plano_simples, manual';
COMMENT ON COLUMN public.simple_meals.usage_count IS 'Quantas vezes a receita foi reutilizada';
COMMENT ON COLUMN public.simple_meals.last_used_at IS 'Última vez que a receita foi usada';