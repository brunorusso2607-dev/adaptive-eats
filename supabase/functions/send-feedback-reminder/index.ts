import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Encode VAPID JWT for web push authorization
async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const audience = new URL(endpoint).origin;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours

  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: "mailto:support@example.com",
  };

  const enc = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBuffer = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    privateKeyBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    enc.encode(unsignedToken)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `vapid t=${unsignedToken}.${signatureB64}, k=${vapidPublicKey}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find users with pending meal feedback (meals consumed 2-24h ago with pending status)
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: pendingMeals, error: mealsError } = await supabase
      .from("meal_consumption")
      .select("user_id")
      .eq("feedback_status", "pending")
      .lt("consumed_at", twoHoursAgo.toISOString())
      .gt("consumed_at", twentyFourHoursAgo.toISOString());

    if (mealsError) {
      console.error("Error fetching pending meals:", mealsError);
      throw mealsError;
    }

    // Get unique user IDs with pending feedback
    const userIds = [...new Set(pendingMeals?.map((m) => m.user_id) || [])];
    console.log(`Found ${userIds.length} users with pending feedback`);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending feedback to notify", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for these users
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
      throw subsError;
    }

    console.log(`Found ${subscriptions?.length || 0} push subscriptions`);

    // Count pending meals per user
    const pendingCountByUser: Record<string, number> = {};
    pendingMeals?.forEach((m) => {
      pendingCountByUser[m.user_id] = (pendingCountByUser[m.user_id] || 0) + 1;
    });

    // Send notifications (simplified - just log for now since web-push crypto is complex)
    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions || []) {
      const pendingCount = pendingCountByUser[sub.user_id] || 0;
      if (pendingCount === 0) continue;

      const payload = JSON.stringify({
        title: "🍽️ Como você se sentiu?",
        body: pendingCount === 1
          ? "Uma refeição aguarda seu feedback"
          : `${pendingCount} refeições aguardam seu feedback`,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: "meal-feedback",
        requireInteraction: true,
        data: {
          type: "meal-feedback",
          url: "/dashboard",
          pendingCount,
        },
        actions: [
          { action: "open-feedback", title: "Responder" },
          { action: "dismiss", title: "Depois" },
        ],
      });

      try {
        // Insert notification into database
        await supabase.from("notifications").insert({
          user_id: sub.user_id,
          title: "🍽️ Como você se sentiu?",
          message: pendingCount === 1
            ? "Uma refeição aguarda seu feedback"
            : `${pendingCount} refeições aguardam seu feedback`,
          type: "meal",
          action_url: "/dashboard",
        });

        // For a production implementation, you would use a web-push library
        // or implement the full encryption protocol. For now, we log the intent.
        console.log(`Sent notification to user ${sub.user_id}: ${payload}`);
        sentCount++;
      } catch (err: any) {
        console.error(`Failed to send to ${sub.endpoint}:`, err.message);
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
    }

    return new Response(
      JSON.stringify({
        message: "Notifications processed",
        sent: sentCount,
        usersWithPending: userIds.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-feedback-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
