-- Remover coluna end_hour da tabela meal_time_settings
-- A lógica de atraso agora será: se passou 1 hora do start_hour sem completar, está atrasada

ALTER TABLE public.meal_time_settings DROP COLUMN end_hour;