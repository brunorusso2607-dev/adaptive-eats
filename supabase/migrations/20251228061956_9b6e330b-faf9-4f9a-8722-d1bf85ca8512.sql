-- Atualizar dietary_tags para incluir tags de intolerância onde apropriado
-- Alimentos naturalmente sem glúten
UPDATE public.nutritionist_foods SET dietary_tags = array_append(dietary_tags, 'sem_gluten')
WHERE name IN ('café', 'chá', 'mandioca cozida', 'tapioca', 'ovo mexido no azeite', 
'queijo minas', 'queijo cottage', 'ricota', 'mamão', 'maçã', 'banana', 'uvas', 'linhaça', 'chia',
'arroz integral', 'arroz branco', 'feijão carioca', 'feijão preto', 'frango grelhado',
'carne bovina grelhada', 'peixe grelhado', 'atum', 'brócolis', 'abobrinha', 'cenoura', 
'alface e tomate', 'suco de laranja', 'água de coco', 'frutas picadas', 'castanhas', 'amêndoas',
'pasta de amendoim', 'queijo cottage light', 'frutas', 'pera', 'abacate',
'patinho grelhado', 'tilápia', 'sardinha')
AND NOT 'sem_gluten' = ANY(dietary_tags);

-- Alimentos naturalmente sem lactose
UPDATE public.nutritionist_foods SET dietary_tags = array_append(dietary_tags, 'sem_lactose')
WHERE name IN ('café', 'chá', 'pão integral', 'cuscuz', 'mandioca cozida', 'tapioca',
'ovo mexido no azeite', 'mamão', 'maçã', 'banana', 'uvas', 'aveia', 'linhaça', 'chia',
'arroz integral', 'arroz branco', 'feijão carioca', 'feijão preto', 'frango grelhado',
'carne bovina grelhada', 'peixe grelhado', 'atum', 'brócolis', 'abobrinha', 'cenoura', 
'alface e tomate', 'suco de laranja', 'água de coco', 'frutas picadas', 'castanhas', 'amêndoas',
'pasta de amendoim', 'frutas', 'pera', 'abacate',
'patinho grelhado', 'tilápia', 'sardinha', 'bolo caseiro')
AND NOT 'sem_lactose' = ANY(dietary_tags);

-- Adicionar opções sem glúten e sem lactose para proteínas do café da manhã
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_portion_grams, compatible_meals, dietary_tags)
VALUES 
('tofu mexido', 'proteínas', 'breakfast_protein', '100g', 76, 8, 1.9, 4.8, 100, ARRAY['cafe_manha'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose', 'low_carb']),
('pasta de grão de bico', 'proteínas', 'breakfast_protein', '2 colheres de sopa', 166, 8, 14, 9, 30, ARRAY['cafe_manha', 'lanche_tarde'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']);

-- Adicionar bebidas alternativas
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_portion_grams, compatible_meals, dietary_tags)
VALUES 
('café com leite vegetal', 'bebidas', 'beverage', '1 xícara', 30, 1, 3, 1.5, 200, ARRAY['cafe_manha'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']),
('chá com mel', 'bebidas', 'beverage', '1 xícara', 25, 0, 6, 0, 200, ARRAY['cafe_manha', 'ceia'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']);

-- Adicionar snacks alternativos
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_portion_grams, compatible_meals, dietary_tags)
VALUES 
('iogurte de coco com frutas', 'laticínios', 'snack_main', '1 pote (170g)', 95, 1, 12, 5, 170, ARRAY['lanche_manha', 'lanche_tarde', 'lanche'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']),
('mix de castanhas', 'oleaginosas', 'snack_complement', '30g', 607, 18, 20, 52, 30, ARRAY['lanche_manha', 'lanche_tarde', 'lanche'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose', 'low_carb']);

-- Atualizar proteínas vegetarianas para ter tags corretas
UPDATE public.nutritionist_foods SET dietary_tags = ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose', 'low_carb']
WHERE name IN ('ovo mexido no azeite');

-- Adicionar proteína principal vegetariana para almoço
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_portion_grams, compatible_meals, dietary_tags)
VALUES 
('tofu grelhado', 'proteínas', 'main_protein', '150g', 144, 17, 3, 9, 150, ARRAY['almoco', 'jantar'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose', 'low_carb']),
('grão de bico cozido', 'leguminosas', 'main_protein', '4 colheres de sopa', 164, 9, 27, 2.6, 120, ARRAY['almoco', 'jantar'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']),
('lentilha cozida', 'leguminosas', 'main_protein', '4 colheres de sopa', 116, 9, 20, 0.4, 120, ARRAY['almoco', 'jantar'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']),
('omelete de legumes', 'proteínas', 'main_protein', '2 ovos', 154, 11, 1.5, 12, 120, ARRAY['almoco', 'jantar'], ARRAY['vegetariana', 'sem_gluten', 'sem_lactose', 'low_carb']);

-- Adicionar light_dinner vegetariano
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_portion_grams, compatible_meals, dietary_tags)
VALUES 
('salada de grão de bico', 'refeições', 'light_dinner', '1 prato', 140, 7, 18, 5, 250, ARRAY['jantar'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']),
('sopa de lentilha', 'refeições', 'light_dinner', '1 tigela', 80, 6, 14, 0.5, 300, ARRAY['jantar'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']),
('wrap de vegetais (sem trigo)', 'refeições', 'light_dinner', '1 unidade', 120, 4, 18, 4, 200, ARRAY['jantar'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']);

-- Adicionar supper vegetariano
INSERT INTO public.nutritionist_foods (name, category, component_type, portion_label, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, default_portion_grams, compatible_meals, dietary_tags)
VALUES 
('chá de camomila com banana', 'bebidas', 'supper', '1 xícara + 1 fruta', 50, 1, 12, 0, 150, ARRAY['ceia'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']),
('frutas da estação', 'frutas', 'supper', '1 porção', 60, 1, 15, 0, 150, ARRAY['ceia'], ARRAY['vegetariana', 'vegana', 'sem_gluten', 'sem_lactose']);