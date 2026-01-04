
-- Migração para padronizar goal e dietary_preference em inglês
-- Isso facilita internacionalização e consistência com outros campos (sex, activity_level)

-- ============================================
-- PASSO 1: Criar novos ENUMs com valores em inglês
-- ============================================

-- Novo ENUM para user_goal em inglês
CREATE TYPE public.user_goal_new AS ENUM ('lose_weight', 'maintain', 'gain_weight');

-- Novo ENUM para dietary_preference em inglês
CREATE TYPE public.dietary_preference_new AS ENUM (
  'omnivore',      -- comum
  'vegetarian',    -- vegetariana  
  'vegan',         -- vegana
  'low_carb',      -- low_carb (já em inglês, manter)
  'pescatarian',   -- pescetariana
  'ketogenic',     -- cetogenica
  'flexitarian'    -- flexitariana
);

-- ============================================
-- PASSO 2: Adicionar colunas temporárias
-- ============================================

ALTER TABLE public.profiles 
ADD COLUMN goal_new public.user_goal_new,
ADD COLUMN dietary_preference_new public.dietary_preference_new;

-- ============================================
-- PASSO 3: Migrar dados existentes
-- ============================================

-- Migrar goal
UPDATE public.profiles SET goal_new = 
  CASE goal::text
    WHEN 'emagrecer' THEN 'lose_weight'::public.user_goal_new
    WHEN 'manter' THEN 'maintain'::public.user_goal_new
    WHEN 'ganhar_peso' THEN 'gain_weight'::public.user_goal_new
    ELSE NULL
  END
WHERE goal IS NOT NULL;

-- Migrar dietary_preference
UPDATE public.profiles SET dietary_preference_new = 
  CASE dietary_preference::text
    WHEN 'comum' THEN 'omnivore'::public.dietary_preference_new
    WHEN 'vegetariana' THEN 'vegetarian'::public.dietary_preference_new
    WHEN 'vegana' THEN 'vegan'::public.dietary_preference_new
    WHEN 'low_carb' THEN 'low_carb'::public.dietary_preference_new
    WHEN 'pescetariana' THEN 'pescatarian'::public.dietary_preference_new
    WHEN 'cetogenica' THEN 'ketogenic'::public.dietary_preference_new
    WHEN 'flexitariana' THEN 'flexitarian'::public.dietary_preference_new
    ELSE NULL
  END
WHERE dietary_preference IS NOT NULL;

-- ============================================
-- PASSO 4: Remover colunas antigas e renomear novas
-- ============================================

ALTER TABLE public.profiles DROP COLUMN goal;
ALTER TABLE public.profiles DROP COLUMN dietary_preference;

ALTER TABLE public.profiles RENAME COLUMN goal_new TO goal;
ALTER TABLE public.profiles RENAME COLUMN dietary_preference_new TO dietary_preference;

-- ============================================
-- PASSO 5: Remover ENUMs antigos e renomear novos
-- ============================================

DROP TYPE public.user_goal;
DROP TYPE public.dietary_preference;

ALTER TYPE public.user_goal_new RENAME TO user_goal;
ALTER TYPE public.dietary_preference_new RENAME TO dietary_preference;

-- ============================================
-- PASSO 6: Definir valores padrão
-- ============================================

ALTER TABLE public.profiles 
ALTER COLUMN goal SET DEFAULT 'maintain'::public.user_goal,
ALTER COLUMN dietary_preference SET DEFAULT 'omnivore'::public.dietary_preference;
