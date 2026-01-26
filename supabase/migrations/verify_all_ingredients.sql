-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO: Todos os ingredientes do banco
-- ═══════════════════════════════════════════════════════════════════════

-- Total de ingredientes
SELECT COUNT(*) as total_ingredientes FROM public.ingredient_pool;

-- Ingredientes por categoria
SELECT 
  category,
  COUNT(*) as total,
  COUNT(CASE WHEN is_alternative = true THEN 1 END) as alternativos,
  COUNT(CASE WHEN is_alternative = false THEN 1 END) as base
FROM public.ingredient_pool
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;

-- Ingredientes sem categoria (deve ser 0)
SELECT 
  ingredient_key,
  display_name_pt,
  is_alternative
FROM public.ingredient_pool
WHERE category IS NULL
ORDER BY ingredient_key;

-- Listar todos os ingredientes base por categoria
SELECT 
  category,
  STRING_AGG(ingredient_key, ', ' ORDER BY ingredient_key) as ingredientes
FROM public.ingredient_pool
WHERE is_alternative = false
GROUP BY category
ORDER BY category;

-- Ingredientes alternativos
SELECT 
  ingredient_key,
  display_name_pt,
  safe_for_intolerances,
  replaces_ingredients
FROM public.ingredient_pool
WHERE is_alternative = true
ORDER BY ingredient_key;
