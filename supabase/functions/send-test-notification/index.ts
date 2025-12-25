import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[TEST-PUSH] Function started");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get authorization header to identify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[TEST-PUSH] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from JWT
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("[TEST-PUSH] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TEST-PUSH] User authenticated:", user.id);

    // Get user's push subscription
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (subsError) {
      console.error("[TEST-PUSH] Subscription query error:", subsError.message);
      throw subsError;
    }

    console.log("[TEST-PUSH] Found subscriptions:", subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma inscrição push encontrada. Ative as notificações primeiro." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert notification into database - this will show in the notification bell
    const { error: insertError } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: "🎉 Teste de notificação!",
      message: "As notificações push estão funcionando perfeitamente!",
      type: "test",
      action_url: "/dashboard",
    });

    if (insertError) {
      console.error("[TEST-PUSH] Insert error:", insertError.message);
      throw insertError;
    }

    console.log("[TEST-PUSH] Notification inserted successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notificação de teste enviada! Verifique o sino de notificações.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TEST-PUSH] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});