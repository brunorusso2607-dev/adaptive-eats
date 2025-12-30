-- =======================================================
-- GLOBAL SAFETY ENGINE - ESTRUTURA CENTRALIZADA
-- =======================================================
-- Este migration cria a arquitetura centralizada para validação
-- de intolerâncias, perfis alimentares e ingredientes excluídos.

-- 1. TABELA DE NORMALIZAÇÃO DE KEYS
-- Mapeia keys do onboarding para keys do intolerance_mappings
CREATE TABLE IF NOT EXISTS public.intolerance_key_normalization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onboarding_key TEXT NOT NULL UNIQUE,
  database_key TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.intolerance_key_normalization ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Anyone can view intolerance key normalization" 
  ON public.intolerance_key_normalization 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage intolerance key normalization" 
  ON public.intolerance_key_normalization 
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Popular com mapeamentos (onboarding -> database)
INSERT INTO public.intolerance_key_normalization (onboarding_key, database_key, label) VALUES
  -- Keys que precisam normalização (onboarding ≠ database)
  ('eggs', 'egg', 'Ovos'),
  ('nuts', 'tree_nuts', 'Oleaginosas/Castanhas'),
  ('cafeina', 'caffeine', 'Cafeína'),
  ('sulfito', 'sulfite', 'Sulfito'),
  ('frutose', 'fructose', 'Frutose'),
  ('histamina', 'histamine', 'Histamina'),
  ('salicilato', 'salicylate', 'Salicilato'),
  ('niquel', 'nickel', 'Níquel'),
  ('milho', 'corn', 'Milho'),
  -- Keys que são iguais (para completude)
  ('lactose', 'lactose', 'Lactose'),
  ('gluten', 'gluten', 'Glúten'),
  ('peanut', 'peanut', 'Amendoim'),
  ('seafood', 'seafood', 'Frutos do Mar'),
  ('fish', 'fish', 'Peixe'),
  ('soy', 'soy', 'Soja'),
  ('fodmap', 'fodmap', 'FODMAP'),
  ('sorbitol', 'sorbitol', 'Sorbitol'),
  ('sugar', 'sugar', 'Açúcar'),
  ('none', 'none', 'Nenhuma')
ON CONFLICT (onboarding_key) DO UPDATE SET 
  database_key = EXCLUDED.database_key,
  label = EXCLUDED.label;

-- 2. TABELA DE INGREDIENTES PROIBIDOS POR PERFIL DIETÉTICO
-- Para vegano, vegetariano, pescetariano, etc.
CREATE TABLE IF NOT EXISTS public.dietary_forbidden_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dietary_key TEXT NOT NULL,
  ingredient TEXT NOT NULL,
  language TEXT DEFAULT 'pt' NOT NULL,
  category TEXT, -- 'meat', 'dairy', 'fish', 'eggs', 'honey', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dietary_key, ingredient, language)
);

