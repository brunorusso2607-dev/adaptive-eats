-- FASE 1: Preparação do Banco de Dados
-- Adicionar campos para suportar registro livre de refeições

-- 1. Campo source_type: identifica origem do registro
-- Valores: 'plan' (plano alimentar), 'photo' (análise de foto), 'manual' (registro livre), 'extra' (refeição extra)
ALTER TABLE public.meal_consumption 
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'plan';

-- 2. Campo custom_meal_name: nome personalizado para refeições extras
-- Usado quando usuário adiciona refeição que não está no plano
ALTER TABLE public.meal_consumption 
ADD COLUMN IF NOT EXISTS custom_meal_name text;

-- 3. Campo meal_time: horário escolhido pelo usuário
-- Permite registrar o horário exato da refeição
ALTER TABLE public.meal_consumption 
ADD COLUMN IF NOT EXISTS meal_time time;

-- 4. Adicionar comentários para documentação
COMMENT ON COLUMN public.meal_consumption.source_type IS 'Origem do registro: plan, photo, manual, extra';
COMMENT ON COLUMN public.meal_consumption.custom_meal_name IS 'Nome personalizado para refeições extras';
COMMENT ON COLUMN public.meal_consumption.meal_time IS 'Horário da refeição informado pelo usuário';