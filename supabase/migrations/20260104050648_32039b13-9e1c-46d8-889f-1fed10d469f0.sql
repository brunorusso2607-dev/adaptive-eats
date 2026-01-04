-- Migrate nutritional_strategies.key from Portuguese to English

-- Update the strategy keys
UPDATE nutritional_strategies SET key = 'weight_loss' WHERE key = 'emagrecer';
UPDATE nutritional_strategies SET key = 'maintenance' WHERE key = 'manter';
UPDATE nutritional_strategies SET key = 'weight_gain' WHERE key = 'ganhar_peso';
UPDATE nutritional_strategies SET key = 'flexible_diet' WHERE key = 'dieta_flexivel';
-- 'cutting' and 'fitness' are already in English, no change needed