-- Habilitar RLS
ALTER TABLE public.dietary_forbidden_ingredients ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Anyone can view dietary forbidden ingredients" 
  ON public.dietary_forbidden_ingredients 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage dietary forbidden ingredients" 
  ON public.dietary_forbidden_ingredients 
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Popular com ingredientes proibidos por perfil
-- VEGANO (SEM carnes, peixes, laticínios, ovos, mel)
INSERT INTO public.dietary_forbidden_ingredients (dietary_key, ingredient, language, category) VALUES
  -- Carnes (PT)
  ('vegana', 'carne', 'pt', 'meat'),
  ('vegana', 'frango', 'pt', 'meat'),
  ('vegana', 'galinha', 'pt', 'meat'),
  ('vegana', 'porco', 'pt', 'meat'),
  ('vegana', 'bacon', 'pt', 'meat'),
  ('vegana', 'presunto', 'pt', 'meat'),
  ('vegana', 'linguiça', 'pt', 'meat'),
  ('vegana', 'salsicha', 'pt', 'meat'),
  ('vegana', 'boi', 'pt', 'meat'),
  ('vegana', 'vaca', 'pt', 'meat'),
  ('vegana', 'vitela', 'pt', 'meat'),
  ('vegana', 'cordeiro', 'pt', 'meat'),
  ('vegana', 'carneiro', 'pt', 'meat'),
  ('vegana', 'peru', 'pt', 'meat'),
  ('vegana', 'pato', 'pt', 'meat'),
  ('vegana', 'coelho', 'pt', 'meat'),
  ('vegana', 'javali', 'pt', 'meat'),
  ('vegana', 'costela', 'pt', 'meat'),
  ('vegana', 'picanha', 'pt', 'meat'),
  ('vegana', 'alcatra', 'pt', 'meat'),
  ('vegana', 'patinho', 'pt', 'meat'),
  ('vegana', 'acém', 'pt', 'meat'),
  ('vegana', 'maminha', 'pt', 'meat'),
  ('vegana', 'coxa', 'pt', 'meat'),
  ('vegana', 'sobrecoxa', 'pt', 'meat'),
  ('vegana', 'peito de frango', 'pt', 'meat'),
  ('vegana', 'filé', 'pt', 'meat'),
  ('vegana', 'mortadela', 'pt', 'meat'),
  ('vegana', 'salame', 'pt', 'meat'),
  ('vegana', 'copa', 'pt', 'meat'),
  ('vegana', 'lombo', 'pt', 'meat'),
  ('vegana', 'pernil', 'pt', 'meat'),
  -- Peixes (PT)
  ('vegana', 'peixe', 'pt', 'fish'),
  ('vegana', 'fish', 'pt', 'fish'),
  ('vegana', 'salmão', 'pt', 'fish'),
  ('vegana', 'atum', 'pt', 'fish'),
  ('vegana', 'tilápia', 'pt', 'fish'),
  ('vegana', 'bacalhau', 'pt', 'fish'),
  ('vegana', 'sardinha', 'pt', 'fish'),
  ('vegana', 'pescada', 'pt', 'fish'),
  ('vegana', 'robalo', 'pt', 'fish'),
  ('vegana', 'truta', 'pt', 'fish'),
  ('vegana', 'linguado', 'pt', 'fish'),
  ('vegana', 'anchova', 'pt', 'fish'),
  ('vegana', 'óleo de peixe', 'pt', 'fish'),
  ('vegana', 'fish oil', 'pt', 'fish'),
  ('vegana', 'omega-3 de peixe', 'pt', 'fish'),
  ('vegana', 'omega 3 de peixe', 'pt', 'fish'),
  ('vegana', 'colágeno de peixe', 'pt', 'fish'),
  ('vegana', 'caldo de peixe', 'pt', 'fish'),
  -- Frutos do mar (PT)
  ('vegana', 'camarão', 'pt', 'seafood'),
  ('vegana', 'camarões', 'pt', 'seafood'),
  ('vegana', 'lagosta', 'pt', 'seafood'),
  ('vegana', 'caranguejo', 'pt', 'seafood'),
  ('vegana', 'siri', 'pt', 'seafood'),
  ('vegana', 'lula', 'pt', 'seafood'),
  ('vegana', 'polvo', 'pt', 'seafood'),
  ('vegana', 'ostra', 'pt', 'seafood'),
  ('vegana', 'mexilhão', 'pt', 'seafood'),
  ('vegana', 'vieira', 'pt', 'seafood'),
  ('vegana', 'marisco', 'pt', 'seafood'),
  ('vegana', 'surimi', 'pt', 'seafood'),
  -- Laticínios (PT)
  ('vegana', 'leite', 'pt', 'dairy'),
  ('vegana', 'queijo', 'pt', 'dairy'),
  ('vegana', 'iogurte', 'pt', 'dairy'),
  ('vegana', 'manteiga', 'pt', 'dairy'),
  ('vegana', 'requeijão', 'pt', 'dairy'),
  ('vegana', 'creme de leite', 'pt', 'dairy'),
  ('vegana', 'nata', 'pt', 'dairy'),
  ('vegana', 'mussarela', 'pt', 'dairy'),
  ('vegana', 'parmesão', 'pt', 'dairy'),
  ('vegana', 'ricota', 'pt', 'dairy'),
  ('vegana', 'cottage', 'pt', 'dairy'),
  ('vegana', 'cream cheese', 'pt', 'dairy'),
  ('vegana', 'chantilly', 'pt', 'dairy'),
  ('vegana', 'leite condensado', 'pt', 'dairy'),
  ('vegana', 'doce de leite', 'pt', 'dairy'),
  ('vegana', 'whey', 'pt', 'dairy'),
  ('vegana', 'caseína', 'pt', 'dairy'),
  ('vegana', 'caseinato', 'pt', 'dairy'),
  ('vegana', 'lactoalbumina', 'pt', 'dairy'),
  ('vegana', 'lactoglobulina', 'pt', 'dairy'),
  ('vegana', 'soro de leite', 'pt', 'dairy'),
  -- Ovos (PT)
  ('vegana', 'ovo', 'pt', 'eggs'),
  ('vegana', 'ovos', 'pt', 'eggs'),
  ('vegana', 'gema', 'pt', 'eggs'),
  ('vegana', 'clara', 'pt', 'eggs'),
  ('vegana', 'albumina', 'pt', 'eggs'),
  ('vegana', 'omelete', 'pt', 'eggs'),
  ('vegana', 'fritada', 'pt', 'eggs'),
  -- Mel e derivados (PT)
  ('vegana', 'mel', 'pt', 'honey'),
  ('vegana', 'própolis', 'pt', 'honey'),
  ('vegana', 'geleia real', 'pt', 'honey'),
  ('vegana', 'cera de abelha', 'pt', 'honey'),
  -- Outros animais (PT)
  ('vegana', 'gelatina', 'pt', 'animal'),
  ('vegana', 'colágeno', 'pt', 'animal'),
  ('vegana', 'banha', 'pt', 'animal'),
  ('vegana', 'toucinho', 'pt', 'animal'),
  ('vegana', 'gordura animal', 'pt', 'animal'),
  ('vegana', 'sebo', 'pt', 'animal'),
  ('vegana', 'tutano', 'pt', 'animal'),
  ('vegana', 'caldo de carne', 'pt', 'animal'),
  ('vegana', 'caldo de galinha', 'pt', 'animal'),
  ('vegana', 'extrato de carne', 'pt', 'animal'),
  ('vegana', 'carmim', 'pt', 'animal'),
  ('vegana', 'cochonilha', 'pt', 'animal'),
  ('vegana', 'E120', 'pt', 'animal'),
  ('vegana', 'queratina', 'pt', 'animal'),
  ('vegana', 'lanolina', 'pt', 'animal'),
  ('vegana', 'seda', 'pt', 'animal'),
  ('vegana', 'colágeno marinho', 'pt', 'animal'),
  -- Carnes (EN)
  ('vegana', 'meat', 'en', 'meat'),
  ('vegana', 'chicken', 'en', 'meat'),
  ('vegana', 'pork', 'en', 'meat'),
  ('vegana', 'beef', 'en', 'meat'),
  ('vegana', 'turkey', 'en', 'meat'),
  ('vegana', 'duck', 'en', 'meat'),
  ('vegana', 'ham', 'en', 'meat'),
  ('vegana', 'sausage', 'en', 'meat'),
  ('vegana', 'bacon', 'en', 'meat'),
  ('vegana', 'steak', 'en', 'meat'),
  -- Peixes (EN)
  ('vegana', 'salmon', 'en', 'fish'),
  ('vegana', 'tuna', 'en', 'fish'),
  ('vegana', 'cod', 'en', 'fish'),
  ('vegana', 'sardine', 'en', 'fish'),
  ('vegana', 'anchovy', 'en', 'fish'),
  ('vegana', 'fish oil', 'en', 'fish'),
  ('vegana', 'omega-3 fish', 'en', 'fish'),
  ('vegana', 'fish collagen', 'en', 'fish'),
  ('vegana', 'marine collagen', 'en', 'fish'),
  -- Frutos do mar (EN)
  ('vegana', 'shrimp', 'en', 'seafood'),
  ('vegana', 'lobster', 'en', 'seafood'),
  ('vegana', 'crab', 'en', 'seafood'),
  ('vegana', 'oyster', 'en', 'seafood'),
  ('vegana', 'squid', 'en', 'seafood'),
  ('vegana', 'octopus', 'en', 'seafood'),
  ('vegana', 'mussel', 'en', 'seafood'),
  ('vegana', 'clam', 'en', 'seafood'),
  -- Laticínios (EN)
  ('vegana', 'milk', 'en', 'dairy'),
  ('vegana', 'cheese', 'en', 'dairy'),
  ('vegana', 'yogurt', 'en', 'dairy'),
  ('vegana', 'butter', 'en', 'dairy'),
  ('vegana', 'cream', 'en', 'dairy'),
  ('vegana', 'whey protein', 'en', 'dairy'),
  ('vegana', 'casein', 'en', 'dairy'),
  ('vegana', 'lactalbumin', 'en', 'dairy'),
  -- Ovos (EN)
  ('vegana', 'egg', 'en', 'eggs'),
  ('vegana', 'eggs', 'en', 'eggs'),
  ('vegana', 'yolk', 'en', 'eggs'),
  ('vegana', 'albumin', 'en', 'eggs'),
  ('vegana', 'omelette', 'en', 'eggs'),
  -- Mel (EN)
  ('vegana', 'honey', 'en', 'honey'),
  ('vegana', 'propolis', 'en', 'honey'),
  ('vegana', 'royal jelly', 'en', 'honey'),
  ('vegana', 'beeswax', 'en', 'honey'),
  -- Outros (EN)
  ('vegana', 'gelatin', 'en', 'animal'),
  ('vegana', 'collagen', 'en', 'animal'),
  ('vegana', 'lard', 'en', 'animal'),
  ('vegana', 'tallow', 'en', 'animal'),
  ('vegana', 'bone broth', 'en', 'animal'),
  ('vegana', 'carmine', 'en', 'animal'),
  ('vegana', 'cochineal', 'en', 'animal'),
  ('vegana', 'keratin', 'en', 'animal'),
  ('vegana', 'lanolin', 'en', 'animal'),
  -- ES
  ('vegana', 'carne', 'es', 'meat'),
  ('vegana', 'pollo', 'es', 'meat'),
  ('vegana', 'cerdo', 'es', 'meat'),
  ('vegana', 'res', 'es', 'meat'),
  ('vegana', 'pavo', 'es', 'meat'),
  ('vegana', 'jamón', 'es', 'meat'),
  ('vegana', 'salchicha', 'es', 'meat'),
  ('vegana', 'tocino', 'es', 'meat'),
  ('vegana', 'pescado', 'es', 'fish'),
  ('vegana', 'atún', 'es', 'fish'),
  ('vegana', 'salmón', 'es', 'fish'),
  ('vegana', 'bacalao', 'es', 'fish'),
  ('vegana', 'sardina', 'es', 'fish'),
  ('vegana', 'aceite de pescado', 'es', 'fish'),
  ('vegana', 'camarón', 'es', 'seafood'),
  ('vegana', 'langosta', 'es', 'seafood'),
  ('vegana', 'cangrejo', 'es', 'seafood'),
  ('vegana', 'pulpo', 'es', 'seafood'),
  ('vegana', 'calamar', 'es', 'seafood'),
  ('vegana', 'leche', 'es', 'dairy'),
  ('vegana', 'queso', 'es', 'dairy'),
  ('vegana', 'yogur', 'es', 'dairy'),
  ('vegana', 'mantequilla', 'es', 'dairy'),
  ('vegana', 'crema', 'es', 'dairy'),
  ('vegana', 'huevo', 'es', 'eggs'),
  ('vegana', 'huevos', 'es', 'eggs'),
  ('vegana', 'miel', 'es', 'honey'),
  ('vegana', 'gelatina', 'es', 'animal'),
  ('vegana', 'colágeno', 'es', 'animal')
