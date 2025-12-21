-- Tabela de alimentos com informações nutricionais
CREATE TABLE public.foods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  calories_per_100g NUMERIC NOT NULL DEFAULT 0,
  protein_per_100g NUMERIC NOT NULL DEFAULT 0,
  carbs_per_100g NUMERIC NOT NULL DEFAULT 0,
  fat_per_100g NUMERIC NOT NULL DEFAULT 0,
  fiber_per_100g NUMERIC DEFAULT 0,
  sodium_per_100g NUMERIC DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índice para busca por nome
CREATE INDEX idx_foods_name_normalized ON public.foods USING gin(to_tsvector('portuguese', name_normalized));
CREATE INDEX idx_foods_name ON public.foods (name);

-- RLS para foods (leitura pública, inserção apenas admin)
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view foods"
ON public.foods FOR SELECT
USING (true);

CREATE POLICY "Admins can insert foods"
ON public.foods FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update foods"
ON public.foods FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabela de consumo de refeições
CREATE TABLE public.meal_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_plan_item_id UUID REFERENCES public.meal_plan_items(id) ON DELETE SET NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  followed_plan BOOLEAN NOT NULL DEFAULT true,
  total_calories NUMERIC NOT NULL DEFAULT 0,
  total_protein NUMERIC NOT NULL DEFAULT 0,
  total_carbs NUMERIC NOT NULL DEFAULT 0,
  total_fat NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para meal_consumption
ALTER TABLE public.meal_consumption ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consumption"
ON public.meal_consumption FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own consumption"
ON public.meal_consumption FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own consumption"
ON public.meal_consumption FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own consumption"
ON public.meal_consumption FOR DELETE
USING (auth.uid() = user_id);

-- Tabela de itens consumidos (detalhes de cada alimento)
CREATE TABLE public.consumption_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_consumption_id UUID NOT NULL REFERENCES public.meal_consumption(id) ON DELETE CASCADE,
  food_id UUID REFERENCES public.foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  quantity_grams NUMERIC NOT NULL,
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS para consumption_items (herda do meal_consumption)
ALTER TABLE public.consumption_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their consumption items"
ON public.consumption_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.meal_consumption mc
  WHERE mc.id = consumption_items.meal_consumption_id
  AND mc.user_id = auth.uid()
));

CREATE POLICY "Users can insert their consumption items"
ON public.consumption_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.meal_consumption mc
  WHERE mc.id = consumption_items.meal_consumption_id
  AND mc.user_id = auth.uid()
));

CREATE POLICY "Users can delete their consumption items"
ON public.consumption_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.meal_consumption mc
  WHERE mc.id = consumption_items.meal_consumption_id
  AND mc.user_id = auth.uid()
));

-- Inserir alguns alimentos básicos
INSERT INTO public.foods (name, name_normalized, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category) VALUES
('Arroz', 'arroz', 130, 2.7, 28, 0.3, 'cereais'),
('Arroz Branco', 'arroz branco', 130, 2.7, 28, 0.3, 'cereais'),
('Arroz Integral', 'arroz integral', 111, 2.6, 23, 0.9, 'cereais'),
('Arroz Parboilizado', 'arroz parboilizado', 123, 2.5, 26, 0.4, 'cereais'),
('Arroz Arbóreo', 'arroz arboreo', 130, 2.7, 28, 0.3, 'cereais'),
('Arroz Basmati', 'arroz basmati', 121, 3.5, 25, 0.4, 'cereais'),
('Feijão Preto', 'feijao preto', 77, 4.5, 14, 0.5, 'leguminosas'),
('Feijão Carioca', 'feijao carioca', 76, 4.8, 13.6, 0.5, 'leguminosas'),
('Frango (Peito)', 'frango peito', 165, 31, 0, 3.6, 'carnes'),
('Frango (Coxa)', 'frango coxa', 209, 26, 0, 11, 'carnes'),
('Carne Bovina (Patinho)', 'carne bovina patinho', 133, 21, 0, 5, 'carnes'),
('Carne Bovina (Alcatra)', 'carne bovina alcatra', 163, 21, 0, 8.5, 'carnes'),
('Ovo', 'ovo', 155, 13, 1.1, 11, 'ovos'),
('Ovo Cozido', 'ovo cozido', 155, 13, 1.1, 11, 'ovos'),
('Batata', 'batata', 77, 2, 17, 0.1, 'tuberculos'),
('Batata Doce', 'batata doce', 86, 1.6, 20, 0.1, 'tuberculos'),
('Macarrão', 'macarrao', 131, 5, 25, 1.1, 'massas'),
('Macarrão Integral', 'macarrao integral', 124, 5.3, 25, 0.9, 'massas'),
('Leite Integral', 'leite integral', 61, 3.2, 4.8, 3.3, 'laticinios'),
('Leite Desnatado', 'leite desnatado', 35, 3.4, 5, 0.1, 'laticinios'),
('Queijo Mussarela', 'queijo mussarela', 280, 22, 2.2, 21, 'laticinios'),
('Queijo Cottage', 'queijo cottage', 98, 11, 3.4, 4.3, 'laticinios'),
('Banana', 'banana', 89, 1.1, 23, 0.3, 'frutas'),
('Maçã', 'maca', 52, 0.3, 14, 0.2, 'frutas'),
('Laranja', 'laranja', 47, 0.9, 12, 0.1, 'frutas'),
('Alface', 'alface', 15, 1.4, 2.9, 0.2, 'verduras'),
('Tomate', 'tomate', 18, 0.9, 3.9, 0.2, 'verduras'),
('Brócolis', 'brocolis', 34, 2.8, 7, 0.4, 'verduras'),
('Azeite de Oliva', 'azeite de oliva', 884, 0, 0, 100, 'oleos'),
('Pão Francês', 'pao frances', 300, 8, 58, 3.1, 'paes'),
('Pão Integral', 'pao integral', 247, 13, 41, 4.2, 'paes'),
('Aveia', 'aveia', 389, 17, 66, 7, 'cereais'),
('Iogurte Natural', 'iogurte natural', 61, 3.5, 4.7, 3.3, 'laticinios'),
('Iogurte Grego', 'iogurte grego', 97, 9, 3.6, 5, 'laticinios'),
('Salmão', 'salmao', 208, 20, 0, 13, 'peixes'),
('Atum', 'atum', 132, 29, 0, 1, 'peixes'),
('Camarão', 'camarao', 99, 24, 0.2, 0.3, 'frutos_do_mar'),
('Amendoim', 'amendoim', 567, 26, 16, 49, 'oleaginosas'),
('Castanha de Caju', 'castanha de caju', 553, 18, 30, 44, 'oleaginosas'),
('Grão de Bico', 'grao de bico', 164, 8.9, 27, 2.6, 'leguminosas'),
('Lentilha', 'lentilha', 116, 9, 20, 0.4, 'leguminosas'),
('Quinoa', 'quinoa', 120, 4.4, 21, 1.9, 'cereais'),
('Abacate', 'abacate', 160, 2, 8.5, 15, 'frutas'),
('Mel', 'mel', 304, 0.3, 82, 0, 'adocantes'),
('Açúcar', 'acucar', 387, 0, 100, 0, 'adocantes'),
('Manteiga', 'manteiga', 717, 0.9, 0.1, 81, 'laticinios'),
('Cream Cheese', 'cream cheese', 342, 6, 4, 34, 'laticinios'),
('Presunto', 'presunto', 145, 21, 1.5, 6, 'embutidos'),
('Peito de Peru', 'peito de peru', 104, 17, 4.2, 2, 'embutidos');