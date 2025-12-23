-- Tabela para armazenar os horários das refeições (configurável pelo admin)
CREATE TABLE public.meal_time_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_type text NOT NULL UNIQUE,
  label text NOT NULL,
  start_hour numeric NOT NULL,
  end_hour numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_time_settings ENABLE ROW LEVEL SECURITY;

-- Políticas: Qualquer pessoa pode ler, apenas admins podem modificar
CREATE POLICY "Anyone can view meal time settings"
ON public.meal_time_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert meal time settings"
ON public.meal_time_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update meal time settings"
ON public.meal_time_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete meal time settings"
ON public.meal_time_settings
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_meal_time_settings_updated_at
BEFORE UPDATE ON public.meal_time_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais (horários atuais)
INSERT INTO public.meal_time_settings (meal_type, label, start_hour, end_hour, sort_order) VALUES
  ('cafe_manha', 'Café da Manhã', 6, 10, 1),
  ('almoco', 'Almoço', 10, 14, 2),
  ('lanche', 'Lanche', 14, 17, 3),
  ('lanche_tarde', 'Lanche da Tarde', 14, 17, 4),
  ('jantar', 'Jantar', 17, 21, 5),
  ('ceia', 'Ceia', 21, 24, 6);