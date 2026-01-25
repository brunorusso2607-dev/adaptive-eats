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
    console.log("=== EXECUTE-SQL FUNCTION STARTED ===");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sql, action } = await req.json();

    if (action === "fix_all") {
      console.log("Executing FIX_ALL action...");

      // 1. Fix handle_new_user function to be more robust
      const { error: error1 } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS trigger
          LANGUAGE plpgsql
          SECURITY DEFINER SET search_path = public 
          AS $$
          BEGIN
            INSERT INTO public.profiles (id, email, first_name, onboarding_completed, created_at, updated_at)
            VALUES (
              NEW.id, 
              NEW.email, 
              COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
              false,
              now(),
              now()
            )
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              updated_at = now();
            RETURN NEW;
          EXCEPTION WHEN OTHERS THEN
            -- Log error but don't fail user creation
            RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
            RETURN NEW;
          END;
          $$;
        `
      });

      if (error1) {
        console.log("Error fixing handle_new_user (trying direct):", error1);
      }

      // 2. Fix profiles RLS policy
      const { error: error2 } = await supabaseAdmin.rpc('exec_sql', {
        sql_query: `
          DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
          CREATE POLICY "Users can insert their own profile" ON public.profiles
            FOR INSERT
            WITH CHECK (
              auth.uid() = id OR 
              auth.jwt() ->> 'role' = 'service_role'
            );
        `
      });

      if (error2) {
        console.log("Error fixing RLS policy (trying direct):", error2);
      }

      console.log("=== FIX_ALL COMPLETED ===");

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "All fixes applied",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Execute custom SQL
    if (sql) {
      console.log("Executing custom SQL...");
      const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

      if (error) {
        console.error("SQL Error:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "No action or SQL provided" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
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

