-- Corrigir country_code do Dourado (deve ser BR, não global)
UPDATE public.ingredient_pool
SET country_code = 'BR'
WHERE ingredient_key = 'grilled_dourado';

-- Verificar correção
SELECT 
  '✅ Dourado corrigido para Brasil' as status,
  ingredient_key,
  display_name_pt,
  country_code,
  category
FROM ingredient_pool
WHERE ingredient_key = 'grilled_dourado';
