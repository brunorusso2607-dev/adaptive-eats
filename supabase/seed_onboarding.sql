-- ============================================================
-- SEED: Onboarding Data (Countries, Categories, Options)
-- Baseado nas screenshots do sistema original
-- ============================================================

-- 1. PAÍSES DISPONÍVEIS (Foto 3 mostra 4 países)
INSERT INTO public.onboarding_countries (country_code, country_name, flag_emoji, is_active, sort_order)
VALUES 
  ('BR', 'Brasil', '🇧🇷', true, 1),
  ('PT', 'Portugal', '🇵🇹', false, 2),
  ('US', 'Estados Unidos', '🇺🇸', false, 3),
  ('GB', 'Reino Unido', '🇬🇧', false, 4)
ON CONFLICT (country_code) DO NOTHING;

-- 2. CATEGORIAS DO ONBOARDING (7 abas visíveis na Foto 3)
INSERT INTO public.onboarding_categories (category_key, label, icon_name, description, sort_order, is_active)
VALUES 
  ('regions', 'Regiões', 'globe', 'Selecione sua região', 1, true),
  ('intolerances', 'Intolerâncias', 'alert-triangle', 'Intolerâncias digestivas', 2, true),
  ('allergies', 'Alergias', 'alert-circle', 'Reações alérgicas', 3, true),
  ('sensitivities', 'Sensibilidades', 'activity', 'Sensibilidades metabólicas', 4, true),
  ('dietary_preferences', 'Preferências Alimentares', 'utensils', 'Seu estilo de alimentação', 5, true),
  ('excluded_ingredients', 'Alimentos Excluídos', 'ban', 'Ingredientes que você não come', 6, true),
  ('nutritional_strategies', 'Estratégias Nutricionais', 'target', 'Seu objetivo nutricional', 7, true)
ON CONFLICT (category_key) DO NOTHING;

-- 3. OPÇÕES DE INTOLERÂNCIAS (Foto 3 mostra "5" na aba)
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, icon_name, is_active, sort_order)
VALUES 
  ('intolerances', 'gluten', 'Glúten', 'Trigo, cevada, centeio', '🌾', 'wheat', true, 1),
  ('intolerances', 'lactose', 'Lactose', 'Leite e derivados', '🥛', 'milk', true, 2),
  ('intolerances', 'fodmap', 'FODMAP', 'Carboidratos fermentáveis', '🫘', 'bean', true, 3),
  ('intolerances', 'fructose', 'Frutose', 'Açúcar das frutas', '🍎', 'apple', true, 4),
  ('intolerances', 'histamine', 'Histamina', 'Alimentos fermentados/envelhecidos', '🧪', 'flask', true, 5),
  ('intolerances', 'none', 'Nenhuma', 'Não tenho intolerâncias', '✅', 'check', true, 99)
ON CONFLICT (category, option_id) DO NOTHING;

-- 4. OPÇÕES DE ALERGIAS (Foto 3 mostra "7" na aba)
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, icon_name, is_active, sort_order)
VALUES 
  ('allergies', 'peanut', 'Amendoim', 'Alergia a amendoim', '🥜', 'nut', true, 1),
  ('allergies', 'nuts', 'Oleaginosas', 'Castanhas, nozes, amêndoas', '🌰', 'acorn', true, 2),
  ('allergies', 'seafood', 'Frutos do mar', 'Crustáceos e moluscos', '🦐', 'fish', true, 3),
  ('allergies', 'fish', 'Peixe', 'Todos os tipos de peixe', '🐟', 'fish', true, 4),
  ('allergies', 'eggs', 'Ovos', 'Ovos e derivados', '🥚', 'egg', true, 5),
  ('allergies', 'soy', 'Soja', 'Soja e derivados', '🫘', 'bean', true, 6),
  ('allergies', 'milk', 'Leite', 'Proteína do leite (caseína)', '🥛', 'milk', true, 7),
  ('allergies', 'none', 'Nenhuma', 'Não tenho alergias', '✅', 'check', true, 99)
ON CONFLICT (category, option_id) DO NOTHING;

