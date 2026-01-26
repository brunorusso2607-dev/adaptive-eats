import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Handle connectivity test (ping) from admin panel
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      // Check if this is a connectivity test
      try {
        const body = await req.clone().json();
        if (body?.test === true || body?.action === "ping") {
          logStep("Connectivity test received");
          return new Response(JSON.stringify({ 
            status: "ok", 
            message: "Webhook endpoint is reachable",
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } catch {
        // Not a JSON body or not a test request
      }
      
      // Real webhook without signature - reject
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: errorMessage });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Event verified", { type: event.type, id: event.id });

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Process different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          customerId: session.customer, 
          email: session.customer_email,
          mode: session.mode 
        });

        if (session.mode === "subscription" && session.customer_email) {
          // Find user by email and update subscription
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("email", session.customer_email)
            .maybeSingle();

          if (profile) {
            await supabaseClient
              .from("user_subscriptions")
              .upsert({
                user_id: profile.id,
                is_active: true,
                plan_name: "premium",
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id" });

            logStep("Subscription activated for user", { userId: profile.id });
          }
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId 
        });

        // Get customer email from Stripe
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;

        const email = customer.email;
        if (!email) break;

        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          
          await supabaseClient
            .from("user_subscriptions")
            .upsert({
              user_id: profile.id,
              is_active: isActive,
              plan_name: isActive ? "premium" : "free",
              expires_at: subscription.current_period_end 
                ? new Date(subscription.current_period_end * 1000).toISOString() 
                : null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          logStep("Subscription status updated", { userId: profile.id, isActive });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Subscription cancelled", { subscriptionId: subscription.id, customerId });

        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) break;

        const email = customer.email;
        if (!email) break;

        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (profile) {
          await supabaseClient
            .from("user_subscriptions")
            .update({
              is_active: false,
              plan_name: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", profile.id);

          logStep("Subscription deactivated", { userId: profile.id });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment succeeded", { 
          invoiceId: invoice.id, 
          amount: invoice.amount_paid,
          customerId: invoice.customer 
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { 
          invoiceId: invoice.id, 
          customerId: invoice.customer 
        });
        
        // Optionally notify user or update subscription status
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

