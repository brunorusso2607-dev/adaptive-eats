-- Insert nutritional strategies from admin screenshots
INSERT INTO public.nutritional_strategies (key, label, description, icon, calorie_modifier, protein_per_kg, carb_ratio, fat_ratio, is_flexible, is_active, sort_order)
VALUES
  ('weight_loss', 'Déficit calórico', 'Redução gradual para perda de peso sustentável', 'TrendingDown', -500, 1.6, 0.40, 0.30, false, true, 1),
  ('cutting', 'Definição muscular', 'Déficit moderado preservando massa magra', 'Dumbbell', -300, 2.0, 0.35, 0.30, false, false, 2),
  ('maintenance', 'Manutenção', 'Equilíbrio para manter peso atual', 'Scale', 0, 1.4, 0.45, 0.30, false, true, 3),
  ('fitness', 'Estilo fitness', 'Foco em performance e composição corporal', 'Dumbbell', 0, 1.8, 0.45, 0.25, false, false, 4),
  ('weight_gain', 'Ganho de peso', 'Superávit calórico controlado', 'TrendingUp', 300, 1.6, 0.50, 0.25, false, true, 5),
  ('flexible_diet', 'Dieta flexível', 'Sem restrições rígidas de macros', 'Utensils', 0, 1.2, 0.50, 0.30, true, false, 6)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  calorie_modifier = EXCLUDED.calorie_modifier,
  protein_per_kg = EXCLUDED.protein_per_kg,
  carb_ratio = EXCLUDED.carb_ratio,
  fat_ratio = EXCLUDED.fat_ratio,
  is_flexible = EXCLUDED.is_flexible,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();