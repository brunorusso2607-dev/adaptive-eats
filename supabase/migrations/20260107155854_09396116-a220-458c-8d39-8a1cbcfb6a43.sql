-- Tabela de ingredientes canônicos com traduções
CREATE TABLE public.canonical_ingredients (
  id TEXT PRIMARY KEY,  -- ID canônico snake_case (ex: "rice_white")
  name_en TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  name_es TEXT,
  category TEXT NOT NULL,  -- grain, protein, vegetable, fruit, dairy, fat, beverage, legume, seasoning
  subcategory TEXT,
  calories_per_100g NUMERIC DEFAULT 0,
  protein_per_100g NUMERIC DEFAULT 0,
  carbs_per_100g NUMERIC DEFAULT 0,
  fat_per_100g NUMERIC DEFAULT 0,
  fiber_per_100g NUMERIC DEFAULT 0,
  default_portion_grams NUMERIC DEFAULT 100,
  portion_label_en TEXT,
  portion_label_pt TEXT,
  intolerance_flags TEXT[] DEFAULT '{}',  -- ['gluten', 'lactose', 'fodmap']
  dietary_flags TEXT[] DEFAULT '{}',  -- ['vegan', 'vegetarian']
  country_specific TEXT[],  -- ['BR', 'PT'] se regional, NULL se universal
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX idx_canonical_ingredients_category ON public.canonical_ingredients(category);
CREATE INDEX idx_canonical_ingredients_intolerance ON public.canonical_ingredients USING GIN(intolerance_flags);
CREATE INDEX idx_canonical_ingredients_dietary ON public.canonical_ingredients USING GIN(dietary_flags);
CREATE INDEX idx_canonical_ingredients_country ON public.canonical_ingredients USING GIN(country_specific);

-- Trigger para updated_at
CREATE TRIGGER update_canonical_ingredients_updated_at
  BEFORE UPDATE ON public.canonical_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.canonical_ingredients ENABLE ROW LEVEL SECURITY;

-- Leitura pública (ingredientes são dados públicos)
CREATE POLICY "Canonical ingredients are readable by everyone"
  ON public.canonical_ingredients FOR SELECT
  USING (true);

-- Apenas admins podem modificar
CREATE POLICY "Only admins can modify canonical ingredients"
  ON public.canonical_ingredients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));