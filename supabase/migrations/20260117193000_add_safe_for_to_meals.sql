-- ============================================================
-- ADICIONAR CAMPO safe_for À TABELA meal_combinations
-- ============================================================

-- 1. Adicionar coluna safe_for
ALTER TABLE meal_combinations
ADD COLUMN IF NOT EXISTS safe_for text[] DEFAULT '{}';

-- 2. Criar índice GIN para busca eficiente
CREATE INDEX IF NOT EXISTS idx_meal_combinations_safe_for 
ON meal_combinations USING GIN(safe_for);

-- 3. Marcar refeições "SEM GLÚTEN" como seguras para intolerantes ao glúten
UPDATE meal_combinations
SET safe_for = array_append(safe_for, 'gluten')
WHERE (
  name ILIKE '%sem glúten%' 
  OR name ILIKE '%sem gluten%'
  OR name ILIKE '%gluten free%'
  OR name ILIKE '%gluten-free%'
  OR name ILIKE '%sin gluten%'
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE comp->>'name' ILIKE '%sem glúten%'
       OR comp->>'name' ILIKE '%sem gluten%'
       OR comp->>'name' ILIKE '%gluten free%'
       OR comp->>'name' ILIKE '%gluten-free%'
  )
)
AND NOT ('gluten' = ANY(safe_for));

-- 4. Marcar refeições "SEM LACTOSE" como seguras para intolerantes à lactose
UPDATE meal_combinations
SET safe_for = array_append(safe_for, 'lactose')
WHERE (
  name ILIKE '%sem lactose%'
  OR name ILIKE '%lactose free%'
  OR name ILIKE '%lactose-free%'
  OR name ILIKE '%sin lactosa%'
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE comp->>'name' ILIKE '%sem lactose%'
       OR comp->>'name' ILIKE '%lactose free%'
       OR comp->>'name' ILIKE '%lactose-free%'
       OR comp->>'name' ILIKE '%leite sem lactose%'
       OR comp->>'name' ILIKE '%queijo sem lactose%'
       OR comp->>'name' ILIKE '%iogurte sem lactose%'
  )
)
AND NOT ('lactose' = ANY(safe_for));

-- 5. Marcar refeições "SEM AÇÚCAR" como seguras para sensíveis ao açúcar
UPDATE meal_combinations
SET safe_for = array_append(safe_for, 'sugar')
WHERE (
  name ILIKE '%sem açúcar%'
  OR name ILIKE '%sem acucar%'
  OR name ILIKE '%sugar free%'
  OR name ILIKE '%sugar-free%'
  OR name ILIKE '%sin azúcar%'
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(components) AS comp
    WHERE comp->>'name' ILIKE '%sem açúcar%'
       OR comp->>'name' ILIKE '%sem acucar%'
       OR comp->>'name' ILIKE '%sugar free%'
  )
)
AND NOT ('sugar' = ANY(safe_for));

-- 6. Comentário explicativo
COMMENT ON COLUMN meal_combinations.safe_for IS 
'Array de intolerâncias para as quais esta refeição é SEGURA. Ex: ["lactose", "gluten"] significa que a refeição é segura para intolerantes à lactose E ao glúten (ex: leite sem lactose, pão sem glúten).';
