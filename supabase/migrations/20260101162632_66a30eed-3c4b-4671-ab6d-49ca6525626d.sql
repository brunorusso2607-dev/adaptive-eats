-- Adicionar colunas severity_level e labels na tabela intolerance_mappings
ALTER TABLE public.intolerance_mappings 
ADD COLUMN IF NOT EXISTS severity_level TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS labels TEXT[] DEFAULT '{}';

-- Criar índice para busca por severity_level
CREATE INDEX IF NOT EXISTS idx_intolerance_mappings_severity 
ON public.intolerance_mappings(intolerance_key, severity_level);

-- Criar índice GIN para busca por labels
CREATE INDEX IF NOT EXISTS idx_intolerance_mappings_labels 
ON public.intolerance_mappings USING GIN(labels);