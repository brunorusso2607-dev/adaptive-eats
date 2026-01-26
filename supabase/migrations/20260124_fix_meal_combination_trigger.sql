-- Fix trigger that references non-existent columns
-- The trigger was referencing meal_name_pt, meal_name_en, country_code, total_kcal
-- But the table uses: name, country_codes (array), total_calories

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS trigger_notify_new_meal_combination ON public.meal_combinations;

-- Recreate the function with correct column names
CREATE OR REPLACE FUNCTION notify_new_meal_combination()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_meal_combination',
    json_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'meal_type', NEW.meal_type,
      'country_codes', NEW.country_codes,
      'total_calories', NEW.total_calories,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_notify_new_meal_combination
  AFTER INSERT ON public.meal_combinations
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_meal_combination();
