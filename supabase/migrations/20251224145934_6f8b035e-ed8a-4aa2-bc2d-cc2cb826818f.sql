-- Create table for water consumption tracking
CREATE TABLE public.water_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount_ml INTEGER NOT NULL DEFAULT 250,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for water goal settings
CREATE TABLE public.water_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  daily_goal_ml INTEGER NOT NULL DEFAULT 2000,
  reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  reminder_interval_minutes INTEGER NOT NULL DEFAULT 60,
  reminder_start_hour INTEGER NOT NULL DEFAULT 8,
  reminder_end_hour INTEGER NOT NULL DEFAULT 22,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.water_consumption ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for water_consumption
CREATE POLICY "Users can view their own water consumption"
ON public.water_consumption
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water consumption"
ON public.water_consumption
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water consumption"
ON public.water_consumption
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for water_settings
CREATE POLICY "Users can view their own water settings"
ON public.water_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own water settings"
ON public.water_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own water settings"
ON public.water_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_water_consumption_user_date ON public.water_consumption (user_id, consumed_at);
CREATE INDEX idx_water_settings_user ON public.water_settings (user_id);