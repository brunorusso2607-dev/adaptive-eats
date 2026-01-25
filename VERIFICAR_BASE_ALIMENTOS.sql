-- ANÁLISE DA BASE DE ALIMENTOS (canonical_ingredients)
-- Identificar alimentos problemáticos que não deveriam ser oferecidos isoladamente

-- 1. TEMPEROS E CONDIMENTOS
-- Identificar temperos que não devem ser refeições
SELECT 
  id,
  name,
  calories_per_100g,
  protein_per_100g,
  category
FROM canonical_ingredients
WHERE name ILIKE ANY(ARRAY[
  '%cenoura%',
  '%salsinha%',
  '%couve crua%',
  '%repolho%',
  '%vagem%',
  '%alho%',
  '%cebola%',
  '%pimenta%',
  '%sal%',
  '%açúcar%'
])
ORDER BY name;

-- 2. GORDURAS E ÓLEOS
-- Identificar gorduras que devem estar sempre acompanhadas
SELECT 
  id,
  name,
  calories_per_100g,
  fat_per_100g,
  category
FROM canonical_ingredients
WHERE name ILIKE ANY(ARRAY[
  '%azeite%',
  '%óleo%',
  '%manteiga%',
  '%margarina%'
])
ORDER BY name;

-- 3. ALIMENTOS QUE PRECISAM ACOMPANHAMENTO
-- Identificar alimentos que não devem ser oferecidos sozinhos
SELECT 
  id,
  name,
  calories_per_100g,
  category
FROM canonical_ingredients
WHERE name ILIKE ANY(ARRAY[
  '%torrada%',
  '%pão%',
  '%biscoito%',
  '%bolacha%'
])
ORDER BY name;

-- 4. ALIMENTOS QUESTIONÁVEIS
-- Melado de cana e outros alimentos que podem não fazer sentido
SELECT 
  id,
  name,
  calories_per_100g,
  carbs_per_100g,
  category
FROM canonical_ingredients
WHERE name ILIKE ANY(ARRAY[
  '%melado%',
  '%melaço%',
  '%xarope%'
])
ORDER BY name;

-- 5. ALIMENTOS MUITO GENÉRICOS
-- Identificar alimentos que precisam ser mais específicos
SELECT 
  id,
  name,
  calories_per_100g,
  category
FROM canonical_ingredients
WHERE name ILIKE ANY(ARRAY[
  '%alface americana%',
  '%salada%',
  '%verdura%',
  '%legume%'
])
ORDER BY name;

-- 6. RESUMO POR CATEGORIA
SELECT 
  category,
  COUNT(*) as total_ingredients,
  AVG(calories_per_100g) as avg_calories
FROM canonical_ingredients
GROUP BY category
ORDER BY total_ingredients DESC;
