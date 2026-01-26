-- MIGRATION: Remove non-core intolerances (SAFE VERSION)
-- Execute this in Supabase SQL Editor
-- Keep only: lactose, gluten, fodmap

-- 1. Remove from onboarding_options (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_options') THEN
        DELETE FROM onboarding_options 
        WHERE option_key IN (
          'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 
          'seafood', 'fish', 'salicylate', 'salicylates', 
          'sulfite', 'sulfites', 'fructose', 'histamine'
        )
        AND category IN ('intolerances', 'allergies', 'sensitivities');
        
        RAISE NOTICE 'Deleted from onboarding_options';
    ELSE
        RAISE NOTICE 'Table onboarding_options does not exist';
    END IF;
END $$;

-- 2. Remove from intolerance_mappings (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intolerance_mappings') THEN
        DELETE FROM intolerance_mappings 
        WHERE intolerance_key IN (
          'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
          'seafood', 'fish', 'salicylate', 'salicylates',
          'sulfite', 'sulfites', 'fructose', 'histamine'
        );
        
        RAISE NOTICE 'Deleted from intolerance_mappings';
    ELSE
        RAISE NOTICE 'Table intolerance_mappings does not exist';
    END IF;
END $$;

-- 3. Remove from intolerance_key_normalization (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intolerance_key_normalization') THEN
        DELETE FROM intolerance_key_normalization 
        WHERE canonical_key IN (
          'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
          'seafood', 'fish', 'salicylate', 'salicylates',
          'sulfite', 'sulfites', 'fructose', 'histamine'
        );
        
        RAISE NOTICE 'Deleted from intolerance_key_normalization';
    ELSE
        RAISE NOTICE 'Table intolerance_key_normalization does not exist';
    END IF;
END $$;

-- 4. Remove from user_intolerances (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_intolerances') THEN
        DELETE FROM user_intolerances 
        WHERE intolerance_key IN (
          'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
          'seafood', 'fish', 'salicylate', 'salicylates',
          'sulfite', 'sulfites', 'fructose', 'histamine'
        );
        
        RAISE NOTICE 'Deleted from user_intolerances';
    ELSE
        RAISE NOTICE 'Table user_intolerances does not exist';
    END IF;
END $$;

-- 5. Clean blocked_for_intolerances in meal_combinations (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meal_combinations') THEN
        UPDATE meal_combinations
        SET blocked_for_intolerances = ARRAY(
          SELECT unnest(blocked_for_intolerances)
          EXCEPT
          SELECT unnest(ARRAY[
            'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
            'seafood', 'fish', 'salicylate', 'salicylates',
            'sulfite', 'sulfites', 'fructose', 'histamine'
          ])
        )
        WHERE blocked_for_intolerances && ARRAY[
          'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
          'seafood', 'fish', 'salicylate', 'salicylates',
          'sulfite', 'sulfites', 'fructose', 'histamine'
        ];
        
        RAISE NOTICE 'Cleaned meal_combinations';
    ELSE
        RAISE NOTICE 'Table meal_combinations does not exist';
    END IF;
END $$;

-- 6. Clean blocked_for_intolerances in recipes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recipes') THEN
        UPDATE recipes
        SET blocked_for_intolerances = ARRAY(
          SELECT unnest(blocked_for_intolerances)
          EXCEPT
          SELECT unnest(ARRAY[
            'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
            'seafood', 'fish', 'salicylate', 'salicylates',
            'sulfite', 'sulfites', 'fructose', 'histamine'
          ])
        )
        WHERE blocked_for_intolerances && ARRAY[
          'egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts',
          'seafood', 'fish', 'salicylate', 'salicylates',
          'sulfite', 'sulfites', 'fructose', 'histamine'
        ];
        
        RAISE NOTICE 'Cleaned recipes';
    ELSE
        RAISE NOTICE 'Table recipes does not exist';
    END IF;
END $$;

-- Verify results
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICATION RESULTS ===';
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'onboarding_options') THEN
        PERFORM pg_notify('migration_log', 
            'onboarding_options remaining: ' || 
            (SELECT COUNT(*)::text FROM onboarding_options 
             WHERE option_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine')
             AND category IN ('intolerances', 'allergies', 'sensitivities'))
        );
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intolerance_mappings') THEN
        PERFORM pg_notify('migration_log', 
            'intolerance_mappings remaining: ' || 
            (SELECT COUNT(*)::text FROM intolerance_mappings 
             WHERE intolerance_key IN ('egg', 'eggs', 'soy', 'peanut', 'tree_nuts', 'nuts', 'seafood', 'fish', 'salicylate', 'salicylates', 'sulfite', 'sulfites', 'fructose', 'histamine'))
        );
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;