ON CONFLICT (dietary_key, ingredient, language) DO NOTHING;

-- VEGETARIANO (SEM carnes e peixes, mas COM laticínios, ovos e mel)
INSERT INTO public.dietary_forbidden_ingredients (dietary_key, ingredient, language, category)
SELECT 'vegetariana', ingredient, language, category 
FROM public.dietary_forbidden_ingredients 
WHERE dietary_key = 'vegana' 
  AND category IN ('meat', 'fish', 'seafood')
ON CONFLICT (dietary_key, ingredient, language) DO NOTHING;

-- PESCETARIANO (SEM carnes, mas COM peixes, laticínios, ovos)
INSERT INTO public.dietary_forbidden_ingredients (dietary_key, ingredient, language, category)
SELECT 'pescetariana', ingredient, language, category 
FROM public.dietary_forbidden_ingredients 
WHERE dietary_key = 'vegana' 
  AND category = 'meat'
ON CONFLICT (dietary_key, ingredient, language) DO NOTHING;

-- 3. ADICIONAR INGREDIENTES FALTANTES NO intolerance_mappings
-- Expandir mapeamentos existentes com aliases multilíngues

-- Peixe (fish) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('fish', 'óleo de peixe'),
  ('fish', 'fish oil'),
  ('fish', 'omega-3 de peixe'),
  ('fish', 'omega 3 fish'),
  ('fish', 'colágeno de peixe'),
  ('fish', 'marine collagen'),
  ('fish', 'fish collagen'),
  ('fish', 'caldo de peixe'),
  ('fish', 'fish stock'),
  ('fish', 'anchova'),
  ('fish', 'anchovy'),
  ('fish', 'surimi'),
  ('fish', 'peixe'),
  ('fish', 'salmão'),
  ('fish', 'atum'),
  ('fish', 'tilápia'),
  ('fish', 'bacalhau'),
  ('fish', 'sardinha'),
  ('fish', 'pescada'),
  ('fish', 'truta'),
  ('fish', 'linguado'),
  ('fish', 'robalo'),
  ('fish', 'salmon'),
  ('fish', 'tuna'),
  ('fish', 'cod'),
  ('fish', 'sardine'),
  ('fish', 'tilapia'),
  ('fish', 'trout'),
  ('fish', 'poisson'),
  ('fish', 'saumon'),
  ('fish', 'thon'),
  ('fish', 'morue'),
  ('fish', 'pesce'),
  ('fish', 'salmone'),
  ('fish', 'tonno'),
  ('fish', 'merluzzo'),
  ('fish', 'fisch'),
  ('fish', 'lachs'),
  ('fish', 'thunfisch'),
  ('fish', 'kabeljau'),
  ('fish', 'pescado'),
  ('fish', 'atún'),
  ('fish', 'bacalao')
