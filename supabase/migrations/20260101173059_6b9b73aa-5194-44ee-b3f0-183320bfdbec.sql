-- Adicionar campo de porção segura para alinhamento com Monash University
-- Usado principalmente para FODMAP onde porções são críticas

ALTER TABLE public.intolerance_mappings 
ADD COLUMN IF NOT EXISTS safe_portion_grams INTEGER DEFAULT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.intolerance_mappings.safe_portion_grams IS 
'Porção segura em gramas (padrão Monash). NULL = sem limite específico ou bloqueado completamente.';