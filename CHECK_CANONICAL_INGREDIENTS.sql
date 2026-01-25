-- Verificar se a tabela canonical_ingredients existe e tem dados

-- 1. Verificar se a tabela existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'canonical_ingredients'
) as tabela_existe;

-- 2. Se existir, contar total de registros
SELECT COUNT(*) as total_ingredientes
FROM canonical_ingredients;

-- 3. Ver estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'canonical_ingredients'
ORDER BY ordinal_position;

-- 4. Ver exemplos de ingredientes por categoria
SELECT 
  category,
  COUNT(*) as quantidade,
  STRING_AGG(name, ', ' ORDER BY name LIMIT 5) as exemplos
FROM canonical_ingredients
GROUP BY category
ORDER BY quantidade DESC;

-- 5. Verificar se há ingredientes com macros válidos
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE calories_per_100g > 0) as com_calorias,
  COUNT(*) FILTER (WHERE protein_per_100g > 0) as com_proteina,
  COUNT(*) FILTER (WHERE category IS NOT NULL) as com_categoria
FROM canonical_ingredients;

-- 6. Ver alguns exemplos de ingredientes
SELECT 
  id,
  name,
  category,
  calories_per_100g,
  protein_per_100g,
  carbs_per_100g,
  fat_per_100g
FROM canonical_ingredients
LIMIT 10;
