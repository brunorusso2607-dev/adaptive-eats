
-- Tabela de perfis dietéticos dinâmicos
CREATE TABLE public.dietary_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text DEFAULT '🍽️',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de refeições/combos simples
CREATE TABLE public.simple_meals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  meal_type text NOT NULL, -- cafe_manha, almoco, lanche_tarde, jantar
  description text,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  calories integer NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  prep_time integer NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de relacionamento N:N entre combos e perfis
CREATE TABLE public.simple_meal_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simple_meal_id uuid NOT NULL REFERENCES public.simple_meals(id) ON DELETE CASCADE,
  dietary_profile_id uuid NOT NULL REFERENCES public.dietary_profiles(id) ON DELETE CASCADE,
  compatibility text NOT NULL DEFAULT 'good', -- good, moderate, avoid
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(simple_meal_id, dietary_profile_id)
);

-- Índices para performance
CREATE INDEX idx_simple_meals_meal_type ON public.simple_meals(meal_type);
CREATE INDEX idx_simple_meals_is_active ON public.simple_meals(is_active);
CREATE INDEX idx_simple_meal_profiles_meal ON public.simple_meal_profiles(simple_meal_id);
CREATE INDEX idx_simple_meal_profiles_profile ON public.simple_meal_profiles(dietary_profile_id);
CREATE INDEX idx_simple_meal_profiles_compatibility ON public.simple_meal_profiles(compatibility);
CREATE INDEX idx_dietary_profiles_key ON public.dietary_profiles(key);

-- Enable RLS
ALTER TABLE public.dietary_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simple_meal_profiles ENABLE ROW LEVEL SECURITY;

-- Policies para dietary_profiles (público para leitura, admin para escrita)
CREATE POLICY "Anyone can view active dietary profiles" 
  ON public.dietary_profiles FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can view all dietary profiles" 
  ON public.dietary_profiles FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert dietary profiles" 
  ON public.dietary_profiles FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update dietary profiles" 
  ON public.dietary_profiles FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete dietary profiles" 
  ON public.dietary_profiles FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para simple_meals (público para leitura, admin para escrita)
CREATE POLICY "Anyone can view active simple meals" 
  ON public.simple_meals FOR SELECT 
  USING (is_active = true);

CREATE POLICY "Admins can view all simple meals" 
  ON public.simple_meals FOR SELECT 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert simple meals" 
  ON public.simple_meals FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update simple meals" 
  ON public.simple_meals FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete simple meals" 
  ON public.simple_meals FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies para simple_meal_profiles (público para leitura, admin para escrita)
CREATE POLICY "Anyone can view simple meal profiles" 
  ON public.simple_meal_profiles FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert simple meal profiles" 
  ON public.simple_meal_profiles FOR INSERT 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update simple meal profiles" 
  ON public.simple_meal_profiles FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete simple meal profiles" 
  ON public.simple_meal_profiles FOR DELETE 
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_dietary_profiles_updated_at
  BEFORE UPDATE ON public.dietary_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_simple_meals_updated_at
  BEFORE UPDATE ON public.simple_meals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
