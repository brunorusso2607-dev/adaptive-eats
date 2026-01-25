-- Ver TODAS as colunas da tabela profiles
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;
