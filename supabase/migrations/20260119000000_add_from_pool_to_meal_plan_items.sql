-- ============================================
-- ADICIONAR COLUNA from_pool EM meal_plan_items
-- ============================================
-- Esta coluna identifica refeições que vieram do pool
-- vs refeições geradas pela IA

-- Adicionar coluna from_pool
ALTER TABLE meal_plan_items 
ADD COLUMN IF NOT EXISTS from_pool BOOLEAN DEFAULT false;

-- Comentário da coluna
COMMENT ON COLUMN meal_plan_items.from_pool IS 'Indica se a refeição veio do pool de refeições pré-aprovadas (true) ou foi gerada pela IA (false)';

-- Criar índice para facilitar queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_from_pool 
ON meal_plan_items(from_pool) 
WHERE from_pool = true;
