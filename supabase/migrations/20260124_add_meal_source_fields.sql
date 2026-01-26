-- Migration: Adicionar campos de origem da refeição
-- Data: 2026-01-24
-- Descrição: Adiciona campos para rastrear de onde cada refeição veio (pool, templates, IA)

-- Adicionar campo source_type para identificar a origem da refeição
ALTER TABLE meal_plan_items 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'unknown';

-- Adicionar campo from_pool para compatibilidade com código existente
ALTER TABLE meal_plan_items 
ADD COLUMN IF NOT EXISTS from_pool BOOLEAN DEFAULT false;

-- Comentários explicativos
COMMENT ON COLUMN meal_plan_items.source_type IS 'Origem da refeição: pool, direct, ai, fallback, unknown';
COMMENT ON COLUMN meal_plan_items.from_pool IS 'Se a refeição veio do pool de refeições aprovadas (meal_combinations)';

-- Atualizar refeições existentes baseado em heurística
-- Se tem pool_meal_id ou nome contém padrões do pool, marca como pool
UPDATE meal_plan_items 
SET source_type = 'unknown', from_pool = false 
WHERE source_type IS NULL;
