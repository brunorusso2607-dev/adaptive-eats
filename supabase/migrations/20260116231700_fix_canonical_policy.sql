-- Fix duplicate policy error for canonical_ingredients
-- Use IF NOT EXISTS approach to avoid conflicts
-- Only execute if table exists

DO $$
BEGIN
    -- Check if table exists before trying to drop/create policy
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'canonical_ingredients'
    ) THEN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Allow read access for authenticated users" ON public.canonical_ingredients;
        
        -- Create policy if not exists
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'canonical_ingredients' 
            AND policyname = 'Allow read access for authenticated users'
        ) THEN
            CREATE POLICY "Allow read access for authenticated users" ON public.canonical_ingredients
                FOR SELECT
                TO authenticated
                USING (true);
        END IF;
    END IF;
END;
$$;
