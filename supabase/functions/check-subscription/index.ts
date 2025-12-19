import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1RVVjnRuiGbcMYaJUJERpDlW": "essencial",
  "price_1RVVk4RuiGbcMYaJclJuGdvq": "premium",
  "price_1Sg9ODCh4FnxqOQFkKsIJZOX": "premium", // Add the price from the subscription
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, user is not subscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 10,
    });

    logStep("Retrieved subscriptions", { 
      count: subscriptions.data.length,
      subscriptions: subscriptions.data.map((s: { id: string; status: string; current_period_end?: number; trial_end?: number | null }) => ({ 
        id: s.id, 
        status: s.status,
        current_period_end: s.current_period_end,
        trial_end: s.trial_end
      }))
    });

    // Filter for active or trialing subscriptions
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
      
      // Get the price ID to determine the plan
      const priceId = subscription.items.data[0]?.price?.id;
      plan = PRICE_TO_PLAN[priceId] || "essencial"; // Default to essencial if unknown
      
      // Handle subscription end date safely
      const endTimestamp = subscription.current_period_end || subscription.trial_end;
      if (endTimestamp && typeof endTimestamp === 'number') {
        subscriptionEnd = new Date(endTimestamp * 1000).toISOString();
      }
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        status,
        priceId,
        plan,
        endDate: subscriptionEnd,
        current_period_end: subscription.current_period_end,
        trial_end: subscription.trial_end
      });
    } else {
      logStep("No active subscription found");
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
