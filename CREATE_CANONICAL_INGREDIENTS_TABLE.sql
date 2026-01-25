-- Criar tabela canonical_ingredients se não existir

CREATE TABLE IF NOT EXISTS canonical_ingredients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  calories_per_100g NUMERIC,
  protein_per_100g NUMERIC,
  carbs_per_100g NUMERIC,
  fat_per_100g NUMERIC,
  fiber_per_100g NUMERIC,
  allergens_static TEXT[],
  allergens_dynamic TEXT[],
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_category 
ON canonical_ingredients(category);

CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_calories 
ON canonical_ingredients(calories_per_100g);

CREATE INDEX IF NOT EXISTS idx_canonical_ingredients_name 
ON canonical_ingredients(name);

-- Comentários
COMMENT ON TABLE canonical_ingredients IS 'Tabela de ingredientes canônicos para substituições inteligentes';
COMMENT ON COLUMN canonical_ingredients.id IS 'ID único do ingrediente (ex: frango_grelhado)';
COMMENT ON COLUMN canonical_ingredients.category IS 'Categoria nutricional (protein, carbohydrate, vegetable, etc)';
COMMENT ON COLUMN canonical_ingredients.source IS 'Fonte dos dados (TACO, TBCA, USDA, etc)';

-- Verificar se foi criada
SELECT 
  'Tabela criada com sucesso!' as status,
  COUNT(*) as total_ingredientes
FROM canonical_ingredients;
