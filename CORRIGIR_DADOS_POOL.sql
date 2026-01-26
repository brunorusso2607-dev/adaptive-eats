-- Corrigir as 2 refeições com calorias inválidas
-- Chá verde: 2 kcal → desativar (dados incorretos)
-- Mate Gelado com Limão: 10 kcal → pode ser válido, mas verificar

-- Desativar refeições com calorias muito baixas (< 50 kcal)
UPDATE meal_combinations
SET is_active = false
WHERE total_calories < 50
  AND is_active = true;

-- Verificar quantas foram desativadas
SELECT COUNT(*) as desativadas
FROM meal_combinations
WHERE total_calories < 50
  AND is_active = false;

-- Ver as refeições que foram desativadas
SELECT id, name, meal_type, total_calories
FROM meal_combinations
WHERE total_calories < 50
ORDER BY total_calories;