ON CONFLICT DO NOTHING;

-- Ovos (egg) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('egg', 'ovo'),
  ('egg', 'ovos'),
  ('egg', 'gema'),
  ('egg', 'clara'),
  ('egg', 'clara de ovo'),
  ('egg', 'albumina'),
  ('egg', 'omelete'),
  ('egg', 'fritada'),
  ('egg', 'eggs'),
  ('egg', 'egg yolk'),
  ('egg', 'egg white'),
  ('egg', 'albumin'),
  ('egg', 'omelette'),
  ('egg', 'oeuf'),
  ('egg', 'oeufs'),
  ('egg', 'uovo'),
  ('egg', 'uova'),
  ('egg', 'ei'),
  ('egg', 'eier'),
  ('egg', 'huevo'),
  ('egg', 'huevos'),
  ('egg', 'tortilla española')
ON CONFLICT DO NOTHING;

-- Amendoim (peanut) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('peanut', 'amendoim'),
  ('peanut', 'pasta de amendoim'),
  ('peanut', 'manteiga de amendoim'),
  ('peanut', 'peanut'),
  ('peanut', 'peanut butter'),
  ('peanut', 'cacahuete'),
  ('peanut', 'maní'),
  ('peanut', 'arachide'),
  ('peanut', 'erdnuss'),
  ('peanut', 'erdnussbutter'),
  ('peanut', 'cacahuète')
