
-- Criar constraint única em name_normalized para permitir upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_name_normalized_unique ON public.foods (name_normalized);
