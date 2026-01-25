-- ============================================
-- CREATE TABLE: ingredient_pool (FIXED)
-- ============================================
-- Tabela para gerenciar ingredientes base e alternativos
-- para o sistema de geração de refeições e receitas.
--
-- Ingredientes base: universais (ex: white_rice, grilled_chicken)
-- Ingredientes alternativos: para intolerâncias (ex: lactose_free_milk)
--
-- Data: 2026-01-23
-- ============================================

-- Criar tabela ingredient_pool
CREATE TABLE IF NOT EXISTS public.ingredient_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  ingredient_key TEXT NOT NULL UNIQUE, -- Ex: "white_rice", "lactose_free_milk"
  display_name_pt TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  display_name_es TEXT,
  
  -- Tipo
  is_alternative BOOLEAN DEFAULT FALSE, -- TRUE = ingrediente alternativo para intolerâncias
  country_code TEXT, -- NULL = global/universal, "BR" = Brasil, "MX" = México, etc
  
  -- Intolerâncias que este ingrediente atende (apenas para alternativos)
  safe_for_intolerances TEXT[], -- Ex: ["gluten", "lactose", "fodmap"]
  
  -- Ingredientes que este substitui (apenas para alternativos)
  replaces_ingredients TEXT[], -- Ex: ["whole_milk", "skim_milk"]
  
  -- Macros nutricionais (por 100g)
  kcal_per_100g REAL,
  protein_per_100g REAL,
  carbs_per_100g REAL,
  fat_per_100g REAL,
  fiber_per_100g REAL,
  default_portion_grams REAL,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ingredient_pool_alternative ON public.ingredient_pool(is_alternative);
CREATE INDEX IF NOT EXISTS idx_ingredient_pool_country ON public.ingredient_pool(country_code);
CREATE INDEX IF NOT EXISTS idx_ingredient_pool_safe_for ON public.ingredient_pool USING GIN(safe_for_intolerances);
CREATE INDEX IF NOT EXISTS idx_ingredient_pool_replaces ON public.ingredient_pool USING GIN(replaces_ingredients);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_ingredient_pool_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ingredient_pool_updated_at ON public.ingredient_pool;
CREATE TRIGGER trigger_update_ingredient_pool_updated_at
  BEFORE UPDATE ON public.ingredient_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_ingredient_pool_updated_at();

-- RLS Policies
ALTER TABLE public.ingredient_pool ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view ingredient_pool" ON public.ingredient_pool;
DROP POLICY IF EXISTS "Admins can manage ingredient_pool" ON public.ingredient_pool;
DROP POLICY IF EXISTS "Service can manage ingredient_pool" ON public.ingredient_pool;
DROP POLICY IF EXISTS "Authenticated users can manage ingredient_pool" ON public.ingredient_pool;

-- Anyone can view ingredients
CREATE POLICY "Anyone can view ingredient_pool"
  ON public.ingredient_pool
  FOR SELECT
  USING (true);

-- Authenticated users can manage (simplified - adjust based on your needs)
CREATE POLICY "Authenticated users can manage ingredient_pool"
  ON public.ingredient_pool
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Service role can manage everything
CREATE POLICY "Service can manage ingredient_pool"
  ON public.ingredient_pool
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Comentário
COMMENT ON TABLE public.ingredient_pool IS 'Pool de ingredientes base e alternativos para geração de refeições e receitas. Ingredientes alternativos são usados automaticamente para usuários com intolerâncias.';
