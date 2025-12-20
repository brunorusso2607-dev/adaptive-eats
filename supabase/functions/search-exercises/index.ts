import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXERCISEDB_BASE_URL = "https://exercisedb-api.vercel.app/api/v1";

const BODY_PART_MAP: Record<string, string> = {
  "chest": "peito",
  "back": "costas",
  "shoulders": "ombros",
  "upper arms": "bíceps/tríceps",
  "lower arms": "antebraços",
  "upper legs": "pernas",
  "lower legs": "panturrilhas",
  "waist": "abdômen",
  "cardio": "cardio",
};

const TARGET_MUSCLE_MAP: Record<string, string> = {
  "pectorals": "peitorais",
  "lats": "dorsais",
  "traps": "trapézio",
  "delts": "deltoides",
  "biceps": "bíceps",
  "triceps": "tríceps",
  "forearms": "antebraços",
  "abs": "abdominais",
  "quads": "quadríceps",
  "hamstrings": "posteriores",
  "glutes": "glúteos",
  "calves": "panturrilhas",
  "adductors": "adutores",
  "abductors": "abdutores",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bodyPart, target, equipment, search, limit = 20, offset = 0 } = await req.json();

    console.log("Search exercises request:", { bodyPart, target, equipment, search, limit, offset });

    let url = `${EXERCISEDB_BASE_URL}/exercises`;
    const params = new URLSearchParams();

    // Build URL based on search type
    if (bodyPart) {
      url = `${EXERCISEDB_BASE_URL}/exercises/bodyPart/${encodeURIComponent(bodyPart)}`;
    } else if (target) {
      url = `${EXERCISEDB_BASE_URL}/exercises/target/${encodeURIComponent(target)}`;
    } else if (equipment) {
      url = `${EXERCISEDB_BASE_URL}/exercises/equipment/${encodeURIComponent(equipment)}`;
    } else if (search) {
      url = `${EXERCISEDB_BASE_URL}/exercises/search`;
      params.append("search", search);
    }

    params.append("limit", limit.toString());
    params.append("offset", offset.toString());

    const fullUrl = `${url}?${params.toString()}`;
    console.log("Fetching from ExerciseDB:", fullUrl);

    const response = await fetch(fullUrl, {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.error("ExerciseDB API error:", response.status, response.statusText);
      throw new Error(`ExerciseDB API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("ExerciseDB response received, exercises count:", data.data?.length || 0);

    // Transform exercises with Portuguese translations
    const exercises = (data.data || []).map((exercise: any) => ({
      id: exercise.exerciseId || exercise.id,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      bodyPartPt: BODY_PART_MAP[exercise.bodyPart?.toLowerCase()] || exercise.bodyPart,
      target: exercise.target,
      targetPt: TARGET_MUSCLE_MAP[exercise.target?.toLowerCase()] || exercise.target,
      equipment: exercise.equipment,
      gifUrl: exercise.gifUrl,
      secondaryMuscles: exercise.secondaryMuscles || [],
      instructions: exercise.instructions || [],
    }));

    return new Response(
      JSON.stringify({
        success: true,
        exercises,
        total: data.total || exercises.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in search-exercises:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
