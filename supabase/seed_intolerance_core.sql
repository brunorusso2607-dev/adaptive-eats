-- ============================================================
-- SEED: Mapeamentos de Intolerâncias - VERSÃO CURADA MANUAL
-- SEM IA - Apenas ingredientes validados e essenciais
-- ============================================================

-- GLÚTEN (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('gluten', 'trigo', 'pt', 'high'),
('gluten', 'farinha de trigo', 'pt', 'high'),
('gluten', 'pão', 'pt', 'high'),
('gluten', 'pão francês', 'pt', 'high'),
('gluten', 'pão integral', 'pt', 'high'),
('gluten', 'pão de forma', 'pt', 'high'),
('gluten', 'macarrão', 'pt', 'high'),
('gluten', 'massa', 'pt', 'high'),
('gluten', 'espaguete', 'pt', 'high'),
('gluten', 'talharim', 'pt', 'high'),
('gluten', 'lasanha', 'pt', 'high'),
('gluten', 'pizza', 'pt', 'high'),
('gluten', 'cevada', 'pt', 'high'),
('gluten', 'centeio', 'pt', 'high'),
('gluten', 'malte', 'pt', 'high'),
('gluten', 'cerveja', 'pt', 'high'),
('gluten', 'biscoito', 'pt', 'medium'),
('gluten', 'bolacha', 'pt', 'medium'),
('gluten', 'bolo', 'pt', 'medium'),
('gluten', 'torta', 'pt', 'medium'),
('gluten', 'sêmola', 'pt', 'high'),
('gluten', 'cuscuz marroquino', 'pt', 'high'),
('gluten', 'seitan', 'pt', 'high'),
('gluten', 'molho de soja', 'pt', 'medium'),
('gluten', 'shoyu', 'pt', 'medium')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- GLÚTEN (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('gluten', 'wheat', 'en', 'high'),
('gluten', 'wheat flour', 'en', 'high'),
('gluten', 'bread', 'en', 'high'),
('gluten', 'pasta', 'en', 'high'),
('gluten', 'noodles', 'en', 'high'),
('gluten', 'barley', 'en', 'high'),
('gluten', 'rye', 'en', 'high'),
('gluten', 'malt', 'en', 'high'),
('gluten', 'beer', 'en', 'high'),
('gluten', 'cookie', 'en', 'medium'),
('gluten', 'cake', 'en', 'medium'),
('gluten', 'pizza', 'en', 'high'),
('gluten', 'seitan', 'en', 'high'),
('gluten', 'soy sauce', 'en', 'medium')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- LACTOSE (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('lactose', 'leite', 'pt', 'high'),
('lactose', 'leite integral', 'pt', 'high'),
('lactose', 'leite desnatado', 'pt', 'high'),
('lactose', 'leite condensado', 'pt', 'high'),
('lactose', 'leite em pó', 'pt', 'high'),
('lactose', 'queijo', 'pt', 'high'),
('lactose', 'queijo minas', 'pt', 'high'),
('lactose', 'queijo prato', 'pt', 'high'),
('lactose', 'queijo mussarela', 'pt', 'high'),
('lactose', 'queijo parmesão', 'pt', 'medium'),
('lactose', 'queijo coalho', 'pt', 'high'),
('lactose', 'iogurte', 'pt', 'high'),
('lactose', 'manteiga', 'pt', 'medium'),
('lactose', 'creme de leite', 'pt', 'high'),
('lactose', 'nata', 'pt', 'high'),
('lactose', 'requeijão', 'pt', 'high'),
('lactose', 'ricota', 'pt', 'medium'),
('lactose', 'sorvete', 'pt', 'medium'),
('lactose', 'chocolate ao leite', 'pt', 'medium'),
('lactose', 'doce de leite', 'pt', 'high'),
('lactose', 'coalhada', 'pt', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- LACTOSE (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('lactose', 'milk', 'en', 'high'),
('lactose', 'whole milk', 'en', 'high'),
('lactose', 'skim milk', 'en', 'high'),
('lactose', 'condensed milk', 'en', 'high'),
('lactose', 'cheese', 'en', 'high'),
('lactose', 'cheddar', 'en', 'high'),
('lactose', 'mozzarella', 'en', 'high'),
('lactose', 'parmesan', 'en', 'medium'),
('lactose', 'yogurt', 'en', 'high'),
('lactose', 'butter', 'en', 'medium'),
('lactose', 'cream', 'en', 'high'),
('lactose', 'ice cream', 'en', 'medium'),
('lactose', 'whey', 'en', 'high'),
('lactose', 'casein', 'en', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- OVOS (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('eggs', 'ovo', 'pt', 'high'),
('eggs', 'ovos', 'pt', 'high'),
('eggs', 'clara', 'pt', 'high'),
('eggs', 'clara de ovo', 'pt', 'high'),
('eggs', 'gema', 'pt', 'high'),
('eggs', 'gema de ovo', 'pt', 'high'),
('eggs', 'maionese', 'pt', 'high'),
('eggs', 'ovo cozido', 'pt', 'high'),
('eggs', 'ovo frito', 'pt', 'high'),
('eggs', 'ovo mexido', 'pt', 'high'),
('eggs', 'omelete', 'pt', 'high'),
('eggs', 'gemada', 'pt', 'high'),
('eggs', 'merengue', 'pt', 'high'),
('eggs', 'quindim', 'pt', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- OVOS (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('eggs', 'egg', 'en', 'high'),
('eggs', 'eggs', 'en', 'high'),
('eggs', 'egg white', 'en', 'high'),
('eggs', 'egg yolk', 'en', 'high'),
('eggs', 'mayonnaise', 'en', 'high'),
('eggs', 'albumin', 'en', 'high'),
('eggs', 'meringue', 'en', 'high'),
('eggs', 'omelet', 'en', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- SOJA (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('soy', 'soja', 'pt', 'high'),
('soy', 'leite de soja', 'pt', 'high'),
('soy', 'tofu', 'pt', 'high'),
('soy', 'molho de soja', 'pt', 'high'),
('soy', 'shoyu', 'pt', 'high'),
('soy', 'tempeh', 'pt', 'high'),
('soy', 'missô', 'pt', 'high'),
('soy', 'edamame', 'pt', 'high'),
('soy', 'proteína de soja', 'pt', 'high'),
('soy', 'óleo de soja', 'pt', 'low'),
('soy', 'lecitina de soja', 'pt', 'low')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- SOJA (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('soy', 'soy', 'en', 'high'),
('soy', 'soya', 'en', 'high'),
('soy', 'soy milk', 'en', 'high'),
('soy', 'tofu', 'en', 'high'),
('soy', 'soy sauce', 'en', 'high'),
('soy', 'tempeh', 'en', 'high'),
('soy', 'miso', 'en', 'high'),
('soy', 'edamame', 'en', 'high'),
('soy', 'soy protein', 'en', 'high'),
('soy', 'soy oil', 'en', 'low'),
('soy', 'soy lecithin', 'en', 'low')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- AMENDOIM (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('peanut', 'amendoim', 'pt', 'high'),
('peanut', 'pasta de amendoim', 'pt', 'high'),
('peanut', 'manteiga de amendoim', 'pt', 'high'),
('peanut', 'paçoca', 'pt', 'high'),
('peanut', 'pé de moleque', 'pt', 'high'),
('peanut', 'óleo de amendoim', 'pt', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- AMENDOIM (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('peanut', 'peanut', 'en', 'high'),
('peanut', 'peanut butter', 'en', 'high'),
('peanut', 'peanut oil', 'en', 'high'),
('peanut', 'groundnut', 'en', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- OLEAGINOSAS (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('tree_nuts', 'castanha', 'pt', 'high'),
('tree_nuts', 'castanha de caju', 'pt', 'high'),
('tree_nuts', 'castanha do pará', 'pt', 'high'),
('tree_nuts', 'nozes', 'pt', 'high'),
('tree_nuts', 'amêndoa', 'pt', 'high'),
('tree_nuts', 'avelã', 'pt', 'high'),
('tree_nuts', 'macadâmia', 'pt', 'high'),
('tree_nuts', 'pistache', 'pt', 'high'),
('tree_nuts', 'noz-pecã', 'pt', 'high'),
('tree_nuts', 'pinhão', 'pt', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- OLEAGINOSAS (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('tree_nuts', 'almond', 'en', 'high'),
('tree_nuts', 'walnut', 'en', 'high'),
('tree_nuts', 'cashew', 'en', 'high'),
('tree_nuts', 'hazelnut', 'en', 'high'),
('tree_nuts', 'macadamia', 'en', 'high'),
('tree_nuts', 'pistachio', 'en', 'high'),
('tree_nuts', 'pecan', 'en', 'high'),
('tree_nuts', 'brazil nut', 'en', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- PEIXE (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('fish', 'peixe', 'pt', 'high'),
('fish', 'salmão', 'pt', 'high'),
('fish', 'atum', 'pt', 'high'),
('fish', 'bacalhau', 'pt', 'high'),
('fish', 'sardinha', 'pt', 'high'),
('fish', 'tilápia', 'pt', 'high'),
('fish', 'truta', 'pt', 'high'),
('fish', 'anchova', 'pt', 'high'),
('fish', 'molho de peixe', 'pt', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- PEIXE (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('fish', 'fish', 'en', 'high'),
('fish', 'salmon', 'en', 'high'),
('fish', 'tuna', 'en', 'high'),
('fish', 'cod', 'en', 'high'),
('fish', 'sardine', 'en', 'high'),
('fish', 'tilapia', 'en', 'high'),
('fish', 'trout', 'en', 'high'),
('fish', 'anchovy', 'en', 'high'),
('fish', 'fish sauce', 'en', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- FRUTOS DO MAR (Português)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('shellfish', 'camarão', 'pt', 'high'),
('shellfish', 'lagosta', 'pt', 'high'),
('shellfish', 'caranguejo', 'pt', 'high'),
('shellfish', 'siri', 'pt', 'high'),
('shellfish', 'lula', 'pt', 'high'),
('shellfish', 'polvo', 'pt', 'high'),
('shellfish', 'mexilhão', 'pt', 'high'),
('shellfish', 'ostra', 'pt', 'high'),
('shellfish', 'vieira', 'pt', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- FRUTOS DO MAR (Inglês)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, language, severity_level) VALUES
('shellfish', 'shrimp', 'en', 'high'),
('shellfish', 'prawn', 'en', 'high'),
('shellfish', 'lobster', 'en', 'high'),
('shellfish', 'crab', 'en', 'high'),
('shellfish', 'squid', 'en', 'high'),
('shellfish', 'octopus', 'en', 'high'),
('shellfish', 'mussel', 'en', 'high'),
('shellfish', 'oyster', 'en', 'high'),
('shellfish', 'scallop', 'en', 'high'),
('shellfish', 'clam', 'en', 'high')
ON CONFLICT (intolerance_key, ingredient, language) DO NOTHING;

-- Total: ~200 ingredientes validados manualmente
-- Cobertura: 8 intolerâncias principais × 2 idiomas
