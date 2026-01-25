-- ============================================
-- VERIFICAR PERFIL DO USUÁRIO
-- ============================================

-- Verificar se o perfil tem todos os campos necessários
SELECT 
  id,
  weight,
  height,
  age,
  gender,
  activity_level,
  goal,
  country_code,
  enabled_meals,
  intolerances,
  dietary_preference,
  excluded_ingredients
FROM user_profiles
ORDER BY created_at DESC
LIMIT 1;

-- Verificar se há algum perfil com dados faltando
SELECT 
  id,
  CASE 
    WHEN weight IS NULL THEN 'weight missing'
    WHEN height IS NULL THEN 'height missing'
    WHEN age IS NULL THEN 'age missing'
    WHEN gender IS NULL THEN 'gender missing'
    WHEN activity_level IS NULL THEN 'activity_level missing'
    WHEN goal IS NULL THEN 'goal missing'
    ELSE 'profile complete'
  END as status
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;
