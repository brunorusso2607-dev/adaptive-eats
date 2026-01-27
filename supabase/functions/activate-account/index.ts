import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[ACTIVATE-ACCOUNT] ${step}`, details ? JSON.stringify(details) : "");
};

// ============================================================
// BYPASS MODE: When true, allows login without Stripe verification
// Set to false to re-enable payment verification
// ============================================================
const BYPASS_STRIPE_FOR_TESTING = true;

// Detect country from IP using free API
async function detectCountryFromIP(req: Request): Promise<string> {
  try {
    // Try to get IP from headers (Cloudflare, etc.)
    const cfCountry = req.headers.get("cf-ipcountry");
    if (cfCountry && cfCountry !== "XX") {
      logStep("Country detected from CF header", { country: cfCountry });
      return cfCountry.toUpperCase();
    }

    // Fallback: use free IP geolocation API
    const response = await fetch("https://ipapi.co/json/", {
      headers: { "User-Agent": "IntoleraI/1.0" }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.country_code) {
        logStep("Country detected from IP API", { country: data.country_code });
        return data.country_code.toUpperCase();
      }
    }
  } catch (error) {
    logStep("Error detecting country", { error: String(error) });
  }
  
  // Default to Brazil
  logStep("Defaulting to BR");
  return "BR";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, sessionId, firstName } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    logStep("Activating account", { email, sessionId, firstName });

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2025-08-27.basil",
    });

    let customerId: string | null = null;
    let hasValidSubscription = false;

    // Verify the checkout session if provided (user just paid)
    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        logStep("Session retrieved", { 
          sessionEmail: session.customer_email,
          customerFromSession: session.customer,
          status: session.payment_status 
        });

        // Get customer from session
        if (session.customer) {
          customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
          
          // Check subscription from this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: "all",
            limit: 1,
          });
          
          hasValidSubscription = subscriptions.data.some(
            (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
          );
          
          logStep("Subscription check from session", { customerId, hasValidSubscription });
        }
      } catch (sessionError) {
        logStep("Session retrieval failed, will check by email", { error: String(sessionError) });
      }
    }

    // If no valid subscription from session, check by email
    if (!hasValidSubscription) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      logStep("Customer search by email", { found: customers.data.length });
      
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          status: "all",
          limit: 1,
        });

        hasValidSubscription = subscriptions.data.some(
          (sub: { status: string }) => sub.status === "active" || sub.status === "trialing"
        );
        
        logStep("Subscription check by email", { customerId, hasValidSubscription });
      }
    }

    // Check if user already exists in Supabase by searching with email filter
    let existingUser = null;
    let page = 1;
    const perPage = 1000;
    
    // Paginate through users to find matching email
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
    
    logStep("Existing user check", { exists: !!existingUser, userId: existingUser?.id });

    // If user exists and has valid subscription OR if user exists (allow login for existing users)
    if (existingUser) {
      // Update first_name if provided (user may be updating their name on re-login)
      if (firstName) {
        await supabaseAdmin
          .from("profiles")
          .update({ first_name: firstName })
          .eq("id", existingUser.id);
        logStep("Updated first_name for existing user", { userId: existingUser.id, firstName });
      }

      // User already exists - generate login link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${req.headers.get("origin")}/dashboard`,
        },
      });

      if (linkError) {
        logStep("Error generating link for existing user", { error: linkError.message });
        throw new Error("Erro ao gerar link de acesso.");
      }

      // Extract token_hash and type from the hashed_token in properties
      const tokenHash = linkData.properties?.hashed_token;
      const type = "magiclink";

      logStep("Magic link generated for existing user", { userId: existingUser.id, hasTokenHash: !!tokenHash });

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId: existingUser.id,
          tokenHash,
          type,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // User doesn't exist - need valid subscription to create account (unless bypass is enabled)
    if (!hasValidSubscription && !BYPASS_STRIPE_FOR_TESTING) {
      throw new Error("Nenhum pagamento encontrado para este email. Por favor, faça sua assinatura primeiro.");
    }
    
    if (BYPASS_STRIPE_FOR_TESTING) {
      logStep("BYPASS MODE: Creating user without subscription verification");
    }

    logStep("Creating new user with valid subscription");

    // Generate a random password (user won't need it)
    const tempPassword = crypto.randomUUID();

    // Create new user with auto-confirm
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        stripe_customer_id: customerId,
      },
    });

    if (createError) {
      logStep("Error creating user", { error: createError.message });
      throw new Error("Erro ao criar conta. Por favor, tente novamente.");
    }

    const userId = newUser.user.id;
    logStep("New user created", { userId });

    // Detect country from IP and update profile with first_name
    const detectedCountry = await detectCountryFromIP(req);
    logStep("Updating profile with detected country and first_name", { country: detectedCountry, firstName });
    
    await supabaseAdmin
      .from("profiles")
      .update({ 
        country: detectedCountry,
        first_name: firstName || null,
      })
      .eq("id", userId);

    // Generate a magic link for the new user
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

    // Extract token_hash from hashed_token in properties
    const tokenHash = linkData.properties?.hashed_token;
    const type = "magiclink";

    logStep("Magic link generated for new user", { userId, hasTokenHash: !!tokenHash });

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        tokenHash,
        type,
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

