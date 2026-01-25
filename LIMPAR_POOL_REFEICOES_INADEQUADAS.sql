-- ============================================
-- LIMPAR POOL DE REFEIÇÕES INADEQUADAS
-- ============================================

-- 1. Identificar refeições com combinações inadequadas
SELECT 
  id,
  name,
  meal_type,
  created_at
FROM meal_combinations
WHERE is_active = true
  AND (
    -- Pão com ovo cozido
    name ILIKE '%pão%ovo cozido%'
    OR name ILIKE '%pao%ovo cozido%'
    
    -- Iogurte com pera
    OR (name ILIKE '%iogurte%' AND name ILIKE '%pera%')
    OR (name ILIKE '%yogurt%' AND name ILIKE '%pera%')
    
    -- Iogurte com melancia
    OR (name ILIKE '%iogurte%' AND name ILIKE '%melancia%')
    
    -- Iogurte com abacate
    OR (name ILIKE '%iogurte%' AND name ILIKE '%abacate%')
    
    -- Cuscuz com peito de peru
    OR (name ILIKE '%cuscuz%' AND name ILIKE '%peito de peru%')
    
    -- Tapioca com presunto
    OR (name ILIKE '%tapioca%' AND name ILIKE '%presunto%')
    
    -- Pão com peito de peru sozinho (sem queijo)
    OR (name ILIKE '%pão%peito de peru%' AND name NOT ILIKE '%queijo%' AND name NOT ILIKE '%cottage%' AND name NOT ILIKE '%requeijão%')
    OR (name ILIKE '%pao%peito de peru%' AND name NOT ILIKE '%queijo%' AND name NOT ILIKE '%cottage%' AND name NOT ILIKE '%requeijao%')
    
    -- Pão com presunto sozinho
    OR (name ILIKE '%pão%presunto%' AND name NOT ILIKE '%queijo%')
    OR (name ILIKE '%pao%presunto%' AND name NOT ILIKE '%queijo%')
  )
ORDER BY created_at DESC;

-- 2. DESATIVAR (não deletar) refeições inadequadas
UPDATE meal_combinations
SET 
  is_active = false,
  approval_status = 'rejected'
WHERE is_active = true
  AND (
    -- Pão com ovo cozido
    name ILIKE '%pão%ovo cozido%'
    OR name ILIKE '%pao%ovo cozido%'
    
    -- Iogurte com pera
    OR (name ILIKE '%iogurte%' AND name ILIKE '%pera%')
    OR (name ILIKE '%yogurt%' AND name ILIKE '%pera%')
    
    -- Iogurte com melancia
    OR (name ILIKE '%iogurte%' AND name ILIKE '%melancia%')
    
    -- Iogurte com abacate
    OR (name ILIKE '%iogurte%' AND name ILIKE '%abacate%')
    
    -- Cuscuz com peito de peru
    OR (name ILIKE '%cuscuz%' AND name ILIKE '%peito de peru%')
    
    -- Tapioca com presunto
    OR (name ILIKE '%tapioca%' AND name ILIKE '%presunto%')
    
    -- Pão com peito de peru sozinho
    OR (name ILIKE '%pão%peito de peru%' AND name NOT ILIKE '%queijo%' AND name NOT ILIKE '%cottage%' AND name NOT ILIKE '%requeijão%')
    OR (name ILIKE '%pao%peito de peru%' AND name NOT ILIKE '%queijo%' AND name NOT ILIKE '%cottage%' AND name NOT ILIKE '%requeijao%')
    
    -- Pão com presunto sozinho
    OR (name ILIKE '%pão%presunto%' AND name NOT ILIKE '%queijo%')
    OR (name ILIKE '%pao%presunto%' AND name NOT ILIKE '%queijo%')
  );

-- 3. Verificar quantas foram desativadas
SELECT 
  COUNT(*) as total_desativadas
FROM meal_combinations
WHERE is_active = false
  AND approval_status = 'rejected';

-- 4. Verificar pool limpo
SELECT 
  meal_type,
  COUNT(*) as total_ativas
FROM meal_combinations
WHERE is_active = true
GROUP BY meal_type
ORDER BY meal_type;
