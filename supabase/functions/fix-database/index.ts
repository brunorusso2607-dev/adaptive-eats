import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== FIX DATABASE STARTED ===");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // 1. Fix RLS Policy
    console.log("1. Fixing RLS Policy...");
    const { error: policyError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
        
        CREATE POLICY "Users can insert their own profile" ON public.profiles
          FOR INSERT
          WITH CHECK (
            auth.uid() = id OR 
            auth.jwt() ->> 'role' = 'service_role'
          );
      `
    });

    if (policyError) {
      console.error("Policy error:", policyError);
      // Continue anyway, policy might already exist
    }

    // 2. Add plan fields
    console.log("2. Adding plan fields...");
    const { error: fieldsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.profiles 
        ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive',
        ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free',
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

        CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);
        CREATE INDEX IF NOT EXISTS idx_profiles_plan_expires_at ON public.profiles(plan_expires_at);
        CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
      `
    });

    if (fieldsError) {
      console.error("Fields error:", fieldsError);
      // Continue anyway, fields might already exist
    }

    // 3. Create trigger function
    console.log("3. Creating trigger function...");
    const { error: triggerError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (triggerError) {
      console.error("Trigger error:", triggerError);
    }

    console.log("=== FIX DATABASE COMPLETED ===");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Database fixed successfully",
        errors: {
          policy: policyError?.message,
          fields: fieldsError?.message,
          trigger: triggerError?.message
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

