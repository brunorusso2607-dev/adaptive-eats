-- Create function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create workout_plans table
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_muscle_group TEXT,
  difficulty TEXT DEFAULT 'intermediate',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout_exercises table
CREATE TABLE public.workout_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  body_part TEXT NOT NULL,
  target_muscle TEXT NOT NULL,
  equipment TEXT,
  gif_url TEXT,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 12,
  rest_seconds INTEGER NOT NULL DEFAULT 60,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies for workout_plans
CREATE POLICY "Users can view their own workout plans"
ON public.workout_plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout plans"
ON public.workout_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout plans"
ON public.workout_plans FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout plans"
ON public.workout_plans FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for workout_exercises (via workout_plan ownership)
CREATE POLICY "Users can view their workout exercises"
ON public.workout_exercises FOR SELECT
USING (EXISTS (
  SELECT 1 FROM workout_plans
  WHERE workout_plans.id = workout_exercises.workout_plan_id
  AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can create workout exercises"
ON public.workout_exercises FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM workout_plans
  WHERE workout_plans.id = workout_exercises.workout_plan_id
  AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can update their workout exercises"
ON public.workout_exercises FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM workout_plans
  WHERE workout_plans.id = workout_exercises.workout_plan_id
  AND workout_plans.user_id = auth.uid()
));

CREATE POLICY "Users can delete their workout exercises"
ON public.workout_exercises FOR DELETE
USING (EXISTS (
  SELECT 1 FROM workout_plans
  WHERE workout_plans.id = workout_exercises.workout_plan_id
  AND workout_plans.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_workout_plans_updated_at
BEFORE UPDATE ON public.workout_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();