-- ============================================
-- FIX: Remover iogurte de FODMAP (está incorreto)
-- Iogurte é LACTOSE, não FODMAP!
-- ============================================

-- 1. VERIFICAR o problema (execute primeiro para ver)
SELECT intolerance_key, ingredient, severity_level 
FROM intolerance_mappings 
WHERE ingredient ILIKE '%iogurte%' OR ingredient ILIKE '%yogurt%';

-- 2. REMOVER iogurte de FODMAP (está errado)
DELETE FROM intolerance_mappings 
WHERE intolerance_key = 'fodmap' 
  AND (ingredient ILIKE '%iogurte%' OR ingredient ILIKE '%yogurt%');

-- 3. VERIFICAR resultado
SELECT intolerance_key, ingredient, severity_level 
FROM intolerance_mappings 
WHERE ingredient ILIKE '%iogurte%' OR ingredient ILIKE '%yogurt%';
