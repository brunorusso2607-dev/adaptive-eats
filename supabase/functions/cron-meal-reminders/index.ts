import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mensagens variadas para as notificações (estilo Duolingo)
const reminderMessages = [
  { title: "🍽️ Hora de comer!", body: "Não esqueça de registrar sua refeição. Seu corpo agradece!" },
  { title: "📱 Sentimos sua falta!", body: "Já registrou suas refeições hoje? Continue sua jornada saudável!" },
  { title: "🔥 Mantenha o ritmo!", body: "Registrar refeições é o segredo do sucesso. Vamos lá?" },
  { title: "💪 Você consegue!", body: "Um pequeno registro agora = grandes resultados depois!" },
  { title: "🌟 Lembrete amigo!", body: "Suas refeições de hoje já foram registradas?" },
  { title: "🥗 Nutrição em dia!", body: "Hora de anotar o que você comeu. É rápido e fácil!" },
  { title: "⏰ Não perca o hábito!", body: "Registrar refeições leva menos de 1 minuto!" },
  { title: "🎯 Meta do dia!", body: "Já anotou suas refeições? Continue firme!" },
];

function getRandomMessage() {
  return reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CRON-MEAL-REMINDERS] Started at:', new Date().toISOString());

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get current hour in BRT (UTC-3)
    const now = new Date();
    const brtHour = (now.getUTCHours() - 3 + 24) % 24;
    const currentTime = `${brtHour.toString().padStart(2, '0')}:00:00`;
    
    console.log('[CRON-MEAL-REMINDERS] Current BRT hour:', brtHour, 'Looking for reminder_time:', currentTime);

    // Get users who should receive reminder at this hour
    const { data: preferences, error: prefError } = await supabaseClient
      .from('notification_preferences')
      .select('user_id, meal_reminders, reminder_time')
      .eq('meal_reminders', true)
      .eq('reminder_time', currentTime);

    if (prefError) {
      throw new Error(`Failed to fetch preferences: ${prefError.message}`);
    }

    console.log('[CRON-MEAL-REMINDERS] Users to notify:', preferences?.length || 0);

    if (!preferences || preferences.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify at this time" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check which users haven't logged meals today
    const today = new Date().toISOString().split('T')[0];
    
    const userIds = preferences.map(p => p.user_id);
    
    const { data: todayConsumption, error: consError } = await supabaseClient
      .from('meal_consumption')
      .select('user_id')
      .in('user_id', userIds)
      .gte('consumed_at', `${today}T00:00:00`)
      .lte('consumed_at', `${today}T23:59:59`);

    if (consError) {
      console.error('[CRON-MEAL-REMINDERS] Error checking consumption:', consError);
    }

    // Users who have logged meals today
    const usersWithMeals = new Set(todayConsumption?.map(c => c.user_id) || []);
    
    // Filter to only notify users who haven't logged meals
    const usersToNotify = preferences.filter(p => !usersWithMeals.has(p.user_id));
    
    console.log('[CRON-MEAL-REMINDERS] Users without meals today:', usersToNotify.length);

    if (usersToNotify.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All users have logged meals today" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notifications
    let sentCount = 0;
    let failedCount = 0;

    for (const user of usersToNotify) {
      try {
        const message = getRandomMessage();
        
        // Call the send-push-notification function
        const { error } = await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            userId: user.user_id,
            payload: {
              title: message.title,
              body: message.body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-96x96.png',
              tag: 'meal-reminder',
              data: { url: '/dashboard' }
            }
          }
        });

        if (error) {
          console.error('[CRON-MEAL-REMINDERS] Failed to send to user:', user.user_id, error);
          failedCount++;
        } else {
          console.log('[CRON-MEAL-REMINDERS] Sent to user:', user.user_id);
          sentCount++;
        }
      } catch (err) {
        console.error('[CRON-MEAL-REMINDERS] Error sending to user:', user.user_id, err);
        failedCount++;
      }
    }

    console.log('[CRON-MEAL-REMINDERS] Complete. Sent:', sentCount, 'Failed:', failedCount);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        failed: failedCount,
        totalUsers: usersToNotify.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[CRON-MEAL-REMINDERS] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
