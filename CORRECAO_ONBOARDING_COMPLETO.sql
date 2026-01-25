-- CORREÇÃO COMPLETA DO ONBOARDING
-- Execute este SQL para garantir que todos os 8 países apareçam

-- 1. Primeiro, verificar quais países existem em onboarding_countries
SELECT 'Antes - onboarding_countries:' as info, country_code, country_name, is_active, sort_order 
FROM public.onboarding_countries 
ORDER BY sort_order;

-- 2. Inserir todos os 8 países (se não existirem)
INSERT INTO public.onboarding_countries (country_code, country_name, flag_emoji, is_active, sort_order)
VALUES 
    ('BR', 'Brasil', '🇧🇷', true, 1),
    ('US', 'United States', '🇺🇸', true, 2),
    ('PT', 'Portugal', '🇵🇹', true, 3),
    ('ES', 'España', '🇪🇸', true, 4),
    ('MX', 'México', '🇲🇽', true, 5),
    ('AR', 'Argentina', '🇦🇷', false, 6),
    ('CL', 'Chile', '🇨🇱', false, 7),
    ('PE', 'Perú', '🇵🇪', false, 8)
ON CONFLICT (country_code) 
DO UPDATE SET 
    country_name = EXCLUDED.country_name,
    flag_emoji = EXCLUDED.flag_emoji,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order;

-- 3. Verificar resultado após inserção
SELECT 'Após - onboarding_countries:' as info, country_code, country_name, flag_emoji, is_active, sort_order 
FROM public.onboarding_countries 
ORDER BY sort_order;

-- 4. Verificar se todos os países existem na tabela countries
SELECT 'Países na tabela countries:' as info, code, name_native, default_language, is_active
FROM public.countries 
ORDER BY sort_order;

-- 5. Adicionar países que faltam na tabela countries
INSERT INTO public.countries (code, name_en, name_native, flag_emoji, default_language, default_locale, timezone_default, measurement_system, currency_code, currency_symbol, nutritional_sources, ui_config, is_active, sort_order)
VALUES 
    ('AR', 'Argentina', 'Argentina', '🇦🇷', 'es', 'es-AR', 'America/Argentina/Buenos_Aires', 'metric', 'ARS', '$',
     ARRAY['USDA', 'ARGENFOODS'],
     '{"searchPlaceholder": {"text": "Escribí el alimento completo", "hint": "Sé específico"}, "portionExample": "100g"}'::jsonb,
     true, 6),
    ('CL', 'Chile', 'Chile', '🇨🇱', 'es', 'es-CL', 'America/Santiago', 'metric', 'CLP', '$',
     ARRAY['USDA', 'INTA'],
     '{"searchPlaceholder": {"text": "Escribe el alimento completo", "hint": "Sé específico"}, "portionExample": "100g"}'::jsonb,
     true, 7),
    ('PE', 'Peru', 'Perú', '🇵🇪', 'es', 'es-PE', 'America/Lima', 'metric', 'PEN', 'S/',
     ARRAY['USDA', 'CENAN'],
     '{"searchPlaceholder": {"text": "Escribe el alimento completo", "hint": "Sé específico"}, "portionExample": "100g"}'::jsonb,
     true, 8)
ON CONFLICT (code) DO NOTHING;

-- 6. Resultado final completo
SELECT 'RESULTADO FINAL - Todos os 8 países:' as info, 
       oc.country_code, 
       oc.country_name, 
       oc.flag_emoji, 
       oc.is_active, 
       oc.sort_order,
       c.default_language,
       c.nutritional_sources
FROM public.onboarding_countries oc
LEFT JOIN public.countries c ON oc.country_code = c.code
ORDER BY oc.sort_order;
