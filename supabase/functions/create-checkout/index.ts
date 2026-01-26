import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lookup keys for plans (set these in Stripe when creating prices)
const PLAN_LOOKUP_KEYS = {
  essencial: "essencial_monthly",
  premium: "premium_monthly",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

// Sanitize API key - remove any whitespace/non-ASCII characters that can break Stripe auth
function sanitizeApiKey(key: string | undefined): string {
  if (!key) return "";
  return key
    .trim()
    .replace(/\s+/g, "")
    .replace(/["']/g, "")
    .replace(/[^\x21-\x7E]/g, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const rawStripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const stripeSecretKey = sanitizeApiKey(rawStripeKey);
    
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    if (!stripeSecretKey.startsWith("sk_test_") && !stripeSecretKey.startsWith("sk_live_")) {
      throw new Error("Invalid STRIPE_SECRET_KEY format. Must start with sk_test_ or sk_live_");
    }

    logStep("Stripe key sanitized", {
      length: stripeSecretKey.length,
      prefix: stripeSecretKey.slice(0, 8),
      suffix: stripeSecretKey.slice(-4),
    });

    const { returnUrl, plan = "premium", email } = await req.json();
    
    const lookupKey = PLAN_LOOKUP_KEYS[plan as keyof typeof PLAN_LOOKUP_KEYS];
    if (!lookupKey) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    logStep("Plan selected", { plan, lookupKey, email });

    const stripeHeaders = new Headers();
    stripeHeaders.set("Authorization", `Bearer ${stripeSecretKey}`);
    stripeHeaders.set("Content-Type", "application/x-www-form-urlencoded");

    // Fetch price by lookup_key
    const pricesResponse = await fetch(
      `https://api.stripe.com/v1/prices?lookup_keys[]=${encodeURIComponent(lookupKey)}&active=true&limit=1`,
      { method: "GET", headers: stripeHeaders }
    );

    const pricesData = await pricesResponse.json();
    
    if (!pricesResponse.ok) {
      console.error("Stripe prices API error:", pricesData);
      throw new Error(pricesData.error?.message || "Failed to fetch prices");
    }

    if (!pricesData.data || pricesData.data.length === 0) {
      throw new Error(`No active price found for lookup_key: ${lookupKey}. Please create a price in Stripe with this lookup_key.`);
    }

    const priceId = pricesData.data[0].id;
    logStep("Price found", { priceId, lookupKey });

    // Check if customer exists by email
    let customerId: string | undefined;
    
    if (email) {
      const customersResponse = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
        { method: "GET", headers: stripeHeaders }
      );
      
      if (customersResponse.ok) {
        const customersData = await customersResponse.json();
        if (customersData.data && customersData.data.length > 0) {
          customerId = customersData.data[0].id;
          logStep("Existing customer found", { customerId });
        }
      }
    }

    // Build checkout session params
    const params = new URLSearchParams();
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price]", priceId);
    params.append("line_items[0][quantity]", "1");
    params.append("mode", "subscription");
    params.append("subscription_data[trial_period_days]", "7");
    params.append("success_url", `${returnUrl}/ativar?session_id={CHECKOUT_SESSION_ID}`);
    params.append("cancel_url", `${returnUrl}?canceled=true`);
    
    if (customerId) {
      params.append("customer", customerId);
    } else if (email) {
      params.append("customer_email", email);
    }

    // Create checkout session
    const sessionResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: stripeHeaders,
      body: params.toString(),
    });

    const sessionData = await sessionResponse.json();

    if (!sessionResponse.ok) {
      console.error("Stripe API error:", sessionData);
      throw new Error(sessionData.error?.message || "Failed to create checkout session");
    }

    logStep("Checkout session created", { sessionId: sessionData.id });

    return new Response(JSON.stringify({ url: sessionData.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
