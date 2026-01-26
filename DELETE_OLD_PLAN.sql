-- Deletar plano antigo com week_number incorreto

-- Primeiro, deletar os meal_plan_items do plano ativo
DELETE FROM meal_plan_items 
WHERE meal_plan_id IN (
  SELECT id FROM meal_plans 
  WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND is_active = true
);

-- Depois, deletar o plano ativo
DELETE FROM meal_plans 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND is_active = true;

-- Verificar se foi deletado
SELECT COUNT(*) as planos_ativos FROM meal_plans 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1)
  AND is_active = true;
