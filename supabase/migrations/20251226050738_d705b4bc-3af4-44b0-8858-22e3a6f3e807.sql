
-- Adicionar colunas para sistema de unidades
ALTER TABLE public.foods 
ADD COLUMN IF NOT EXISTS serving_unit text DEFAULT 'g',
ADD COLUMN IF NOT EXISTS default_serving_size numeric DEFAULT 100;

-- Comentários para documentação
COMMENT ON COLUMN public.foods.serving_unit IS 'Tipo de unidade: g (gramas), ml (mililitros), un (unidade), fatia';
COMMENT ON COLUMN public.foods.default_serving_size IS 'Tamanho padrão da porção em gramas ou ml';
