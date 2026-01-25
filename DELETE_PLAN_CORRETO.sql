-- Deletar plano ativo do usuário (versão corrigida)

-- Primeiro, pegar o ID do plano ativo
DO $$
DECLARE
  plan_id_to_delete UUID;
  user_id_var UUID;
BEGIN
  -- Pegar ID do usuário
  SELECT id INTO user_id_var FROM auth.users LIMIT 1;
  
  -- Pegar ID do plano ativo
  SELECT id INTO plan_id_to_delete 
  FROM meal_plans 
  WHERE user_id = user_id_var 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Deletar itens do plano
  IF plan_id_to_delete IS NOT NULL THEN
    DELETE FROM meal_plan_items WHERE meal_plan_id = plan_id_to_delete;
    RAISE NOTICE 'Deleted items for plan: %', plan_id_to_delete;
    
    -- Deletar o plano
    DELETE FROM meal_plans WHERE id = plan_id_to_delete;
    RAISE NOTICE 'Deleted plan: %', plan_id_to_delete;
  ELSE
    RAISE NOTICE 'No active plan found';
  END IF;
END $$;

-- Verificar se foi deletado
SELECT COUNT(*) as planos_ativos 
FROM meal_plans 
WHERE user_id = (SELECT id FROM auth.users LIMIT 1) 
  AND is_active = true;
