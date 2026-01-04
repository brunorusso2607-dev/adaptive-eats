-- MIGRAÇÃO 1: meal_type de português para inglês
-- Mapeamento:
-- cafe_manha → breakfast
-- lanche_manha → morning_snack  
-- almoco → lunch
-- lanche → afternoon_snack (também lanche_tarde)
-- jantar → dinner
-- ceia → supper

-- 1. Atualizar meal_time_settings
UPDATE meal_time_settings SET meal_type = 'breakfast' WHERE meal_type = 'cafe_manha';
UPDATE meal_time_settings SET meal_type = 'morning_snack' WHERE meal_type = 'lanche_manha';
UPDATE meal_time_settings SET meal_type = 'lunch' WHERE meal_type = 'almoco';
UPDATE meal_time_settings SET meal_type = 'afternoon_snack' WHERE meal_type IN ('lanche', 'lanche_tarde');
UPDATE meal_time_settings SET meal_type = 'dinner' WHERE meal_type = 'jantar';
UPDATE meal_time_settings SET meal_type = 'supper' WHERE meal_type = 'ceia';

-- 2. Atualizar meal_plan_items
UPDATE meal_plan_items SET meal_type = 'breakfast' WHERE meal_type = 'cafe_manha';
UPDATE meal_plan_items SET meal_type = 'morning_snack' WHERE meal_type = 'lanche_manha';
UPDATE meal_plan_items SET meal_type = 'lunch' WHERE meal_type = 'almoco';
UPDATE meal_plan_items SET meal_type = 'afternoon_snack' WHERE meal_type IN ('lanche', 'lanche_tarde');
UPDATE meal_plan_items SET meal_type = 'dinner' WHERE meal_type = 'jantar';
UPDATE meal_plan_items SET meal_type = 'supper' WHERE meal_type = 'ceia';

-- 3. Atualizar simple_meals
UPDATE simple_meals SET meal_type = 'breakfast' WHERE meal_type = 'cafe_manha';
UPDATE simple_meals SET meal_type = 'morning_snack' WHERE meal_type = 'lanche_manha';
UPDATE simple_meals SET meal_type = 'lunch' WHERE meal_type = 'almoco';
UPDATE simple_meals SET meal_type = 'afternoon_snack' WHERE meal_type IN ('lanche', 'lanche_tarde');
UPDATE simple_meals SET meal_type = 'dinner' WHERE meal_type = 'jantar';
UPDATE simple_meals SET meal_type = 'supper' WHERE meal_type = 'ceia';

-- 4. Atualizar compatible_meal_times em simple_meals (array)
UPDATE simple_meals SET compatible_meal_times = 
  array_replace(
    array_replace(
      array_replace(
        array_replace(
          array_replace(
            array_replace(compatible_meal_times, 'cafe_manha', 'breakfast'),
            'lanche_manha', 'morning_snack'),
          'almoco', 'lunch'),
        'lanche', 'afternoon_snack'),
      'jantar', 'dinner'),
    'ceia', 'supper')
WHERE compatible_meal_times IS NOT NULL;

-- Também converter lanche_tarde
UPDATE simple_meals SET compatible_meal_times = 
  array_replace(compatible_meal_times, 'lanche_tarde', 'afternoon_snack')
WHERE compatible_meal_times IS NOT NULL AND 'lanche_tarde' = ANY(compatible_meal_times);

-- 5. Atualizar meal_consumption
UPDATE meal_consumption SET detected_meal_type = 'breakfast' WHERE detected_meal_type = 'cafe_manha';
UPDATE meal_consumption SET detected_meal_type = 'morning_snack' WHERE detected_meal_type = 'lanche_manha';
UPDATE meal_consumption SET detected_meal_type = 'lunch' WHERE detected_meal_type = 'almoco';
UPDATE meal_consumption SET detected_meal_type = 'afternoon_snack' WHERE detected_meal_type IN ('lanche', 'lanche_tarde');
UPDATE meal_consumption SET detected_meal_type = 'dinner' WHERE detected_meal_type = 'jantar';
UPDATE meal_consumption SET detected_meal_type = 'supper' WHERE detected_meal_type = 'ceia';

-- 6. Atualizar enabled_meals em meal_reminder_settings (array)
UPDATE meal_reminder_settings SET enabled_meals = 
  array_replace(
    array_replace(
      array_replace(
        array_replace(
          array_replace(
            array_replace(enabled_meals, 'cafe_manha', 'breakfast'),
            'lanche_manha', 'morning_snack'),
          'almoco', 'lunch'),
        'lanche', 'afternoon_snack'),
      'jantar', 'dinner'),
    'ceia', 'supper')
WHERE enabled_meals IS NOT NULL;

UPDATE meal_reminder_settings SET enabled_meals = 
  array_replace(enabled_meals, 'lanche_tarde', 'afternoon_snack')
WHERE enabled_meals IS NOT NULL AND 'lanche_tarde' = ANY(enabled_meals);

-- 7. Atualizar enabled_meals em profiles (array)
UPDATE profiles SET enabled_meals = 
  array_replace(
    array_replace(
      array_replace(
        array_replace(
          array_replace(
            array_replace(enabled_meals, 'cafe_manha', 'breakfast'),
            'lanche_manha', 'morning_snack'),
          'almoco', 'lunch'),
        'lanche', 'afternoon_snack'),
      'jantar', 'dinner'),
    'ceia', 'supper')
WHERE enabled_meals IS NOT NULL;

UPDATE profiles SET enabled_meals = 
  array_replace(enabled_meals, 'lanche_tarde', 'afternoon_snack')
WHERE enabled_meals IS NOT NULL AND 'lanche_tarde' = ANY(enabled_meals);