-- Verificar se iogurte está mapeado para FODMAP (INCORRETO)
-- Iogurte deveria estar apenas em LACTOSE, não em FODMAP

-- 1. Verificar mapeamentos atuais de iogurte
SELECT 
    intolerance_key, 
    ingredient, 
    severity_level,
    CASE 
        WHEN intolerance_key = 'fodmap' THEN '❌ INCORRETO - Iogurte NÃO é FODMAP'
        WHEN intolerance_key = 'lactose' THEN '✅ CORRETO - Iogurte é LACTOSE'
        ELSE '⚠️ Verificar'
    END as status
FROM intolerance_mappings 
WHERE ingredient ILIKE '%iogurte%' 
   OR ingredient ILIKE '%yogurt%'
   OR ingredient ILIKE '%yoghurt%'
ORDER BY intolerance_key;

-- 2. Se existir iogurte em FODMAP, REMOVER
DELETE FROM intolerance_mappings 
WHERE intolerance_key = 'fodmap' 
  AND (ingredient ILIKE '%iogurte%' OR ingredient ILIKE '%yogurt%' OR ingredient ILIKE '%yoghurt%');

-- 3. Garantir que iogurte está em LACTOSE (se não existir, adicionar)
INSERT INTO intolerance_mappings (intolerance_key, ingredient, severity_level, language)
SELECT 'lactose', 'iogurte', 'high', 'pt'
WHERE NOT EXISTS (
    SELECT 1 FROM intolerance_mappings 
    WHERE intolerance_key = 'lactose' AND ingredient = 'iogurte'
);

INSERT INTO intolerance_mappings (intolerance_key, ingredient, severity_level, language)
SELECT 'lactose', 'yogurt', 'high', 'en'
WHERE NOT EXISTS (
    SELECT 1 FROM intolerance_mappings 
    WHERE intolerance_key = 'lactose' AND ingredient = 'yogurt'
);

-- 4. Verificar resultado final
SELECT 
    intolerance_key, 
    ingredient, 
    severity_level
FROM intolerance_mappings 
WHERE ingredient ILIKE '%iogurte%' 
   OR ingredient ILIKE '%yogurt%'
ORDER BY intolerance_key;
