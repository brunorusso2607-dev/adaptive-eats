-- Create table to store food correction feedback for AI improvement
CREATE TABLE public.food_corrections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Original AI analysis
  original_item TEXT NOT NULL,
  original_porcao TEXT,
  original_calorias INTEGER,
  original_proteinas NUMERIC,
  original_carboidratos NUMERIC,
  original_gorduras NUMERIC,
  original_confianca TEXT,
  original_culinaria TEXT,
  
  -- Corrected values by user
  corrected_item TEXT NOT NULL,
  corrected_porcao TEXT,
  corrected_calorias INTEGER,
  corrected_proteinas NUMERIC,
  corrected_carboidratos NUMERIC,
  corrected_gorduras NUMERIC,
  
  -- Context
  correction_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'alternative_selected'
  alternative_selected TEXT, -- If user clicked an alternative
  image_hash TEXT, -- Optional: to group corrections from same image
  
  -- Metadata
  dish_context TEXT, -- Optional: dish name if identified
  cuisine_origin TEXT
);

-- Enable Row Level Security
ALTER TABLE public.food_corrections ENABLE ROW LEVEL SECURITY;

-- Users can insert their own corrections
CREATE POLICY "Users can insert their own corrections"
ON public.food_corrections
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own corrections
CREATE POLICY "Users can view their own corrections"
ON public.food_corrections
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all corrections (for AI improvement analysis)
CREATE POLICY "Admins can view all corrections"
ON public.food_corrections
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete corrections
CREATE POLICY "Admins can delete corrections"
ON public.food_corrections
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_food_corrections_user_id ON public.food_corrections(user_id);
CREATE INDEX idx_food_corrections_original_item ON public.food_corrections(original_item);
CREATE INDEX idx_food_corrections_created_at ON public.food_corrections(created_at DESC);