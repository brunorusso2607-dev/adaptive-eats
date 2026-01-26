-- ============================================
-- VERIFICAR SCHEMA DA TABELA PROFILES
-- ============================================

-- Ver todas as colunas da tabela profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Ver um registro de exemplo
SELECT *
FROM profiles
WHERE email = 'brunorusso212@gmail.com'
LIMIT 1;
