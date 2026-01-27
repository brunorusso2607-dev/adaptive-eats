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

// Helper to create ArrayBuffer from Uint8Array
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  new Uint8Array(buffer).set(arr);
  return buffer;
}

// Create VAPID JWT token
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

  const privateKeyBytes = urlBase64ToUint8Array(privateKeyBase64);
  const publicKeyBytes = urlBase64ToUint8Array(publicKeyBase64);

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

  const userPublicKeyBytes = urlBase64ToUint8Array(p256dhKey);
  const userAuthBytes = urlBase64ToUint8Array(authSecret);

  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(userPublicKeyBytes),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: userPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const keyInfoPrefix = encoder.encode("WebPush: info\0");
  const keyInfo = new Uint8Array(keyInfoPrefix.length + userPublicKeyBytes.length + localPublicKey.length);
  keyInfo.set(keyInfoPrefix, 0);
  keyInfo.set(userPublicKeyBytes, keyInfoPrefix.length);
  keyInfo.set(localPublicKey, keyInfoPrefix.length + userPublicKeyBytes.length);

  const ikm = await hkdf(userAuthBytes, sharedSecret, keyInfo, 32);

  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16);

  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);

  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes, 0);
  paddedPayload[payloadBytes.length] = 2;
  
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

    const endpointUrl = new URL(endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey, vapidPublicKey);
    const vapidAuth = `vapid t=${jwt}, k=${vapidPublicKey}`;

    const { ciphertext, salt, localPublicKey } = await encryptPayload(
      payloadString,
      p256dh,
      auth
    );

    const body = buildRequestBody(ciphertext, salt, localPublicKey);

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

    if (response.status === 201 || response.status === 200) {
      return { success: true, status: response.status, message: "Push sent successfully" };
    } else if (response.status === 410) {
      return { success: false, status: 410, message: "Subscription expired" };
    } else {
      return { success: false, status: response.status, message: responseText };
    }
  } catch (error) {
    console.error("[WATER-PUSH] Error sending push:", error);
    return { success: false, status: 500, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Helper to get current time in user's timezone
function getCurrentTimeInTimezone(timezone: string): { hour: number; minute: number; todayStart: Date } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0', 10);
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0', 10);
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0', 10);
    
    // Calculate the start of the day in the user's timezone (as UTC)
    const todayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    
    return { hour, minute, todayStart };
  } catch (error) {
    console.error(`Invalid timezone ${timezone}, falling back to America/Sao_Paulo`);
    return getCurrentTimeInTimezone('America/Sao_Paulo');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[WATER-REMINDER] Function started");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[WATER-REMINDER] VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all users with water reminders enabled
    const { data: allSettings, error: settingsError } = await supabase
      .from("water_settings")
      .select("user_id, daily_goal_ml, reminder_start_hour, reminder_end_hour, reminder_interval_minutes, updated_at")
      .eq("reminder_enabled", true);

    if (settingsError) {
      console.error("[WATER-REMINDER] Error fetching water settings:", settingsError);
      throw settingsError;
    }

    if (!allSettings || allSettings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with reminders enabled", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profiles with timezone and country
    const userIds = allSettings.map(s => s.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, timezone, country")
      .in("id", userIds);

    if (profilesError) {
      console.error("[WATER-REMINDER] Error fetching profiles:", profilesError);
    }

    // Create timezone and country maps
    const timezoneMap = new Map<string, string>();
    const countryMap = new Map<string, string>();
    profiles?.forEach(p => {
      timezoneMap.set(p.id, p.timezone || 'America/Sao_Paulo');
      countryMap.set(p.id, p.country || 'BR');
    });

    // Filter users based on their timezone and reminder hours
    const usersToCheck: typeof allSettings = [];
    
    for (const setting of allSettings) {
      const userTimezone = timezoneMap.get(setting.user_id) || 'America/Sao_Paulo';
      const { hour: currentHour, minute: currentMinute } = getCurrentTimeInTimezone(userTimezone);
      
      // Check if within reminder hours
      if (currentHour >= setting.reminder_start_hour && currentHour < setting.reminder_end_hour) {
        // Check interval
        const interval = setting.reminder_interval_minutes || 60;
        if (currentMinute % interval === 0) {
          usersToCheck.push(setting);
          console.log(`[WATER-REMINDER] User ${setting.user_id} in timezone ${userTimezone}, local time ${currentHour}:${currentMinute} - due for reminder`);
        }
      }
    }

    console.log(`[WATER-REMINDER] ${usersToCheck.length} users due for reminder based on their local time`);

    if (usersToCheck.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users due for reminder at this time", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get today's water consumption for these users (based on their timezone)
    const usersToRemind: { userId: string; total: number; goal: number; percentage: number }[] = [];
    
    for (const setting of usersToCheck) {
      const userTimezone = timezoneMap.get(setting.user_id) || 'America/Sao_Paulo';
      const { todayStart } = getCurrentTimeInTimezone(userTimezone);
      
      // Get consumption since start of user's day
      const { data: consumptions, error: consError } = await supabase
        .from("water_consumption")
        .select("amount_ml")
        .eq("user_id", setting.user_id)
        .gte("consumed_at", todayStart.toISOString());

      if (consError) {
        console.error(`[WATER-REMINDER] Error fetching consumption for user ${setting.user_id}:`, consError);
        continue;
      }

      const total = consumptions?.reduce((sum, c) => sum + c.amount_ml, 0) || 0;
      const goal = setting.daily_goal_ml;
      const percentage = Math.round((total / goal) * 100);
      
      // Only remind if below 100% of goal
      if (percentage < 100) {
        usersToRemind.push({ userId: setting.user_id, total, goal, percentage });
      }
    }

    console.log(`[WATER-REMINDER] ${usersToRemind.length} users need water reminders`);

    if (usersToRemind.length === 0) {
      return new Response(
        JSON.stringify({ message: "All users on track or goal reached", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", usersToRemind.map((u) => u.userId));

    if (subsError) {
      console.error("[WATER-REMINDER] Error fetching subscriptions:", subsError);
    }

    let sentCount = 0;
    const expiredSubscriptions: string[] = [];

    for (const sub of subscriptions || []) {
      const userData = usersToRemind.find((u) => u.userId === sub.user_id);
      if (!userData) continue;

      const userTimezone = timezoneMap.get(sub.user_id) || 'America/Sao_Paulo';
      const userCountry = countryMap.get(sub.user_id) || 'BR';
      const remaining = Math.round((userData.goal - userData.total) / 1000 * 10) / 10;
      const totalLiters = (userData.total / 1000).toFixed(1);
      const goalLiters = (userData.goal / 1000).toFixed(1);
      
      // Country-specific message templates
      const WATER_MESSAGES: Record<string, { title: string; messages: string[] }> = {
        'BR': { 
          title: '💧 Hora de beber água!',
          messages: [
            `Você bebeu ${totalLiters}L de ${goalLiters}L. Faltam ${remaining}L!`,
            `Hora de se hidratar! Ainda faltam ${remaining}L para sua meta.`,
            `Lembrete: beba água! Meta de hoje: ${remaining}L restantes.`,
            `${userData.percentage}% da meta atingida. Beba mais ${remaining}L!`,
          ]
        },
        'PT': { 
          title: '💧 Hora de beber água!',
          messages: [
            `Bebeu ${totalLiters}L de ${goalLiters}L. Faltam ${remaining}L!`,
            `Hora de se hidratar! Ainda faltam ${remaining}L para a sua meta.`,
            `Lembrete: beba água! Meta de hoje: ${remaining}L restantes.`,
          ]
        },
        'US': { 
          title: '💧 Time to drink water!',
          messages: [
            `You drank ${totalLiters}L of ${goalLiters}L. ${remaining}L to go!`,
            `Stay hydrated! You still need ${remaining}L to reach your goal.`,
            `Reminder: drink water! Today's goal: ${remaining}L remaining.`,
            `${userData.percentage}% of goal reached. Drink ${remaining}L more!`,
          ]
        },
        'GB': { 
          title: '💧 Time to drink water!',
          messages: [
            `You've drunk ${totalLiters}L of ${goalLiters}L. ${remaining}L to go!`,
            `Stay hydrated! You still need ${remaining}L to reach your goal.`,
          ]
        },
        'MX': { 
          title: '💧 ¡Hora de beber agua!',
          messages: [
            `Bebiste ${totalLiters}L de ${goalLiters}L. ¡Faltan ${remaining}L!`,
            `¡Hora de hidratarte! Aún faltan ${remaining}L para tu meta.`,
            `Recordatorio: ¡bebe agua! Meta de hoy: ${remaining}L restantes.`,
          ]
        },
        'ES': { 
          title: '💧 ¡Hora de beber agua!',
          messages: [
            `Has bebido ${totalLiters}L de ${goalLiters}L. ¡Faltan ${remaining}L!`,
            `¡Hora de hidratarte! Aún faltan ${remaining}L para tu meta.`,
          ]
        },
        'FR': { 
          title: "💧 C'est l'heure de boire de l'eau!",
          messages: [
            `Vous avez bu ${totalLiters}L sur ${goalLiters}L. Il reste ${remaining}L!`,
            `Restez hydraté! Il vous reste ${remaining}L pour atteindre votre objectif.`,
          ]
        },
        'DE': { 
          title: '💧 Zeit, Wasser zu trinken!',
          messages: [
            `Sie haben ${totalLiters}L von ${goalLiters}L getrunken. Noch ${remaining}L!`,
            `Bleiben Sie hydratisiert! Sie brauchen noch ${remaining}L für Ihr Ziel.`,
          ]
        },
        'IT': { 
          title: "💧 È ora di bere acqua!",
          messages: [
            `Hai bevuto ${totalLiters}L di ${goalLiters}L. Mancano ${remaining}L!`,
            `Resta idratato! Ti mancano ancora ${remaining}L per raggiungere il tuo obiettivo.`,
          ]
        },
      };
      
      const msgConfig = WATER_MESSAGES[userCountry] || WATER_MESSAGES['BR'];
      const message = msgConfig.messages[Math.floor(Math.random() * msgConfig.messages.length)];

      // First, insert the notification to get its ID
      const { data: insertedNotif } = await supabase.from("notifications").insert({
        user_id: sub.user_id,
        title: msgConfig.title,
        message: message,
        type: "reminder",
        action_url: "/dashboard",
      }).select("id").single();

      // Get current unread count for badge
      const { count: unreadCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", sub.user_id)
        .eq("is_read", false);

      const pushPayload = {
        title: msgConfig.title,
        body: message,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: "water-reminder",
        badgeCount: unreadCount || 1,
        data: {
          type: "water-reminder",
          url: "/dashboard",
          notificationId: insertedNotif?.id || null,
        },
        actions: [
          { action: "add-water", title: "💧 +250ml" },
          { action: "dismiss", title: userCountry === 'US' || userCountry === 'GB' ? "Later" : userCountry === 'MX' || userCountry === 'ES' ? "Después" : userCountry === 'FR' ? "Plus tard" : userCountry === 'DE' ? "Später" : userCountry === 'IT' ? "Dopo" : "Depois" },
        ],
      };

      console.log(`[WATER-REMINDER] Sending push to user ${sub.user_id} (timezone: ${userTimezone})`);

      const result = await sendPushNotification(
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        pushPayload,
        vapidPublicKey,
        vapidPrivateKey,
        "mailto:contato@intolerai.com"
      );

      if (result.success) {
        sentCount++;
        console.log(`[WATER-REMINDER] Push sent to user ${sub.user_id}: ${userData.percentage}% of goal`);
      } else if (result.status === 410) {
        console.log(`[WATER-REMINDER] Subscription expired for user ${sub.user_id}`);
        expiredSubscriptions.push(sub.id);
      } else {
        console.error(`[WATER-REMINDER] Failed to send push to user ${sub.user_id}: ${result.message}`);
      }
    }

    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", expiredSubscriptions);
      console.log(`[WATER-REMINDER] Removed ${expiredSubscriptions.length} expired subscriptions`);
    }

    console.log(`[WATER-REMINDER] Function complete. Sent ${sentCount} notifications`);

    return new Response(
      JSON.stringify({ 
        message: "Water reminders sent", 
        sent: sentCount,
        usersChecked: usersToCheck.length,
        usersReminded: usersToRemind.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[WATER-REMINDER] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

