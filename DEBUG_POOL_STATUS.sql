-- ============================================
-- DEBUG: VERIFICAR STATUS DO POOL
-- ============================================

-- 1. Verificar quantas refeições foram aprovadas
SELECT 
  approval_status,
  COUNT(*) as total,
  STRING_AGG(DISTINCT meal_type, ', ') as meal_types
FROM meal_combinations
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '5 hours'
GROUP BY approval_status;

-- 2. Verificar refeições aprovadas por tipo
SELECT 
  meal_type,
  COUNT(*) as total,
  STRING_AGG(name, ' | ') as meal_names
FROM meal_combinations
WHERE approval_status = 'approved'
AND is_active = true
AND 'BR' = ANY(country_codes)
GROUP BY meal_type
ORDER BY meal_type;

-- 3. Verificar se há refeições aprovadas ativas para BR
SELECT 
  COUNT(*) as total_approved_active_br
FROM meal_combinations
WHERE approval_status = 'approved'
AND is_active = true
AND 'BR' = ANY(country_codes);

-- 4. Mostrar algumas refeições aprovadas
SELECT 
  id,
  name,
  meal_type,
  total_calories,
  approval_status,
  is_active,
  country_codes
FROM meal_combinations
WHERE approval_status = 'approved'
AND is_active = true
AND 'BR' = ANY(country_codes)
ORDER BY meal_type, name
LIMIT 20;

-- 5. Verificar se há algum erro de tipo de refeição
SELECT DISTINCT meal_type
FROM meal_combinations
WHERE approval_status = 'approved'
AND is_active = true
ORDER BY meal_type;

-- 6. Contar por tipo de refeição (com nomes em português)
SELECT 
  meal_type,
  COUNT(*) as total,
  AVG(total_calories)::int as avg_calories
FROM meal_combinations
WHERE approval_status = 'approved'
AND is_active = true
AND 'BR' = ANY(country_codes)
GROUP BY meal_type
ORDER BY 
  CASE meal_type
    WHEN 'cafe_manha' THEN 1
    WHEN 'lanche_manha' THEN 2
    WHEN 'almoco' THEN 3
    WHEN 'lanche_tarde' THEN 4
    WHEN 'jantar' THEN 5
    WHEN 'ceia' THEN 6
    ELSE 99
  END;
