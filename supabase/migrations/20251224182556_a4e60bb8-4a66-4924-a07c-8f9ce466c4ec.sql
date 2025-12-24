-- Create feature_flags table for controlling app features
CREATE TABLE public.feature_flags (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    feature_key TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags (needed to check if feature is enabled)
CREATE POLICY "Anyone can read feature flags"
ON public.feature_flags
FOR SELECT
USING (true);

-- Only admins can update feature flags
CREATE POLICY "Admins can update feature flags"
ON public.feature_flags
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert feature flags
CREATE POLICY "Admins can insert feature flags"
ON public.feature_flags
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete feature flags
CREATE POLICY "Admins can delete feature flags"
ON public.feature_flags
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default feature flag for Kids Mode (disabled by default)
INSERT INTO public.feature_flags (feature_key, display_name, description, is_enabled)
VALUES ('kids_mode', 'Modo Kids', 'Ativa o modo infantil com receitas adaptadas para crianças', false);

-- Create trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON public.feature_flags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();