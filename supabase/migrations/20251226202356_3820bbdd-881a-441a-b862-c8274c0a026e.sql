-- Adicionar campos de rating, fonte e localização na tabela simple_meals
ALTER TABLE public.simple_meals
ADD COLUMN IF NOT EXISTS rating numeric(2,1) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rating_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS source_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS source_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'BR',
ADD COLUMN IF NOT EXISTS language_code text DEFAULT 'pt-BR',
ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS component_type text DEFAULT 'main',
ADD COLUMN IF NOT EXISTS compatible_meal_times text[] DEFAULT '{}'::text[];

-- Criar índices para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_simple_meals_country_code ON public.simple_meals(country_code);
CREATE INDEX IF NOT EXISTS idx_simple_meals_component_type ON public.simple_meals(component_type);
CREATE INDEX IF NOT EXISTS idx_simple_meals_rating ON public.simple_meals(rating DESC NULLS LAST);

-- Comentários para documentação
COMMENT ON COLUMN public.simple_meals.rating IS 'Rating da receita de 0.0 a 5.0 (fonte original ou interno)';
COMMENT ON COLUMN public.simple_meals.rating_count IS 'Número de avaliações na fonte original';
COMMENT ON COLUMN public.simple_meals.source_url IS 'URL original da receita (se importada de site externo)';
COMMENT ON COLUMN public.simple_meals.source_name IS 'Nome do site fonte (ex: TudoGostoso, Tasty)';
COMMENT ON COLUMN public.simple_meals.country_code IS 'Código do país de origem (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN public.simple_meals.language_code IS 'Código do idioma (BCP 47)';
COMMENT ON COLUMN public.simple_meals.image_url IS 'URL da imagem da receita';
COMMENT ON COLUMN public.simple_meals.ai_generated IS 'Se a receita foi gerada por IA';
COMMENT ON COLUMN public.simple_meals.component_type IS 'Tipo: main, side, dessert, simple, drink';
COMMENT ON COLUMN public.simple_meals.compatible_meal_times IS 'Horários compatíveis: cafe_manha, almoco, lanche_tarde, jantar, ceia';