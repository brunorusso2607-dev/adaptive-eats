-- AUTO SYNC TRIGGERS - ADAPTIVE EATS
-- Triggers to automatically sync ingredients and meal pool

-- 1. Function to notify when new ingredient is added
CREATE OR REPLACE FUNCTION notify_new_ingredient()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_ingredient',
    json_build_object(
      'ingredient_key', NEW.ingredient_key,
      'category', NEW.category,
      'display_name_pt', NEW.display_name_pt,
      'display_name_en', NEW.display_name_en,
      'is_alternative', NEW.is_alternative,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new ingredients
DROP TRIGGER IF EXISTS trigger_notify_new_ingredient ON public.ingredient_pool;
CREATE TRIGGER trigger_notify_new_ingredient
  AFTER INSERT ON public.ingredient_pool
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_ingredient();

-- 2. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ingredient_pool updates
DROP TRIGGER IF EXISTS trigger_update_ingredient_pool_timestamp ON public.ingredient_pool;
CREATE TRIGGER trigger_update_ingredient_pool_timestamp
  BEFORE UPDATE ON public.ingredient_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Function to notify when new meal is added to pool
CREATE OR REPLACE FUNCTION notify_new_meal_combination()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'new_meal_combination',
    json_build_object(
      'id', NEW.id,
      'meal_name_pt', NEW.meal_name_pt,
      'meal_name_en', NEW.meal_name_en,
      'meal_type', NEW.meal_type,
      'country_code', NEW.country_code,
      'total_kcal', NEW.total_kcal,
      'timestamp', NOW()
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new meal combinations
DROP TRIGGER IF EXISTS trigger_notify_new_meal_combination ON public.meal_combinations;
CREATE TRIGGER trigger_notify_new_meal_combination
  AFTER INSERT ON public.meal_combinations
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_meal_combination();

-- 4. Cache version table
CREATE TABLE IF NOT EXISTS public.meal_pool_cache_version (
  id INTEGER PRIMARY KEY DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.meal_pool_cache_version (id, version, last_updated)
VALUES (1, 1, NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. Function to increment cache version
CREATE OR REPLACE FUNCTION increment_meal_pool_cache_version()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.meal_pool_cache_version
  SET version = version + 1,
      last_updated = NOW()
  WHERE id = 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to invalidate cache when meal_combinations changes
DROP TRIGGER IF EXISTS trigger_invalidate_meal_pool_cache ON public.meal_combinations;
CREATE TRIGGER trigger_invalidate_meal_pool_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.meal_combinations
  FOR EACH STATEMENT
  EXECUTE FUNCTION increment_meal_pool_cache_version();

-- 6. Function to check if ingredient exists
CREATE OR REPLACE FUNCTION check_ingredient_exists(ingredient_key_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ingredient_pool
    WHERE ingredient_key = ingredient_key_param
  );
END;
$$ LANGUAGE plpgsql;

-- 7. Function to sync ingredient from code to database
CREATE OR REPLACE FUNCTION sync_ingredient_to_pool(
  p_ingredient_key TEXT,
  p_display_name_pt TEXT,
  p_display_name_en TEXT,
  p_display_name_es TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_kcal_per_100g NUMERIC DEFAULT NULL,
  p_protein_per_100g NUMERIC DEFAULT NULL,
  p_carbs_per_100g NUMERIC DEFAULT NULL,
  p_fat_per_100g NUMERIC DEFAULT NULL,
  p_fiber_per_100g NUMERIC DEFAULT NULL,
  p_default_portion_grams INTEGER DEFAULT NULL,
  p_is_alternative BOOLEAN DEFAULT FALSE,
  p_country_code TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  ingredient_exists BOOLEAN;
BEGIN
  ingredient_exists := check_ingredient_exists(p_ingredient_key);
  
  IF ingredient_exists THEN
    UPDATE public.ingredient_pool
    SET
      display_name_pt = COALESCE(p_display_name_pt, display_name_pt),
      display_name_en = COALESCE(p_display_name_en, display_name_en),
      display_name_es = COALESCE(p_display_name_es, display_name_es),
      category = COALESCE(p_category, category),
      kcal_per_100g = COALESCE(p_kcal_per_100g, kcal_per_100g),
      protein_per_100g = COALESCE(p_protein_per_100g, protein_per_100g),
      carbs_per_100g = COALESCE(p_carbs_per_100g, carbs_per_100g),
      fat_per_100g = COALESCE(p_fat_per_100g, fat_per_100g),
      fiber_per_100g = COALESCE(p_fiber_per_100g, fiber_per_100g),
      default_portion_grams = COALESCE(p_default_portion_grams, default_portion_grams),
      country_code = COALESCE(p_country_code, country_code),
      updated_at = NOW()
    WHERE ingredient_key = p_ingredient_key;
    RETURN TRUE;
  ELSE
    INSERT INTO public.ingredient_pool (
      ingredient_key, display_name_pt, display_name_en, display_name_es,
      category, kcal_per_100g, protein_per_100g, carbs_per_100g,
      fat_per_100g, fiber_per_100g, default_portion_grams,
      is_alternative, country_code
    ) VALUES (
      p_ingredient_key, p_display_name_pt, p_display_name_en, p_display_name_es,
      p_category, p_kcal_per_100g, p_protein_per_100g, p_carbs_per_100g,
      p_fat_per_100g, p_fiber_per_100g, p_default_portion_grams,
      p_is_alternative, p_country_code
    );
    RETURN TRUE;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 8. View for sync status
CREATE OR REPLACE VIEW public.ingredients_sync_status AS
SELECT
  ip.ingredient_key,
  ip.display_name_pt,
  ip.category,
  ip.created_at,
  ip.updated_at,
  CASE
    WHEN ip.updated_at > (NOW() - INTERVAL '1 hour') THEN 'recently_updated'
    WHEN ip.created_at > (NOW() - INTERVAL '1 hour') THEN 'recently_created'
    ELSE 'stable'
  END as sync_status
FROM public.ingredient_pool ip
ORDER BY ip.updated_at DESC;
