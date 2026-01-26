-- Adicionar feature flag para "Montar Meu Plano" (manual meal plan builder)
-- Quando desabilitada, o usuário pula direto para criação com IA

INSERT INTO feature_flags (feature_key, display_name, description, is_enabled)
VALUES (
  'manual_meal_plan_builder',
  'Montar Meu Plano',
  'Habilita a opção de montar plano manualmente na tela de criação de plano alimentar. Quando desabilitada, o usuário é direcionado diretamente para criação com IA.',
  false -- Começa desabilitada
)
ON CONFLICT (feature_key) DO NOTHING;