ON CONFLICT DO NOTHING;

-- Castanhas/oleaginosas (tree_nuts) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('tree_nuts', 'castanha'),
  ('tree_nuts', 'castanha do pará'),
  ('tree_nuts', 'castanha de caju'),
  ('tree_nuts', 'noz'),
  ('tree_nuts', 'nozes'),
  ('tree_nuts', 'amêndoa'),
  ('tree_nuts', 'amêndoas'),
  ('tree_nuts', 'avelã'),
  ('tree_nuts', 'macadâmia'),
  ('tree_nuts', 'pistache'),
  ('tree_nuts', 'pecã'),
  ('tree_nuts', 'nuts'),
  ('tree_nuts', 'almonds'),
  ('tree_nuts', 'walnuts'),
  ('tree_nuts', 'hazelnuts'),
  ('tree_nuts', 'cashews'),
  ('tree_nuts', 'pistachios'),
  ('tree_nuts', 'macadamia'),
  ('tree_nuts', 'pecans'),
  ('tree_nuts', 'brazil nuts'),
  ('tree_nuts', 'noix'),
  ('tree_nuts', 'amande'),
  ('tree_nuts', 'noisette'),
  ('tree_nuts', 'noce'),
  ('tree_nuts', 'mandorla'),
  ('tree_nuts', 'nocciola'),
  ('tree_nuts', 'nuss'),
  ('tree_nuts', 'mandel'),
  ('tree_nuts', 'haselnuss'),
  ('tree_nuts', 'nuez'),
  ('tree_nuts', 'almendra'),
  ('tree_nuts', 'avellana')
