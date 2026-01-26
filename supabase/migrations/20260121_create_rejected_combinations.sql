-- Criar tabela para armazenar combinações de ingredientes rejeitadas
CREATE TABLE IF NOT EXISTS rejected_meal_combinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type TEXT NOT NULL,
  country_code TEXT NOT NULL,
  ingredient_ids TEXT[] NOT NULL, -- Array de IDs dos ingredientes (sorted)
  combination_hash TEXT NOT NULL UNIQUE, -- Hash único da combinação
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT, -- Opcional: motivo da rejeição
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rejected_combinations_meal_type ON rejected_meal_combinations(meal_type);
CREATE INDEX IF NOT EXISTS idx_rejected_combinations_country ON rejected_meal_combinations(country_code);
CREATE INDEX IF NOT EXISTS idx_rejected_combinations_hash ON rejected_meal_combinations(combination_hash);

-- Comentários
COMMENT ON TABLE rejected_meal_combinations IS 'Armazena combinações de ingredientes que foram rejeitadas pelo admin e não devem ser geradas novamente';
COMMENT ON COLUMN rejected_meal_combinations.combination_hash IS 'Hash MD5 dos ingredient_ids ordenados para garantir unicidade';
