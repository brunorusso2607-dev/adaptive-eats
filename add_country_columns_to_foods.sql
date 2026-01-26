-- Adicionar colunas country_code e language à tabela foods
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar colunas
ALTER TABLE public.foods 
    ADD COLUMN IF NOT EXISTS country_code text,
    ADD COLUMN IF NOT EXISTS language text;

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_foods_country ON public.foods(country_code);
CREATE INDEX IF NOT EXISTS idx_foods_language ON public.foods(language);
CREATE INDEX IF NOT EXISTS idx_foods_country_lang ON public.foods(country_code, language);

-- 3. Popular dados existentes baseado em source
UPDATE public.foods 
SET country_code = 'BR', language = 'pt' 
WHERE source = 'TBCA' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'BR', language = 'pt' 
WHERE source = 'taco' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'US', language = 'en' 
WHERE source = 'usda' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'MX', language = 'es' 
WHERE source = 'BAM' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'FR', language = 'fr' 
WHERE source = 'CIQUAL' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'ES', language = 'es' 
WHERE source = 'AESAN Spain' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'DE', language = 'de' 
WHERE source = 'BLS Germany' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'IT', language = 'it' 
WHERE source = 'CREA' AND country_code IS NULL;

UPDATE public.foods 
SET country_code = 'GB', language = 'en' 
WHERE source = 'McCance' AND country_code IS NULL;

-- 4. Adicionar comentários
COMMENT ON COLUMN public.foods.country_code IS 'Código do país de origem do alimento (ISO 3166-1 alpha-2)';
COMMENT ON COLUMN public.foods.language IS 'Idioma do nome do alimento (ISO 639-1)';

-- Verificar resultado
SELECT 
    country_code,
    language,
    source,
    COUNT(*) as total
FROM public.foods
WHERE country_code IS NOT NULL
GROUP BY country_code, language, source
ORDER BY country_code, source;
