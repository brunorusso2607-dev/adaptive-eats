-- ============================================
-- INSERÇÃO DE 120 REFEIÇÕES NO POOL - BRASIL
-- ============================================
-- Data: 18/01/2026
-- País: BR
-- Total: 120 refeições

-- ============================================
-- CAFÉ DA MANHÃ (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (name, meal_type, components, country_codes, total_calories, total_protein, total_carbs, total_fat, total_fiber, source, created_at) VALUES
('Pão Integral com Requeijão e Banana', 'breakfast',
 '[{"type":"carb","name":"Pão integral","portion_grams":50},{"type":"dairy","name":"Requeijão","portion_grams":30},{"type":"fruit","name":"Banana prata","portion_grams":100},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 350, 12, 55, 8, 3, 'manual', NOW()),

('BR', 'breakfast', 'Tapioca com Queijo Minas e Café',
 '[{"type":"carb","name":"Tapioca","portion_grams":100},{"type":"dairy","name":"Queijo minas frescal","portion_grams":50},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Iogurte Natural com Granola e Mamão',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"grain","name":"Granola","portion_grams":30},{"type":"fruit","name":"Mamão papaia","portion_grams":150}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Pão de Queijo com Café com Leite',
 '[{"type":"carb","name":"Pão de queijo","portion_grams":100},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Ovo Mexido com Pão Integral e Abacate',
 '[{"type":"protein","name":"Ovos mexidos","portion_grams":100},{"type":"carb","name":"Pão integral","portion_grams":50},{"type":"fat","name":"Abacate","portion_grams":50},{"type":"beverage","name":"Café preto","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Cuscuz Nordestino com Ovo Cozido',
 '[{"type":"carb","name":"Cuscuz nordestino","portion_grams":100},{"type":"protein","name":"Ovo cozido","portion_grams":50},{"type":"fat","name":"Manteiga","portion_grams":10},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Mingau de Aveia com Banana e Canela',
 '[{"type":"grain","name":"Aveia","portion_grams":40},{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"fruit","name":"Banana","portion_grams":100}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Tapioca com Coco Ralado e Mel',
 '[{"type":"carb","name":"Tapioca","portion_grams":100},{"type":"fat","name":"Coco ralado","portion_grams":20},{"type":"carb","name":"Mel","portion_grams":15},{"type":"beverage","name":"Chá verde","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Pão Francês com Queijo Branco e Tomate',
 '[{"type":"carb","name":"Pão francês","portion_grams":50},{"type":"dairy","name":"Queijo branco","portion_grams":30},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Panqueca de Banana com Mel',
 '[{"type":"fruit","name":"Banana","portion_grams":100},{"type":"protein","name":"Ovo","portion_grams":50},{"type":"grain","name":"Aveia","portion_grams":30},{"type":"carb","name":"Mel","portion_grams":15},{"type":"beverage","name":"Café preto","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Beiju com Queijo Coalho',
 '[{"type":"carb","name":"Beiju","portion_grams":50},{"type":"dairy","name":"Queijo coalho","portion_grams":50},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Iogurte Grego com Frutas Vermelhas e Granola',
 '[{"type":"dairy","name":"Iogurte grego","portion_grams":150},{"type":"fruit","name":"Morangos","portion_grams":80},{"type":"grain","name":"Granola","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Pão Integral com Pasta de Amendoim e Banana',
 '[{"type":"carb","name":"Pão integral","portion_grams":50},{"type":"fat","name":"Pasta de amendoim","portion_grams":20},{"type":"fruit","name":"Banana","portion_grams":100},{"type":"beverage","name":"Café preto","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Cuscuz Paulista com Ovo Pochê',
 '[{"type":"carb","name":"Cuscuz paulista","portion_grams":100},{"type":"protein","name":"Ovo pochê","portion_grams":50},{"type":"fat","name":"Azeite","portion_grams":5},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Vitamina de Açaí com Banana',
 '[{"type":"fruit","name":"Açaí polpa","portion_grams":100},{"type":"fruit","name":"Banana","portion_grams":100},{"type":"dairy","name":"Leite","portion_ml":200},{"type":"grain","name":"Granola","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Tapioca com Frango Desfiado',
 '[{"type":"carb","name":"Tapioca","portion_grams":100},{"type":"protein","name":"Frango desfiado","portion_grams":50},{"type":"dairy","name":"Requeijão","portion_grams":20},{"type":"beverage","name":"Café preto","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Pão de Forma Integral com Cottage e Geleia',
 '[{"type":"carb","name":"Pão de forma integral","portion_grams":50},{"type":"dairy","name":"Queijo cottage","portion_grams":50},{"type":"carb","name":"Geleia de morango","portion_grams":20},{"type":"beverage","name":"Chá preto","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Omelete com Queijo e Tomate',
 '[{"type":"protein","name":"Ovos","portion_grams":100},{"type":"dairy","name":"Queijo minas","portion_grams":30},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"carb","name":"Pão integral","portion_grams":30},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Mingau de Tapioca com Leite de Coco',
 '[{"type":"carb","name":"Polvilho azedo","portion_grams":30},{"type":"dairy","name":"Leite de coco","portion_ml":150},{"type":"carb","name":"Açúcar mascavo","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'breakfast', 'Pão Sírio com Homus e Vegetais',
 '[{"type":"carb","name":"Pão sírio","portion_grams":50},{"type":"legume","name":"Homus","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"vegetable","name":"Pepino","portion_grams":30},{"type":"beverage","name":"Chá verde","portion_ml":200}]'::jsonb,
 'pending', NOW());

-- ============================================
-- LANCHE DA MANHÃ (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (country_code, meal_type, meal_name, components, approval_status, created_at) VALUES
('BR', 'morning_snack', 'Banana com Castanhas',
 '[{"type":"fruit","name":"Banana prata","portion_grams":100},{"type":"fat","name":"Castanha do Pará","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Iogurte Natural com Mel',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"carb","name":"Mel","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Pão de Queijo',
 '[{"type":"carb","name":"Pão de queijo","portion_grams":100}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Maçã com Pasta de Amendoim',
 '[{"type":"fruit","name":"Maçã","portion_grams":150},{"type":"fat","name":"Pasta de amendoim","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Tapioca Mini com Queijo',
 '[{"type":"carb","name":"Tapioca","portion_grams":50},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Vitamina de Mamão',
 '[{"type":"fruit","name":"Mamão papaia","portion_grams":150},{"type":"dairy","name":"Leite desnatado","portion_ml":150}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Biscoito Integral com Queijo Branco',
 '[{"type":"carb","name":"Biscoito integral","portion_grams":30},{"type":"dairy","name":"Queijo branco","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Açaí na Tigela Pequeno',
 '[{"type":"fruit","name":"Açaí polpa","portion_grams":100},{"type":"fruit","name":"Banana","portion_grams":50},{"type":"grain","name":"Granola","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Caju Fresco',
 '[{"type":"fruit","name":"Caju fruta","portion_grams":200}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Queijo Coalho Grelhado',
 '[{"type":"dairy","name":"Queijo coalho","portion_grams":50},{"type":"carb","name":"Melado de cana","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Smoothie de Frutas Vermelhas',
 '[{"type":"fruit","name":"Morangos","portion_grams":100},{"type":"dairy","name":"Iogurte natural","portion_grams":100},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Barra de Cereal com Castanhas',
 '[{"type":"grain","name":"Barra de cereal","portion_grams":30},{"type":"fat","name":"Amêndoas","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Goiabada com Queijo Minas',
 '[{"type":"fruit","name":"Goiabada","portion_grams":30},{"type":"dairy","name":"Queijo minas frescal","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Pipoca Caseira',
 '[{"type":"grain","name":"Milho de pipoca","portion_grams":30},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Iogurte com Chia',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"grain","name":"Chia","portion_grams":10},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Pitanga Fresca',
 '[{"type":"fruit","name":"Pitanga","portion_grams":200}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Mix de Oleaginosas',
 '[{"type":"fat","name":"Castanha do Pará","portion_grams":10},{"type":"fat","name":"Amêndoas","portion_grams":10},{"type":"fat","name":"Nozes","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Bananada com Queijo',
 '[{"type":"fruit","name":"Bananada","portion_grams":30},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Suco Verde Natural',
 '[{"type":"vegetable","name":"Couve","portion_grams":30},{"type":"fruit","name":"Limão","portion_grams":30},{"type":"fruit","name":"Maçã","portion_grams":100}]'::jsonb,
 'pending', NOW()),

('BR', 'morning_snack', 'Biscoito de Polvilho',
 '[{"type":"carb","name":"Biscoito de polvilho","portion_grams":40}]'::jsonb,
 'pending', NOW());

-- ============================================
-- ALMOÇO (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (country_code, meal_type, meal_name, components, approval_status, created_at) VALUES
('BR', 'lunch', 'Arroz com Feijão, Bife de Alcatra e Salada',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Bife de alcatra grelhado","portion_grams":120},{"type":"vegetable","name":"Alface americana","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":40}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz Integral, Frango Grelhado e Brócolis',
 '[{"type":"carb","name":"Arroz integral","portion_grams":100},{"type":"protein","name":"Peito de frango grelhado","portion_grams":120},{"type":"vegetable","name":"Brócolis cozido","portion_grams":100},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Batata Doce, Carne Moída e Cenoura',
 '[{"type":"carb","name":"Batata doce cozida","portion_grams":150},{"type":"protein","name":"Carne moída refogada","portion_grams":100},{"type":"vegetable","name":"Cenoura cozida","portion_grams":80},{"type":"vegetable","name":"Salada de alface","portion_grams":40}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz com Feijão, Tilápia Grelhada e Salada de Tomate',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão carioca","portion_grams":80},{"type":"protein","name":"Tilápia grelhada","portion_grams":120},{"type":"vegetable","name":"Tomate","portion_grams":60},{"type":"vegetable","name":"Cebola","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Macarrão ao Molho de Tomate com Carne Moída',
 '[{"type":"carb","name":"Macarrão","portion_grams":100},{"type":"protein","name":"Carne moída","portion_grams":80},{"type":"vegetable","name":"Molho de tomate","portion_grams":60},{"type":"dairy","name":"Queijo ralado","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz, Feijão, Linguiça Calabresa e Couve Refogada',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Linguiça calabresa","portion_grams":80},{"type":"vegetable","name":"Couve refogada","portion_grams":60},{"type":"carb","name":"Farofa","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Batata Assada, Salmão Grelhado e Aspargos',
 '[{"type":"carb","name":"Batata inglesa assada","portion_grams":150},{"type":"protein","name":"Salmão grelhado","portion_grams":120},{"type":"vegetable","name":"Aspargos grelhados","portion_grams":80},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz com Feijão, Carne de Sol e Abóbora',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão verde","portion_grams":80},{"type":"protein","name":"Carne de sol","portion_grams":100},{"type":"vegetable","name":"Abóbora cozida","portion_grams":100}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz, Frango ao Curry e Legumes',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"protein","name":"Frango ao curry","portion_grams":120},{"type":"vegetable","name":"Cenoura","portion_grams":60},{"type":"vegetable","name":"Vagem","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Purê de Batata, Filé Mignon e Rúcula',
 '[{"type":"carb","name":"Purê de batata","portion_grams":150},{"type":"protein","name":"Filé mignon grelhado","portion_grams":120},{"type":"vegetable","name":"Rúcula","portion_grams":40},{"type":"vegetable","name":"Tomate cereja","portion_grams":40}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz com Feijão, Charque Desfiado e Maxixe',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Charque desfiado","portion_grams":80},{"type":"vegetable","name":"Maxixe refogado","portion_grams":80}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Macarrão à Carbonara com Bacon',
 '[{"type":"carb","name":"Macarrão","portion_grams":100},{"type":"protein","name":"Bacon","portion_grams":40},{"type":"dairy","name":"Creme de leite light","portion_grams":30},{"type":"dairy","name":"Queijo parmesão","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz, Feijão, Linguiça Toscana e Ora-pro-nóbis',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão carioca","portion_grams":80},{"type":"protein","name":"Linguiça toscana","portion_grams":80},{"type":"vegetable","name":"Ora-pro-nóbis refogado","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz Integral, Peixe Assado e Taioba',
 '[{"type":"carb","name":"Arroz integral","portion_grams":100},{"type":"protein","name":"Peixe assado","portion_grams":120},{"type":"vegetable","name":"Taioba refogada","portion_grams":80},{"type":"fruit","name":"Limão","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Batata, Carne Assada e Salada Completa',
 '[{"type":"carb","name":"Batata cozida","portion_grams":150},{"type":"protein","name":"Carne assada","portion_grams":100},{"type":"vegetable","name":"Alface","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":40},{"type":"vegetable","name":"Pepino","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz com Feijão, Frango Xadrez e Legumes',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Frango xadrez","portion_grams":120},{"type":"vegetable","name":"Pimentão","portion_grams":50},{"type":"vegetable","name":"Cebola","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz, Feijão, Costelinha Suína e Caruru',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão carioca","portion_grams":80},{"type":"protein","name":"Costelinha suína","portion_grams":80},{"type":"vegetable","name":"Caruru refogado","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Macarrão ao Pesto com Frango',
 '[{"type":"carb","name":"Macarrão","portion_grams":100},{"type":"protein","name":"Frango grelhado","portion_grams":100},{"type":"vegetable","name":"Molho pesto","portion_grams":30},{"type":"vegetable","name":"Tomate seco","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz, Feijão, Bife Acebolado e Farofa',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Bife acebolado","portion_grams":120},{"type":"carb","name":"Farofa","portion_grams":40}]'::jsonb,
 'pending', NOW()),

('BR', 'lunch', 'Arroz Integral, Salmão e Jambu',
 '[{"type":"carb","name":"Arroz integral","portion_grams":100},{"type":"protein","name":"Salmão grelhado","portion_grams":120},{"type":"vegetable","name":"Jambu refogado","portion_grams":60},{"type":"fruit","name":"Limão","portion_grams":20}]'::jsonb,
 'pending', NOW());

-- ============================================
-- LANCHE DA TARDE (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (country_code, meal_type, meal_name, components, approval_status, created_at) VALUES
('BR', 'afternoon_snack', 'Pão Integral com Queijo Branco',
 '[{"type":"carb","name":"Pão integral","portion_grams":50},{"type":"dairy","name":"Queijo branco","portion_grams":30},{"type":"beverage","name":"Chá verde","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Tapioca com Coco',
 '[{"type":"carb","name":"Tapioca","portion_grams":50},{"type":"fat","name":"Coco ralado","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Iogurte com Frutas',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"fruit","name":"Morango","portion_grams":80}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Biscoito Integral com Chá',
 '[{"type":"carb","name":"Biscoito integral","portion_grams":40},{"type":"beverage","name":"Chá de camomila","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Pão de Queijo com Café',
 '[{"type":"carb","name":"Pão de queijo","portion_grams":50},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Vitamina de Banana com Aveia',
 '[{"type":"fruit","name":"Banana","portion_grams":100},{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"grain","name":"Aveia","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Queijo Coalho com Melado',
 '[{"type":"dairy","name":"Queijo coalho","portion_grams":50},{"type":"carb","name":"Melado de cana","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Bolo Caseiro Simples',
 '[{"type":"carb","name":"Bolo simples","portion_grams":60},{"type":"beverage","name":"Café preto","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Sanduíche Natural',
 '[{"type":"carb","name":"Pão de forma integral","portion_grams":50},{"type":"protein","name":"Peito de peru","portion_grams":30},{"type":"vegetable","name":"Alface","portion_grams":20},{"type":"vegetable","name":"Tomate","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Açaí Pequeno com Banana',
 '[{"type":"fruit","name":"Açaí polpa","portion_grams":80},{"type":"fruit","name":"Banana","portion_grams":50}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Crepioca com Queijo',
 '[{"type":"protein","name":"Ovo","portion_grams":50},{"type":"carb","name":"Tapioca","portion_grams":30},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Goiabada com Queijo',
 '[{"type":"fruit","name":"Goiabada","portion_grams":30},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Suco de Cajuína com Biscoito',
 '[{"type":"beverage","name":"Cajuína","portion_ml":200},{"type":"carb","name":"Biscoito integral","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Pão Francês com Requeijão',
 '[{"type":"carb","name":"Pão francês","portion_grams":50},{"type":"dairy","name":"Requeijão","portion_grams":20},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Mix de Frutas Frescas',
 '[{"type":"fruit","name":"Mamão","portion_grams":100},{"type":"fruit","name":"Melancia","portion_grams":100},{"type":"fruit","name":"Uva","portion_grams":50}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Barra de Cereal com Iogurte',
 '[{"type":"grain","name":"Barra de cereal","portion_grams":30},{"type":"dairy","name":"Iogurte natural","portion_grams":100}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Cuscuz com Leite de Coco',
 '[{"type":"carb","name":"Cuscuz nordestino","portion_grams":60},{"type":"dairy","name":"Leite de coco","portion_ml":100}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Smoothie de Cupuaçu',
 '[{"type":"fruit","name":"Cupuaçu","portion_grams":100},{"type":"dairy","name":"Leite","portion_ml":150},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Biscoito de Polvilho com Café',
 '[{"type":"carb","name":"Biscoito de polvilho","portion_grams":40},{"type":"beverage","name":"Café preto","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'afternoon_snack', 'Rapadura com Castanhas',
 '[{"type":"carb","name":"Rapadura","portion_grams":20},{"type":"fat","name":"Castanha do Pará","portion_grams":15}]'::jsonb,
 'pending', NOW());

-- ============================================
-- JANTAR (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (country_code, meal_type, meal_name, components, approval_status, created_at) VALUES
('BR', 'dinner', 'Sopa de Legumes com Frango',
 '[{"type":"protein","name":"Frango desfiado","portion_grams":80},{"type":"vegetable","name":"Cenoura","portion_grams":60},{"type":"carb","name":"Batata","portion_grams":60},{"type":"vegetable","name":"Chuchu","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Arroz Integral com Peixe Grelhado e Salada',
 '[{"type":"carb","name":"Arroz integral","portion_grams":80},{"type":"protein","name":"Peixe grelhado","portion_grams":100},{"type":"vegetable","name":"Alface","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":40}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Omelete de Legumes com Salada',
 '[{"type":"protein","name":"Ovos","portion_grams":100},{"type":"vegetable","name":"Tomate","portion_grams":40},{"type":"vegetable","name":"Cebola","portion_grams":20},{"type":"vegetable","name":"Espinafre","portion_grams":40},{"type":"vegetable","name":"Salada verde","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Batata Doce com Frango Desfiado',
 '[{"type":"carb","name":"Batata doce","portion_grams":120},{"type":"protein","name":"Frango desfiado","portion_grams":80},{"type":"vegetable","name":"Brócolis","portion_grams":80}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Sopa de Feijão com Legumes',
 '[{"type":"legume","name":"Feijão","portion_grams":100},{"type":"vegetable","name":"Cenoura","portion_grams":50},{"type":"vegetable","name":"Abóbora","portion_grams":60},{"type":"vegetable","name":"Couve","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Arroz com Tilápia e Legumes no Vapor',
 '[{"type":"carb","name":"Arroz branco","portion_grams":80},{"type":"protein","name":"Tilápia","portion_grams":100},{"type":"vegetable","name":"Cenoura","portion_grams":60},{"type":"vegetable","name":"Brócolis","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Macarrão Integral com Molho de Tomate',
 '[{"type":"carb","name":"Macarrão integral","portion_grams":80},{"type":"vegetable","name":"Molho de tomate","portion_grams":80},{"type":"vegetable","name":"Manjericão","portion_grams":5},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Caldo Verde',
 '[{"type":"carb","name":"Batata","portion_grams":100},{"type":"vegetable","name":"Couve","portion_grams":60},{"type":"protein","name":"Linguiça calabresa","portion_grams":40}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Salada Completa com Atum',
 '[{"type":"protein","name":"Atum em água","portion_grams":80},{"type":"vegetable","name":"Alface","portion_grams":60},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"vegetable","name":"Pepino","portion_grams":40},{"type":"grain","name":"Milho","portion_grams":40},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Arroz com Carne Moída e Cenoura',
 '[{"type":"carb","name":"Arroz branco","portion_grams":80},{"type":"protein","name":"Carne moída","portion_grams":70},{"type":"vegetable","name":"Cenoura cozida","portion_grams":80}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Sopa de Abóbora com Gengibre',
 '[{"type":"vegetable","name":"Abóbora","portion_grams":200},{"type":"vegetable","name":"Gengibre","portion_grams":5},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Purê de Mandioca com Carne Desfiada',
 '[{"type":"carb","name":"Mandioca","portion_grams":120},{"type":"protein","name":"Carne desfiada","portion_grams":70},{"type":"vegetable","name":"Salada verde","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Arroz Integral com Salmão e Aspargos',
 '[{"type":"carb","name":"Arroz integral","portion_grams":80},{"type":"protein","name":"Salmão grelhado","portion_grams":100},{"type":"vegetable","name":"Aspargos","portion_grams":80}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Creme de Espinafre com Frango',
 '[{"type":"vegetable","name":"Espinafre","portion_grams":100},{"type":"protein","name":"Frango desfiado","portion_grams":70},{"type":"dairy","name":"Creme de leite light","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Batata com Carne de Sol e Manteiga de Garrafa',
 '[{"type":"carb","name":"Batata cozida","portion_grams":120},{"type":"protein","name":"Carne de sol","portion_grams":60},{"type":"fat","name":"Manteiga de garrafa","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Risoto de Legumes',
 '[{"type":"carb","name":"Arroz arbóreo","portion_grams":80},{"type":"vegetable","name":"Cenoura","portion_grams":40},{"type":"vegetable","name":"Abobrinha","portion_grams":40},{"type":"dairy","name":"Queijo parmesão","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Sopa de Lentilha',
 '[{"type":"legume","name":"Lentilha","portion_grams":80},{"type":"vegetable","name":"Cenoura","portion_grams":50},{"type":"vegetable","name":"Cebola","portion_grams":30},{"type":"vegetable","name":"Alho","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Arroz com Frango ao Molho de Mostarda',
 '[{"type":"carb","name":"Arroz branco","portion_grams":80},{"type":"protein","name":"Frango","portion_grams":80},{"type":"vegetable","name":"Molho de mostarda","portion_grams":20},{"type":"vegetable","name":"Salada verde","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Pirão de Peixe com Salada',
 '[{"type":"carb","name":"Pirão","portion_grams":100},{"type":"protein","name":"Peixe cozido","portion_grams":80},{"type":"vegetable","name":"Salada de tomate","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'dinner', 'Angu com Linguiça Toscana',
 '[{"type":"carb","name":"Angu","portion_grams":100},{"type":"protein","name":"Linguiça toscana","portion_grams":60},{"type":"vegetable","name":"Couve refogada","portion_grams":60}]'::jsonb,
 'pending', NOW());

-- ============================================
-- CEIA (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (country_code, meal_type, meal_name, components, approval_status, created_at) VALUES
('BR', 'supper', 'Iogurte Natural com Mel',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Leite Morno com Biscoito Integral',
 '[{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"carb","name":"Biscoito integral","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Queijo Branco com Geleia',
 '[{"type":"dairy","name":"Queijo branco","portion_grams":50},{"type":"carb","name":"Geleia de morango","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Chá de Camomila com Torrada',
 '[{"type":"beverage","name":"Chá de camomila","portion_ml":200},{"type":"carb","name":"Torrada integral","portion_grams":30},{"type":"dairy","name":"Requeijão light","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Iogurte Grego Natural',
 '[{"type":"dairy","name":"Iogurte grego","portion_grams":150}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Vitamina de Banana Light',
 '[{"type":"fruit","name":"Banana","portion_grams":100},{"type":"dairy","name":"Leite desnatado","portion_ml":150}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Queijo Cottage com Mel',
 '[{"type":"dairy","name":"Queijo cottage","portion_grams":100},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Chá Verde com Biscoito de Polvilho',
 '[{"type":"beverage","name":"Chá verde","portion_ml":200},{"type":"carb","name":"Biscoito de polvilho","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Leite com Aveia',
 '[{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"grain","name":"Aveia","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Iogurte com Chia',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"grain","name":"Chia","portion_grams":5}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Queijo Minas com Doce de Leite',
 '[{"type":"dairy","name":"Queijo minas frescal","portion_grams":40},{"type":"dairy","name":"Doce de leite","portion_grams":15}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Chá de Erva-Doce com Torrada',
 '[{"type":"beverage","name":"Chá de erva-doce","portion_ml":200},{"type":"carb","name":"Torrada","portion_grams":25}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Leite de Amêndoas com Mel',
 '[{"type":"dairy","name":"Leite de amêndoas","portion_ml":200},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Iogurte Natural com Morango',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"fruit","name":"Morango","portion_grams":60}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Queijo Branco com Biscoito Água e Sal',
 '[{"type":"dairy","name":"Queijo branco","portion_grams":40},{"type":"carb","name":"Biscoito água e sal","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Chá de Hortelã com Pão de Queijo Mini',
 '[{"type":"beverage","name":"Chá de hortelã","portion_ml":200},{"type":"carb","name":"Pão de queijo","portion_grams":30}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Leite Morno com Canela',
 '[{"type":"dairy","name":"Leite desnatado","portion_ml":200}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Iogurte com Banana Amassada',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"fruit","name":"Banana","portion_grams":50}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Mate Gelado com Limão',
 '[{"type":"beverage","name":"Mate gelado","portion_ml":200},{"type":"fruit","name":"Limão","portion_grams":20}]'::jsonb,
 'pending', NOW()),

('BR', 'supper', 'Queijo Cottage com Pepino',
 '[{"type":"dairy","name":"Queijo cottage","portion_grams":100},{"type":"vegetable","name":"Pepino","portion_grams":50}]'::jsonb,
 'pending', NOW());

-- ============================================
-- FIM DA INSERÇÃO
-- ============================================

-- Verificar quantas refeições foram inseridas
SELECT 
  country_code,
  meal_type,
  COUNT(*) as total
FROM meal_combinations
WHERE country_code = 'BR'
GROUP BY country_code, meal_type
ORDER BY meal_type;
