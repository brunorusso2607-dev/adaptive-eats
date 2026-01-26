-- ============================================
-- EXECUTAR ESTE SQL NO SUPABASE SQL EDITOR
-- Copia e cola tudo de uma vez
-- ============================================

-- 1. Adicionar colunas country_code e language à tabela foods
ALTER TABLE public.foods 
    ADD COLUMN IF NOT EXISTS country_code text,
    ADD COLUMN IF NOT EXISTS language text;

-- 2. Criar índices
CREATE INDEX IF NOT EXISTS idx_foods_country ON public.foods(country_code);
CREATE INDEX IF NOT EXISTS idx_foods_language ON public.foods(language);
CREATE INDEX IF NOT EXISTS idx_foods_country_lang ON public.foods(country_code, language);

-- 3. Popular dados existentes baseado em source
UPDATE public.foods SET country_code = 'BR', language = 'pt' WHERE source = 'TBCA' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'BR', language = 'pt' WHERE source = 'taco' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'US', language = 'en' WHERE source = 'usda' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'MX', language = 'es' WHERE source = 'BAM' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'FR', language = 'fr' WHERE source = 'CIQUAL' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'ES', language = 'es' WHERE source = 'AESAN Spain' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'DE', language = 'de' WHERE source = 'BLS Germany' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'IT', language = 'it' WHERE source = 'CREA' AND country_code IS NULL;
UPDATE public.foods SET country_code = 'GB', language = 'en' WHERE source = 'McCance' AND country_code IS NULL;

-- 4. Popular tabela countries (se ainda não existir dados)
INSERT INTO public.countries (code, name_en, name_native, flag_emoji, default_language, default_locale, timezone_default, measurement_system, currency_code, currency_symbol, nutritional_sources, ui_config, is_active, sort_order)
VALUES 
    ('BR', 'Brazil', 'Brasil', '🇧🇷', 'pt', 'pt-BR', 'America/Sao_Paulo', 'metric', 'BRL', 'R$', 
     ARRAY['TBCA', 'USDA'], 
     '{"searchPlaceholder": {"text": "Digite o alimento completo (ex: arroz integral cozido)", "hint": "Seja específico"}, "portionExample": "100g"}'::jsonb,
     true, 1),
    ('US', 'United States', 'United States', '🇺🇸', 'en', 'en-US', 'America/New_York', 'imperial', 'USD', '$',
     ARRAY['USDA', 'FDA'],
     '{"searchPlaceholder": {"text": "Type the full food name (e.g., grilled chicken breast)", "hint": "Be specific"}, "portionExample": "1 cup, 3 oz"}'::jsonb,
     true, 2),
    ('PT', 'Portugal', 'Portugal', '🇵🇹', 'pt', 'pt-PT', 'Europe/Lisbon', 'metric', 'EUR', '€',
     ARRAY['INSA', 'CIQUAL', 'USDA'],
     '{"searchPlaceholder": {"text": "Escreva o alimento completo", "hint": "Seja específico"}, "portionExample": "100g"}'::jsonb,
     true, 3),
    ('ES', 'Spain', 'España', '🇪🇸', 'es', 'es-ES', 'Europe/Madrid', 'metric', 'EUR', '€',
     ARRAY['BEDCA', 'USDA'],
     '{"searchPlaceholder": {"text": "Escribe el alimento completo", "hint": "Sé específico"}, "portionExample": "100g"}'::jsonb,
     true, 4),
    ('MX', 'Mexico', 'México', '🇲🇽', 'es', 'es-MX', 'America/Mexico_City', 'metric', 'MXN', '$',
     ARRAY['USDA', 'SMAE'],
     '{"searchPlaceholder": {"text": "Escribe el alimento completo", "hint": "Sé específico"}, "portionExample": "100g"}'::jsonb,
     true, 5)
ON CONFLICT (code) DO NOTHING;

-- 5. Verificar resultado
SELECT 
    country_code,
    language,
    source,
    COUNT(*) as total
FROM public.foods
WHERE country_code IS NOT NULL
GROUP BY country_code, language, source
ORDER BY country_code, source;

-- Mostrar países cadastrados
SELECT code, name_native, default_language, is_active FROM public.countries ORDER BY sort_order;
