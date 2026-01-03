-- Adicionar coluna language à tabela food_decomposition_mappings
-- Segue o mesmo padrão de intolerance_mappings
ALTER TABLE public.food_decomposition_mappings 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt';

-- Adicionar índice para otimizar buscas por idioma
CREATE INDEX IF NOT EXISTS idx_food_decomposition_language 
ON public.food_decomposition_mappings(language);

-- Comentário explicativo
COMMENT ON COLUMN public.food_decomposition_mappings.language IS 'Código do idioma/país: en (global), br (Brasil), pt (Portugal), etc.';