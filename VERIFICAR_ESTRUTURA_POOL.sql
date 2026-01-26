-- Verificar estrutura da tabela meal_combinations
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meal_combinations'
ORDER BY ordinal_position;

-- Verificar dados reais da tabela (primeiras 5 linhas)
SELECT * 
FROM meal_combinations 
LIMIT 5;

-- Contar total de registros
SELECT COUNT(*) as total_registros
FROM meal_combinations;
