import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// ============================================================
// BYPASS MODE: Set to true to skip Stripe verification
// All logged-in users will have premium access
// Set to false to re-enable Stripe verification
// ============================================================
const BYPASS_STRIPE_FOR_TESTING = true;
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");

    // Create admin client to verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Verify user is logged in
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !userData?.user) {
      throw new Error("User not authenticated");
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    logStep("User authenticated", { userId, email: userEmail });

    // BYPASS MODE: Return premium access for all logged-in users
    if (BYPASS_STRIPE_FOR_TESTING) {
      logStep("BYPASS MODE ACTIVE - Granting premium access", { userId });
      return new Response(JSON.stringify({
        subscribed: true,
        plan: "premium",
        status: "active",
        subscription_end: null,
        bypass_mode: true // Flag to indicate this is bypass mode
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Normal Stripe verification (only runs if BYPASS_STRIPE_FOR_TESTING is false)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const { default: Stripe } = await import("https://esm.sh/stripe@18.5.0");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user is not subscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    const activeSubs = subscriptions.data.filter((s: { status: string }) => 
      s.status === 'active' || s.status === 'trialing'
    );

    const hasActiveSub = activeSubs.length > 0;
    
    let plan: string | null = null;
    let subscriptionEnd: string | null = null;
    let status: string | null = null;

    if (hasActiveSub) {
      const subscription = activeSubs[0];
      status = subscription.status;
      plan = "premium"; // Default to premium
      
      const endTimestamp = subscription.current_period_end || subscription.trial_end;
      if (endTimestamp && typeof endTimestamp === 'number') {
        subscriptionEnd = new Date(endTimestamp * 1000).toISOString();
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        status,
        plan,
        endDate: subscriptionEnd
      });
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      status,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

