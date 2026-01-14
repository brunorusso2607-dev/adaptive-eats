-- ============================================================
-- SEED: Segurança Alimentar - VERSÃO BÁSICA
-- Intolerâncias e Dietas - Ingredientes mais comuns
-- NOTA: Esta é uma versão inicial. Para cobertura completa (2.846+ ingredientes),
-- use as edge functions de expansão via IA ou importe do sistema original.
-- ============================================================

-- 1. NORMALIZAÇÃO DE CHAVES (intolerance_key_normalization)
INSERT INTO public.intolerance_key_normalization (onboarding_key, database_key, label, description)
VALUES 
  ('gluten', 'gluten', 'Glúten', 'Proteína presente em trigo, cevada, centeio'),
  ('lactose', 'lactose', 'Lactose', 'Açúcar do leite'),
  ('fodmap', 'fodmap', 'FODMAP', 'Carboidratos fermentáveis'),
  ('fructose', 'fructose', 'Frutose', 'Açúcar das frutas'),
  ('histamine', 'histamine', 'Histamina', 'Presente em alimentos fermentados'),
  ('peanut', 'peanut', 'Amendoim', 'Alergia a amendoim'),
  ('nuts', 'tree_nuts', 'Oleaginosas', 'Castanhas, nozes, amêndoas'),
  ('seafood', 'shellfish', 'Frutos do mar', 'Crustáceos e moluscos'),
  ('fish', 'fish', 'Peixe', 'Todos os peixes'),
  ('eggs', 'eggs', 'Ovos', 'Ovos e derivados'),
  ('soy', 'soy', 'Soja', 'Soja e derivados'),
  ('milk', 'milk_protein', 'Proteína do Leite', 'Caseína e whey')
ON CONFLICT (onboarding_key) DO NOTHING;

-- 2. MAPEAMENTO DE INTOLERÂNCIAS - GLÚTEN
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient_name, ingredient_normalized, language, source, confidence)
VALUES 
  -- Português
  ('gluten', 'trigo', 'trigo', 'pt', 'manual', 1.0),
  ('gluten', 'farinha de trigo', 'farinha de trigo', 'pt', 'manual', 1.0),
  ('gluten', 'pão', 'pao', 'pt', 'manual', 0.95),
  ('gluten', 'macarrão', 'macarrao', 'pt', 'manual', 0.95),
  ('gluten', 'massa', 'massa', 'pt', 'manual', 0.9),
  ('gluten', 'cevada', 'cevada', 'pt', 'manual', 1.0),
  ('gluten', 'centeio', 'centeio', 'pt', 'manual', 1.0),
  ('gluten', 'malte', 'malte', 'pt', 'manual', 1.0),
  ('gluten', 'cerveja', 'cerveja', 'pt', 'manual', 0.95),
  ('gluten', 'biscoito', 'biscoito', 'pt', 'manual', 0.9),
  ('gluten', 'bolacha', 'bolacha', 'pt', 'manual', 0.9),
  ('gluten', 'bolo', 'bolo', 'pt', 'manual', 0.9),
  ('gluten', 'pizza', 'pizza', 'pt', 'manual', 0.95),
  ('gluten', 'torta', 'torta', 'pt', 'manual', 0.9),
  ('gluten', 'sêmola', 'semola', 'pt', 'manual', 1.0),
  -- Inglês
  ('gluten', 'wheat', 'wheat', 'en', 'manual', 1.0),
  ('gluten', 'bread', 'bread', 'en', 'manual', 0.95),
  ('gluten', 'pasta', 'pasta', 'en', 'manual', 0.95),
  ('gluten', 'barley', 'barley', 'en', 'manual', 1.0),
  ('gluten', 'rye', 'rye', 'en', 'manual', 1.0),
  ('gluten', 'malt', 'malt', 'en', 'manual', 1.0)
ON CONFLICT (intolerance_key, ingredient_normalized, language) DO NOTHING;

-- 3. MAPEAMENTO DE INTOLERÂNCIAS - LACTOSE
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient_name, ingredient_normalized, language, source, confidence)
VALUES 
  -- Português
  ('lactose', 'leite', 'leite', 'pt', 'manual', 1.0),
  ('lactose', 'queijo', 'queijo', 'pt', 'manual', 0.95),
  ('lactose', 'iogurte', 'iogurte', 'pt', 'manual', 0.95),
  ('lactose', 'manteiga', 'manteiga', 'pt', 'manual', 0.9),
  ('lactose', 'creme de leite', 'creme de leite', 'pt', 'manual', 1.0),
  ('lactose', 'requeijão', 'requeijao', 'pt', 'manual', 0.95),
  ('lactose', 'coalhada', 'coalhada', 'pt', 'manual', 0.95),
  ('lactose', 'leite condensado', 'leite condensado', 'pt', 'manual', 1.0),
  ('lactose', 'doce de leite', 'doce de leite', 'pt', 'manual', 1.0),
  ('lactose', 'sorvete', 'sorvete', 'pt', 'manual', 0.9),
  ('lactose', 'chocolate ao leite', 'chocolate ao leite', 'pt', 'manual', 0.9),
  -- Inglês
  ('lactose', 'milk', 'milk', 'en', 'manual', 1.0),
  ('lactose', 'cheese', 'cheese', 'en', 'manual', 0.95),
  ('lactose', 'yogurt', 'yogurt', 'en', 'manual', 0.95),
  ('lactose', 'butter', 'butter', 'en', 'manual', 0.9),
  ('lactose', 'cream', 'cream', 'en', 'manual', 1.0)
ON CONFLICT (intolerance_key, ingredient_normalized, language) DO NOTHING;

