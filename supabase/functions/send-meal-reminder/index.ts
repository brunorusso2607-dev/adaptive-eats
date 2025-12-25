import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper functions for Web Push
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(uint8Array: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function toBuffer(arr: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(arr.length);
  const view = new Uint8Array(buffer);
  view.set(arr);
  return buffer;
}

async function createVapidJwt(endpoint: string, vapidPublicKey: string, vapidPrivateKey: string): Promise<string> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:noreply@wellmeals.app"
  };
  
  const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  
  const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBuffer(privateKeyBytes),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );
  
  const signatureArray = new Uint8Array(signature);
  const encodedSignature = uint8ArrayToBase64Url(signatureArray);
  
  return `${unsignedToken}.${encodedSignature}`;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", toBuffer(ikm), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const saltBuffer = salt.length > 0 ? toBuffer(salt) : new ArrayBuffer(32);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, saltBuffer));
  
  const prkKey = await crypto.subtle.importKey("raw", toBuffer(prk), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  
  const okm = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, toBuffer(infoWithCounter)));
  return okm.slice(0, length);
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const localKeyPair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);
  
  const subscriberPublicKeyBytes = urlBase64ToUint8Array(p256dhKey);
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    toBuffer(subscriberPublicKeyBytes),
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  const sharedSecretArrayBuffer = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretArrayBuffer);
  
  const authSecretBytes = urlBase64ToUint8Array(authSecret);
  
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prk = await hkdf(authSecretBytes, sharedSecret, authInfo, 32);
  
  const keyInfoPrefix = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const keyInfo = new Uint8Array(keyInfoPrefix.length + 1 + 65 + 1 + 65);
  keyInfo.set(keyInfoPrefix);
  let offset = keyInfoPrefix.length;
  keyInfo[offset++] = 0;
  keyInfo.set(subscriberPublicKeyBytes, offset);
  offset += 65;
  keyInfo.set(localPublicKey, offset);
  
  const contentEncryptionKey = await hkdf(salt, prk, keyInfo.slice(0, keyInfoPrefix.length + 1 + 65 + 1 + 65), 16);
  
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonce = await hkdf(salt, prk, nonceInfo, 12);
  
  const paddedPayload = new Uint8Array(payload.length + 2);
  paddedPayload.set(new TextEncoder().encode(payload));
  paddedPayload[payload.length] = 2;
  paddedPayload[payload.length + 1] = 0;
  
  const aesKey = await crypto.subtle.importKey("raw", toBuffer(contentEncryptionKey), { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toBuffer(nonce) }, aesKey, toBuffer(paddedPayload));
  
  return { ciphertext: new Uint8Array(encrypted), salt, localPublicKey };
}

