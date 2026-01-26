# 🔧 EXECUÇÃO MANUAL FINAL - GESTÃO COMPLETA

## ❌ PROBLEMA IDENTIFICADO

A API REST do Supabase está bloqueando execução automática via script. Precisa executar manualmente.

## ✅ SOLUÇÃO: EXECUTE ESTE SQL ÚNICO

**Acesse:** https://supabase.com/dashboard/project/onzdkpqtzfxzcdyxczkn/sql/new

**Cole todo este SQL de uma vez:**

```sql
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
```

## 🎯 APÓS EXECUTAR

1. **Teste criação de usuário:** Abra `c:\adaptive-eats-main\TEST_DIRETO.html`
2. **Se funcionar:** Teste fluxo Stripe completo
3. **Me avise para finalizar!**

---

**Este é o passo final manual necessário!** 🚀
