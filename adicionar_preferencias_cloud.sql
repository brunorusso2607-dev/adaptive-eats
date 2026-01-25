-- SQL para adicionar preferências alimentares faltantes no Supabase Cloud
-- Execute em: https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/editor

-- Verificar preferências atuais
SELECT option_id, label, description, sort_order 
FROM public.onboarding_options 
WHERE category = 'dietary_preferences' 
ORDER BY sort_order;

-- Adicionar preferências faltantes
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, icon_name, is_active, sort_order)
VALUES 
  ('dietary_preferences', 'pescatarian', 'Pescetariana', 'Como peixes, sem carnes', '🐟', 'fish', true, 4),
  ('dietary_preferences', 'flexitarian', 'Flexitariana', 'Vegetariana com carne ocasional', '🌿', 'leaf', true, 5),
  ('dietary_preferences', 'low_carb', 'Low Carb', 'Reduzo carboidratos', '🥩', 'beef', true, 6),
  ('dietary_preferences', 'keto', 'Cetogênica', 'Baixo carboidrato, alta gordura', '🥑', 'flame', true, 7)
ON CONFLICT (category, option_id) DO NOTHING;

-- Verificar após inserção
SELECT option_id, label, description, sort_order 
FROM public.onboarding_options 
WHERE category = 'dietary_preferences' 
ORDER BY sort_order;
