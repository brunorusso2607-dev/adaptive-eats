-- Adiciona coluna instructions na tabela simple_meals para instruções passo-a-passo
ALTER TABLE public.simple_meals 
ADD COLUMN IF NOT EXISTS instructions jsonb DEFAULT '[]'::jsonb;