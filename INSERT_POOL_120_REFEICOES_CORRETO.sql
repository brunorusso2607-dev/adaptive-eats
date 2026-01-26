-- ============================================
-- INSERÇÃO DE 120 REFEIÇÕES NO POOL - BRASIL
-- ============================================
-- Data: 18/01/2026
-- País: BR
-- Total: 120 refeições
-- ESTRUTURA CORRETA: country_codes (array), name, macros calculados

-- ============================================
-- CAFÉ DA MANHÃ (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (
  name, 
  meal_type, 
  components, 
  country_codes, 
  total_calories, 
  total_protein, 
  total_carbs, 
  total_fat, 
  total_fiber,
  source
) VALUES
('Pão Integral com Requeijão e Banana', 'cafe_manha',
 '[{"type":"carb","name":"Pão integral","portion_grams":50,"portion_label":"1 fatia (50g)"},{"type":"dairy","name":"Requeijão","portion_grams":30,"portion_label":"1 colher sopa (30g)"},{"type":"fruit","name":"Banana prata","portion_grams":100,"portion_label":"1 unidade (100g)"},{"type":"beverage","name":"Café com leite","portion_ml":200,"portion_label":"1 xícara (200ml)"}]'::jsonb,
 '{BR}'::text[], 350, 12, 55, 8, 3, 'manual'),

('Tapioca com Queijo Minas e Café', 'cafe_manha',
 '[{"type":"carb","name":"Tapioca","portion_grams":100},{"type":"dairy","name":"Queijo minas frescal","portion_grams":50},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 320, 15, 40, 12, 1, 'manual'),

('Iogurte Natural com Granola e Mamão', 'cafe_manha',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"grain","name":"Granola","portion_grams":30},{"type":"fruit","name":"Mamão papaia","portion_grams":150}]'::jsonb,
 '{BR}'::text[], 280, 12, 45, 6, 3, 'manual'),