ON CONFLICT DO NOTHING;

-- Cafeína (caffeine) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('caffeine', 'café'),
  ('caffeine', 'coffee'),
  ('caffeine', 'chá preto'),
  ('caffeine', 'chá verde'),
  ('caffeine', 'chá mate'),
  ('caffeine', 'black tea'),
  ('caffeine', 'green tea'),
  ('caffeine', 'guaraná'),
  ('caffeine', 'chocolate'),
  ('caffeine', 'cacau'),
  ('caffeine', 'cocoa'),
  ('caffeine', 'espresso'),
  ('caffeine', 'cappuccino'),
  ('caffeine', 'latte'),
  ('caffeine', 'energético'),
  ('caffeine', 'energy drink'),
  ('caffeine', 'red bull'),
  ('caffeine', 'monster'),
  ('caffeine', 'kaffee'),
  ('caffeine', 'schokolade'),
  ('caffeine', 'té negro'),
  ('caffeine', 'té verde'),
  ('caffeine', 'thé noir'),
  ('caffeine', 'thé vert')
ON CONFLICT DO NOTHING;

-- Frutose (fructose) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('fructose', 'xarope de milho'),
  ('fructose', 'high fructose corn syrup'),
  ('fructose', 'hfcs'),
  ('fructose', 'xarope de agave'),
  ('fructose', 'agave'),
  ('fructose', 'mel'),
  ('fructose', 'honey'),
  ('fructose', 'maçã'),
  ('fructose', 'apple'),
  ('fructose', 'pera'),
  ('fructose', 'pear'),
  ('fructose', 'manga'),
  ('fructose', 'mango'),
  ('fructose', 'melancia'),
  ('fructose', 'watermelon'),
  ('fructose', 'uva'),
  ('fructose', 'grape'),
  ('fructose', 'frutose')
ON CONFLICT DO NOTHING;

-- Histamina (histamine) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('histamine', 'queijo curado'),
  ('histamine', 'aged cheese'),
  ('histamine', 'vinho'),
  ('histamine', 'wine'),
  ('histamine', 'cerveja'),
  ('histamine', 'beer'),
  ('histamine', 'embutidos'),
  ('histamine', 'cured meats'),
  ('histamine', 'fermentados'),
  ('histamine', 'fermented'),
  ('histamine', 'vinagre'),
  ('histamine', 'vinegar'),
  ('histamine', 'molho de soja'),
  ('histamine', 'soy sauce'),
  ('histamine', 'tomate'),
  ('histamine', 'tomato'),
  ('histamine', 'espinafre'),
  ('histamine', 'spinach'),
  ('histamine', 'berinjela'),
  ('histamine', 'eggplant'),
  ('histamine', 'abacate'),
  ('histamine', 'avocado'),
  ('histamine', 'chocolate'),
  ('histamine', 'peixe enlatado'),
  ('histamine', 'canned fish'),
  ('histamine', 'sardinha enlatada'),
  ('histamine', 'atum enlatado')
ON CONFLICT DO NOTHING;

-- Salicilato (salicylate) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('salicylate', 'tomate'),
  ('salicylate', 'tomato'),
  ('salicylate', 'pimentão'),
  ('salicylate', 'pepper'),
  ('salicylate', 'berinjela'),
  ('salicylate', 'eggplant'),
  ('salicylate', 'curry'),
  ('salicylate', 'hortelã'),
  ('salicylate', 'mint'),
  ('salicylate', 'pepino'),
  ('salicylate', 'cucumber'),
  ('salicylate', 'mel'),
  ('salicylate', 'honey'),
  ('salicylate', 'amêndoa'),
  ('salicylate', 'almond'),
  ('salicylate', 'azeite'),
  ('salicylate', 'olive oil'),
  ('salicylate', 'vinho'),
  ('salicylate', 'wine'),
  ('salicylate', 'chá'),
  ('salicylate', 'tea'),
  ('salicylate', 'café'),
  ('salicylate', 'coffee'),
  ('salicylate', 'frutas cítricas'),
  ('salicylate', 'citrus'),
  ('salicylate', 'laranja'),
  ('salicylate', 'orange'),
  ('salicylate', 'limão'),
  ('salicylate', 'lemon')
