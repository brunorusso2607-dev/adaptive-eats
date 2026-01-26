-- Adicionar campo meal_density à tabela meal_combinations
-- Para balanceamento de refeições no plano de 30 dias

ALTER TABLE public.meal_combinations 
ADD COLUMN IF NOT EXISTS meal_density TEXT CHECK (meal_density IN ('light', 'moderate', 'heavy'));

-- Criar índice para busca eficiente por densidade
CREATE INDEX IF NOT EXISTS idx_meal_combinations_density 
ON public.meal_combinations(meal_density) 
WHERE meal_density IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.meal_combinations.meal_density IS 
'Densidade calórica da refeição: light (<350 kcal), moderate (350-550 kcal), heavy (>550 kcal). Usado para balancear dias de treino vs descanso no plano de 30 dias.';
