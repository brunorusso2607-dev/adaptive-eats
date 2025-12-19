import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[ACTIVATE-ACCOUNT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, sessionId } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    logStep("Activating account", { email, sessionId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    // Verify the checkout session if provided
    if (sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      logStep("Session retrieved", { 
        sessionEmail: session.customer_email,
        status: session.payment_status 
      });

      // Verify email matches the session
      if (session.customer_email && session.customer_email.toLowerCase() !== email.toLowerCase()) {
        throw new Error("Email não corresponde ao usado no pagamento");
      }
    }

    // Check if customer exists in Stripe with active subscription
    const customers = await stripe.customers.list({ email, limit: 1 });
    
    if (customers.data.length === 0) {
      throw new Error("Nenhum pagamento encontrado para este email. Por favor, faça sua assinatura primeiro.");
    }

    const customerId = customers.data[0].id;
    logStep("Customer found", { customerId });

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    const hasActiveOrTrial = subscriptions.data.some(
      (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
    );

    if (!hasActiveOrTrial) {
      throw new Error("Nenhuma assinatura ativa encontrada. Por favor, faça sua assinatura primeiro.");
    }

    logStep("Active subscription confirmed");

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Generate a random password (user won't need it since we'll create a session)
    const tempPassword = crypto.randomUUID();

    // Try to create user, or get existing one
    let userId: string;
    
    // First check if user exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      userId = existingUser.id;
      logStep("Existing user found", { userId });
    } else {
      // Create new user with auto-confirm
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          stripe_customer_id: customerId,
        },
      });

      if (createError) {
        logStep("Error creating user", { error: createError.message });
        throw new Error("Erro ao criar conta. Por favor, tente novamente.");
      }

      userId = newUser.user.id;
      logStep("New user created", { userId });
    }

    // Generate a magic link for the user (this creates a session token)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo: `${req.headers.get("origin")}/dashboard`,
      },
    });

    if (linkError) {
      logStep("Error generating link", { error: linkError.message });
      throw new Error("Erro ao gerar link de acesso.");
    }

    logStep("Magic link generated", { userId });

    // Return the verification token from the link
    const token = linkData.properties?.hashed_token;
    const actionLink = linkData.properties?.action_link;

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        actionLink, // This is the full magic link URL
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    console.error("Activation error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
