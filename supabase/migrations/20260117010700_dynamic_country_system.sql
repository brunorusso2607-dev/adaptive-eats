-- ============================================
-- MIGRATION: Sistema Dinâmico de Países
-- ============================================
-- Este migration cria as tabelas necessárias para tornar o sistema
-- de pool de refeições 100% dinâmico, sincronizado com onboarding_countries
-- ============================================

-- ============================================
-- 1. TABELA CULTURAL_RULES
-- ============================================
-- Armazena regras culturais por país e tipo de refeição
CREATE TABLE IF NOT EXISTS public.cultural_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  meal_type TEXT NOT NULL, -- cafe_manha, lanche_manha, almoco, lanche_tarde, jantar, ceia
  
  -- Estrutura obrigatória
  required_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["carbs", "proteins", "beverages"]
  
  forbidden_components JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["legumes", "rice"] (para café da manhã)
  
  typical_beverages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["café", "café com leite", "suco natural"]
  
  forbidden_beverages JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Ex: ["refrigerante", "cerveja"]
  
  structure_description TEXT,
  -- Ex: "Pão/Tapioca + Bebida quente + Fruta"
  
  examples JSONB DEFAULT '[]'::jsonb,
  -- Ex: ["Pão francês + Ovo + Café", "Tapioca + Queijo + Suco"]
  
  negative_examples JSONB DEFAULT '[]'::jsonb,
  -- Ex: ["❌ Arroz + Feijão + Café (isso é ALMOÇO)"]
  
  macro_focus JSONB DEFAULT '{}'::jsonb,
  -- Ex: {"carb": "alto", "protein": "médio", "fat": "moderado"}
  
  max_prep_time TEXT DEFAULT '15 minutos',
  
  fallback_country_code TEXT,
  -- País de onde herdar regras se não definido
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(country_code, meal_type)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cultural_rules_country ON public.cultural_rules(country_code);
CREATE INDEX IF NOT EXISTS idx_cultural_rules_meal_type ON public.cultural_rules(meal_type);
CREATE INDEX IF NOT EXISTS idx_cultural_rules_active ON public.cultural_rules(is_active) WHERE is_active = true;

-- ============================================
-- 2. TABELA MEAL_COMPONENTS_POOL
-- ============================================
-- Armazena componentes de refeição por país e tipo
CREATE TABLE IF NOT EXISTS public.meal_components_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  meal_type TEXT NOT NULL, -- cafe_manha, almoco, jantar, etc. ou 'all' para todos
  component_type TEXT NOT NULL, -- carbs, proteins, vegetables, fruits, dairy, legumes, beverages
  
  name TEXT NOT NULL,
  name_en TEXT,
  portion_grams INTEGER,
  portion_ml INTEGER,
  portion_label TEXT,
  
  blocked_for TEXT[] DEFAULT '{}',
  -- Ex: ["gluten", "lactose"]
  
  safe_for TEXT[] DEFAULT '{}',
  -- Ex: ["lactose"] (para "Leite sem lactose")
  
  is_alternative BOOLEAN DEFAULT false,
  -- Se é alternativa para intolerância
  
  alternatives TEXT[] DEFAULT '{}',
  -- Lista de nomes de alternativas disponíveis
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_country ON public.meal_components_pool(country_code);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_meal_type ON public.meal_components_pool(meal_type);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_type ON public.meal_components_pool(component_type);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_blocked ON public.meal_components_pool USING GIN(blocked_for);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_safe ON public.meal_components_pool USING GIN(safe_for);
CREATE INDEX IF NOT EXISTS idx_meal_components_pool_active ON public.meal_components_pool(is_active) WHERE is_active = true;

