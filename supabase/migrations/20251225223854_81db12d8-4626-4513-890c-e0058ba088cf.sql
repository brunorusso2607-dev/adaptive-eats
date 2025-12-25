-- Create meal reminder settings table
CREATE TABLE public.meal_reminder_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_minutes_before INTEGER NOT NULL DEFAULT 0,
  enabled_meals TEXT[] NOT NULL DEFAULT '{cafe_manha,almoco,lanche_tarde,jantar,ceia}'::text[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_reminder_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own meal reminder settings"
ON public.meal_reminder_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal reminder settings"
ON public.meal_reminder_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal reminder settings"
ON public.meal_reminder_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal reminder settings"
ON public.meal_reminder_settings FOR DELETE
USING (auth.uid() = user_id);

-- Service role can read all settings (for edge function)
CREATE POLICY "Service can read all meal reminder settings"
ON public.meal_reminder_settings FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_meal_reminder_settings_updated_at
BEFORE UPDATE ON public.meal_reminder_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();