import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to get current time in user's timezone
function getCurrentTimeInTimezone(timezone: string): { hour: number; twoHoursAgo: Date; twentyFourHoursAgo: Date } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    
    // Calculate time ranges in UTC (these are still valid as absolute times)
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return { hour, twoHoursAgo, twentyFourHoursAgo };
  } catch (error) {
    console.error(`Invalid timezone ${timezone}, falling back to America/Sao_Paulo`);
    return getCurrentTimeInTimezone('America/Sao_Paulo');
  }
}

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
    sub: "mailto:support@wellmeals.app",
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
    console.log("[FEEDBACK-REMINDER] Function started");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all users with pending meal feedback
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
      console.error("[FEEDBACK-REMINDER] Error fetching pending meals:", mealsError);
      throw mealsError;
    }

    // Get unique user IDs with pending feedback
    const userIds = [...new Set(pendingMeals?.map((m) => m.user_id) || [])];
    console.log(`[FEEDBACK-REMINDER] Found ${userIds.length} users with pending feedback`);

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending feedback to notify", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profiles with timezone
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, timezone")
      .in("id", userIds);

    if (profilesError) {
      console.error("[FEEDBACK-REMINDER] Error fetching profiles:", profilesError);
    }

    // Create timezone map (default: America/Sao_Paulo)
    const timezoneMap = new Map<string, string>();
    profiles?.forEach(p => {
      timezoneMap.set(p.id, p.timezone || 'America/Sao_Paulo');
    });

    // Filter users who are in appropriate hours (8am - 10pm in their timezone)
    const usersInActiveHours: string[] = [];
    for (const userId of userIds) {
      const userTimezone = timezoneMap.get(userId) || 'America/Sao_Paulo';
      const { hour } = getCurrentTimeInTimezone(userTimezone);
      
      // Only send reminders between 8am and 10pm local time
      if (hour >= 8 && hour < 22) {
        usersInActiveHours.push(userId);
        console.log(`[FEEDBACK-REMINDER] User ${userId} in timezone ${userTimezone}, hour ${hour} - active`);
      } else {
        console.log(`[FEEDBACK-REMINDER] User ${userId} in timezone ${userTimezone}, hour ${hour} - skipped (outside active hours)`);
      }
    }

    if (usersInActiveHours.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users in active hours", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions for users in active hours
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", usersInActiveHours);

    if (subsError) {
      console.error("[FEEDBACK-REMINDER] Error fetching subscriptions:", subsError);
      throw subsError;
    }

    console.log(`[FEEDBACK-REMINDER] Found ${subscriptions?.length || 0} push subscriptions`);

    // Count pending meals per user
    const pendingCountByUser: Record<string, number> = {};
    pendingMeals?.forEach((m) => {
      if (usersInActiveHours.includes(m.user_id)) {
        pendingCountByUser[m.user_id] = (pendingCountByUser[m.user_id] || 0) + 1;
      }
    });

    // Send notifications
    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions || []) {
      const pendingCount = pendingCountByUser[sub.user_id] || 0;
      if (pendingCount === 0) continue;

      const userTimezone = timezoneMap.get(sub.user_id) || 'America/Sao_Paulo';
      const messageBody = pendingCount === 1
        ? "Uma refeição aguarda seu feedback"
        : `${pendingCount} refeições aguardam seu feedback`;

      try {
        // Insert notification into database and get the ID
        const { data: insertedNotif } = await supabase.from("notifications").insert({
          user_id: sub.user_id,
          title: "🍽️ Como você se sentiu?",
          message: messageBody,
          type: "meal",
          action_url: "/dashboard",
        }).select("id").single();

        // Get current unread count for badge
        const { count: unreadCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", sub.user_id)
          .eq("is_read", false);

        const payload = JSON.stringify({
          title: "🍽️ Como você se sentiu?",
          body: messageBody,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          tag: "meal-feedback",
          badgeCount: unreadCount || 1,
          requireInteraction: true,
          data: {
            type: "meal-feedback",
            url: "/dashboard",
            pendingCount,
            notificationId: insertedNotif?.id || null,
          },
          actions: [
            { action: "open-feedback", title: "Responder" },
            { action: "dismiss", title: "Depois" },
          ],
        });

        console.log(`[FEEDBACK-REMINDER] Sent notification to user ${sub.user_id} (timezone: ${userTimezone}): ${payload}`);
        sentCount++;
      } catch (err: any) {
        console.error(`[FEEDBACK-REMINDER] Failed to send to ${sub.endpoint}:`, err.message);
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up invalid subscriptions
    if (failedEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
      console.log(`[FEEDBACK-REMINDER] Removed ${failedEndpoints.length} failed subscriptions`);
    }

    console.log(`[FEEDBACK-REMINDER] Function complete. Sent ${sentCount} notifications`);

    return new Response(
      JSON.stringify({
        message: "Notifications processed",
        sent: sentCount,
        usersWithPending: userIds.length,
        usersInActiveHours: usersInActiveHours.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[FEEDBACK-REMINDER] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