ON CONFLICT DO NOTHING;

-- Níquel (nickel) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('nickel', 'chocolate'),
  ('nickel', 'cacau'),
  ('nickel', 'cocoa'),
  ('nickel', 'aveia'),
  ('nickel', 'oats'),
  ('nickel', 'lentilha'),
  ('nickel', 'lentils'),
  ('nickel', 'soja'),
  ('nickel', 'soy'),
  ('nickel', 'grão de bico'),
  ('nickel', 'chickpeas'),
  ('nickel', 'feijão'),
  ('nickel', 'beans'),
  ('nickel', 'nozes'),
  ('nickel', 'nuts'),
  ('nickel', 'amêndoas'),
  ('nickel', 'almonds'),
  ('nickel', 'tomate'),
  ('nickel', 'tomato'),
  ('nickel', 'espinafre'),
  ('nickel', 'spinach'),
  ('nickel', 'brócolis'),
  ('nickel', 'broccoli'),
  ('nickel', 'trigo integral'),
  ('nickel', 'whole wheat'),
  ('nickel', 'centeio'),
  ('nickel', 'rye')
ON CONFLICT DO NOTHING;

-- Milho (corn) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('corn', 'milho'),
  ('corn', 'corn'),
  ('corn', 'maize'),
  ('corn', 'fubá'),
  ('corn', 'cornmeal'),
  ('corn', 'polenta'),
  ('corn', 'pipoca'),
  ('corn', 'popcorn'),
  ('corn', 'xarope de milho'),
  ('corn', 'corn syrup'),
  ('corn', 'amido de milho'),
  ('corn', 'corn starch'),
  ('corn', 'óleo de milho'),
  ('corn', 'corn oil'),
  ('corn', 'maltodextrina'),
  ('corn', 'maltodextrin'),
  ('corn', 'dextrose'),
  ('corn', 'maíz'),
  ('corn', 'palomitas'),
  ('corn', 'harina de maíz')
ON CONFLICT DO NOTHING;

-- Sulfito (sulfite) - expandir
INSERT INTO public.intolerance_mappings (intolerance_key, ingredient) VALUES
  ('sulfite', 'vinho'),
  ('sulfite', 'wine'),
  ('sulfite', 'vinagre'),
  ('sulfite', 'vinegar'),
  ('sulfite', 'frutas secas'),
  ('sulfite', 'dried fruits'),
  ('sulfite', 'conservas'),
  ('sulfite', 'pickles'),
  ('sulfite', 'mostarda'),
  ('sulfite', 'mustard'),
  ('sulfite', 'molho de soja'),
  ('sulfite', 'soy sauce'),
  ('sulfite', 'sucos industrializados'),
  ('sulfite', 'processed juices'),
  ('sulfite', 'cerveja'),
  ('sulfite', 'beer'),
  ('sulfite', 'sidra'),
  ('sulfite', 'cider'),
  ('sulfite', 'camarão congelado'),
  ('sulfite', 'frozen shrimp'),
  ('sulfite', 'batata pré-cozida'),
  ('sulfite', 'pre-cooked potato')
ON CONFLICT DO NOTHING;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_dietary_forbidden_dietary_key ON public.dietary_forbidden_ingredients(dietary_key);
CREATE INDEX IF NOT EXISTS idx_dietary_forbidden_ingredient ON public.dietary_forbidden_ingredients(ingredient);
CREATE INDEX IF NOT EXISTS idx_dietary_forbidden_language ON public.dietary_forbidden_ingredients(language);
CREATE INDEX IF NOT EXISTS idx_intolerance_normalization_onboarding ON public.intolerance_key_normalization(onboarding_key);
CREATE INDEX IF NOT EXISTS idx_intolerance_normalization_database ON public.intolerance_key_normalization(database_key);