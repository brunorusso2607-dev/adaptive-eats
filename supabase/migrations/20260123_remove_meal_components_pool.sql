-- ============================================
-- REMOVE OBSOLETE TABLE: meal_components_pool
-- ============================================
-- Esta tabela não é mais utilizada pelo sistema.
-- O pool de refeições agora usa meal-ingredients-db.ts (TypeScript hardcoded)
-- com 100+ ingredientes e macros TACO/TBCA.
--
-- Data: 2026-01-23
-- Motivo: Tabela obsoleta, não utilizada pelo código atual
-- ============================================

-- Remover índices primeiro
DROP INDEX IF EXISTS idx_meal_components_pool_country;
DROP INDEX IF EXISTS idx_meal_components_pool_meal_type;
DROP INDEX IF EXISTS idx_meal_components_pool_type;
DROP INDEX IF EXISTS idx_meal_components_pool_blocked;
DROP INDEX IF EXISTS idx_meal_components_pool_safe;
DROP INDEX IF EXISTS idx_meal_components_pool_active;

-- Remover políticas RLS
DROP POLICY IF EXISTS "Anyone can view active meal_components_pool" ON public.meal_components_pool;
DROP POLICY IF EXISTS "Admins can view all meal_components_pool" ON public.meal_components_pool;
DROP POLICY IF EXISTS "Admins can insert meal_components_pool" ON public.meal_components_pool;
DROP POLICY IF EXISTS "Admins can update meal_components_pool" ON public.meal_components_pool;
DROP POLICY IF EXISTS "Admins can delete meal_components_pool" ON public.meal_components_pool;
DROP POLICY IF EXISTS "Service can manage meal_components_pool" ON public.meal_components_pool;

-- Remover trigger
DROP TRIGGER IF EXISTS update_meal_components_pool_updated_at ON public.meal_components_pool;

-- Remover tabela
DROP TABLE IF EXISTS public.meal_components_pool CASCADE;

-- Comentário de confirmação
COMMENT ON SCHEMA public IS 'meal_components_pool removed - pool now uses TypeScript hardcoded ingredients (meal-ingredients-db.ts)';
