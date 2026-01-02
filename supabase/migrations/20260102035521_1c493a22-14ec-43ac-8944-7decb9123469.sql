
-- 1. Adicionar ingredientes faltantes para GLUTEN
INSERT INTO intolerance_mappings (ingredient, intolerance_key, severity_level)
VALUES 
  ('macarrão integral', 'gluten', 'high'),
  ('macarrão', 'gluten', 'high')
ON CONFLICT DO NOTHING;

-- 2. Adicionar neutralizadores (safe keywords)
INSERT INTO intolerance_safe_keywords (keyword, intolerance_key)
VALUES 
  ('macarrão de arroz', 'gluten'),
  ('macarrão sem glúten', 'gluten'),
  ('baixo fodmap', 'fodmap'),
  ('low fodmap', 'fodmap')
ON CONFLICT DO NOTHING;

-- 3. Normalizar severity_level para lowercase (HIGH -> high)
UPDATE intolerance_mappings 
SET severity_level = LOWER(severity_level)
WHERE severity_level != LOWER(severity_level);
