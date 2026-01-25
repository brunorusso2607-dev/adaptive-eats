-- Verificar quantas refeições de lanche da manhã existem no pool
SELECT 
  COUNT(*) as total_lanche_manha,
  COUNT(DISTINCT name) as nomes_unicos
FROM meal_combinations
WHERE meal_type = 'lanche_manha'
  AND is_active = true;

-- Ver todas as refeições de lanche da manhã
SELECT 
  name,
  created_at
FROM meal_combinations
WHERE meal_type = 'lanche_manha'
  AND is_active = true
ORDER BY created_at DESC;

-- Calcular combinações possíveis vs existentes
-- Template 1: fruta_nuts = 13 frutas × 4 nuts = 52 combinações
-- Template 2: iogurte = 3 dairy × 10 frutas = 30 combinações  
-- Template 3: batata_doce = 2 combinações
-- TOTAL = 84 combinações possíveis
