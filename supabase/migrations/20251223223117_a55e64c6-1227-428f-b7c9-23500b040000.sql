-- Create table for meal status colors configuration
CREATE TABLE public.meal_status_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  background_color TEXT NOT NULL DEFAULT 'rgba(34, 197, 94, 0.1)',
  text_color TEXT NOT NULL DEFAULT 'rgba(34, 197, 94, 1)',
  border_color TEXT DEFAULT 'rgba(34, 197, 94, 0.3)',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.meal_status_colors ENABLE ROW LEVEL SECURITY;

-- Anyone can read the colors (needed for frontend display)
CREATE POLICY "Anyone can view meal status colors"
ON public.meal_status_colors
FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert meal status colors"
ON public.meal_status_colors
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update meal status colors"
ON public.meal_status_colors
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete meal status colors"
ON public.meal_status_colors
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_meal_status_colors_updated_at
BEFORE UPDATE ON public.meal_status_colors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default status colors
INSERT INTO public.meal_status_colors (status_key, label, background_color, text_color, border_color, sort_order)
VALUES 
  ('on_time', 'No horário', 'rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 1)', 'rgba(34, 197, 94, 0.3)', 1),
  ('alert', 'Em alerta', 'rgba(251, 191, 36, 0.1)', 'rgba(217, 119, 6, 1)', 'rgba(251, 191, 36, 0.3)', 2),
  ('late', 'Atrasado', 'rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 0.3)', 3);