-- ============================================
-- 3. TABELA COUNTRY_FALLBACK_HIERARCHY
-- ============================================
-- Define hierarquia de fallback para países sem regras próprias
CREATE TABLE IF NOT EXISTS public.country_fallback_hierarchy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  fallback_chain TEXT[] NOT NULL DEFAULT '{}',
  -- Ex: ["AR", "MX", "ES", "BR"] (Chile herda de Argentina, depois México, etc.)
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_country_fallback_country ON public.country_fallback_hierarchy(country_code);

-- ============================================
-- 4. HABILITAR RLS
-- ============================================
ALTER TABLE public.cultural_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_components_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_fallback_hierarchy ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. POLÍTICAS RLS - cultural_rules
-- ============================================
CREATE POLICY "Anyone can view active cultural_rules"
ON public.cultural_rules
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all cultural_rules"
ON public.cultural_rules
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert cultural_rules"
ON public.cultural_rules
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update cultural_rules"
ON public.cultural_rules
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete cultural_rules"
ON public.cultural_rules
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service can manage cultural_rules"
ON public.cultural_rules
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- 6. POLÍTICAS RLS - meal_components_pool
-- ============================================
CREATE POLICY "Anyone can view active meal_components_pool"
ON public.meal_components_pool
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all meal_components_pool"
ON public.meal_components_pool
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can insert meal_components_pool"
ON public.meal_components_pool
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update meal_components_pool"
ON public.meal_components_pool
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete meal_components_pool"
ON public.meal_components_pool
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service can manage meal_components_pool"
ON public.meal_components_pool
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- 7. POLÍTICAS RLS - country_fallback_hierarchy
-- ============================================
CREATE POLICY "Anyone can view country_fallback_hierarchy"
ON public.country_fallback_hierarchy
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage country_fallback_hierarchy"
ON public.country_fallback_hierarchy
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Service can manage country_fallback_hierarchy"
ON public.country_fallback_hierarchy
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================
-- 8. TRIGGERS DE UPDATED_AT
-- ============================================
CREATE TRIGGER update_cultural_rules_updated_at
BEFORE UPDATE ON public.cultural_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meal_components_pool_updated_at
BEFORE UPDATE ON public.meal_components_pool
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_country_fallback_hierarchy_updated_at
BEFORE UPDATE ON public.country_fallback_hierarchy
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 9. COMENTÁRIOS
-- ============================================
COMMENT ON TABLE public.cultural_rules IS 'Regras culturais por país e tipo de refeição para geração dinâmica de refeições';
COMMENT ON TABLE public.meal_components_pool IS 'Pool de componentes de refeição por país com suporte a intolerâncias e alternativas';
COMMENT ON TABLE public.country_fallback_hierarchy IS 'Hierarquia de fallback para países sem regras culturais próprias';

-- ============================================
-- 10. POPULAR FALLBACK HIERARCHY
-- ============================================
INSERT INTO public.country_fallback_hierarchy (country_code, fallback_chain, notes) VALUES
  ('BR', '{}', 'Brasil - País base, não precisa de fallback'),
  ('US', '{"BR"}', 'Estados Unidos - Fallback para Brasil'),
  ('PT', '{"BR"}', 'Portugal - Fallback para Brasil (idioma similar)'),
  ('GB', '{"US", "BR"}', 'Reino Unido - Fallback para EUA depois Brasil'),
  ('ES', '{"PT", "MX", "BR"}', 'Espanha - Fallback para Portugal, México, Brasil'),
  ('MX', '{"ES", "BR"}', 'México - Fallback para Espanha, Brasil'),
  ('AR', '{"ES", "MX", "BR"}', 'Argentina - Fallback para Espanha, México, Brasil'),
  ('CL', '{"AR", "ES", "BR"}', 'Chile - Fallback para Argentina, Espanha, Brasil'),
  ('PE', '{"MX", "AR", "BR"}', 'Peru - Fallback para México, Argentina, Brasil')
ON CONFLICT (country_code) DO UPDATE SET
  fallback_chain = EXCLUDED.fallback_chain,
  notes = EXCLUDED.notes,
  updated_at = NOW();
