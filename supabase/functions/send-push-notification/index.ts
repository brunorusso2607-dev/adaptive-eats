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

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate VAPID signature
async function generateVapidSignature(
  endpoint: string,
  vapidPrivateKey: string,
  vapidPublicKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
  
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: "mailto:noreply@nutriapp.com"
  };

  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKeyBytes = base64UrlToUint8Array(vapidPrivateKey);
  const privateKey = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyBytes.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
  );

  // Convert signature to base64url
  const signatureArray = new Uint8Array(signature);
  let signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${unsignedToken}.${signatureB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`
  };
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    console.log('[PUSH] Sending to endpoint:', subscription.endpoint);

    const { authorization, cryptoKey } = await generateVapidSignature(
      subscription.endpoint,
      vapidPrivateKey,
      vapidPublicKey
    );

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Authorization': authorization,
        'Crypto-Key': cryptoKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[PUSH] Failed:', response.status, error);
      return false;
    }

    console.log('[PUSH] Sent successfully');
    return true;
  } catch (error) {
    console.error('[PUSH] Error:', error);
    return false;
  }
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
      throw new Error("VAPID keys not configured");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, payload }: SendPushRequest = await req.json();

    if (!payload) {
      throw new Error("Payload is required");
    }

    console.log('[SEND-PUSH] Payload:', payload);

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
      const success = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        vapidPublicKey,
        vapidPrivateKey
      );

      if (success) {
        sentCount++;
      } else {
        failedSubscriptions.push(sub.id);
      }
    }

    // Mark failed subscriptions as inactive
    if (failedSubscriptions.length > 0) {
      await supabaseClient
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', failedSubscriptions);
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
