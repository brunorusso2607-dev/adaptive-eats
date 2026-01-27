import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Convert URL-safe base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert Uint8Array to URL-safe base64
function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Helper to create ArrayBuffer from Uint8Array (avoid SharedArrayBuffer issues)
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

// Create VAPID JWT token using JWK format
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64: string,
  publicKeyBase64: string
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const encodedHeader = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Decode keys
  const privateKeyBytes = urlBase64ToUint8Array(privateKeyBase64);
  const publicKeyBytes = urlBase64ToUint8Array(publicKeyBase64);

  // Create JWK from raw keys for P-256 curve
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);
  const d = privateKeyBytes;

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: uint8ArrayToBase64Url(x),
    y: uint8ArrayToBase64Url(y),
    d: uint8ArrayToBase64Url(d),
  };

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = uint8ArrayToBase64Url(signatureArray);

  return `${unsignedToken}.${signatureBase64}`;
}

// HKDF implementation
async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  // Extract
  const saltBuffer = salt.length ? toArrayBuffer(salt) : new ArrayBuffer(32);
  const saltKey = await crypto.subtle.importKey(
    "raw",
    saltBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const prk = new Uint8Array(
    await crypto.subtle.sign("HMAC", saltKey, toArrayBuffer(ikm))
  );
  
  // Expand
  const prkKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(prk),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  let output = new Uint8Array(0);
  let t = new Uint8Array(0);
  let counter = 1;
  
  while (output.length < length) {
    const input = new Uint8Array(t.length + info.length + 1);
    input.set(t, 0);
    input.set(info, t.length);
    input[t.length + info.length] = counter;
    
    t = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, toArrayBuffer(input)));
    const newOutput = new Uint8Array(output.length + t.length);
    newOutput.set(output);
    newOutput.set(t, output.length);
    output = newOutput;
    counter++;
  }
  
  return output.slice(0, length);
}

// Encrypt payload for web push
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  const payloadBytes = encoder.encode(payload);

  // Decode subscription keys
  const userPublicKeyBytes = urlBase64ToUint8Array(p256dhKey);
  const userAuthBytes = urlBase64ToUint8Array(authSecret);

  // Generate local keypair for ECDH
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(userPublicKeyBytes),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Create info for key derivation (WebPush standard)
  const keyInfoPrefix = encoder.encode("WebPush: info\0");
  const keyInfo = new Uint8Array(keyInfoPrefix.length + userPublicKeyBytes.length + localPublicKey.length);
  keyInfo.set(keyInfoPrefix, 0);
  keyInfo.set(userPublicKeyBytes, keyInfoPrefix.length);
  keyInfo.set(localPublicKey, keyInfoPrefix.length + userPublicKeyBytes.length);

  // Derive IKM from shared secret and auth
  const ikm = await hkdf(userAuthBytes, sharedSecret, keyInfo, 32);

  // Derive content encryption key
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16);

  // Derive nonce
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  // Add padding delimiter to payload
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 2; // Delimiter
  
  // Encrypt with AES-GCM
  const aesKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(contentEncryptionKey),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(nonce) },
    aesKey,
    toArrayBuffer(paddedPayload)
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

// Build the encrypted request body
function buildRequestBody(
  ciphertext: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  const rs = 4096;
  const idlen = localPublicKey.length;
  
  const header = new Uint8Array(16 + 4 + 1 + idlen);
  header.set(salt, 0);
  header[16] = (rs >> 24) & 0xff;
  header[17] = (rs >> 16) & 0xff;
  header[18] = (rs >> 8) & 0xff;
  header[19] = rs & 0xff;
  header[20] = idlen;
  header.set(localPublicKey, 21);

  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header, 0);
  body.set(ciphertext, header.length);

  return body;
}

// Send push notification
async function sendPushNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: object,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; status: number; message: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    console.log("[PUSH] Encrypting payload...");

    const endpointUrl = new URL(endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    console.log("[PUSH] Creating VAPID JWT for audience:", audience);
    
    let jwt: string;
    try {
      jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
    } catch (jwtError) {
      console.error("[PUSH] JWT creation failed:", jwtError);
      throw new Error(`JWT creation failed: ${jwtError}`);
    }

    const vapidAuth = `vapid t=${jwt}, k=${vapidPublicKey}`;

    // Encrypt the payload
    const { ciphertext, salt, localPublicKey } = await encryptPayload(
      payloadString,
      p256dh,
      auth
    );

    const body = buildRequestBody(ciphertext, salt, localPublicKey);

    console.log("[PUSH] Sending to endpoint:", endpoint);

    // Send the push notification
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": vapidAuth,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": body.length.toString(),
        "TTL": "86400",
        "Urgency": "high",
      },
      body: toArrayBuffer(body),
    });

    const responseText = await response.text();
    console.log("[PUSH] Response status:", response.status, "body:", responseText);

    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status, message: "Push sent successfully" };
    } else if (response.status === 410) {
      return { success: false, status: 410, message: "Subscription expired" };
    } else {
      return { success: false, status: response.status, message: responseText };
    }
  } catch (error) {
    console.error("[PUSH] Error sending push:", error);
    return { success: false, status: 500, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[TEST-PUSH] Function started");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[TEST-PUSH] VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TEST-PUSH] VAPID keys found, public key length:", vapidPublicKey.length);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[TEST-PUSH] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error("[TEST-PUSH] Auth error:", userError?.message);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[TEST-PUSH] User authenticated:", user.id);

    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user.id);

    if (subsError) {
      console.error("[TEST-PUSH] Subscription query error:", subsError.message);
      throw subsError;
    }

    console.log("[TEST-PUSH] Found subscriptions:", subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhuma inscrição push encontrada. Ative as notificações primeiro." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert notification into database and get the ID
    const { data: insertedNotif } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: "🎉 Teste de notificação!",
      message: "As notificações push estão funcionando!",
      type: "test",
      action_url: "/dashboard",
    }).select("id").single();

    // Get current unread count for badge
    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    // Push notification payload
    const pushPayload = {
      title: "🎉 IntoleraI",
      body: "Notificação push funcionando!",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      tag: "test-notification",
      badgeCount: unreadCount || 1,
      data: {
        url: "/dashboard",
        timestamp: Date.now(),
        notificationId: insertedNotif?.id || null,
      },
    };

    // Send push to all subscriptions
    const results = [];
    for (const sub of subscriptions) {
      console.log("[TEST-PUSH] Sending to subscription:", sub.endpoint.substring(0, 50) + "...");
      
      const result = await sendPushNotification(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey,
        "mailto:contato@intolerai.com"
      );
      
      results.push({
        endpoint: sub.endpoint.substring(0, 50) + "...",
        ...result,
      });

      if (result.status === 410) {
        console.log("[TEST-PUSH] Removing expired subscription");
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
      }
    }

    console.log("[TEST-PUSH] Results:", JSON.stringify(results));

    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: successCount > 0 
          ? `Push enviado para ${successCount} dispositivo(s)!` 
          : "Falha ao enviar push. Verifique os logs.",
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[TEST-PUSH] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