-- 5. OPÇÕES DE SENSIBILIDADES (Foto 3 mostra "6" na aba)
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, icon_name, is_active, sort_order)
VALUES 
  ('sensitivities', 'sugar', 'Açúcar', 'Sensibilidade ao açúcar', '🍬', 'candy', true, 1),
  ('sensitivities', 'caffeine', 'Cafeína', 'Sensibilidade à cafeína', '☕', 'coffee', true, 2),
  ('sensitivities', 'alcohol', 'Álcool', 'Sensibilidade ao álcool', '🍷', 'wine', true, 3),
  ('sensitivities', 'msg', 'Glutamato Monossódico', 'MSG e realçadores de sabor', '🧂', 'salt', true, 4),
  ('sensitivities', 'sulfites', 'Sulfitos', 'Conservantes em vinhos e alimentos', '🍇', 'grape', true, 5),
  ('sensitivities', 'salicylates', 'Salicilatos', 'Compostos em frutas e vegetais', '🥗', 'salad', true, 6),
  ('sensitivities', 'none', 'Nenhuma', 'Não tenho sensibilidades', '✅', 'check', true, 99)
ON CONFLICT (category, option_id) DO NOTHING;

-- 6. PREFERÊNCIAS ALIMENTARES (Foto 3 mostra "7" na aba)
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, icon_name, is_active, sort_order)
VALUES 
  ('dietary_preferences', 'omnivore', 'Comum', 'Como de tudo sem restrições', '🍽️', 'utensils', true, 1),
  ('dietary_preferences', 'vegetarian', 'Vegetariana', 'Não como carnes', '🥗', 'salad', true, 2),
  ('dietary_preferences', 'vegan', 'Vegana', 'Não como nada de origem animal', '🌱', 'leaf', true, 3),
  ('dietary_preferences', 'pescatarian', 'Pescetariana', 'Como peixes, sem carnes', '🐟', 'fish', true, 4),
  ('dietary_preferences', 'flexitarian', 'Flexitariana', 'Vegetariana com carne ocasional', '🌿', 'leaf', true, 5),
  ('dietary_preferences', 'low_carb', 'Low Carb', 'Reduzo carboidratos', '🥩', 'beef', true, 6),
  ('dietary_preferences', 'keto', 'Cetogênica', 'Baixo carboidrato, alta gordura', '🥑', 'flame', true, 7)
ON CONFLICT (category, option_id) DO NOTHING;

-- 7. ALIMENTOS EXCLUÍDOS (Foto 3 mostra "0" - vazio, mas vou adicionar opções comuns)
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, icon_name, is_active, sort_order)
VALUES 
  ('excluded_ingredients', 'pork', 'Carne de porco', 'Bacon, presunto, linguiça de porco', '🐷', 'ban', true, 1),
  ('excluded_ingredients', 'beef', 'Carne bovina', 'Bife, carne moída, etc.', '🐄', 'ban', true, 2),
  ('excluded_ingredients', 'chicken', 'Frango', 'Frango e outras aves', '🐔', 'ban', true, 3),
  ('excluded_ingredients', 'fish', 'Peixe', 'Todos os tipos de peixe', '🐟', 'ban', true, 4),
  ('excluded_ingredients', 'seafood', 'Frutos do mar', 'Camarão, lula, etc.', '🦐', 'ban', true, 5),
  ('excluded_ingredients', 'liver', 'Fígado', 'Fígado bovino, de frango', '🫀', 'ban', true, 6),
  ('excluded_ingredients', 'offal', 'Miúdos', 'Vísceras (coração, rim, moela)', '🫁', 'ban', true, 7),
  ('excluded_ingredients', 'processed_meats', 'Embutidos', 'Salsicha, mortadela, presunto', '🌭', 'ban', true, 8),
  ('excluded_ingredients', 'cheese', 'Queijos', 'Todos os tipos de queijo', '🧀', 'ban', true, 9),
  ('excluded_ingredients', 'mushrooms', 'Cogumelos', 'Todos os tipos', '🍄', 'ban', true, 10)
ON CONFLICT (category, option_id) DO NOTHING;

-- 8. ESTRATÉGIAS NUTRICIONAIS (Objetivos)
INSERT INTO public.onboarding_options (category, option_id, label, description, emoji, icon_name, is_active, sort_order)
VALUES 
  ('goals', 'lose_weight', 'Emagrecer', 'Perder peso de forma saudável', '⬇️', 'trending-down', true, 1),
  ('goals', 'maintain', 'Manter peso', 'Manter meu peso atual', '⚖️', 'scale', true, 2),
  ('goals', 'gain_weight', 'Ganhar peso', 'Ganhar massa muscular', '⬆️', 'trending-up', true, 3),
  ('goals', 'health', 'Saúde', 'Melhorar minha saúde geral', '❤️', 'heart', true, 4),
  ('goals', 'performance', 'Performance', 'Melhorar desempenho físico', '💪', 'zap', true, 5)
ON CONFLICT (category, option_id) DO NOTHING;
