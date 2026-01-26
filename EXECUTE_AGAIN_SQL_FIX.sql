-- EXECUTAR NOVAMENTE PARA GARANTIR QUE TUDO FUNCIONE
-- Copie e cole tudo no Supabase SQL Editor

-- 1. Verificar se as colunas existem e adicionar se necessário
DO $$
BEGIN
    -- Adicionar colunas se não existirem
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'foods' 
        AND column_name = 'country_code'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.foods ADD COLUMN country_code text;
        RAISE NOTICE 'Coluna country_code adicionada';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'foods' 
        AND column_name = 'language'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.foods ADD COLUMN language text;
        RAISE NOTICE 'Coluna language adicionada';
    END IF;
END $$;

-- 2. Popular dados novamente (caso não tenham sido populados)
UPDATE public.foods SET country_code = 'BR', language = 'pt' WHERE source = 'TBCA' AND (country_code IS NULL OR language IS NULL);
UPDATE public.foods SET country_code = 'BR', language = 'pt' WHERE source = 'taco' AND (country_code IS NULL OR language IS NULL);
UPDATE public.foods SET country_code = 'US', language = 'en' WHERE source = 'usda' AND (country_code IS NULL OR language IS NULL);
UPDATE public.foods SET country_code = 'MX', language = 'es' WHERE source = 'BAM' AND (country_code IS NULL OR language IS NULL);

-- 3. Verificar resultado
SELECT 
    country_code,
    language,
    source,
    COUNT(*) as total
FROM public.foods
WHERE country_code IS NOT NULL
GROUP BY country_code, language, source
ORDER BY country_code, source;

-- 4. Verificar estrutura da tabela
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'foods' 
    AND table_schema = 'public'
    AND column_name IN ('country_code', 'language', 'source')
ORDER BY column_name;
