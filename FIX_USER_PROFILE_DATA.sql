-- ============================================
-- CORRIGIR DADOS DO PERFIL DO USUÁRIO
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- IMPORTANTE: Altere os valores abaixo com SEUS dados reais!

UPDATE profiles
SET 
  weight_current = 75,        -- SEU PESO ATUAL em kg
  weight_goal = 70,           -- SEU PESO META em kg
  height = 175,               -- SUA ALTURA em cm
  age = 30,                   -- SUA IDADE em anos
  sex = 'male',               -- 'male' ou 'female'
  activity_level = 'moderate', -- 'sedentary', 'light', 'moderate', 'active', 'very_active'
  strategy_id = (
    SELECT id FROM nutritional_strategies 
    WHERE key = 'weight_loss' 
    LIMIT 1
  )
WHERE id = 'd003d59f-49b2-4e55-b3ca-1c79e0b7a5c3';

-- Verificar se foi atualizado
SELECT 
  weight_current,
  weight_goal,
  height,
  age,
  sex,
  activity_level,
  goal
FROM profiles
WHERE id = 'd003d59f-49b2-4e55-b3ca-1c79e0b7a5c3';
