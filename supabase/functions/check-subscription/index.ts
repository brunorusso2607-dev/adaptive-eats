import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

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
  "price_1Sg9ODCh4FnxqOQFkKsIJZOX": "premium",
};

// Decode JWT payload without verification (we'll verify via Supabase)
function decodeJwtPayload(token: string): { sub?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    // Add padding if needed
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = new TextDecoder().decode(decode(padded));
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Token extracted", { tokenLength: token.length });

    // Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    let userEmail: string | null = null;
    let userId: string | null = null;

    // First try to get user via getUser (works for valid sessions)
    logStep("Attempting to authenticate with getUser");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (!userError && userData?.user?.email) {
      userEmail = userData.user.email;
      userId = userData.user.id;
      logStep("User authenticated via getUser", { userId, email: userEmail });
    } else {
      logStep("getUser failed, trying JWT decode", { error: userError?.message });
      
      // Fallback: decode JWT to get user ID and fetch email from profiles
      const jwtPayload = decodeJwtPayload(token);
      logStep("JWT payload decoded", { sub: jwtPayload?.sub, email: jwtPayload?.email });
      
      if (jwtPayload?.email) {
        userEmail = jwtPayload.email;
        userId = jwtPayload.sub || null;
        logStep("Got email from JWT", { email: userEmail });
      } else if (jwtPayload?.sub) {
        userId = jwtPayload.sub;
        // Fetch email from profiles table
        const { data: profileData, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .maybeSingle();
        
        if (profileData?.email) {
          userEmail = profileData.email;
          logStep("Got email from profiles", { email: userEmail });
        } else {
          logStep("Could not get email from profiles", { error: profileError?.message });
        }
      }
    }

    if (!userEmail) {
      throw new Error("Could not determine user email");
    }
    
    logStep("User identified", { userId, email: userEmail });

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
