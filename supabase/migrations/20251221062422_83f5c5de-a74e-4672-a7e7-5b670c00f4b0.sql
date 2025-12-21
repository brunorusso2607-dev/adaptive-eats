-- Create app_settings table for appearance customization
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_color text NOT NULL DEFAULT '#22c55e',
  secondary_color text NOT NULL DEFAULT '#16a34a',
  accent_color text NOT NULL DEFAULT '#4ade80',
  background_color text NOT NULL DEFAULT '#ffffff',
  foreground_color text NOT NULL DEFAULT '#0a0a0a',
  logo_url text,
  topbar_text text,
  custom_css text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can view app settings"
ON public.app_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert app settings"
ON public.app_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Public can read settings (for applying theme)
CREATE POLICY "Anyone can read app settings"
ON public.app_settings FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.app_settings (id) VALUES (gen_random_uuid());

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('app-assets', 'app-assets', true);

-- Storage policies for app-assets bucket
CREATE POLICY "Anyone can view app assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-assets');

CREATE POLICY "Admins can upload app assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'app-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'app-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'app-assets' AND has_role(auth.uid(), 'admin'));