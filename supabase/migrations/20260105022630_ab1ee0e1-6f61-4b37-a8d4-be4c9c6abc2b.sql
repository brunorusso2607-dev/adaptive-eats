-- Inserir ingredientes puros brasileiros críticos em intolerance_mappings
-- Evitando duplicatas com ON CONFLICT DO NOTHING

INSERT INTO public.intolerance_mappings (intolerance_key, ingredient, language, severity_level)
VALUES
  -- Sesame (gergelim)
  ('sesame', 'gergelim', 'br', 'blocked'),
  ('sesame', 'óleo de gergelim', 'br', 'blocked'),
  ('sesame', 'tahine', 'br', 'blocked'),
  
  -- Seafood (frutos do mar brasileiros)
  ('seafood', 'sururu', 'br', 'blocked'),
  ('seafood', 'marisco', 'br', 'blocked'),
  ('seafood', 'ostra', 'br', 'blocked'),
  ('seafood', 'mexilhão', 'br', 'blocked'),
  ('seafood', 'siri', 'br', 'blocked'),
  
  -- Lactose (derivados lácteos brasileiros)
  ('lactose', 'nata', 'br', 'blocked'),
  ('lactose', 'coalho', 'br', 'blocked'),
  
  -- Fructose (frutas brasileiras ricas em frutose)
  ('fructose', 'caju', 'br', 'blocked'),
  ('fructose', 'goiaba', 'br', 'blocked'),
  ('fructose', 'jabuticaba', 'br', 'blocked'),
  ('fructose', 'acerola', 'br', 'blocked'),
  ('fructose', 'graviola', 'br', 'blocked'),
  ('fructose', 'cupuaçu', 'br', 'blocked'),
  ('fructose', 'maracujá', 'br', 'blocked'),
  
  -- Salicylate (frutas brasileiras ricas em salicilato)
  ('salicylate', 'caju', 'br', 'blocked'),
  ('salicylate', 'acerola', 'br', 'blocked'),
  ('salicylate', 'pitanga', 'br', 'blocked'),
  ('salicylate', 'mangaba', 'br', 'blocked'),
  ('salicylate', 'camu-camu', 'br', 'blocked'),
  
  -- Tree Nuts (castanhas brasileiras)
  ('tree_nuts', 'sapucaia', 'br', 'blocked'),
  ('tree_nuts', 'babaçu', 'br', 'blocked'),
  
  -- Soy (derivados de soja)
  ('soy', 'tofu', 'br', 'blocked'),
  ('soy', 'tempeh', 'br', 'blocked'),
  ('soy', 'edamame', 'br', 'blocked')
ON CONFLICT DO NOTHING;