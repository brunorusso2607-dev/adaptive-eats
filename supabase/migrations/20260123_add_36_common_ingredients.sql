-- ═══════════════════════════════════════════════════════════════════════
-- ADD 36 COMMON INGREDIENTS
-- ═══════════════════════════════════════════════════════════════════════
-- Adiciona 36 ingredientes comuns ao ingredient_pool
-- Dados nutricionais baseados em TACO/TBCA
-- ═══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- PROTEÍNAS (8 ingredientes)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('beef_chuck', 'Músculo bovino', 'Beef chuck', 'Músculo de res', false, NULL, 'protein', 178, 26, 0, 8, 0, 120),
('beef_rump_steak', 'Coxão mole grelhado', 'Grilled rump steak', 'Filete de cadera', false, NULL, 'protein', 158, 27, 0, 5, 0, 120),
('pork_loin', 'Lombo de porco assado', 'Roasted pork loin', 'Lomo de cerdo', false, NULL, 'protein', 171, 27, 0, 6.5, 0, 120),
('pork_chop', 'Costeleta de porco grelhada', 'Grilled pork chop', 'Chuleta de cerdo', false, NULL, 'protein', 231, 25, 0, 14, 0, 120),
('turkey_breast', 'Peito de peru assado', 'Roasted turkey breast', 'Pechuga de pavo', false, NULL, 'protein', 135, 29, 0, 1.7, 0, 120),
('tuna_steak', 'Atum fresco grelhado', 'Grilled tuna steak', 'Filete de atún', false, NULL, 'protein', 144, 30, 0, 1.5, 0, 120),
('tofu', 'Tofu', 'Tofu', 'Tofu', false, NULL, 'protein', 76, 8.1, 1.9, 4.8, 0.3, 100),
('chickpeas', 'Grão-de-bico cozido', 'Boiled chickpeas', 'Garbanzos cocidos', false, NULL, 'protein', 164, 8.9, 27.4, 2.6, 7.6, 100)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- CARBOIDRATOS (5 ingredientes)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('yam', 'Inhame cozido', 'Boiled yam', 'Ñame cocido', false, NULL, 'carbs', 97, 1.5, 23.2, 0.2, 1.5, 150),
('rice_noodles', 'Macarrão de arroz cozido', 'Cooked rice noodles', 'Fideos de arroz', false, NULL, 'carbs', 109, 1.8, 24.9, 0.1, 0.4, 100),
('sweet_corn', 'Milho verde cozido', 'Boiled sweet corn', 'Maíz dulce', false, NULL, 'carbs', 96, 3.4, 21, 1.5, 2, 100),
('plantain', 'Banana-da-terra cozida', 'Boiled plantain', 'Plátano cocido', false, NULL, 'carbs', 122, 1.3, 31.9, 0.4, 2.3, 150),
('barley', 'Cevada cozida', 'Cooked barley', 'Cebada cocida', false, NULL, 'carbs', 123, 2.3, 28.2, 0.4, 3.8, 100)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- VEGETAIS (3 ingredientes)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('boiled_asparagus', 'Aspargos cozidos', 'Boiled asparagus', 'Espárragos cocidos', false, NULL, 'vegetable', 20, 2.2, 3.9, 0.1, 2.1, 80),
('sauteed_mushroom', 'Cogumelos refogados', 'Sautéed mushrooms', 'Champiñones salteados', false, NULL, 'vegetable', 28, 3.1, 3.3, 0.5, 1, 80),
('radish', 'Rabanete', 'Radish', 'Rábano', false, NULL, 'vegetable', 16, 0.7, 3.4, 0.1, 1.6, 50)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- FRUTAS (8 ingredientes)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('peach', 'Pêssego', 'Peach', 'Durazno', false, NULL, 'fruit', 39, 0.9, 9.5, 0.3, 1.5, 150),
('plum', 'Ameixa', 'Plum', 'Ciruela', false, NULL, 'fruit', 46, 0.7, 11.4, 0.3, 1.4, 100),
('fig', 'Figo', 'Fig', 'Higo', false, NULL, 'fruit', 74, 0.8, 19.2, 0.3, 2.9, 100),
('blueberry', 'Mirtilo', 'Blueberry', 'Arándano', false, NULL, 'fruit', 57, 0.7, 14.5, 0.3, 2.4, 100),
('raspberry', 'Framboesa', 'Raspberry', 'Frambuesa', false, NULL, 'fruit', 52, 1.2, 11.9, 0.7, 6.5, 100),
('blackberry', 'Amora', 'Blackberry', 'Mora', false, NULL, 'fruit', 43, 1.4, 9.6, 0.5, 5.3, 100),
('cherry', 'Cereja', 'Cherry', 'Cereza', false, NULL, 'fruit', 63, 1.1, 16, 0.2, 2.1, 100),
('passion_fruit', 'Maracujá', 'Passion fruit', 'Maracuyá', false, NULL, 'fruit', 97, 2.2, 23.4, 0.7, 10.4, 100)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- LATICÍNIOS (3 ingredientes)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('butter', 'Manteiga', 'Butter', 'Mantequilla', false, NULL, 'dairy', 717, 0.9, 0.1, 81.1, 0, 10),
('parmesan_cheese', 'Queijo parmesão', 'Parmesan cheese', 'Queso parmesano', false, NULL, 'dairy', 392, 35.8, 1.4, 25.8, 0, 20),
('cheddar_cheese', 'Queijo cheddar', 'Cheddar cheese', 'Queso cheddar', false, NULL, 'dairy', 403, 24.9, 1.3, 33.1, 0, 30)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- GORDURAS (1 ingrediente)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('olives', 'Azeitonas', 'Olives', 'Aceitunas', false, NULL, 'fat', 115, 0.8, 6.3, 10.7, 3.2, 30)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- SEMENTES/OLEAGINOSAS (3 ingredientes)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('almonds', 'Amêndoas', 'Almonds', 'Almendras', false, NULL, 'seeds', 579, 21.2, 21.6, 49.9, 12.5, 20),
('sunflower_seeds', 'Sementes de girassol', 'Sunflower seeds', 'Semillas de girasol', false, NULL, 'seeds', 584, 20.8, 20, 51.5, 8.6, 20),
('pumpkin_seeds', 'Sementes de abóbora', 'Pumpkin seeds', 'Semillas de calabaza', false, NULL, 'seeds', 559, 30.2, 10.7, 49, 6, 20)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- BEBIDAS (5 ingredientes)
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO public.ingredient_pool (ingredient_key, display_name_pt, display_name_en, display_name_es, is_alternative, country_code, category, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams) VALUES
('apple_juice', 'Suco de maçã natural', 'Fresh apple juice', 'Jugo de manzana', false, NULL, 'beverage', 46, 0.1, 11.3, 0.1, 0.2, 200),
('grape_juice', 'Suco de uva natural', 'Fresh grape juice', 'Jugo de uva', false, NULL, 'beverage', 61, 0.6, 15.5, 0.1, 0.2, 200),
('tomato_juice', 'Suco de tomate', 'Tomato juice', 'Jugo de tomate', false, NULL, 'beverage', 17, 0.8, 3.9, 0.1, 0.4, 200),
('ginger_tea', 'Chá de gengibre', 'Ginger tea', 'Té de jengibre', false, NULL, 'beverage', 2, 0, 0.5, 0, 0, 200),
('peppermint_tea', 'Chá de hortelã', 'Peppermint tea', 'Té de menta', false, NULL, 'beverage', 1, 0, 0.2, 0, 0, 200)
ON CONFLICT (ingredient_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO
-- ═══════════════════════════════════════════════════════════════════════

-- Contar ingredientes por categoria
SELECT 
  category,
  COUNT(*) as total
FROM public.ingredient_pool
WHERE category IS NOT NULL
GROUP BY category
ORDER BY category;

-- Total geral
SELECT COUNT(*) as total_ingredientes FROM public.ingredient_pool;
