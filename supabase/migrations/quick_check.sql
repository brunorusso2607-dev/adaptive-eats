-- Verificação rápida
SELECT 
  is_alternative,
  COUNT(*) as total
FROM public.ingredient_pool
GROUP BY is_alternative
ORDER BY is_alternative;

-- Total geral
SELECT COUNT(*) as total FROM public.ingredient_pool;
