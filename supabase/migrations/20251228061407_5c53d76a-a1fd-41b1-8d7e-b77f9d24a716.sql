-- Adicionar coluna portion_label para medidas caseiras
ALTER TABLE public.nutritionist_foods 
ADD COLUMN IF NOT EXISTS portion_label text;

-- Adicionar coluna component_type para identificar o tipo de componente na composição
ALTER TABLE public.nutritionist_foods 
ADD COLUMN IF NOT EXISTS component_type text;

-- Limpar dados existentes para reinserir com formato correto
DELETE FROM public.nutritionist_foods;

-- ============================================
-- CAFÉ DA MANHÃ - Componentes
-- ============================================

-- Bebidas (component_type: 'beverage')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('café', 'beverage', 'beverage', '1 xícara', 2, 0.1, 0.4, 0, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 150),
  ('café com leite', 'beverage', 'beverage', '1 xícara', 45, 3, 5, 1.5, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana'], 200),
  ('chá', 'beverage', 'beverage', '1 xícara', 1, 0, 0.2, 0, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 200);

-- Carboidratos café (component_type: 'breakfast_carb')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('pão integral', 'carb', 'breakfast_carb', '1 fatia', 247, 9, 41, 4, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana'], 30),
  ('cuscuz', 'carb', 'breakfast_carb', '3 colheres de sopa', 112, 4, 23, 0.2, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana'], 100),
  ('mandioca cozida', 'carb', 'breakfast_carb', '2 colheres de sopa', 125, 1, 30, 0.1, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana'], 80),
  ('bolo caseiro', 'carb', 'breakfast_carb', '1 fatia', 300, 5, 50, 10, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana'], 60),
  ('tapioca', 'carb', 'breakfast_carb', '1 unidade', 130, 0.5, 32, 0.1, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana'], 50);

-- Proteínas café (component_type: 'breakfast_protein')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('ovo mexido no azeite', 'protein', 'breakfast_protein', '1 ovo', 155, 13, 1, 11, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'low_carb'], 50),
  ('queijo minas', 'protein', 'breakfast_protein', '1 fatia', 264, 17, 3, 20, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'low_carb'], 30),
  ('queijo cottage', 'protein', 'breakfast_protein', '2 colheres de sopa', 98, 11, 3, 4, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'low_carb'], 50),
  ('ricota', 'protein', 'breakfast_protein', '1 fatia', 174, 11, 4, 13, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'low_carb'], 40);

-- Frutas café (component_type: 'breakfast_fruit')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('mamão', 'fruit', 'breakfast_fruit', '1 fatia', 40, 0.5, 10, 0.1, ARRAY['cafe_manha', 'lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana'], 100),
  ('maçã', 'fruit', 'breakfast_fruit', '1 unidade', 52, 0.3, 14, 0.2, ARRAY['cafe_manha', 'lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana'], 150),
  ('banana', 'fruit', 'breakfast_fruit', '1 unidade', 89, 1, 23, 0.3, ARRAY['cafe_manha', 'lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana'], 100),
  ('uvas', 'fruit', 'breakfast_fruit', '8 unidades', 69, 0.7, 18, 0.2, ARRAY['cafe_manha', 'lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana'], 80);

-- Complementos café (component_type: 'breakfast_complement')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('aveia', 'grain', 'breakfast_complement', '1 colher de sopa', 389, 17, 66, 7, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana'], 15),
  ('linhaça', 'grain', 'breakfast_complement', '1 colher de sopa', 534, 18, 29, 42, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 10),
  ('chia', 'grain', 'breakfast_complement', '1 colher de sopa', 486, 17, 42, 31, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 10),
  ('granola sem açúcar', 'grain', 'breakfast_complement', '2 colheres de sopa', 450, 10, 60, 18, ARRAY['cafe_manha'], ARRAY['comum', 'vegetariana', 'vegana'], 30);

-- ============================================
-- ALMOÇO/JANTAR - Componentes
-- ============================================

-- Proteínas principais (component_type: 'main_protein')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('filé de peito de frango com açafrão', 'protein', 'main_protein', '1 filé', 165, 31, 0, 4, ARRAY['almoco', 'jantar'], ARRAY['comum', 'low_carb'], 120),
  ('isca de carne acebolada', 'protein', 'main_protein', '1 porção', 250, 26, 2, 15, ARRAY['almoco', 'jantar'], ARRAY['comum', 'low_carb'], 120),
  ('peixe grelhado', 'protein', 'main_protein', '1 filé', 120, 24, 0, 2, ARRAY['almoco', 'jantar'], ARRAY['comum', 'pescetariana', 'low_carb'], 120),
  ('frango assado ao molho de laranjas', 'protein', 'main_protein', '1 porção', 195, 28, 5, 7, ARRAY['almoco', 'jantar'], ARRAY['comum'], 130),
  ('bife a rolê', 'protein', 'main_protein', '1 unidade', 280, 24, 3, 19, ARRAY['almoco', 'jantar'], ARRAY['comum', 'low_carb'], 120),
  ('carne moída com ervilhas', 'protein', 'main_protein', '1 porção', 220, 22, 8, 12, ARRAY['almoco', 'jantar'], ARRAY['comum'], 130),
  ('peixe cozido com legumes', 'protein', 'main_protein', '1 porção', 150, 22, 5, 4, ARRAY['almoco', 'jantar'], ARRAY['comum', 'pescetariana'], 150);

-- Arroz (component_type: 'rice')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('arroz branco', 'carb', 'rice', '3 colheres de sopa rasas', 130, 2.5, 28, 0.3, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana'], 90),
  ('arroz integral', 'carb', 'rice', '3 colheres de sopa rasas', 111, 2.6, 23, 0.9, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana'], 90);

-- Feijão (component_type: 'beans')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('feijão carioca', 'legume', 'beans', '1 concha rasa', 77, 5, 14, 0.5, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana'], 80),
  ('feijão preto', 'legume', 'beans', '1 concha rasa', 77, 5, 14, 0.5, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana'], 80);

-- Legumes/Saladas (component_type: 'vegetable')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('brócolis e cenoura cozidos', 'vegetable', 'vegetable', '1 porção', 35, 2, 7, 0.3, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 80),
  ('abóbora e couve refogadas', 'vegetable', 'vegetable', '1 porção', 40, 1, 8, 1, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 80),
  ('couve-flor e abobrinha', 'vegetable', 'vegetable', '1 porção', 28, 2, 5, 0.2, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 80),
  ('ervilhas e berinjela', 'vegetable', 'vegetable', '1 porção', 55, 3, 10, 0.3, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana'], 80),
  ('quibebe de abóbora', 'vegetable', 'vegetable', '1 porção', 45, 1, 9, 1, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 80),
  ('saladinha de tomate', 'vegetable', 'vegetable', '1 porção', 18, 1, 4, 0.2, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 80),
  ('salada crua', 'vegetable', 'vegetable', '1 porção', 20, 1, 4, 0.2, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 80),
  ('alface', 'vegetable', 'vegetable', '1 porção', 15, 1, 3, 0.2, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 60),
  ('quiabo refogado', 'vegetable', 'vegetable', '1 porção', 33, 2, 7, 0.2, ARRAY['almoco', 'jantar'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 80);

-- ============================================
-- LANCHE - Componentes
-- ============================================

-- Lanches principais (component_type: 'snack_main')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('1 fruta', 'fruit', 'snack_main', '1 unidade', 50, 0.5, 12, 0.2, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana'], 120),
  ('vitamina de frutas com aveia', 'snack', 'snack_main', '1 copo', 150, 5, 25, 3, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana'], 250),
  ('bolo caseiro de banana', 'snack', 'snack_main', '1 fatia', 280, 4, 45, 10, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana'], 60),
  ('iogurte natural com frutas', 'snack', 'snack_main', '1 pote', 100, 5, 15, 2, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana'], 170),
  ('pão de queijo', 'snack', 'snack_main', '2 unidades', 350, 6, 40, 18, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana'], 50),
  ('biscoito de aveia com geleia', 'snack', 'snack_main', '3 unidades', 420, 8, 65, 14, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana'], 40),
  ('salada de frutas', 'fruit', 'snack_main', '1 porção', 55, 0.6, 14, 0.2, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana'], 150);

-- Complementos lanche (component_type: 'snack_complement')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('castanhas do Pará', 'nuts', 'snack_complement', '2 unidades', 656, 14, 12, 66, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 8),
  ('castanhas picadas', 'nuts', 'snack_complement', '1 colher de sopa', 600, 15, 15, 50, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 15),
  ('chá de capim santo', 'beverage', 'snack_complement', '1 xícara', 1, 0, 0.2, 0, ARRAY['lanche_tarde'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 200);

-- ============================================
-- JANTAR LEVE - Componentes
-- ============================================

-- Jantares leves (component_type: 'light_dinner')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('canja de galinha', 'soup', 'light_dinner', '1 prato', 70, 5, 8, 2, ARRAY['jantar'], ARRAY['comum'], 300),
  ('sanduíche natural de isca de carne', 'sandwich', 'light_dinner', '1 unidade', 200, 15, 20, 8, ARRAY['jantar'], ARRAY['comum'], 150),
  ('sopa de legumes com mandioca', 'soup', 'light_dinner', '1 prato', 80, 3, 15, 1, ARRAY['jantar'], ARRAY['comum', 'vegetariana', 'vegana'], 300),
  ('torta salgada de frango com legumes', 'pie', 'light_dinner', '1 fatia', 180, 12, 18, 8, ARRAY['jantar'], ARRAY['comum'], 120),
  ('omelete de forno', 'egg', 'light_dinner', '1 porção', 150, 12, 3, 10, ARRAY['jantar'], ARRAY['comum', 'vegetariana', 'low_carb'], 150),
  ('crepioca com recheio de carne moída e queijo', 'crepe', 'light_dinner', '1 unidade', 200, 15, 15, 10, ARRAY['jantar'], ARRAY['comum'], 150),
  ('hambúrguer caseiro com salada', 'burger', 'light_dinner', '1 unidade', 250, 18, 15, 14, ARRAY['jantar'], ARRAY['comum'], 180);

-- ============================================
-- CEIA - Componentes
-- ============================================

-- Ceias leves (component_type: 'supper')
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, compatible_meals, dietary_tags, default_portion_grams)
VALUES 
  ('chá de camomila', 'beverage', 'supper', '1 xícara', 1, 0, 0.2, 0, ARRAY['ceia'], ARRAY['comum', 'vegetariana', 'vegana', 'low_carb'], 200),
  ('leite morno', 'beverage', 'supper', '1 copo', 60, 3, 5, 3, ARRAY['ceia'], ARRAY['comum', 'vegetariana'], 200),
  ('iogurte natural', 'dairy', 'supper', '1 pote', 60, 4, 5, 3, ARRAY['ceia'], ARRAY['comum', 'vegetariana'], 170),
  ('banana com canela', 'fruit', 'supper', '1 unidade', 89, 1, 23, 0.3, ARRAY['ceia'], ARRAY['comum', 'vegetariana', 'vegana'], 100);

-- Atualizar timestamp
UPDATE public.nutritionist_foods SET updated_at = now();