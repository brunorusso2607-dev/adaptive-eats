import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-STRIPE-PLAN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Verify admin user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      throw new Error("User is not an admin");
    }
    logStep("Admin verified");

    // Parse request body
    const { name, description, price, currency, interval } = await req.json();
    
    if (!name || !price) {
      throw new Error("Name and price are required");
    }

    logStep("Creating plan", { name, price, currency, interval });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Create product
    const product = await stripe.products.create({
      name,
      description: description || undefined,
    });
    logStep("Product created", { productId: product.id });

    // Create price
    const priceData: Stripe.PriceCreateParams = {
      product: product.id,
      unit_amount: Math.round(price * 100), // Convert to cents
      currency: currency || "brl",
    };

    // If interval is provided, make it recurring
    if (interval && interval !== "one_time") {
      priceData.recurring = {
        interval: interval as "day" | "week" | "month" | "year",
      };
    }

    const stripePrice = await stripe.prices.create(priceData);
    logStep("Price created", { priceId: stripePrice.id });

    return new Response(
      JSON.stringify({
        success: true,
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
        },
        price: {
          id: stripePrice.id,
          unit_amount: stripePrice.unit_amount,
          currency: stripePrice.currency,
          recurring: stripePrice.recurring,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

