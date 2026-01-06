import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price IDs from Stripe
const PRICE_IDS = {
  essencial: "price_1Sg9N6Ch4FnxqOQFbN0RhBzy",
  premium: "price_1Sg9ODCh4FnxqOQFkKsIJZOX",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const { returnUrl, plan = "premium", email } = await req.json();
    
    // Validate plan
    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS];
    if (!priceId) {
      throw new Error(`Invalid plan: ${plan}`);
    }

    logStep("Plan selected", { plan, priceId, email });

    // Check if customer exists by email using fetch
    let customerId: string | undefined;
    
    if (email) {
      const customersResponse = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
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

    // Create checkout session using fetch
    const sessionResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
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
