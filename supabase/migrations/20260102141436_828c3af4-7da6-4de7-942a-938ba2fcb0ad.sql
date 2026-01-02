-- Adicionar campo detected_meal_type para armazenar o tipo de refeição detectado automaticamente
-- Isso é útil para refeições livres (sem meal_plan_item_id) para categorização e análise
ALTER TABLE public.meal_consumption 
ADD COLUMN IF NOT EXISTS detected_meal_type text;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.meal_consumption.detected_meal_type IS 'Tipo de refeição detectado automaticamente baseado no horário (cafe_manha, almoco, lanche_tarde, jantar, ceia, extra)';