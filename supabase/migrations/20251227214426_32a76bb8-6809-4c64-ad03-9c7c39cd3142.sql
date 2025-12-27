-- Adiciona campo para horários personalizados padrão do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_meal_times jsonb DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.profiles.default_meal_times IS 'Horários personalizados padrão do usuário, usado como template para novos planos alimentares';