import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { encode as base64Encode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

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
function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to base64url
function base64UrlEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return base64UrlEncode(new Uint8Array(buffer));
}

// Create VAPID JWT for push authentication
async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  subject: string
): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  // JWT Header
  const header = { typ: 'JWT', alg: 'ES256' };
  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  
  // JWT Payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject
  };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  
  const unsignedToken = `${headerB64}.${payloadB64}`;
  
  // Import the private key
  // VAPID private key is 32 bytes in raw format, need to convert to JWK
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);
  
  console.log('[VAPID] Private key bytes length:', privateKeyBytes.length);
  console.log('[VAPID] Public key bytes length:', publicKeyBytes.length);
  
  // Extract x and y coordinates from the public key (uncompressed format: 0x04 || x || y)
  let x: Uint8Array, y: Uint8Array;
  if (publicKeyBytes.length === 65 && publicKeyBytes[0] === 0x04) {
    x = publicKeyBytes.slice(1, 33);
    y = publicKeyBytes.slice(33, 65);
  } else {
    throw new Error('Invalid public key format');
  }
  
  // Create JWK for private key
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
    d: base64UrlEncode(privateKeyBytes)
  };
  
  console.log('[VAPID] JWK created');
  
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  console.log('[VAPID] Key imported');
  
  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  // Convert DER signature to raw (r || s) format if needed
  // Web Crypto API returns signature in IEEE P1363 format (r || s), not DER
  const signatureB64 = arrayBufferToBase64Url(signature);
  
  const jwt = `${unsignedToken}.${signatureB64}`;
  
  console.log('[VAPID] JWT created');
  
  return `vapid t=${jwt}, k=${vapidPublicKey}`;
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
    console.log('[SEND-PUSH] Public key length:', vapidPublicKey.length);
    console.log('[SEND-PUSH] Private key length:', vapidPrivateKey.length);

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

    // Prepare the notification payload as JSON
    const notificationPayload = JSON.stringify(payload);
    const payloadBytes = new TextEncoder().encode(notificationPayload);

    console.log('[SEND-PUSH] Payload bytes length:', payloadBytes.length);

    for (const sub of subscriptions) {
      try {
        console.log('[PUSH] Sending to endpoint:', sub.endpoint.substring(0, 60) + '...');
        console.log('[PUSH] Subscription p256dh:', sub.p256dh?.substring(0, 20) + '...');
        console.log('[PUSH] Subscription auth:', sub.auth?.substring(0, 10) + '...');
        
        // Create VAPID authorization header
        const authHeader = await createVapidAuthHeader(
          sub.endpoint,
          vapidPublicKey,
          vapidPrivateKey,
          'mailto:contato@receitai.com'
        );
        
        console.log('[PUSH] Auth header created');
        
        // For now, send without encryption (empty body with VAPID auth)
        // The browser will show a default notification
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'TTL': '86400',
            'Urgency': 'high',
            'Content-Type': 'application/octet-stream',
            'Content-Length': '0',
          },
        });
        
        console.log('[PUSH] Response status:', response.status);
        const responseText = await response.text();
        console.log('[PUSH] Response body:', responseText);
        
        if (response.ok || response.status === 201) {
          console.log('[PUSH] Sent successfully');
          sentCount++;
        } else {
          console.error('[PUSH] Failed:', response.status, responseText);
          
          // Mark as inactive if subscription is gone
          if (response.status === 410 || response.status === 404) {
            failedSubscriptions.push(sub.id);
          }
        }
      } catch (error: unknown) {
        console.error('[PUSH] Error sending:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[PUSH] Error details:', errorMessage);
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
