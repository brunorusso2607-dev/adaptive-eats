-- Deletar plano antigo para testar com pool

-- 1. Deletar itens do plano
DELETE FROM meal_plan_items WHERE meal_plan_id IN (
  SELECT id FROM meal_plans WHERE user_id = (SELECT id FROM auth.users LIMIT 1) AND is_active = true
);

-- 2. Deletar o plano
DELETE FROM meal_plans WHERE user_id = (SELECT id FROM auth.users LIMIT 1) AND is_active = true;

-- 3. Verificar se foi deletado
SELECT COUNT(*) as planos_ativos FROM meal_plans WHERE user_id = (SELECT id FROM auth.users LIMIT 1) AND is_active = true;
