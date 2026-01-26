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
    console.log("=== TEST CREATE USER V2 ===");
    
    const { email, action } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Action: fix_trigger - Fix the handle_new_user trigger
    if (action === "fix_trigger") {
      console.log("Fixing handle_new_user trigger...");
      
      // Update the trigger function to be more robust
      const { error: triggerError } = await supabaseAdmin.from('_temp_fix').select('*').limit(0);
      
      // We can't run raw SQL directly, but we can test if profiles table accepts inserts
      const testId = crypto.randomUUID();
      const { error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: testId,
          email: 'test_trigger_fix@test.com',
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      // Delete test record
      await supabaseAdmin.from('profiles').delete().eq('id', testId);
      
      return new Response(
        JSON.stringify({ 
          success: !insertError,
          message: insertError ? `Insert test failed: ${insertError.message}` : "Profiles table accepts inserts",
          insertError: insertError?.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Action: check_admin - Check if admin user exists
    if (action === "check_admin") {
      console.log("Checking admin user:", email);
      
      let existingUser = null;
      let page = 1;
      const perPage = 1000;
      
      while (true) {
        const { data: usersPage } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });
        
        if (!usersPage?.users || usersPage.users.length === 0) {
          break;
        }
        
        existingUser = usersPage.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
        
        if (existingUser || usersPage.users.length < perPage) {
          break;
        }
        
        page++;
      }
      
      if (existingUser) {
        // Check if admin
        const { data: roleData } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', existingUser.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        // Check profile
        const { data: profileData } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', existingUser.id)
          .maybeSingle();
        
        return new Response(
          JSON.stringify({ 
            success: true,
            userExists: true,
            userId: existingUser.id,
            email: existingUser.email,
            isAdmin: !!roleData,
            hasProfile: !!profileData,
            profile: profileData,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          userExists: false,
          message: "User not found",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Action: generate_link - Generate magic link for existing user
    if (action === "generate_link") {
      console.log("Generating magic link for:", email);
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${req.headers.get("origin") || 'http://localhost:8081'}/dashboard`,
        },
      });

      if (linkError) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: linkError.message,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          tokenHash: linkData.properties?.hashed_token,
          type: "magiclink",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
    
    // Default action: create user
    if (!email) {
      throw new Error("Email required");
    }

    console.log("Creating user:", email);

    const tempPassword = crypto.randomUUID();
    console.log("Password generated");

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    });

    if (error) {
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // If error is "Database error", try to get more info
      if (error.message?.includes("Database error")) {
        // Check if profiles table has issues
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .limit(1);
        
        return new Response(
          JSON.stringify({ 
            error: "Database error creating new user",
            details: error.message,
            profileTableAccessible: !profileError,
            profileError: profileError?.message,
            hint: "The handle_new_user trigger may be failing. Check if profiles table has correct schema.",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }
      
      throw error;
    }

    console.log("User created successfully:", data.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: data.user.id,
        email: data.user.email 
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
      status: 400,
    });
  }
});

