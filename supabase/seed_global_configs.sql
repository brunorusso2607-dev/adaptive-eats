-- ============================================================
-- SEED: Configurações Globais do Sistema
-- ============================================================

-- 1. HORÁRIOS DAS REFEIÇÕES (meal_time_settings)
INSERT INTO public.meal_time_settings (meal_type, start_hour, end_hour, label, icon_name, is_active, sort_order)
VALUES 
  ('cafe_manha', 6, 10, 'Café da Manhã', 'sunrise', true, 1),
  ('lanche_manha', 9, 11, 'Lanche da Manhã', 'coffee', true, 2),
  ('almoco', 11, 14, 'Almoço', 'sun', true, 3),
  ('lanche_tarde', 14, 17, 'Lanche da Tarde', 'cookie', true, 4),
  ('jantar', 18, 21, 'Jantar', 'moon', true, 5),
  ('ceia', 21, 23, 'Ceia', 'moon-star', true, 6)
ON CONFLICT (meal_type) DO NOTHING;

-- 2. IDIOMAS SUPORTADOS (supported_languages)
INSERT INTO public.supported_languages (language_code, language_name, native_name, flag_emoji, is_active, is_default, sort_order, translation_coverage)
VALUES 
  ('pt-BR', 'Portuguese (Brazil)', 'Português (Brasil)', '🇧🇷', true, true, 1, 100),
  ('en-US', 'English (US)', 'English (US)', '🇺🇸', true, false, 2, 80),
  ('es-ES', 'Spanish', 'Español', '🇪🇸', true, false, 3, 70),
  ('fr-FR', 'French', 'Français', '🇫🇷', false, false, 4, 50),
  ('de-DE', 'German', 'Deutsch', '🇩🇪', false, false, 5, 50),
  ('it-IT', 'Italian', 'Italiano', '🇮🇹', false, false, 6, 50)
ON CONFLICT (language_code) DO NOTHING;

-- 3. TIPOS DE SINTOMAS (symptom_types)
INSERT INTO public.symptom_types (symptom_key, label, description, icon_name, severity_level, is_active, sort_order)
VALUES 
  ('nausea', 'Náusea', 'Enjoo ou vontade de vomitar', 'frown', 'medium', true, 1),
  ('stomach_pain', 'Dor de Estômago', 'Dor ou desconforto abdominal', 'activity', 'high', true, 2),
  ('bloating', 'Inchaço', 'Sensação de barriga inchada', 'circle', 'low', true, 3),
  ('diarrhea', 'Diarreia', 'Evacuações líquidas frequentes', 'droplet', 'high', true, 4),
  ('constipation', 'Constipação', 'Dificuldade para evacuar', 'pause', 'medium', true, 5),
  ('gas', 'Gases', 'Flatulência excessiva', 'wind', 'low', true, 6),
  ('heartburn', 'Azia', 'Queimação no estômago/esôfago', 'flame', 'medium', true, 7),
  ('headache', 'Dor de Cabeça', 'Cefaleia após refeição', 'zap', 'medium', true, 8),
  ('fatigue', 'Fadiga', 'Cansaço excessivo após comer', 'battery', 'low', true, 9),
  ('skin_reaction', 'Reação na Pele', 'Coceira, vermelhidão, urticária', 'alert-triangle', 'high', true, 10)
ON CONFLICT (symptom_key) DO NOTHING;

-- 4. FEATURE FLAGS (funcionalidades do sistema)
INSERT INTO public.feature_flags (flag_key, label, description, is_enabled, category, sort_order)
VALUES 
  ('meal_plans', 'Planos Alimentares', 'Geração de planos alimentares por IA', true, 'core', 1),
  ('photo_analysis', 'Análise de Fotos', 'Análise de fotos de refeições', true, 'ai', 2),
  ('symptom_tracking', 'Rastreamento de Sintomas', 'Registro de sintomas pós-refeição', true, 'health', 3),
  ('water_tracking', 'Rastreamento de Água', 'Controle de consumo de água', true, 'health', 4),
  ('weight_tracking', 'Rastreamento de Peso', 'Histórico de peso corporal', true, 'health', 5),
  ('gamification', 'Gamificação', 'Sistema de conquistas e pontos', true, 'engagement', 6),
  ('push_notifications', 'Notificações Push', 'Lembretes e alertas', true, 'engagement', 7),
  ('kids_mode', 'Modo Kids', 'Interface simplificada para crianças', true, 'special', 8),
  ('meal_pool', 'Pool de Refeições', 'Refeições pré-validadas', true, 'core', 9),
  ('spoonacular_import', 'Importação Spoonacular', 'Importar receitas do Spoonacular', false, 'import', 10)
ON CONFLICT (flag_key) DO NOTHING;

-- 5. PERFIS DIETÉTICOS (dietary_profiles)
INSERT INTO public.dietary_profiles (profile_key, label, description, icon_name, color, is_active, sort_order, requires_validation)
VALUES 
  ('vegan', 'Vegano', 'Sem produtos de origem animal', 'leaf', 'green', true, 1, true),
  ('vegetarian', 'Vegetariano', 'Sem carnes, com laticínios e ovos', 'salad', 'lime', true, 2, true),
  ('pescatarian', 'Pescetariano', 'Sem carnes, com peixes', 'fish', 'blue', true, 3, true),
  ('flexitarian', 'Flexitariano', 'Vegetariano com carne ocasional', 'leaf', 'emerald', true, 4, false),
  ('omnivore', 'Onívoro', 'Come de tudo', 'utensils', 'gray', true, 5, false),
  ('low_carb', 'Low Carb', 'Baixo carboidrato', 'beef', 'orange', true, 6, false),
  ('keto', 'Cetogênico', 'Muito baixo carbo, alta gordura', 'flame', 'red', true, 7, false)
ON CONFLICT (profile_key) DO NOTHING;