function buildRequestBody(salt: Uint8Array, localPublicKey: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  const recordSize = 4096;
  const header = new Uint8Array(86);
  header.set(salt, 0);
  header[16] = (recordSize >> 24) & 0xff;
  header[17] = (recordSize >> 16) & 0xff;
  header[18] = (recordSize >> 8) & 0xff;
  header[19] = recordSize & 0xff;
  header[20] = 65;
  header.set(localPublicKey, 21);
  
  const body = new Uint8Array(header.length + ciphertext.length);
  body.set(header);
  body.set(ciphertext, header.length);
  
  return body;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; icon?: string; badge?: string; tag?: string; data?: Record<string, unknown> },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    const { ciphertext, salt, localPublicKey } = await encryptPayload(payloadString, subscription.p256dh, subscription.auth);
    const requestBody = buildRequestBody(salt, localPublicKey, ciphertext);
    
    const jwt = await createVapidJwt(subscription.endpoint, vapidPublicKey, vapidPrivateKey);
    
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: toBuffer(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed: ${response.status} - ${errorText}`);
      return { success: false, status: response.status, error: errorText };
    }
    
    return { success: true, status: response.status };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("Error sending push:", error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🍽️ Starting meal reminder check...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get current time info
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    
    console.log(`Current time: ${currentHour}:${currentMinute} (${currentTimeInMinutes} minutes)`);
    
    // Get meal time settings
    const { data: mealTimeSettings, error: settingsError } = await supabase
      .from("meal_time_settings")
      .select("*")
      .order("sort_order", { ascending: true });
    
    if (settingsError) throw settingsError;
    if (!mealTimeSettings || mealTimeSettings.length === 0) {
      console.log("No meal time settings found");
      return new Response(JSON.stringify({ success: true, message: "No meal time settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Find meals that are starting now (within a 5-minute window at the start hour)
    const mealsToRemind = mealTimeSettings.filter((setting: { start_hour: number }) => {
      const startTimeInMinutes = setting.start_hour * 60;
      // Send notification in the first 5 minutes of the meal window
      return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes < startTimeInMinutes + 5;
    });
    
    if (mealsToRemind.length === 0) {
      console.log("No meals starting now");
      return new Response(JSON.stringify({ success: true, message: "No meals to remind" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Found ${mealsToRemind.length} meals to remind:`, mealsToRemind.map((m: { label: string }) => m.label));
    
    // Get all active meal plans
    const today = now.toISOString().split('T')[0];
    const { data: activePlans, error: plansError } = await supabase
      .from("meal_plans")
      .select("id, user_id, start_date")
      .eq("is_active", true)
      .lte("start_date", today)
      .gte("end_date", today);
    
    if (plansError) throw plansError;
    if (!activePlans || activePlans.length === 0) {
      console.log("No active meal plans found for today");
      return new Response(JSON.stringify({ success: true, message: "No active plans" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log(`Found ${activePlans.length} active meal plans`);
    
    let notificationsSent = 0;
    
    for (const mealSetting of mealsToRemind) {
      for (const plan of activePlans) {
        // Calculate day of week based on plan start date
        const [year, month, day] = plan.start_date.split('-').map(Number);
        const planStartDate = new Date(year, month - 1, day);
        const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const diffTime = todayDate.getTime() - planStartDate.getTime();
        const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysSinceStart < 0) continue;
        
        const weekNumber = Math.floor(daysSinceStart / 7) + 1;
        const dayOfWeek = daysSinceStart % 7;
        
        // Get meal item for this meal type and day
        const { data: mealItems, error: itemsError } = await supabase
          .from("meal_plan_items")
          .select("*")
          .eq("meal_plan_id", plan.id)
          .eq("day_of_week", dayOfWeek)
          .eq("week_number", weekNumber)
          .eq("meal_type", mealSetting.meal_type)
          .is("completed_at", null)
          .limit(1);
        
        if (itemsError) {
          console.error("Error fetching meal items:", itemsError);
          continue;
        }
        
        if (!mealItems || mealItems.length === 0) {
          console.log(`No pending meal for ${mealSetting.label} in plan ${plan.id}`);
          continue;
        }
        
        const mealItem = mealItems[0];
        
        // Get push subscriptions for this user
        const { data: subscriptions, error: subError } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", plan.user_id);
        
        if (subError) {
          console.error("Error fetching subscriptions:", subError);
          continue;
        }
        
        if (!subscriptions || subscriptions.length === 0) {
          console.log(`No push subscriptions for user ${plan.user_id}`);
          continue;
        }
        
        // Create notification message
        const reminderMessages = [
          `🍽️ Hora do ${mealSetting.label}!`,
          `⏰ Está na hora do seu ${mealSetting.label}!`,
          `🥗 ${mealSetting.label} pronto para você!`,
        ];
        const randomMessage = reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
        
        const notificationPayload = {
          title: randomMessage,
          body: `${mealItem.recipe_name} • ${mealItem.recipe_calories} kcal`,
          icon: "/icons/icon-192x192.png",
          badge: "/icons/icon-72x72.png",
          tag: `meal-reminder-${mealSetting.meal_type}`,
          data: {
            type: "meal_reminder",
            mealType: mealSetting.meal_type,
            mealItemId: mealItem.id,
            url: "/dashboard"
          }
        };
        
        // Send push notification to all subscriptions
        for (const subscription of subscriptions) {
          console.log(`Sending meal reminder to user ${plan.user_id} for ${mealSetting.label}`);
          
          const result = await sendPushNotification(
            {
              endpoint: subscription.endpoint,
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
            notificationPayload,
            vapidPublicKey,
            vapidPrivateKey
          );
          
          if (result.success) {
            notificationsSent++;
            console.log(`✅ Push sent successfully for ${mealSetting.label}`);
          } else if (result.status === 410 || result.status === 404) {
            // Subscription expired, remove it
            console.log(`Removing expired subscription for user ${plan.user_id}`);
            await supabase.from("push_subscriptions").delete().eq("id", subscription.id);
          } else {
            console.error(`Failed to send push: ${result.error}`);
          }
        }
        
        // Also create in-app notification
        await supabase.from("notifications").insert({
          user_id: plan.user_id,
          title: randomMessage,
          message: `${mealItem.recipe_name} • ${mealItem.recipe_calories} kcal`,
          type: "reminder",
          action_url: "/dashboard"
        });
      }
    }
    
    console.log(`✅ Meal reminder check complete. Sent ${notificationsSent} notifications.`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent,
        mealsChecked: mealsToRemind.map((m: { label: string }) => m.label)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error("❌ Error in meal reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
