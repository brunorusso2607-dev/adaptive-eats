-- Testar filtro de país que o código usa

-- Simular o filtro exato do código (linha 1541-1542)
SELECT 
  meal_type,
  COUNT(*) as quantidade_filtrada
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
  AND (country_codes IS NULL OR country_codes @> '["BR"]'::jsonb)
GROUP BY meal_type
ORDER BY meal_type;

-- Ver exemplos de country_codes
SELECT 
  meal_type,
  country_codes,
  COUNT(*) as quantidade
FROM meal_combinations
WHERE is_active = true
  AND approval_status = 'approved'
GROUP BY meal_type, country_codes
ORDER BY meal_type, quantidade DESC;
