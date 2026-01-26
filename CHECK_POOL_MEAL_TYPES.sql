-- Verificar tipos de refeição no pool aprovado
SELECT 
  meal_type,
  COUNT(*) as quantidade,
  ROUND(AVG(total_calories)) as media_calorias
FROM meal_combinations
WHERE is_active = true 
AND approval_status = 'approved'
AND 'BR' = ANY(country_codes)
GROUP BY meal_type
ORDER BY quantidade DESC;

-- Verificar refeições habilitadas do seu perfil
SELECT 
  enabled_meals,
  email
FROM profiles
WHERE email = 'brunorusso212@gmail.com';
