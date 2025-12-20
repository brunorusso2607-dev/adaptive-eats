import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXERCISEDB_BASE_URL = "https://exercisedb-api.vercel.app/api/v1";

const logStep = (step: string, details?: any) => {
  console.log(`[GENERATE-WORKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

const MUSCLE_GROUP_EXERCISES: Record<string, string[]> = {
  "peito": ["chest"],
  "costas": ["back"],
  "ombros": ["shoulders"],
  "braços": ["upper arms"],
  "pernas": ["upper legs", "lower legs"],
  "abdômen": ["waist"],
  "corpo_todo": ["chest", "back", "upper legs"],
};

const DIFFICULTY_CONFIG = {
  beginner: { sets: 3, reps: 12, rest: 90, exerciseCount: 4 },
  intermediate: { sets: 4, reps: 10, rest: 60, exerciseCount: 6 },
  advanced: { sets: 5, reps: 8, rest: 45, exerciseCount: 8 },
};

async function fetchExercisesByBodyPart(bodyPart: string, limit: number = 10): Promise<any[]> {
  const url = `${EXERCISEDB_BASE_URL}/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}`;
  logStep("Fetching exercises from ExerciseDB", { url });
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`ExerciseDB API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    logStep("User authenticated", { userId: user.id });

    const { muscleGroup, difficulty = "intermediate", planName } = await req.json();
    
    if (!muscleGroup) {
      throw new Error("Muscle group is required");
    }

    logStep("Request params", { muscleGroup, difficulty, planName });

    const config = DIFFICULTY_CONFIG[difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.intermediate;
    const bodyParts = MUSCLE_GROUP_EXERCISES[muscleGroup] || ["chest"];

    // Fetch exercises for each body part
    const allExercises: any[] = [];
    for (const bodyPart of bodyParts) {
      const exercises = await fetchExercisesByBodyPart(bodyPart, 20);
      allExercises.push(...exercises);
    }

    logStep("Fetched exercises", { total: allExercises.length });

    // Shuffle and select exercises
    const shuffled = allExercises.sort(() => Math.random() - 0.5);
    const selectedExercises = shuffled.slice(0, config.exerciseCount);

    // Create workout plan
    const { data: workoutPlan, error: planError } = await supabase
      .from("workout_plans")
      .insert({
        user_id: user.id,
        name: planName || `Treino de ${muscleGroup}`,
        target_muscle_group: muscleGroup,
        difficulty: difficulty,
      })
      .select()
      .single();

    if (planError) {
      logStep("Error creating workout plan", planError);
      throw new Error("Failed to create workout plan");
    }

    logStep("Created workout plan", { planId: workoutPlan.id });

    // Insert exercises
    const exercisesToInsert = selectedExercises.map((exercise, index) => ({
      workout_plan_id: workoutPlan.id,
      exercise_id: exercise.exerciseId || exercise.id,
      exercise_name: exercise.name,
      body_part: exercise.bodyPart,
      target_muscle: exercise.target,
      equipment: exercise.equipment,
      gif_url: exercise.gifUrl,
      sets: config.sets,
      reps: config.reps,
      rest_seconds: config.rest,
      order_index: index,
    }));

    const { error: exercisesError } = await supabase
      .from("workout_exercises")
      .insert(exercisesToInsert);

    if (exercisesError) {
      logStep("Error inserting exercises", exercisesError);
      throw new Error("Failed to insert exercises");
    }

    logStep("Inserted exercises", { count: exercisesToInsert.length });

    // Fetch complete workout with exercises
    const { data: completeWorkout, error: fetchError } = await supabase
      .from("workout_plans")
      .select(`
        *,
        workout_exercises (*)
      `)
      .eq("id", workoutPlan.id)
      .single();

    if (fetchError) {
      throw new Error("Failed to fetch complete workout");
    }

    return new Response(
      JSON.stringify({
        success: true,
        workout: completeWorkout,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Error in generate-workout", { error: error instanceof Error ? error.message : "Unknown" });
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
