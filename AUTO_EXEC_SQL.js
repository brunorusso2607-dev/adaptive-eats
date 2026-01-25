// Auto-executar SQL via Supabase REST API
// Execute este script no Node.js para rodar SQL automaticamente

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://onzdkpqtzfxzcdyxczkn.supabase.co';
const supabaseKey = 'cd201337eefbeedb5088e1affe2e26cb191b40db620a237434dbe86241d35714'; // Service Role Key

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
-- 1. FIX PROFILES RLS POLICY
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id OR 
    auth.jwt() ->> 'role' = 'service_role'
  );

-- 2. ADD PLAN FIELDS TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON public.profiles(plan_expires_at);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- 3. CREATE WEBHOOK TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION handle_subscription_update()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.profiles 
        SET 
            subscription_status = CASE 
                WHEN NEW.is_active = true THEN 'active'
                ELSE 'inactive'
            END,
            plan_expires_at = CASE 
                WHEN NEW.is_active = true THEN 
                    (CURRENT_TIMESTAMP + INTERVAL '31 days')
                ELSE NULL
            END,
            plan_type = CASE 
                WHEN NEW.is_active = true THEN 'premium'
                ELSE 'free'
            END,
            stripe_customer_id = NEW.stripe_customer_id,
            stripe_subscription_id = NEW.stripe_subscription_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profile_on_subscription_change ON public.user_subscriptions;
CREATE TRIGGER update_profile_on_subscription_change
    AFTER INSERT OR UPDATE ON public.user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION handle_subscription_update();

GRANT EXECUTE ON FUNCTION handle_subscription_update() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_subscription_update() TO service_role;
`;

async function executeSQL() {
  try {
    console.log('Executando SQL automaticamente...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      console.error('Erro:', error);
    } else {
      console.log('✅ SQL executado com sucesso!');
      console.log('Resultado:', data);
    }
  } catch (err) {
    console.error('Erro ao executar:', err);
  }
}

executeSQL();
