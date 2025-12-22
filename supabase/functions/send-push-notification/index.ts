import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface SendPushRequest {
  userId?: string;
  payload: PushPayload;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[SEND-PUSH] Function started');

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[SEND-PUSH] VAPID keys missing');
      throw new Error("VAPID keys not configured");
    }
    
    console.log('[SEND-PUSH] VAPID keys found');

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, payload }: SendPushRequest = await req.json();

    if (!payload) {
      throw new Error("Payload is required");
    }

    console.log('[SEND-PUSH] Payload:', JSON.stringify(payload));

    // Get active subscriptions for user(s)
    let query = supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    console.log('[SEND-PUSH] Found subscriptions:', subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send push to all subscriptions
    let sentCount = 0;
    const failedSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      try {
        console.log('[PUSH] Sending to endpoint:', sub.endpoint.substring(0, 60) + '...');
        
        // Send a simple push without payload (triggers the push event in SW)
        // The SW will show a default notification
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'TTL': '60',
            'Content-Length': '0',
            'Urgency': 'normal',
          },
        });
        
        console.log('[PUSH] Response status:', response.status);
        
        if (response.ok || response.status === 201) {
          console.log('[PUSH] Sent successfully');
          sentCount++;
        } else {
          const text = await response.text();
          console.error('[PUSH] Failed:', response.status, text);
          
          // Mark as inactive if subscription is gone
          if (response.status === 410 || response.status === 404) {
            failedSubscriptions.push(sub.id);
          }
        }
      } catch (error: unknown) {
        console.error('[PUSH] Error sending:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('410') || errorMessage.includes('expired')) {
          failedSubscriptions.push(sub.id);
        }
      }
    }

    // Mark expired subscriptions as inactive
    if (failedSubscriptions.length > 0) {
      await supabaseClient
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', failedSubscriptions);
      console.log('[SEND-PUSH] Marked', failedSubscriptions.length, 'subscriptions as inactive');
    }

    console.log('[SEND-PUSH] Complete. Sent:', sentCount, 'Failed:', failedSubscriptions.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedSubscriptions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SEND-PUSH] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
