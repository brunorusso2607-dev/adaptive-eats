-- Add language/country column to intolerance_mappings
ALTER TABLE public.intolerance_mappings 
ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'pt';

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_intolerance_mappings_language 
ON public.intolerance_mappings(language);

-- Update existing records to 'pt' (Brazilian Portuguese - current data)
UPDATE public.intolerance_mappings SET language = 'pt' WHERE language IS NULL OR language = 'pt';

-- Add comment for documentation
COMMENT ON COLUMN public.intolerance_mappings.language IS 'Country/language code for regional ingredients (pt, en, es, fr, etc.)';