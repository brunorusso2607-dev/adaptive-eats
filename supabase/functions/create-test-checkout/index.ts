import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price ID do plano de teste (R$ 297/ano)
const TEST_PRICE_ID = "price_1SqCdpCcXxVrGn1qcvcAAsza";

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-TEST-CHECKOUT] ${step}`, details ? JSON.stringify(details) : "");
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
  
  // Permitir GET para verificar se a função está funcionando
  if (req.method === "GET") {
    return new Response(JSON.stringify({ 
      message: "POST method required to create checkout session",
      usage: "Send POST request with {email: 'user@email.com'} to create Stripe checkout session",
      priceId: TEST_PRICE_ID
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
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

    // Parse request body - email é opcional
    let email: string | undefined;
    try {
      const body = await req.json();
      email = body.email;
    } catch {
      // Se não conseguir parsear o body, continuar sem email
      logStep("No body provided, continuing without email");
    }

    logStep("Request received", { email, priceId: TEST_PRICE_ID });

    const stripeHeaders = new Headers();
    stripeHeaders.set("Authorization", `Bearer ${stripeSecretKey}`);
    stripeHeaders.set("Content-Type", "application/x-www-form-urlencoded");

    // Para Accounts v2 em testmode, precisamos criar um customer vazio primeiro
    // O email será preenchido pelo usuário no formulário do Stripe
    logStep("Creating temporary customer for Accounts v2...");
    
    const createCustomerParams = new URLSearchParams();
    createCustomerParams.append("metadata[source]", "test_checkout");
    createCustomerParams.append("metadata[created_at]", new Date().toISOString());
    
    const createCustomerResponse = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: stripeHeaders,
      body: createCustomerParams.toString(),
    });
    
    const customerData = await createCustomerResponse.json();
    
    if (!createCustomerResponse.ok) {
      console.error("Stripe customer creation error:", customerData);
      throw new Error(customerData.error?.message || "Failed to create customer");
    }
    
    const customerId = customerData.id;
    logStep("Temporary customer created", { customerId });

    // Build checkout session params
    const params = new URLSearchParams();
    params.append("payment_method_types[0]", "card");
    params.append("line_items[0][price]", TEST_PRICE_ID);
    params.append("line_items[0][quantity]", "1");
    params.append("mode", "subscription");
    params.append("success_url", "http://localhost:8080/ativar?session_id={CHECKOUT_SESSION_ID}");
    params.append("cancel_url", "http://localhost:8080?canceled=true");
    
    // Sempre usar o customer ID (obrigatório para Accounts v2)
    if (!customerId) {
      throw new Error("Failed to create or find customer");
    }
    params.append("customer", customerId);
    logStep("Using customer", { customerId });

    // Create checkout session via REST API
    logStep("Creating checkout session...");
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

    logStep("Checkout session created", { sessionId: sessionData.id, url: sessionData.url });

    return new Response(JSON.stringify({ 
      checkout_url: sessionData.url,
      session_id: sessionData.id 
    }), {
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

