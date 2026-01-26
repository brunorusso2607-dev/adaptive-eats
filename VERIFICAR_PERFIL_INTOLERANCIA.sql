-- Verificar se intolerância a lactose está salva corretamente no perfil
SELECT 
  id,
  intolerances,
  dietary_preference,
  excluded_ingredients,
  goal,
  strategy_key
FROM profiles
WHERE intolerances IS NOT NULL
  OR excluded_ingredients IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Verificar formato específico das intolerâncias
SELECT 
  id,
  intolerances::text as intolerances_raw,
  jsonb_array_length(intolerances) as num_intolerances
FROM profiles
WHERE intolerances IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
