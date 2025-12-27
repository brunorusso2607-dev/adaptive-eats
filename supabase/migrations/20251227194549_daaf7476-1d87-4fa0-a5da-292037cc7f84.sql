-- Adicionar coluna custom_meal_times para horários personalizados por plano
-- Formato esperado: {"cafe_manha": "07:00", "almoco": "12:30", "lanche_tarde": "15:30", "jantar": "19:00", "ceia": "21:30"}
ALTER TABLE public.meal_plans 
ADD COLUMN IF NOT EXISTS custom_meal_times JSONB DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN public.meal_plans.custom_meal_times IS 'Horários personalizados para cada tipo de refeição. Se NULL, usa os horários globais de meal_time_settings.';