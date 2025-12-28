-- Tabela de alimentos nutricionais curados
CREATE TABLE public.nutritionist_foods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL, -- carb, protein, legume, vegetal, fruta, cafe, lanche
  calories_per_100g numeric NOT NULL DEFAULT 0,
  protein_per_100g numeric NOT NULL DEFAULT 0,
  carbs_per_100g numeric NOT NULL DEFAULT 0,
  fat_per_100g numeric NOT NULL DEFAULT 0,
  fiber_per_100g numeric DEFAULT 0,
  default_portion_grams numeric NOT NULL DEFAULT 100,
  compatible_meals text[] NOT NULL DEFAULT '{}', -- cafe_manha, almoco, jantar, lanche_manha, lanche_tarde, ceia
  dietary_tags text[] DEFAULT '{}', -- vegetariano, vegano, low_carb, sem_gluten, sem_lactose
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_nutritionist_foods_category ON public.nutritionist_foods(category);
CREATE INDEX idx_nutritionist_foods_active ON public.nutritionist_foods(is_active) WHERE is_active = true;
CREATE INDEX idx_nutritionist_foods_meals ON public.nutritionist_foods USING GIN(compatible_meals);

-- Enable RLS
ALTER TABLE public.nutritionist_foods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active nutritionist foods" 
ON public.nutritionist_foods 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can view all nutritionist foods" 
ON public.nutritionist_foods 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert nutritionist foods" 
ON public.nutritionist_foods 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update nutritionist foods" 
ON public.nutritionist_foods 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete nutritionist foods" 
ON public.nutritionist_foods 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_nutritionist_foods_updated_at
  BEFORE UPDATE ON public.nutritionist_foods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais - Carboidratos
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Arroz integral', 'carb', 111, 2.6, 23, 0.9, 1.8, 150, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 1),
('Arroz branco', 'carb', 130, 2.7, 28, 0.3, 0.4, 150, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 2),
('Batata doce', 'carb', 86, 1.6, 20, 0.1, 3, 150, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 3),
('Macarrão integral', 'carb', 124, 5.3, 25, 0.5, 4.5, 100, '{almoco,jantar}', '{vegetariano,vegano,sem_lactose}', 4),
('Quinoa', 'carb', 120, 4.4, 21, 1.9, 2.8, 120, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 5),
('Mandioca cozida', 'carb', 125, 1.1, 30, 0.3, 1.8, 120, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 6),
('Inhame cozido', 'carb', 97, 2.1, 23, 0.1, 4.1, 120, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 7),
('Cuscuz de milho', 'carb', 112, 2.5, 25, 0.3, 1.4, 120, '{almoco,jantar,cafe_manha}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 8);

-- Inserir dados iniciais - Proteínas
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Frango grelhado', 'protein', 165, 31, 0, 3.6, 0, 120, '{almoco,jantar}', '{sem_gluten,sem_lactose}', 1),
('Peixe assado (tilápia)', 'protein', 96, 20, 0, 1.7, 0, 120, '{almoco,jantar}', '{sem_gluten,sem_lactose}', 2),
('Patinho moído', 'protein', 137, 26, 0, 3.5, 0, 120, '{almoco,jantar}', '{sem_gluten,sem_lactose}', 3),
('Ovo cozido', 'protein', 155, 13, 1.1, 11, 0, 100, '{cafe_manha,almoco,jantar,lanche_manha,lanche_tarde}', '{vegetariano,sem_gluten,sem_lactose}', 4),
('Frango desfiado', 'protein', 165, 31, 0, 3.6, 0, 100, '{almoco,jantar}', '{sem_gluten,sem_lactose}', 5),
('Filé de salmão', 'protein', 208, 20, 0, 13, 0, 120, '{almoco,jantar}', '{sem_gluten,sem_lactose}', 6),
('Carne de panela', 'protein', 150, 27, 0, 5, 0, 120, '{almoco,jantar}', '{sem_gluten,sem_lactose}', 7),
('Atum em água', 'protein', 116, 26, 0, 0.8, 0, 80, '{almoco,jantar,lanche_manha,lanche_tarde}', '{sem_gluten,sem_lactose}', 8),
('Tofu grelhado', 'protein', 76, 8, 1.9, 4.8, 0.3, 100, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 9);

-- Inserir dados iniciais - Leguminosas
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Feijão carioca', 'legume', 76, 4.8, 13.6, 0.5, 8.5, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 1),
('Feijão preto', 'legume', 77, 4.5, 14, 0.5, 8.4, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 2),
('Lentilha', 'legume', 116, 9, 20, 0.4, 7.9, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 3),
('Grão de bico', 'legume', 164, 8.9, 27, 2.6, 7.6, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 4),
('Ervilha', 'legume', 81, 5.4, 14.5, 0.4, 5.1, 60, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 5);

-- Inserir dados iniciais - Vegetais/Saladas
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Salada verde mista', 'vegetal', 15, 1.3, 2.4, 0.2, 1.8, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 1),
('Brócolis cozido', 'vegetal', 35, 2.4, 7, 0.4, 3.3, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 2),
('Cenoura cozida', 'vegetal', 35, 0.8, 8, 0.2, 3, 60, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 3),
('Abobrinha refogada', 'vegetal', 17, 1.2, 3.1, 0.3, 1, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 4),
('Couve refogada', 'vegetal', 27, 2.9, 4.3, 0.5, 3.6, 60, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 5),
('Espinafre refogado', 'vegetal', 23, 2.9, 3.6, 0.4, 2.2, 60, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 6),
('Tomate', 'vegetal', 18, 0.9, 3.9, 0.2, 1.2, 50, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 7),
('Pepino', 'vegetal', 15, 0.7, 3.6, 0.1, 0.5, 50, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 8),
('Beterraba cozida', 'vegetal', 44, 1.7, 10, 0.1, 2.8, 60, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 9),
('Chuchu cozido', 'vegetal', 17, 0.6, 4, 0.1, 1.7, 80, '{almoco,jantar}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 10);

-- Inserir dados iniciais - Café da Manhã
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Pão integral', 'cafe', 247, 13, 41, 4.2, 6.8, 50, '{cafe_manha}', '{vegetariano,sem_lactose}', 1),
('Tapioca', 'cafe', 130, 0.5, 32, 0.1, 0.5, 50, '{cafe_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 2),
('Aveia em flocos', 'cafe', 379, 13, 67, 7, 10, 40, '{cafe_manha}', '{vegetariano,vegano,sem_lactose}', 3),
('Banana', 'cafe', 89, 1.1, 23, 0.3, 2.6, 100, '{cafe_manha,lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 4),
('Mamão', 'cafe', 43, 0.5, 11, 0.3, 1.7, 150, '{cafe_manha}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 5),
('Iogurte natural desnatado', 'cafe', 56, 4, 6, 0.5, 0, 170, '{cafe_manha,lanche_manha,lanche_tarde}', '{vegetariano,sem_gluten}', 6),
('Queijo cottage', 'cafe', 98, 11, 3.4, 4.3, 0, 50, '{cafe_manha,lanche_manha,lanche_tarde}', '{vegetariano,sem_gluten}', 7),
('Omelete simples', 'cafe', 154, 11, 1.6, 12, 0, 100, '{cafe_manha}', '{vegetariano,sem_gluten,sem_lactose}', 8);

-- Inserir dados iniciais - Lanches
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Castanha do Pará', 'lanche', 656, 14, 12, 66, 7.5, 15, '{lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 1),
('Maçã', 'lanche', 52, 0.3, 14, 0.2, 2.4, 150, '{lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 2),
('Mix de oleaginosas', 'lanche', 607, 20, 21, 54, 8, 30, '{lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 3),
('Iogurte grego natural', 'lanche', 97, 9, 4, 5, 0, 100, '{lanche_manha,lanche_tarde}', '{vegetariano,sem_gluten}', 4),
('Cenoura baby', 'lanche', 35, 0.9, 8, 0.2, 2.8, 80, '{lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 5),
('Uva', 'lanche', 69, 0.7, 18, 0.2, 0.9, 100, '{lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 6),
('Laranja', 'lanche', 47, 0.9, 12, 0.1, 2.4, 180, '{lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 7);

-- Inserir dados iniciais - Frutas (categoria separada para flexibilidade)
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Morango', 'fruta', 32, 0.7, 7.7, 0.3, 2, 100, '{cafe_manha,lanche_manha,lanche_tarde,ceia}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 1),
('Melancia', 'fruta', 30, 0.6, 7.6, 0.2, 0.4, 200, '{cafe_manha,lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 2),
('Abacaxi', 'fruta', 50, 0.5, 13, 0.1, 1.4, 150, '{cafe_manha,lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 3),
('Manga', 'fruta', 60, 0.8, 15, 0.4, 1.6, 150, '{cafe_manha,lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 4),
('Pera', 'fruta', 57, 0.4, 15, 0.1, 3.1, 150, '{lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 5),
('Kiwi', 'fruta', 61, 1.1, 15, 0.5, 3, 100, '{cafe_manha,lanche_manha,lanche_tarde}', '{vegetariano,vegano,sem_gluten,sem_lactose}', 6);

-- Ceia items
INSERT INTO public.nutritionist_foods (name, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, default_portion_grams, compatible_meals, dietary_tags, sort_order) VALUES
('Chá de camomila', 'ceia', 1, 0, 0.2, 0, 0, 200, '{ceia}', '{vegetariano,vegano,sem_gluten,sem_lactose,low_carb}', 1),
('Leite desnatado morno', 'ceia', 35, 3.4, 5, 0.1, 0, 200, '{ceia}', '{vegetariano,sem_gluten}', 2);