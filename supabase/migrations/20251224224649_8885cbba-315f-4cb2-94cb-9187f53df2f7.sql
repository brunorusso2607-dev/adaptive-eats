-- Expandir tabela foods com novos campos para sistema híbrido
ALTER TABLE public.foods 
ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cuisine_origin TEXT,
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS confidence DECIMAL DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;

-- Criar índice para busca em aliases
CREATE INDEX IF NOT EXISTS idx_foods_aliases ON public.foods USING GIN(aliases);

-- Criar índice para busca por origem culinária
CREATE INDEX IF NOT EXISTS idx_foods_cuisine_origin ON public.foods(cuisine_origin);

-- Criar tabela de sinônimos globais para suporte multilíngue
CREATE TABLE IF NOT EXISTS public.ingredient_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  food_id UUID REFERENCES public.foods(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language TEXT DEFAULT 'pt-BR',
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_alias ON public.ingredient_aliases(LOWER(alias));
CREATE INDEX IF NOT EXISTS idx_ingredient_aliases_food_id ON public.ingredient_aliases(food_id);

-- Enable RLS
ALTER TABLE public.ingredient_aliases ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - todos podem ler, apenas admins podem modificar
CREATE POLICY "Anyone can view ingredient aliases"
ON public.ingredient_aliases
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert ingredient aliases"
ON public.ingredient_aliases
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ingredient aliases"
ON public.ingredient_aliases
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ingredient aliases"
ON public.ingredient_aliases
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Função para normalizar texto (remove acentos, lowercase)
CREATE OR REPLACE FUNCTION public.normalize_ingredient_name(input_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(
    TRANSLATE(
      input_text,
      'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
      'aaaaaeeeeiiiioooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
    )
  );
$$;

-- Índice funcional para busca normalizada
CREATE INDEX IF NOT EXISTS idx_foods_name_normalized_lower ON public.foods(LOWER(name_normalized));