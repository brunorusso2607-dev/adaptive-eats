-- Create meal_plans table
CREATE TABLE public.meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meal_plan_items table
CREATE TABLE public.meal_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_plan_id UUID NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  meal_type TEXT NOT NULL,
  recipe_name TEXT NOT NULL,
  recipe_calories INTEGER NOT NULL DEFAULT 0,
  recipe_protein NUMERIC NOT NULL DEFAULT 0,
  recipe_carbs NUMERIC NOT NULL DEFAULT 0,
  recipe_fat NUMERIC NOT NULL DEFAULT 0,
  recipe_prep_time INTEGER NOT NULL DEFAULT 30,
  recipe_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  recipe_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for meal_plans
CREATE POLICY "Users can view their own meal plans" ON public.meal_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own meal plans" ON public.meal_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans" ON public.meal_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal plans" ON public.meal_plans
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for meal_plan_items
CREATE POLICY "Users can view their meal plan items" ON public.meal_plan_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create meal plan items" ON public.meal_plan_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update their meal plan items" ON public.meal_plan_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete their meal plan items" ON public.meal_plan_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.meal_plans WHERE id = meal_plan_id AND user_id = auth.uid())
  );

-- Trigger for updated_at
CREATE TRIGGER update_meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_updated_at();