-- Create enum types for profile fields
CREATE TYPE public.dietary_preference AS ENUM ('comum', 'vegetariana', 'vegana', 'low_carb');
CREATE TYPE public.user_goal AS ENUM ('emagrecer', 'manter', 'ganhar_peso');
CREATE TYPE public.calorie_goal AS ENUM ('reduzir', 'manter', 'aumentar', 'definir_depois');
CREATE TYPE public.recipe_complexity AS ENUM ('rapida', 'equilibrada', 'elaborada');
CREATE TYPE public.user_context AS ENUM ('individual', 'familia', 'modo_kids');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  intolerances TEXT[] DEFAULT '{}',
  dietary_preference public.dietary_preference DEFAULT 'comum',
  goal public.user_goal DEFAULT 'manter',
  calorie_goal public.calorie_goal DEFAULT 'definir_depois',
  recipe_complexity public.recipe_complexity DEFAULT 'equilibrada',
  context public.user_context DEFAULT 'individual',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_updated_at();