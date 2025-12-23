-- Remover coluna recipe_complexity da tabela profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS recipe_complexity;

-- Desativar opções de complexidade no onboarding (categoria 'complexity')
UPDATE public.onboarding_options 
SET is_active = false 
WHERE category = 'complexity';