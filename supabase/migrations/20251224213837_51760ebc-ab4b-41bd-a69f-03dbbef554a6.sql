-- Create intolerance_mappings table
CREATE TABLE public.intolerance_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intolerance_key text NOT NULL,
  ingredient text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(intolerance_key, ingredient)
);

-- Create safe_keywords table for keywords that neutralize suspicion
CREATE TABLE public.intolerance_safe_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intolerance_key text NOT NULL,
  keyword text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(intolerance_key, keyword)
);

-- Enable RLS
ALTER TABLE public.intolerance_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intolerance_safe_keywords ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed for the symptom tracking logic)
CREATE POLICY "Anyone can view intolerance mappings"
ON public.intolerance_mappings FOR SELECT
USING (true);

CREATE POLICY "Anyone can view safe keywords"
ON public.intolerance_safe_keywords FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can insert intolerance mappings"
ON public.intolerance_mappings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update intolerance mappings"
ON public.intolerance_mappings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete intolerance mappings"
ON public.intolerance_mappings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert safe keywords"
ON public.intolerance_safe_keywords FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update safe keywords"
ON public.intolerance_safe_keywords FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete safe keywords"
ON public.intolerance_safe_keywords FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));