('Pão de Queijo com Café com Leite', 'cafe_manha',
 '[{"type":"carb","name":"Pão de queijo","portion_grams":100},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 420, 14, 50, 18, 2, 'manual'),

('Ovo Mexido com Pão Integral e Abacate', 'cafe_manha',
 '[{"type":"protein","name":"Ovos mexidos","portion_grams":100},{"type":"carb","name":"Pão integral","portion_grams":50},{"type":"fat","name":"Abacate","portion_grams":50},{"type":"beverage","name":"Café preto","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 380, 18, 30, 22, 5, 'manual'),

('Cuscuz Nordestino com Ovo Cozido', 'cafe_manha',
 '[{"type":"carb","name":"Cuscuz nordestino","portion_grams":100},{"type":"protein","name":"Ovo cozido","portion_grams":50},{"type":"fat","name":"Manteiga","portion_grams":10},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 340, 15, 42, 12, 1, 'manual'),

('Mingau de Aveia com Banana e Canela', 'cafe_manha',
 '[{"type":"grain","name":"Aveia","portion_grams":40},{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"fruit","name":"Banana","portion_grams":100}]'::jsonb,
 '{BR}'::text[], 310, 14, 52, 5, 4, 'manual'),

('Tapioca com Coco Ralado e Mel', 'cafe_manha',
 '[{"type":"carb","name":"Tapioca","portion_grams":100},{"type":"fat","name":"Coco ralado","portion_grams":20},{"type":"carb","name":"Mel","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 280, 3, 48, 8, 2, 'manual'),

('Pão Francês com Queijo Branco e Tomate', 'cafe_manha',
 '[{"type":"carb","name":"Pão francês","portion_grams":50},{"type":"dairy","name":"Queijo branco","portion_grams":30},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 320, 14, 42, 10, 2, 'manual'),

('Panqueca de Banana com Mel', 'cafe_manha',
 '[{"type":"fruit","name":"Banana","portion_grams":100},{"type":"protein","name":"Ovo","portion_grams":50},{"type":"grain","name":"Aveia","portion_grams":30},{"type":"carb","name":"Mel","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 330, 12, 55, 8, 4, 'manual'),

('Beiju com Queijo Coalho', 'cafe_manha',
 '[{"type":"carb","name":"Beiju","portion_grams":50},{"type":"dairy","name":"Queijo coalho","portion_grams":50},{"type":"beverage","name":"Café com leite","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 350, 18, 35, 15, 1, 'manual'),

('Iogurte Grego com Frutas Vermelhas e Granola', 'cafe_manha',
 '[{"type":"dairy","name":"Iogurte grego","portion_grams":150},{"type":"fruit","name":"Morangos","portion_grams":80},{"type":"grain","name":"Granola","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 320, 18, 38, 10, 3, 'manual'),

('Pão Integral com Pasta de Amendoim e Banana', 'cafe_manha',
 '[{"type":"carb","name":"Pão integral","portion_grams":50},{"type":"fat","name":"Pasta de amendoim","portion_grams":20},{"type":"fruit","name":"Banana","portion_grams":100}]'::jsonb,
 '{BR}'::text[], 380, 14, 52, 14, 5, 'manual'),

('Cuscuz Paulista com Ovo Pochê', 'cafe_manha',
 '[{"type":"carb","name":"Cuscuz paulista","portion_grams":100},{"type":"protein","name":"Ovo pochê","portion_grams":50},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 340, 16, 45, 11, 2, 'manual'),

('Vitamina de Açaí com Banana', 'cafe_manha',
 '[{"type":"fruit","name":"Açaí polpa","portion_grams":100},{"type":"fruit","name":"Banana","portion_grams":100},{"type":"dairy","name":"Leite","portion_ml":200},{"type":"grain","name":"Granola","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 380, 12, 58, 12, 5, 'manual'),

('Tapioca com Frango Desfiado', 'cafe_manha',
 '[{"type":"carb","name":"Tapioca","portion_grams":100},{"type":"protein","name":"Frango desfiado","portion_grams":50},{"type":"dairy","name":"Requeijão","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 340, 22, 38, 10, 1, 'manual'),

('Pão de Forma Integral com Cottage e Geleia', 'cafe_manha',
 '[{"type":"carb","name":"Pão de forma integral","portion_grams":50},{"type":"dairy","name":"Queijo cottage","portion_grams":50},{"type":"carb","name":"Geleia de morango","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 300, 16, 45, 6, 3, 'manual'),

('Omelete com Queijo e Tomate', 'cafe_manha',
 '[{"type":"protein","name":"Ovos","portion_grams":100},{"type":"dairy","name":"Queijo minas","portion_grams":30},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"carb","name":"Pão integral","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 380, 24, 28, 18, 3, 'manual'),

('Mingau de Tapioca com Leite de Coco', 'cafe_manha',
 '[{"type":"carb","name":"Polvilho azedo","portion_grams":30},{"type":"dairy","name":"Leite de coco","portion_ml":150},{"type":"carb","name":"Açúcar mascavo","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 280, 2, 45, 10, 1, 'manual'),

('Pão Sírio com Homus e Vegetais', 'cafe_manha',
 '[{"type":"carb","name":"Pão sírio","portion_grams":50},{"type":"legume","name":"Homus","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"vegetable","name":"Pepino","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 310, 12, 42, 10, 4, 'manual');

-- ============================================
-- LANCHE DA MANHÃ (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (
  name, 
  meal_type, 
  components, 
  country_codes, 
  total_calories, 
  total_protein, 
  total_carbs, 
  total_fat, 
  total_fiber,
  source
) VALUES
('Banana com Castanhas', 'lanche_manha',
 '[{"type":"fruit","name":"Banana prata","portion_grams":100},{"type":"fat","name":"Castanha do Pará","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 180, 5, 25, 8, 3, 'manual'),

('Iogurte Natural com Mel', 'lanche_manha',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"carb","name":"Mel","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 150, 8, 24, 3, 0, 'manual'),

('Pão de Queijo', 'lanche_manha',
 '[{"type":"carb","name":"Pão de queijo","portion_grams":100}]'::jsonb,
 '{BR}'::text[], 335, 9, 45, 13, 2, 'manual'),

('Maçã com Pasta de Amendoim', 'lanche_manha',
 '[{"type":"fruit","name":"Maçã","portion_grams":150},{"type":"fat","name":"Pasta de amendoim","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 180, 5, 28, 7, 4, 'manual'),

('Tapioca Mini com Queijo', 'lanche_manha',
 '[{"type":"carb","name":"Tapioca","portion_grams":50},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 160, 10, 18, 6, 1, 'manual'),

('Vitamina de Mamão', 'lanche_manha',
 '[{"type":"fruit","name":"Mamão papaia","portion_grams":150},{"type":"dairy","name":"Leite desnatado","portion_ml":150}]'::jsonb,
 '{BR}'::text[], 140, 7, 24, 2, 2, 'manual'),

('Biscoito Integral com Queijo Branco', 'lanche_manha',
 '[{"type":"carb","name":"Biscoito integral","portion_grams":30},{"type":"dairy","name":"Queijo branco","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 170, 8, 20, 6, 2, 'manual'),

('Açaí na Tigela Pequeno', 'lanche_manha',
 '[{"type":"fruit","name":"Açaí polpa","portion_grams":100},{"type":"fruit","name":"Banana","portion_grams":50},{"type":"grain","name":"Granola","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 180, 4, 28, 7, 4, 'manual'),

('Caju Fresco', 'lanche_manha',
 '[{"type":"fruit","name":"Caju fruta","portion_grams":200}]'::jsonb,
 '{BR}'::text[], 86, 2, 20, 0, 3, 'manual'),

('Queijo Coalho Grelhado', 'lanche_manha',
 '[{"type":"dairy","name":"Queijo coalho","portion_grams":50},{"type":"carb","name":"Melado de cana","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 194, 13, 11, 13, 0, 'manual'),

('Smoothie de Frutas Vermelhas', 'lanche_manha',
 '[{"type":"fruit","name":"Morangos","portion_grams":100},{"type":"dairy","name":"Iogurte natural","portion_grams":100},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 150, 6, 28, 2, 2, 'manual'),

('Barra de Cereal com Castanhas', 'lanche_manha',
 '[{"type":"grain","name":"Barra de cereal","portion_grams":30},{"type":"fat","name":"Amêndoas","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 180, 6, 20, 9, 3, 'manual'),

('Goiabada com Queijo Minas', 'lanche_manha',
 '[{"type":"fruit","name":"Goiabada","portion_grams":30},{"type":"dairy","name":"Queijo minas frescal","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 160, 6, 24, 6, 2, 'manual'),

('Pipoca Caseira', 'lanche_manha',
 '[{"type":"grain","name":"Milho de pipoca","portion_grams":30},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 160, 3, 24, 6, 3, 'manual'),

('Iogurte com Chia', 'lanche_manha',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"grain","name":"Chia","portion_grams":10},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 170, 9, 22, 5, 3, 'manual'),

('Pitanga Fresca', 'lanche_manha',
 '[{"type":"fruit","name":"Pitanga","portion_grams":200}]'::jsonb,
 '{BR}'::text[], 82, 2, 20, 0, 3, 'manual'),

('Mix de Oleaginosas', 'lanche_manha',
 '[{"type":"fat","name":"Castanha do Pará","portion_grams":10},{"type":"fat","name":"Amêndoas","portion_grams":10},{"type":"fat","name":"Nozes","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 190, 6, 6, 17, 3, 'manual'),

('Bananada com Queijo', 'lanche_manha',
 '[{"type":"fruit","name":"Bananada","portion_grams":30},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 160, 6, 25, 6, 2, 'manual'),

('Suco Verde Natural', 'lanche_manha',
 '[{"type":"vegetable","name":"Couve","portion_grams":30},{"type":"fruit","name":"Limão","portion_grams":30},{"type":"fruit","name":"Maçã","portion_grams":100}]'::jsonb,
 '{BR}'::text[], 80, 2, 18, 1, 3, 'manual'),

('Biscoito de Polvilho', 'lanche_manha',
 '[{"type":"carb","name":"Biscoito de polvilho","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 140, 0, 35, 0, 0, 'manual');

-- ============================================
-- ALMOÇO (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (
  name, 
  meal_type, 
  components, 
  country_codes, 
  total_calories, 
  total_protein, 
  total_carbs, 
  total_fat, 
  total_fiber,
  source
) VALUES
('Arroz com Feijão, Bife de Alcatra e Salada', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Bife de alcatra grelhado","portion_grams":120},{"type":"vegetable","name":"Alface americana","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 520, 38, 52, 15, 8, 'manual'),

('Arroz Integral, Frango Grelhado e Brócolis', 'almoco',
 '[{"type":"carb","name":"Arroz integral","portion_grams":100},{"type":"protein","name":"Peito de frango grelhado","portion_grams":120},{"type":"vegetable","name":"Brócolis cozido","portion_grams":100},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 480, 42, 48, 10, 7, 'manual'),

('Batata Doce, Carne Moída e Cenoura', 'almoco',
 '[{"type":"carb","name":"Batata doce cozida","portion_grams":150},{"type":"protein","name":"Carne moída refogada","portion_grams":100},{"type":"vegetable","name":"Cenoura cozida","portion_grams":80},{"type":"vegetable","name":"Salada de alface","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 490, 32, 54, 16, 8, 'manual'),

('Arroz com Feijão, Tilápia Grelhada e Salada de Tomate', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão carioca","portion_grams":80},{"type":"protein","name":"Tilápia grelhada","portion_grams":120},{"type":"vegetable","name":"Tomate","portion_grams":60},{"type":"vegetable","name":"Cebola","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 460, 36, 54, 8, 7, 'manual'),

('Macarrão ao Molho de Tomate com Carne Moída', 'almoco',
 '[{"type":"carb","name":"Macarrão","portion_grams":100},{"type":"protein","name":"Carne moída","portion_grams":80},{"type":"vegetable","name":"Molho de tomate","portion_grams":60},{"type":"dairy","name":"Queijo ralado","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 510, 28, 62, 16, 4, 'manual'),

('Arroz, Feijão, Linguiça Calabresa e Couve Refogada', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Linguiça calabresa","portion_grams":80},{"type":"vegetable","name":"Couve refogada","portion_grams":60},{"type":"carb","name":"Farofa","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 580, 24, 58, 28, 8, 'manual'),

('Batata Assada, Salmão Grelhado e Aspargos', 'almoco',
 '[{"type":"carb","name":"Batata inglesa assada","portion_grams":150},{"type":"protein","name":"Salmão grelhado","portion_grams":120},{"type":"vegetable","name":"Aspargos grelhados","portion_grams":80},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 520, 34, 42, 22, 6, 'manual'),

('Arroz com Feijão, Carne de Sol e Abóbora', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão verde","portion_grams":80},{"type":"protein","name":"Carne de sol","portion_grams":100},{"type":"vegetable","name":"Abóbora cozida","portion_grams":100}]'::jsonb,
 '{BR}'::text[], 510, 38, 56, 14, 8, 'manual'),

('Arroz, Frango ao Curry e Legumes', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"protein","name":"Frango ao curry","portion_grams":120},{"type":"vegetable","name":"Cenoura","portion_grams":60},{"type":"vegetable","name":"Vagem","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 490, 40, 52, 12, 6, 'manual'),

('Purê de Batata, Filé Mignon e Rúcula', 'almoco',
 '[{"type":"carb","name":"Purê de batata","portion_grams":150},{"type":"protein","name":"Filé mignon grelhado","portion_grams":120},{"type":"vegetable","name":"Rúcula","portion_grams":40},{"type":"vegetable","name":"Tomate cereja","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 500, 38, 42, 18, 5, 'manual'),

('Arroz com Feijão, Charque Desfiado e Maxixe', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Charque desfiado","portion_grams":80},{"type":"vegetable","name":"Maxixe refogado","portion_grams":80}]'::jsonb,
 '{BR}'::text[], 480, 34, 54, 12, 8, 'manual'),

('Macarrão à Carbonara com Bacon', 'almoco',
 '[{"type":"carb","name":"Macarrão","portion_grams":100},{"type":"protein","name":"Bacon","portion_grams":40},{"type":"dairy","name":"Creme de leite light","portion_grams":30},{"type":"dairy","name":"Queijo parmesão","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 540, 22, 58, 24, 3, 'manual'),

('Arroz, Feijão, Linguiça Toscana e Ora-pro-nóbis', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão carioca","portion_grams":80},{"type":"protein","name":"Linguiça toscana","portion_grams":80},{"type":"vegetable","name":"Ora-pro-nóbis refogado","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 550, 26, 56, 24, 8, 'manual'),

('Arroz Integral, Peixe Assado e Taioba', 'almoco',
 '[{"type":"carb","name":"Arroz integral","portion_grams":100},{"type":"protein","name":"Peixe assado","portion_grams":120},{"type":"vegetable","name":"Taioba refogada","portion_grams":80},{"type":"fruit","name":"Limão","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 460, 36, 48, 10, 7, 'manual'),

('Batata, Carne Assada e Salada Completa', 'almoco',
 '[{"type":"carb","name":"Batata cozida","portion_grams":150},{"type":"protein","name":"Carne assada","portion_grams":100},{"type":"vegetable","name":"Alface","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":40},{"type":"vegetable","name":"Pepino","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 480, 34, 46, 14, 6, 'manual'),

('Arroz com Feijão, Frango Xadrez e Legumes', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Frango xadrez","portion_grams":120},{"type":"vegetable","name":"Pimentão","portion_grams":50},{"type":"vegetable","name":"Cebola","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 500, 40, 54, 12, 8, 'manual'),

('Arroz, Feijão, Costelinha Suína e Caruru', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão carioca","portion_grams":80},{"type":"protein","name":"Costelinha suína","portion_grams":80},{"type":"vegetable","name":"Caruru refogado","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 560, 28, 52, 26, 8, 'manual'),

('Macarrão ao Pesto com Frango', 'almoco',
 '[{"type":"carb","name":"Macarrão","portion_grams":100},{"type":"protein","name":"Frango grelhado","portion_grams":100},{"type":"vegetable","name":"Molho pesto","portion_grams":30},{"type":"vegetable","name":"Tomate seco","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 520, 38, 56, 16, 4, 'manual'),

('Arroz, Feijão, Bife Acebolado e Farofa', 'almoco',
 '[{"type":"carb","name":"Arroz branco","portion_grams":100},{"type":"legume","name":"Feijão preto","portion_grams":80},{"type":"protein","name":"Bife acebolado","portion_grams":120},{"type":"carb","name":"Farofa","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 580, 36, 62, 18, 8, 'manual'),

('Arroz Integral, Salmão e Jambu', 'almoco',
 '[{"type":"carb","name":"Arroz integral","portion_grams":100},{"type":"protein","name":"Salmão grelhado","portion_grams":120},{"type":"vegetable","name":"Jambu refogado","portion_grams":60},{"type":"fruit","name":"Limão","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 540, 36, 46, 20, 6, 'manual');

-- ============================================
-- LANCHE DA TARDE (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (
  name, 
  meal_type, 
  components, 
  country_codes, 
  total_calories, 
  total_protein, 
  total_carbs, 
  total_fat, 
  total_fiber,
  source
) VALUES
('Pão Integral com Queijo Branco', 'lanche_tarde',
 '[{"type":"carb","name":"Pão integral","portion_grams":50},{"type":"dairy","name":"Queijo branco","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 200, 12, 26, 6, 3, 'manual'),

('Tapioca com Coco', 'lanche_tarde',
 '[{"type":"carb","name":"Tapioca","portion_grams":50},{"type":"fat","name":"Coco ralado","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 160, 2, 26, 6, 2, 'manual'),

('Iogurte com Frutas', 'lanche_tarde',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"fruit","name":"Morango","portion_grams":80}]'::jsonb,
 '{BR}'::text[], 140, 8, 20, 3, 2, 'manual'),

('Biscoito Integral com Chá', 'lanche_tarde',
 '[{"type":"carb","name":"Biscoito integral","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 160, 4, 28, 4, 2, 'manual'),

('Pão de Queijo com Café', 'lanche_tarde',
 '[{"type":"carb","name":"Pão de queijo","portion_grams":50}]'::jsonb,
 '{BR}'::text[], 240, 8, 28, 10, 1, 'manual'),

('Vitamina de Banana com Aveia', 'lanche_tarde',
 '[{"type":"fruit","name":"Banana","portion_grams":100},{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"grain","name":"Aveia","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 240, 12, 42, 3, 4, 'manual'),

('Queijo Coalho com Melado', 'lanche_tarde',
 '[{"type":"dairy","name":"Queijo coalho","portion_grams":50},{"type":"carb","name":"Melado de cana","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 210, 13, 14, 13, 0, 'manual'),

('Bolo Caseiro Simples', 'lanche_tarde',
 '[{"type":"carb","name":"Bolo simples","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 220, 4, 38, 6, 1, 'manual'),

('Sanduíche Natural', 'lanche_tarde',
 '[{"type":"carb","name":"Pão de forma integral","portion_grams":50},{"type":"protein","name":"Peito de peru","portion_grams":30},{"type":"vegetable","name":"Alface","portion_grams":20},{"type":"vegetable","name":"Tomate","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 180, 14, 24, 4, 3, 'manual'),

('Açaí Pequeno com Banana', 'lanche_tarde',
 '[{"type":"fruit","name":"Açaí polpa","portion_grams":80},{"type":"fruit","name":"Banana","portion_grams":50}]'::jsonb,
 '{BR}'::text[], 120, 2, 18, 4, 3, 'manual'),

('Crepioca com Queijo', 'lanche_tarde',
 '[{"type":"protein","name":"Ovo","portion_grams":50},{"type":"carb","name":"Tapioca","portion_grams":30},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 200, 14, 16, 9, 1, 'manual'),

('Goiabada com Queijo', 'lanche_tarde',
 '[{"type":"fruit","name":"Goiabada","portion_grams":30},{"type":"dairy","name":"Queijo minas","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 160, 6, 24, 6, 2, 'manual'),

('Suco de Cajuína com Biscoito', 'lanche_tarde',
 '[{"type":"beverage","name":"Cajuína","portion_ml":200},{"type":"carb","name":"Biscoito integral","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 180, 3, 38, 3, 2, 'manual'),

('Pão Francês com Requeijão', 'lanche_tarde',
 '[{"type":"carb","name":"Pão francês","portion_grams":50},{"type":"dairy","name":"Requeijão","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 260, 10, 34, 9, 1, 'manual'),

('Mix de Frutas Frescas', 'lanche_tarde',
 '[{"type":"fruit","name":"Mamão","portion_grams":100},{"type":"fruit","name":"Melancia","portion_grams":100},{"type":"fruit","name":"Uva","portion_grams":50}]'::jsonb,
 '{BR}'::text[], 100, 2, 24, 1, 3, 'manual'),

('Barra de Cereal com Iogurte', 'lanche_tarde',
 '[{"type":"grain","name":"Barra de cereal","portion_grams":30},{"type":"dairy","name":"Iogurte natural","portion_grams":100}]'::jsonb,
 '{BR}'::text[], 180, 7, 28, 5, 2, 'manual'),

('Cuscuz com Leite de Coco', 'lanche_tarde',
 '[{"type":"carb","name":"Cuscuz nordestino","portion_grams":60},{"type":"dairy","name":"Leite de coco","portion_ml":100}]'::jsonb,
 '{BR}'::text[], 180, 3, 28, 6, 1, 'manual'),

('Smoothie de Cupuaçu', 'lanche_tarde',
 '[{"type":"fruit","name":"Cupuaçu","portion_grams":100},{"type":"dairy","name":"Leite","portion_ml":150},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 160, 6, 28, 3, 2, 'manual'),

('Biscoito de Polvilho com Café', 'lanche_tarde',
 '[{"type":"carb","name":"Biscoito de polvilho","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 140, 0, 35, 0, 0, 'manual'),

('Rapadura com Castanhas', 'lanche_tarde',
 '[{"type":"carb","name":"Rapadura","portion_grams":20},{"type":"fat","name":"Castanha do Pará","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 170, 3, 22, 8, 1, 'manual');

-- ============================================
-- JANTAR (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (
  name, 
  meal_type, 
  components, 
  country_codes, 
  total_calories, 
  total_protein, 
  total_carbs, 
  total_fat, 
  total_fiber,
  source
) VALUES
('Sopa de Legumes com Frango', 'jantar',
 '[{"type":"protein","name":"Frango desfiado","portion_grams":80},{"type":"vegetable","name":"Cenoura","portion_grams":60},{"type":"carb","name":"Batata","portion_grams":60},{"type":"vegetable","name":"Chuchu","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 280, 24, 32, 6, 5, 'manual'),

('Arroz Integral com Peixe Grelhado e Salada', 'jantar',
 '[{"type":"carb","name":"Arroz integral","portion_grams":80},{"type":"protein","name":"Peixe grelhado","portion_grams":100},{"type":"vegetable","name":"Alface","portion_grams":40},{"type":"vegetable","name":"Tomate","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 340, 28, 38, 7, 6, 'manual'),

('Omelete de Legumes com Salada', 'jantar',
 '[{"type":"protein","name":"Ovos","portion_grams":100},{"type":"vegetable","name":"Tomate","portion_grams":40},{"type":"vegetable","name":"Cebola","portion_grams":20},{"type":"vegetable","name":"Espinafre","portion_grams":40},{"type":"vegetable","name":"Salada verde","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 240, 16, 12, 14, 4, 'manual'),

('Batata Doce com Frango Desfiado', 'jantar',
 '[{"type":"carb","name":"Batata doce","portion_grams":120},{"type":"protein","name":"Frango desfiado","portion_grams":80},{"type":"vegetable","name":"Brócolis","portion_grams":80}]'::jsonb,
 '{BR}'::text[], 320, 28, 36, 6, 6, 'manual'),

('Sopa de Feijão com Legumes', 'jantar',
 '[{"type":"legume","name":"Feijão","portion_grams":100},{"type":"vegetable","name":"Cenoura","portion_grams":50},{"type":"vegetable","name":"Abóbora","portion_grams":60},{"type":"vegetable","name":"Couve","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 260, 14, 42, 3, 10, 'manual'),

('Arroz com Tilápia e Legumes no Vapor', 'jantar',
 '[{"type":"carb","name":"Arroz branco","portion_grams":80},{"type":"protein","name":"Tilápia","portion_grams":100},{"type":"vegetable","name":"Cenoura","portion_grams":60},{"type":"vegetable","name":"Brócolis","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 340, 28, 40, 6, 6, 'manual'),

('Macarrão Integral com Molho de Tomate', 'jantar',
 '[{"type":"carb","name":"Macarrão integral","portion_grams":80},{"type":"vegetable","name":"Molho de tomate","portion_grams":80},{"type":"vegetable","name":"Manjericão","portion_grams":5},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 300, 10, 52, 6, 5, 'manual'),

('Caldo Verde', 'jantar',
 '[{"type":"carb","name":"Batata","portion_grams":100},{"type":"vegetable","name":"Couve","portion_grams":60},{"type":"protein","name":"Linguiça calabresa","portion_grams":40}]'::jsonb,
 '{BR}'::text[], 280, 12, 32, 12, 4, 'manual'),

('Salada Completa com Atum', 'jantar',
 '[{"type":"protein","name":"Atum em água","portion_grams":80},{"type":"vegetable","name":"Alface","portion_grams":60},{"type":"vegetable","name":"Tomate","portion_grams":50},{"type":"vegetable","name":"Pepino","portion_grams":40},{"type":"grain","name":"Milho","portion_grams":40},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 220, 22, 18, 7, 5, 'manual'),

('Arroz com Carne Moída e Cenoura', 'jantar',
 '[{"type":"carb","name":"Arroz branco","portion_grams":80},{"type":"protein","name":"Carne moída","portion_grams":70},{"type":"vegetable","name":"Cenoura cozida","portion_grams":80}]'::jsonb,
 '{BR}'::text[], 360, 22, 42, 11, 5, 'manual'),

('Sopa de Abóbora com Gengibre', 'jantar',
 '[{"type":"vegetable","name":"Abóbora","portion_grams":200},{"type":"vegetable","name":"Gengibre","portion_grams":5},{"type":"fat","name":"Azeite","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 180, 4, 32, 5, 4, 'manual'),

('Purê de Mandioca com Carne Desfiada', 'jantar',
 '[{"type":"carb","name":"Mandioca","portion_grams":120},{"type":"protein","name":"Carne desfiada","portion_grams":70},{"type":"vegetable","name":"Salada verde","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 340, 24, 40, 9, 5, 'manual'),

('Arroz Integral com Salmão e Aspargos', 'jantar',
 '[{"type":"carb","name":"Arroz integral","portion_grams":80},{"type":"protein","name":"Salmão grelhado","portion_grams":100},{"type":"vegetable","name":"Aspargos","portion_grams":80}]'::jsonb,
 '{BR}'::text[], 400, 30, 36, 15, 6, 'manual'),

('Creme de Espinafre com Frango', 'jantar',
 '[{"type":"vegetable","name":"Espinafre","portion_grams":100},{"type":"protein","name":"Frango desfiado","portion_grams":70},{"type":"dairy","name":"Creme de leite light","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 240, 26, 12, 10, 3, 'manual'),

('Batata com Carne de Sol e Manteiga de Garrafa', 'jantar',
 '[{"type":"carb","name":"Batata cozida","portion_grams":120},{"type":"protein","name":"Carne de sol","portion_grams":60},{"type":"fat","name":"Manteiga de garrafa","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 320, 22, 34, 11, 4, 'manual'),

('Risoto de Legumes', 'jantar',
 '[{"type":"carb","name":"Arroz arbóreo","portion_grams":80},{"type":"vegetable","name":"Cenoura","portion_grams":40},{"type":"vegetable","name":"Abobrinha","portion_grams":40},{"type":"dairy","name":"Queijo parmesão","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 340, 12, 52, 10, 4, 'manual'),

('Sopa de Lentilha', 'jantar',
 '[{"type":"legume","name":"Lentilha","portion_grams":80},{"type":"vegetable","name":"Cenoura","portion_grams":50},{"type":"vegetable","name":"Cebola","portion_grams":30},{"type":"vegetable","name":"Alho","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 240, 16, 38, 2, 8, 'manual'),

('Arroz com Frango ao Molho de Mostarda', 'jantar',
 '[{"type":"carb","name":"Arroz branco","portion_grams":80},{"type":"protein","name":"Frango","portion_grams":80},{"type":"vegetable","name":"Molho de mostarda","portion_grams":20},{"type":"vegetable","name":"Salada verde","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 340, 28, 38, 8, 4, 'manual'),

('Pirão de Peixe com Salada', 'jantar',
 '[{"type":"carb","name":"Pirão","portion_grams":100},{"type":"protein","name":"Peixe cozido","portion_grams":80},{"type":"vegetable","name":"Salada de tomate","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 260, 20, 28, 6, 3, 'manual'),

('Angu com Linguiça Toscana', 'jantar',
 '[{"type":"carb","name":"Angu","portion_grams":100},{"type":"protein","name":"Linguiça toscana","portion_grams":60},{"type":"vegetable","name":"Couve refogada","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 340, 16, 32, 18, 4, 'manual');

-- ============================================
-- CEIA (20 REFEIÇÕES)
-- ============================================

INSERT INTO meal_combinations (
  name, 
  meal_type, 
  components, 
  country_codes, 
  total_calories, 
  total_protein, 
  total_carbs, 
  total_fat, 
  total_fiber,
  source
) VALUES
('Iogurte Natural com Mel', 'ceia',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 140, 8, 20, 3, 0, 'manual'),

('Leite Morno com Biscoito Integral', 'ceia',
 '[{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"carb","name":"Biscoito integral","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 150, 9, 24, 2, 2, 'manual'),

('Queijo Branco com Geleia', 'ceia',
 '[{"type":"dairy","name":"Queijo branco","portion_grams":50},{"type":"carb","name":"Geleia de morango","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 120, 8, 14, 3, 1, 'manual'),

('Chá de Camomila com Torrada', 'ceia',
 '[{"type":"beverage","name":"Chá de camomila","portion_ml":200},{"type":"carb","name":"Torrada integral","portion_grams":30},{"type":"dairy","name":"Requeijão light","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 130, 5, 20, 3, 2, 'manual'),

('Iogurte Grego Natural', 'ceia',
 '[{"type":"dairy","name":"Iogurte grego","portion_grams":150}]'::jsonb,
 '{BR}'::text[], 150, 15, 6, 8, 0, 'manual'),

('Vitamina de Banana Light', 'ceia',
 '[{"type":"fruit","name":"Banana","portion_grams":100},{"type":"dairy","name":"Leite desnatado","portion_ml":150}]'::jsonb,
 '{BR}'::text[], 160, 7, 30, 1, 3, 'manual'),

('Queijo Cottage com Mel', 'ceia',
 '[{"type":"dairy","name":"Queijo cottage","portion_grams":100},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 140, 12, 14, 4, 0, 'manual'),

('Chá Verde com Biscoito de Polvilho', 'ceia',
 '[{"type":"beverage","name":"Chá verde","portion_ml":200},{"type":"carb","name":"Biscoito de polvilho","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 105, 0, 26, 0, 0, 'manual'),

('Leite com Aveia', 'ceia',
 '[{"type":"dairy","name":"Leite desnatado","portion_ml":200},{"type":"grain","name":"Aveia","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 160, 10, 26, 2, 2, 'manual'),

('Iogurte com Chia', 'ceia',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"grain","name":"Chia","portion_grams":5}]'::jsonb,
 '{BR}'::text[], 130, 8, 14, 5, 2, 'manual'),

('Queijo Minas com Doce de Leite', 'ceia',
 '[{"type":"dairy","name":"Queijo minas frescal","portion_grams":40},{"type":"dairy","name":"Doce de leite","portion_grams":15}]'::jsonb,
 '{BR}'::text[], 160, 8, 16, 7, 0, 'manual'),

('Chá de Erva-Doce com Torrada', 'ceia',
 '[{"type":"beverage","name":"Chá de erva-doce","portion_ml":200},{"type":"carb","name":"Torrada","portion_grams":25}]'::jsonb,
 '{BR}'::text[], 100, 3, 20, 1, 1, 'manual'),

('Leite de Amêndoas com Mel', 'ceia',
 '[{"type":"dairy","name":"Leite de amêndoas","portion_ml":200},{"type":"carb","name":"Mel","portion_grams":10}]'::jsonb,
 '{BR}'::text[], 90, 2, 16, 3, 1, 'manual'),

('Iogurte Natural com Morango', 'ceia',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"fruit","name":"Morango","portion_grams":60}]'::jsonb,
 '{BR}'::text[], 130, 8, 18, 3, 2, 'manual'),

('Queijo Branco com Biscoito Água e Sal', 'ceia',
 '[{"type":"dairy","name":"Queijo branco","portion_grams":40},{"type":"carb","name":"Biscoito água e sal","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 140, 7, 16, 5, 1, 'manual'),

('Chá de Hortelã com Pão de Queijo Mini', 'ceia',
 '[{"type":"beverage","name":"Chá de hortelã","portion_ml":200},{"type":"carb","name":"Pão de queijo","portion_grams":30}]'::jsonb,
 '{BR}'::text[], 100, 3, 14, 4, 1, 'manual'),

('Leite Morno com Canela', 'ceia',
 '[{"type":"dairy","name":"Leite desnatado","portion_ml":200}]'::jsonb,
 '{BR}'::text[], 80, 8, 12, 1, 0, 'manual'),

('Iogurte com Banana Amassada', 'ceia',
 '[{"type":"dairy","name":"Iogurte natural","portion_grams":150},{"type":"fruit","name":"Banana","portion_grams":50}]'::jsonb,
 '{BR}'::text[], 140, 8, 22, 3, 2, 'manual'),

('Mate Gelado com Limão', 'ceia',
 '[{"type":"beverage","name":"Mate gelado","portion_ml":200},{"type":"fruit","name":"Limão","portion_grams":20}]'::jsonb,
 '{BR}'::text[], 10, 0, 2, 0, 0, 'manual'),

('Queijo Cottage com Pepino', 'ceia',
 '[{"type":"dairy","name":"Queijo cottage","portion_grams":100},{"type":"vegetable","name":"Pepino","portion_grams":50}]'::jsonb,
 '{BR}'::text[], 120, 12, 8, 4, 1, 'manual');

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

SELECT 
  country_codes,
  meal_type,
  COUNT(*) as total
FROM meal_combinations
WHERE 'BR' = ANY(country_codes)
GROUP BY country_codes, meal_type
ORDER BY meal_type;
