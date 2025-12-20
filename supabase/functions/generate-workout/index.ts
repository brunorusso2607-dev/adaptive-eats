import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WGER_BASE_URL = "https://wger.de/api/v2";

const logStep = (step: string, details?: any) => {
  console.log(`[GENERATE-WORKOUT] ${step}`, details ? JSON.stringify(details) : "");
};

// WGER muscle category IDs mapped to our muscle groups
const MUSCLE_GROUP_CATEGORIES: Record<string, number[]> = {
  "peito": [4], // Pectoralis major
  "costas": [12], // Latissimus dorsi
  "ombros": [2], // Anterior deltoid
  "braços": [1, 5], // Biceps brachii, Triceps brachii
  "pernas": [10, 11, 8], // Quadriceps, Hamstrings, Glutes
  "abdômen": [6], // Rectus abdominis
  "corpo_todo": [4, 12, 10], // Mix
};

const DIFFICULTY_CONFIG = {
  beginner: { sets: 3, reps: 12, rest: 90, exerciseCount: 4 },
  intermediate: { sets: 4, reps: 10, rest: 60, exerciseCount: 6 },
  advanced: { sets: 5, reps: 8, rest: 45, exerciseCount: 8 },
};

// Pre-defined exercises database (no external GIF URLs - they were showing random content)
const FALLBACK_EXERCISES: Record<string, any[]> = {
  "peito": [
    { id: "chest-1", name: "Flexão de Braço", bodyPart: "peito", target: "peitoral", equipment: "peso corporal", gifUrl: null },
    { id: "chest-2", name: "Supino Reto", bodyPart: "peito", target: "peitoral maior", equipment: "barra", gifUrl: null },
    { id: "chest-3", name: "Crucifixo", bodyPart: "peito", target: "peitoral", equipment: "halteres", gifUrl: null },
    { id: "chest-4", name: "Flexão Inclinada", bodyPart: "peito", target: "peitoral superior", equipment: "peso corporal", gifUrl: null },
    { id: "chest-5", name: "Supino Inclinado", bodyPart: "peito", target: "peitoral superior", equipment: "halteres", gifUrl: null },
    { id: "chest-6", name: "Crossover", bodyPart: "peito", target: "peitoral", equipment: "cabo", gifUrl: null },
    { id: "chest-7", name: "Supino Declinado", bodyPart: "peito", target: "peitoral inferior", equipment: "barra", gifUrl: null },
    { id: "chest-8", name: "Flexão Diamante", bodyPart: "peito", target: "peitoral interno", equipment: "peso corporal", gifUrl: null },
  ],
  "costas": [
    { id: "back-1", name: "Remada Curvada", bodyPart: "costas", target: "latíssimo", equipment: "barra", gifUrl: null },
    { id: "back-2", name: "Puxada na Barra", bodyPart: "costas", target: "latíssimo", equipment: "barra fixa", gifUrl: null },
    { id: "back-3", name: "Remada Unilateral", bodyPart: "costas", target: "dorsais", equipment: "halter", gifUrl: null },
    { id: "back-4", name: "Pulldown", bodyPart: "costas", target: "latíssimo", equipment: "máquina", gifUrl: null },
    { id: "back-5", name: "Remada Baixa", bodyPart: "costas", target: "dorsais", equipment: "cabo", gifUrl: null },
    { id: "back-6", name: "Hiperextensão", bodyPart: "costas", target: "lombar", equipment: "banco", gifUrl: null },
    { id: "back-7", name: "Remada Cavalinho", bodyPart: "costas", target: "dorsais", equipment: "máquina", gifUrl: null },
    { id: "back-8", name: "Puxada Supinada", bodyPart: "costas", target: "latíssimo", equipment: "máquina", gifUrl: null },
  ],
  "ombros": [
    { id: "shoulder-1", name: "Desenvolvimento", bodyPart: "ombros", target: "deltoides", equipment: "halteres", gifUrl: null },
    { id: "shoulder-2", name: "Elevação Lateral", bodyPart: "ombros", target: "deltoides lateral", equipment: "halteres", gifUrl: null },
    { id: "shoulder-3", name: "Elevação Frontal", bodyPart: "ombros", target: "deltoides anterior", equipment: "halteres", gifUrl: null },
    { id: "shoulder-4", name: "Remada Alta", bodyPart: "ombros", target: "trapézio", equipment: "barra", gifUrl: null },
    { id: "shoulder-5", name: "Desenvolvimento Arnold", bodyPart: "ombros", target: "deltoides", equipment: "halteres", gifUrl: null },
    { id: "shoulder-6", name: "Face Pull", bodyPart: "ombros", target: "deltoides posterior", equipment: "cabo", gifUrl: null },
    { id: "shoulder-7", name: "Encolhimento", bodyPart: "ombros", target: "trapézio", equipment: "halteres", gifUrl: null },
    { id: "shoulder-8", name: "Crucifixo Invertido", bodyPart: "ombros", target: "deltoides posterior", equipment: "halteres", gifUrl: null },
  ],
  "braços": [
    { id: "arms-1", name: "Rosca Direta", bodyPart: "braços", target: "bíceps", equipment: "barra", gifUrl: null },
    { id: "arms-2", name: "Tríceps Testa", bodyPart: "braços", target: "tríceps", equipment: "barra", gifUrl: null },
    { id: "arms-3", name: "Rosca Martelo", bodyPart: "braços", target: "bíceps", equipment: "halteres", gifUrl: null },
    { id: "arms-4", name: "Tríceps Corda", bodyPart: "braços", target: "tríceps", equipment: "cabo", gifUrl: null },
    { id: "arms-5", name: "Rosca Concentrada", bodyPart: "braços", target: "bíceps", equipment: "halter", gifUrl: null },
    { id: "arms-6", name: "Mergulho no Banco", bodyPart: "braços", target: "tríceps", equipment: "banco", gifUrl: null },
    { id: "arms-7", name: "Rosca Scott", bodyPart: "braços", target: "bíceps", equipment: "barra", gifUrl: null },
    { id: "arms-8", name: "Tríceps Francês", bodyPart: "braços", target: "tríceps", equipment: "halter", gifUrl: null },
  ],
  "pernas": [
    { id: "legs-1", name: "Agachamento", bodyPart: "pernas", target: "quadríceps", equipment: "barra", gifUrl: null },
    { id: "legs-2", name: "Leg Press", bodyPart: "pernas", target: "quadríceps", equipment: "máquina", gifUrl: null },
    { id: "legs-3", name: "Stiff", bodyPart: "pernas", target: "posteriores", equipment: "barra", gifUrl: null },
    { id: "legs-4", name: "Cadeira Extensora", bodyPart: "pernas", target: "quadríceps", equipment: "máquina", gifUrl: null },
    { id: "legs-5", name: "Mesa Flexora", bodyPart: "pernas", target: "posteriores", equipment: "máquina", gifUrl: null },
    { id: "legs-6", name: "Panturrilha em Pé", bodyPart: "pernas", target: "panturrilhas", equipment: "máquina", gifUrl: null },
    { id: "legs-7", name: "Afundo", bodyPart: "pernas", target: "glúteos", equipment: "halteres", gifUrl: null },
    { id: "legs-8", name: "Elevação Pélvica", bodyPart: "pernas", target: "glúteos", equipment: "barra", gifUrl: null },
  ],
  "abdômen": [
    { id: "abs-1", name: "Abdominal Crunch", bodyPart: "abdômen", target: "reto abdominal", equipment: "peso corporal", gifUrl: null },
    { id: "abs-2", name: "Prancha", bodyPart: "abdômen", target: "core", equipment: "peso corporal", gifUrl: null },
    { id: "abs-3", name: "Elevação de Pernas", bodyPart: "abdômen", target: "reto abdominal inferior", equipment: "barra fixa", gifUrl: null },
    { id: "abs-4", name: "Abdominal Oblíquo", bodyPart: "abdômen", target: "oblíquos", equipment: "peso corporal", gifUrl: null },
    { id: "abs-5", name: "Mountain Climber", bodyPart: "abdômen", target: "core", equipment: "peso corporal", gifUrl: null },
    { id: "abs-6", name: "Russian Twist", bodyPart: "abdômen", target: "oblíquos", equipment: "peso corporal", gifUrl: null },
    { id: "abs-7", name: "Abdominal Infra", bodyPart: "abdômen", target: "reto abdominal inferior", equipment: "peso corporal", gifUrl: null },
    { id: "abs-8", name: "Prancha Lateral", bodyPart: "abdômen", target: "oblíquos", equipment: "peso corporal", gifUrl: null },
  ],
  "corpo_todo": [
    { id: "full-1", name: "Burpee", bodyPart: "corpo todo", target: "full body", equipment: "peso corporal", gifUrl: null },
    { id: "full-2", name: "Agachamento", bodyPart: "corpo todo", target: "quadríceps", equipment: "barra", gifUrl: null },
    { id: "full-3", name: "Remada Curvada", bodyPart: "corpo todo", target: "costas", equipment: "barra", gifUrl: null },
    { id: "full-4", name: "Desenvolvimento", bodyPart: "corpo todo", target: "ombros", equipment: "halteres", gifUrl: null },
    { id: "full-5", name: "Flexão de Braço", bodyPart: "corpo todo", target: "peitoral", equipment: "peso corporal", gifUrl: null },
    { id: "full-6", name: "Stiff", bodyPart: "corpo todo", target: "posteriores", equipment: "barra", gifUrl: null },
    { id: "full-7", name: "Rosca Direta", bodyPart: "corpo todo", target: "bíceps", equipment: "barra", gifUrl: null },
    { id: "full-8", name: "Prancha", bodyPart: "corpo todo", target: "core", equipment: "peso corporal", gifUrl: null },
  ],
};

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

    // Use fallback exercises (pre-defined with working GIF URLs)
    const allExercises = FALLBACK_EXERCISES[muscleGroup] || FALLBACK_EXERCISES["corpo_todo"];
    
    logStep("Using exercises", { total: allExercises.length });

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
      exercise_id: exercise.id,
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
