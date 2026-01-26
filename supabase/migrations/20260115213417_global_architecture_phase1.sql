-- ============================================
-- GLOBAL ARCHITECTURE - PHASE 1: FOUNDATION
-- Criação de tabelas para suporte multi-país
-- ============================================

-- ============================================
-- 1. TABELA DE TERMOS DE PROCESSAMENTO
-- ============================================
-- Externaliza termos hardcoded de calculateRealMacros.ts
CREATE TABLE IF NOT EXISTS public.food_processing_terms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    term text NOT NULL,
    language text NOT NULL,
    category text NOT NULL, -- 'preparation', 'cooking_method', 'state', 'modifier'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_processing_terms_lang ON public.food_processing_terms(language);
CREATE INDEX IF NOT EXISTS idx_processing_terms_category ON public.food_processing_terms(category);
CREATE INDEX IF NOT EXISTS idx_processing_terms_lookup ON public.food_processing_terms(language, term);

-- Constraint único
CREATE UNIQUE INDEX IF NOT EXISTS idx_processing_terms_unique ON public.food_processing_terms(term, language);

-- ============================================
-- 2. TABELA DE PALAVRAS-CHAVE DE CATEGORIA
-- ============================================
-- Externaliza detecção de categoria de alimentos
CREATE TABLE IF NOT EXISTS public.food_category_keywords (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword text NOT NULL,
    language text NOT NULL,
    category text NOT NULL, -- 'meat', 'grains', 'vegetables', 'fruits', 'dairy', etc.
    weight integer DEFAULT 1, -- Peso para scoring (1-10)
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_category_keywords_lang ON public.food_category_keywords(language);
CREATE INDEX IF NOT EXISTS idx_category_keywords_category ON public.food_category_keywords(category);
CREATE INDEX IF NOT EXISTS idx_category_keywords_lookup ON public.food_category_keywords(language, keyword);

-- Constraint único
CREATE UNIQUE INDEX IF NOT EXISTS idx_category_keywords_unique ON public.food_category_keywords(keyword, language, category);

-- ============================================
-- 3. TABELA COUNTRIES (CENTRALIZAÇÃO TOTAL)
-- ============================================
-- Substitui countryConfig.ts hardcoded
CREATE TABLE IF NOT EXISTS public.countries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE NOT NULL, -- 'BR', 'US', 'ES', etc.
    name_en text NOT NULL,
    name_native text NOT NULL,
    flag_emoji text NOT NULL,
    
    -- Configurações de idioma
    default_language text NOT NULL, -- 'pt', 'en', 'es'
    default_locale text NOT NULL, -- 'pt-BR', 'en-US'
    
    -- Configurações regionais
    timezone_default text NOT NULL,
    measurement_system text DEFAULT 'metric' CHECK (measurement_system IN ('metric', 'imperial')),
    currency_code text, -- 'BRL', 'USD', 'EUR'
    currency_symbol text, -- 'R$', '$', '€'
    
    -- Fontes nutricionais prioritárias (array ordenado)
    nutritional_sources text[] DEFAULT '{}',
    
    -- Configurações de UI (JSON flexível)
    ui_config jsonb DEFAULT '{}'::jsonb,
    
    -- Metadados
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_countries_active ON public.countries(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);

-- ============================================
-- 4. ADICIONAR COLUNAS À TABELA FOODS
-- ============================================
-- Adicionar country_code e language para filtro regional
ALTER TABLE public.foods 
    ADD COLUMN IF NOT EXISTS country_code text,
    ADD COLUMN IF NOT EXISTS language text;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_foods_country ON public.foods(country_code);
CREATE INDEX IF NOT EXISTS idx_foods_language ON public.foods(language);
CREATE INDEX IF NOT EXISTS idx_foods_country_lang ON public.foods(country_code, language);

-- ============================================
-- 5. POPULAR DADOS EXISTENTES (MIGRATION)
-- ============================================

-- Popular country_code e language baseado em source
UPDATE public.foods 
SET 
    country_code = 'BR',
    language = 'pt'
WHERE source = 'TBCA' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'BR',
    language = 'pt'
WHERE source = 'taco' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'US',
    language = 'en'
WHERE source = 'usda' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'MX',
    language = 'es'
WHERE source = 'BAM' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'FR',
    language = 'fr'
WHERE source = 'CIQUAL' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'ES',
    language = 'es'
WHERE source = 'AESAN Spain' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'DE',
    language = 'de'
WHERE source = 'BLS Germany' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'IT',
    language = 'it'
WHERE source = 'CREA' AND country_code IS NULL;

UPDATE public.foods 
SET 
    country_code = 'GB',
    language = 'en'
WHERE source = 'McCance' AND country_code IS NULL;

-- Alimentos curated podem ser globais (null) ou específicos
-- Deixar null por enquanto para indicar "global"

-- ============================================
-- 6. RLS POLICIES
-- ============================================

-- food_processing_terms: leitura pública, escrita admin
ALTER TABLE public.food_processing_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all" ON public.food_processing_terms
    FOR SELECT
    USING (true);

CREATE POLICY "Allow all for service role" ON public.food_processing_terms
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- food_category_keywords: leitura pública, escrita admin
ALTER TABLE public.food_category_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all" ON public.food_category_keywords
    FOR SELECT
    USING (true);

CREATE POLICY "Allow all for service role" ON public.food_category_keywords
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- countries: leitura pública, escrita admin
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all" ON public.countries
    FOR SELECT
    USING (true);

CREATE POLICY "Allow all for service role" ON public.countries
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================
-- 7. TRIGGERS PARA UPDATED_AT
-- ============================================

CREATE TRIGGER update_food_processing_terms_updated_at 
    BEFORE UPDATE ON public.food_processing_terms 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_food_category_keywords_updated_at 
    BEFORE UPDATE ON public.food_category_keywords 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_countries_updated_at 
    BEFORE UPDATE ON public.countries 
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE public.food_processing_terms IS 'Termos de processamento de alimentos em múltiplos idiomas (externaliza hardcoding)';
COMMENT ON TABLE public.food_category_keywords IS 'Palavras-chave para detecção de categoria de alimentos';
COMMENT ON TABLE public.countries IS 'Configuração centralizada de países (substitui countryConfig.ts)';
COMMENT ON COLUMN public.foods.country_code IS 'Código do país de origem do alimento (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN public.foods.language IS 'Idioma do nome do alimento (ISO 639-1)';
