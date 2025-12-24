-- =============================================
-- FASE 1: Tabelas para Rastreador de Sintomas
-- =============================================

-- Tabela de tipos de sintomas (referência)
CREATE TABLE public.symptom_types (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT '😣',
  category text NOT NULL DEFAULT 'digestivo',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir sintomas comuns
INSERT INTO public.symptom_types (name, icon, category, sort_order) VALUES
  ('Inchaço abdominal', '🎈', 'digestivo', 1),
  ('Gases', '💨', 'digestivo', 2),
  ('Náusea', '🤢', 'digestivo', 3),
  ('Dor abdominal', '😣', 'digestivo', 4),
  ('Diarreia', '🚽', 'digestivo', 5),
  ('Constipação', '😖', 'digestivo', 6),
  ('Azia/Refluxo', '🔥', 'digestivo', 7),
  ('Dor de cabeça', '🤕', 'neurologico', 8),
  ('Fadiga', '😴', 'energia', 9),
  ('Coceira na pele', '🤚', 'pele', 10),
  ('Urticária', '🔴', 'pele', 11),
  ('Congestão nasal', '🤧', 'respiratorio', 12);

-- RLS para symptom_types (leitura pública)
ALTER TABLE public.symptom_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active symptom types"
ON public.symptom_types FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage symptom types"
ON public.symptom_types FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- Tabela de registros de sintomas do usuário
-- =============================================
CREATE TABLE public.symptom_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  meal_consumption_id uuid REFERENCES public.meal_consumption(id) ON DELETE SET NULL,
  symptoms text[] NOT NULL DEFAULT '{}',
  severity text NOT NULL DEFAULT 'leve' CHECK (severity IN ('leve', 'moderado', 'severo')),
  notes text,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_symptom_logs_user_id ON public.symptom_logs(user_id);
CREATE INDEX idx_symptom_logs_logged_at ON public.symptom_logs(logged_at);
CREATE INDEX idx_symptom_logs_meal ON public.symptom_logs(meal_consumption_id);

-- RLS para symptom_logs
ALTER TABLE public.symptom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own symptom logs"
ON public.symptom_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own symptom logs"
ON public.symptom_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symptom logs"
ON public.symptom_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptom logs"
ON public.symptom_logs FOR DELETE
USING (auth.uid() = user_id);