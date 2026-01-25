-- ============================================
-- APROVAR REFEIÇÕES DO POOL
-- ============================================
-- As refeições inseridas manualmente estão com approval_status = 'pending'
-- O sistema só usa refeições com approval_status = 'approved'
-- Este script aprova todas as refeições inseridas manualmente

-- Aprovar todas as refeições do pool
UPDATE meal_combinations
SET approval_status = 'approved'
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '3 hours'
AND approval_status = 'pending';

-- Verificar resultado
SELECT 
  approval_status,
  COUNT(*) as total,
  STRING_AGG(DISTINCT meal_type, ', ') as meal_types
FROM meal_combinations 
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '3 hours'
GROUP BY approval_status;

-- Mostrar algumas refeições aprovadas
SELECT 
  name,
  meal_type,
  total_calories,
  approval_status,
  is_active
FROM meal_combinations
WHERE source = 'manual'
AND created_at > NOW() - INTERVAL '3 hours'
ORDER BY meal_type, name
LIMIT 10;
