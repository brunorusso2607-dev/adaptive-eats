import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Auto-skip deadline: 24 hours after meal end time
const AUTO_SKIP_HOURS = 24;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[auto-skip-overdue-meals] Starting auto-skip job...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active meal plans with their items
    const { data: activePlans, error: plansError } = await supabase
      .from("meal_plans")
      .select(`
        id,
        user_id,
        start_date,
        custom_meal_times,
        meal_plan_items!inner (
          id,
          day_of_week,
          week_number,
          meal_type,
          recipe_name,
          completed_at
        )
      `)
      .eq("is_active", true)
      .is("meal_plan_items.completed_at", null);

    if (plansError) {
      console.error("[auto-skip-overdue-meals] Error fetching plans:", plansError);
      throw plansError;
    }

    if (!activePlans || activePlans.length === 0) {
      console.log("[auto-skip-overdue-meals] No active plans with pending meals found");
      return new Response(
        JSON.stringify({ success: true, skippedCount: 0, message: "No pending meals" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get global meal time settings
    const { data: mealTimeSettings } = await supabase
      .from("meal_time_settings")
      .select("meal_type, start_hour");

    const globalTimeRanges: Record<string, { start: number; end: number }> = {};
    if (mealTimeSettings) {
      const sorted = [...mealTimeSettings].sort((a, b) => a.start_hour - b.start_hour);
      for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        const next = sorted[i + 1];
        globalTimeRanges[current.meal_type] = {
          start: current.start_hour,
          end: next ? next.start_hour : 24,
        };
      }
    }

    const now = new Date();
    let skippedCount = 0;
    const skippedMeals: Array<{ userId: string; mealId: string; recipeName: string }> = [];

    for (const plan of activePlans) {
      const planStartDate = new Date(plan.start_date + "T00:00:00");
      
      // Merge custom meal times with global
      const planCustomTimes = plan.custom_meal_times as Record<string, string> | null;
      const effectiveRanges = { ...globalTimeRanges };
      
      if (planCustomTimes) {
        for (const [mealType, customTime] of Object.entries(planCustomTimes)) {
          if (typeof customTime === "string" && effectiveRanges[mealType]) {
            const [hours] = customTime.split(":").map(Number);
            const duration = effectiveRanges[mealType].end - effectiveRanges[mealType].start;
            effectiveRanges[mealType] = {
              start: hours,
              end: hours + duration,
            };
          }
        }
      }

      for (const item of plan.meal_plan_items as any[]) {
        // Calculate actual date of this meal
        const actualDate = new Date(planStartDate);
        const weeksOffset = (item.week_number - 1) * 7;
        actualDate.setDate(actualDate.getDate() + weeksOffset + item.day_of_week);

        // Get the end hour of this meal
        const range = effectiveRanges[item.meal_type];
        if (!range) continue;

        // Set the meal end time (end hour of the meal window)
        const mealEndTime = new Date(actualDate);
        mealEndTime.setHours(Math.floor(range.end), (range.end % 1) * 60, 0, 0);

        // Calculate 24h deadline after meal end time
        const deadline = new Date(mealEndTime.getTime() + AUTO_SKIP_HOURS * 60 * 60 * 1000);

        // Check if deadline has passed
        if (now > deadline) {
          console.log(`[auto-skip-overdue-meals] Marking as skipped: ${item.recipe_name} (meal: ${item.id}, deadline was: ${deadline.toISOString()})`);

          // Check if already processed (avoid duplicates)
          const { data: existingConsumption } = await supabase
            .from("meal_consumption")
            .select("id")
            .eq("meal_plan_item_id", item.id)
            .maybeSingle();

          if (existingConsumption) {
            console.log(`[auto-skip-overdue-meals] Meal ${item.id} already has consumption record, skipping`);
            continue;
          }

          // Create meal consumption record with source_type: 'auto_skipped'
          const { error: consumptionError } = await supabase
            .from("meal_consumption")
            .insert({
              user_id: plan.user_id,
              meal_plan_item_id: item.id,
              followed_plan: false,
              total_calories: 0,
              total_protein: 0,
              total_carbs: 0,
              total_fat: 0,
              source_type: "auto_skipped",
              custom_meal_name: `${item.recipe_name} (Perdida)`,
              feedback_status: "auto_well", // No symptoms for skipped meals
              consumed_at: deadline.toISOString(), // Use deadline as consumed_at for history
            });

          if (consumptionError) {
            console.error(`[auto-skip-overdue-meals] Error creating consumption for ${item.id}:`, consumptionError);
            continue;
          }

          // Mark meal plan item as completed
          const { error: updateError } = await supabase
            .from("meal_plan_items")
            .update({ completed_at: now.toISOString() })
            .eq("id", item.id);

          if (updateError) {
            console.error(`[auto-skip-overdue-meals] Error updating meal item ${item.id}:`, updateError);
            continue;
          }

          // Create notification record for user (ignore if already exists)
          const { error: notifError } = await supabase
            .from("auto_skip_notifications")
            .upsert({
              user_id: plan.user_id,
              meal_plan_item_id: item.id,
              skipped_at: now.toISOString(),
            }, { onConflict: "meal_plan_item_id", ignoreDuplicates: true });

          skippedMeals.push({
            userId: plan.user_id,
            mealId: item.id,
            recipeName: item.recipe_name,
          });
          skippedCount++;
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[auto-skip-overdue-meals] Completed. Skipped ${skippedCount} meals in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        skippedCount,
        skippedMeals,
        durationMs: duration,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[auto-skip-overdue-meals] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

