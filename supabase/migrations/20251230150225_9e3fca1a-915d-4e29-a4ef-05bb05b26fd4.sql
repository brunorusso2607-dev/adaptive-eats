-- Add missing Portuguese onboarding keys to intolerance_key_normalization
-- These are the keys used in the onboarding flow that need to map to English database keys

INSERT INTO intolerance_key_normalization (onboarding_key, database_key, label) VALUES
  ('amendoim', 'peanut', 'Amendoim'),
  ('ovos', 'egg', 'Ovos'),
  ('soja', 'soy', 'Soja'),
  ('acucar_diabetes', 'sugar', 'Açúcar/Diabetes'),
  ('acucar', 'sugar', 'Açúcar'),
  ('castanhas', 'tree_nuts', 'Castanhas'),
  ('frutos_do_mar', 'seafood', 'Frutos do Mar'),
  ('peixe', 'fish', 'Peixe'),
  ('histamina', 'histamine', 'Histamina'),
  ('salicilatos', 'salicylate', 'Salicilatos'),
  ('sulfitos', 'sulfite', 'Sulfitos'),
  ('milho', 'corn', 'Milho'),
  ('frutose', 'fructose', 'Frutose')
ON CONFLICT (onboarding_key) DO NOTHING;