-- 4. KEYWORDS SEGURAS (intolerance_safe_keywords)
INSERT INTO public.intolerance_safe_keywords (intolerance_key, keyword, language)
VALUES 
  -- Lactose
  ('lactose', 'sem lactose', 'pt'),
  ('lactose', 'zero lactose', 'pt'),
  ('lactose', 'lactose free', 'en'),
  ('lactose', 'lactose-free', 'en'),
  -- Glúten
  ('gluten', 'sem glúten', 'pt'),
  ('gluten', 'sem gluten', 'pt'),
  ('gluten', 'gluten free', 'en'),
  ('gluten', 'gluten-free', 'en')
ON CONFLICT (intolerance_key, keyword, language) DO NOTHING;

-- 5. INGREDIENTES PROIBIDOS POR DIETA - VEGANO
INSERT INTO public.dietary_forbidden_ingredients (dietary_profile, ingredient_name, ingredient_normalized, category, language)
VALUES 
  -- Carnes
  ('vegan', 'carne', 'carne', 'meat', 'pt'),
  ('vegan', 'frango', 'frango', 'meat', 'pt'),
  ('vegan', 'peixe', 'peixe', 'meat', 'pt'),
  ('vegan', 'porco', 'porco', 'meat', 'pt'),
  ('vegan', 'boi', 'boi', 'meat', 'pt'),
  ('vegan', 'cordeiro', 'cordeiro', 'meat', 'pt'),
  -- Laticínios
  ('vegan', 'leite', 'leite', 'dairy', 'pt'),
  ('vegan', 'queijo', 'queijo', 'dairy', 'pt'),
  ('vegan', 'iogurte', 'iogurte', 'dairy', 'pt'),
  ('vegan', 'manteiga', 'manteiga', 'dairy', 'pt'),
  ('vegan', 'creme de leite', 'creme de leite', 'dairy', 'pt'),
  -- Ovos
  ('vegan', 'ovo', 'ovo', 'eggs', 'pt'),
  ('vegan', 'ovos', 'ovos', 'eggs', 'pt'),
  -- Mel
  ('vegan', 'mel', 'mel', 'honey', 'pt'),
  -- Gelatina
  ('vegan', 'gelatina', 'gelatina', 'gelatin', 'pt'),
  -- Inglês
  ('vegan', 'meat', 'meat', 'meat', 'en'),
  ('vegan', 'chicken', 'chicken', 'meat', 'en'),
  ('vegan', 'fish', 'fish', 'meat', 'en'),
  ('vegan', 'milk', 'milk', 'dairy', 'en'),
  ('vegan', 'cheese', 'cheese', 'dairy', 'en'),
  ('vegan', 'egg', 'egg', 'eggs', 'en'),
  ('vegan', 'honey', 'honey', 'honey', 'en')
ON CONFLICT (dietary_profile, ingredient_normalized, language) DO NOTHING;

-- 6. INGREDIENTES PROIBIDOS POR DIETA - VEGETARIANO
INSERT INTO public.dietary_forbidden_ingredients (dietary_profile, ingredient_name, ingredient_normalized, category, language)
VALUES 
  -- Carnes (mesmas do vegano)
  ('vegetarian', 'carne', 'carne', 'meat', 'pt'),
  ('vegetarian', 'frango', 'frango', 'meat', 'pt'),
  ('vegetarian', 'peixe', 'peixe', 'meat', 'pt'),
  ('vegetarian', 'porco', 'porco', 'meat', 'pt'),
  ('vegetarian', 'boi', 'boi', 'meat', 'pt'),
  ('vegetarian', 'cordeiro', 'cordeiro', 'meat', 'pt'),
  -- Gelatina
  ('vegetarian', 'gelatina', 'gelatina', 'gelatin', 'pt'),
  -- Inglês
  ('vegetarian', 'meat', 'meat', 'meat', 'en'),
  ('vegetarian', 'chicken', 'chicken', 'meat', 'en'),
  ('vegetarian', 'fish', 'fish', 'meat', 'en'),
  ('vegetarian', 'gelatin', 'gelatin', 'gelatin', 'en')
ON CONFLICT (dietary_profile, ingredient_normalized, language) DO NOTHING;

-- 7. INGREDIENTES PROIBIDOS POR DIETA - PESCETARIANO
INSERT INTO public.dietary_forbidden_ingredients (dietary_profile, ingredient_name, ingredient_normalized, category, language)
VALUES 
  -- Carnes (sem peixe)
  ('pescatarian', 'carne', 'carne', 'meat', 'pt'),
  ('pescatarian', 'frango', 'frango', 'meat', 'pt'),
  ('pescatarian', 'porco', 'porco', 'meat', 'pt'),
  ('pescatarian', 'boi', 'boi', 'meat', 'pt'),
  ('pescatarian', 'cordeiro', 'cordeiro', 'meat', 'pt'),
  -- Inglês
  ('pescatarian', 'meat', 'meat', 'meat', 'en'),
  ('pescatarian', 'chicken', 'chicken', 'meat', 'en'),
  ('pescatarian', 'beef', 'beef', 'meat', 'en'),
  ('pescatarian', 'pork', 'pork', 'meat', 'en')
ON CONFLICT (dietary_profile, ingredient_normalized, language) DO NOTHING;

-- NOTA IMPORTANTE:
-- Esta é uma versão BÁSICA com ~100 ingredientes.
-- Para cobertura completa (2.846+ ingredientes do sistema original):
-- 1. Use as edge functions de expansão: expand-intolerance-mappings, expand-all-intolerances
-- 2. Ou importe do sistema original via resgate.js (se tiver acesso)
-- 3. Ou use translate-intolerance-mappings para adicionar mais idiomas
