import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const currentHour = now.getHours();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    // Get users with reminders enabled and within their reminder hours
    const { data: settings, error: settingsError } = await supabase
      .from("water_settings")
      .select("user_id, daily_goal_ml, reminder_start_hour, reminder_end_hour")
      .eq("reminder_enabled", true)
      .lte("reminder_start_hour", currentHour)
      .gte("reminder_end_hour", currentHour);

    if (settingsError) {
      console.error("Error fetching water settings:", settingsError);
      throw settingsError;
    }

    console.log(`Found ${settings?.length || 0} users with active water reminders`);

    if (!settings || settings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to remind", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = settings.map((s) => s.user_id);

    // Get today's water consumption for these users
    const { data: consumptions, error: consError } = await supabase
      .from("water_consumption")
      .select("user_id, amount_ml")
      .in("user_id", userIds)
      .gte("consumed_at", todayStart.toISOString());

    if (consError) {
      console.error("Error fetching water consumption:", consError);
    }

    // Calculate total per user
    const totalByUser: Record<string, number> = {};
    consumptions?.forEach((c) => {
      totalByUser[c.user_id] = (totalByUser[c.user_id] || 0) + c.amount_ml;
    });

    // Find users who need reminding (below 80% of goal for current time proportion)
    const usersToRemind: { userId: string; total: number; goal: number; percentage: number }[] = [];
    
    for (const setting of settings) {
      const total = totalByUser[setting.user_id] || 0;
      const goal = setting.daily_goal_ml;
      const percentage = Math.round((total / goal) * 100);
      
      // Calculate expected progress based on time of day
      const dayProgress = (currentHour - (setting.reminder_start_hour || 8)) / 
        ((setting.reminder_end_hour || 22) - (setting.reminder_start_hour || 8));
      const expectedPercentage = Math.min(dayProgress * 100, 100);
      
      // Remind if below 80% of expected progress
      if (percentage < expectedPercentage * 0.8) {
        usersToRemind.push({ userId: setting.user_id, total, goal, percentage });
      }
    }

    console.log(`${usersToRemind.length} users need water reminders`);

    if (usersToRemind.length === 0) {
      return new Response(
        JSON.stringify({ message: "All users on track", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", usersToRemind.map((u) => u.userId));

    if (subsError) {
      console.error("Error fetching subscriptions:", subsError);
    }

    let sentCount = 0;

    for (const sub of subscriptions || []) {
      const userData = usersToRemind.find((u) => u.userId === sub.user_id);
      if (!userData) continue;

      const remaining = Math.round((userData.goal - userData.total) / 1000 * 10) / 10;
      
      const messages = [
        `Você bebeu ${userData.percentage}% da meta. Faltam ${remaining}L!`,
        `Hora de se hidratar! Ainda faltam ${remaining}L para sua meta.`,
        `Lembrete: beba água! Meta de hoje: ${remaining}L restantes.`,
      ];
      
      const payload = JSON.stringify({
        title: "💧 Hora de beber água!",
        body: messages[Math.floor(Math.random() * messages.length)],
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-72x72.png",
        tag: "water-reminder",
        data: {
          type: "water-reminder",
          url: "/dashboard",
        },
        actions: [
          { action: "add-water", title: "💧 +250ml" },
          { action: "dismiss", title: "Depois" },
        ],
      });

      const message = messages[Math.floor(Math.random() * messages.length)];

      // Insert notification into database
      await supabase.from("notifications").insert({
        user_id: sub.user_id,
        title: "💧 Hora de beber água!",
        message: message,
        type: "reminder",
        action_url: "/dashboard",
      });

      console.log(`Sent water reminder to user ${sub.user_id}: ${userData.percentage}% of goal`);
      sentCount++;
    }

    return new Response(
      JSON.stringify({
        message: "Water reminders processed",
        sent: sentCount,
        usersChecked: settings.length,
        usersNeedingReminder: usersToRemind.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-water-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
