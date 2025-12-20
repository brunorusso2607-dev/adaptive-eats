import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-defined exercises organized by muscle group
const EXERCISES_DB: Record<string, any[]> = {
  "peito": [
    { id: "chest-1", name: "Flexão de Braço", bodyPart: "peito", target: "peitoral", equipment: "peso corporal", gifUrl: "https://media.giphy.com/media/23hPPMRgPxbNBlPQe3/giphy.gif" },
    { id: "chest-2", name: "Supino Reto", bodyPart: "peito", target: "peitoral maior", equipment: "barra", gifUrl: "https://media.giphy.com/media/1qfKN8Dt0CRdCRxz9q/giphy.gif" },
    { id: "chest-3", name: "Crucifixo", bodyPart: "peito", target: "peitoral", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xTiTnwRUSj0hnkMFhu/giphy.gif" },
    { id: "chest-4", name: "Flexão Inclinada", bodyPart: "peito", target: "peitoral superior", equipment: "peso corporal", gifUrl: "https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif" },
    { id: "chest-5", name: "Supino Inclinado", bodyPart: "peito", target: "peitoral superior", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xT0xeMA62E1XIlup68/giphy.gif" },
    { id: "chest-6", name: "Crossover", bodyPart: "peito", target: "peitoral", equipment: "cabo", gifUrl: "https://media.giphy.com/media/3o7TKMeCOV3oXSb5bq/giphy.gif" },
  ],
  "costas": [
    { id: "back-1", name: "Remada Curvada", bodyPart: "costas", target: "latíssimo", equipment: "barra", gifUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
    { id: "back-2", name: "Puxada na Barra", bodyPart: "costas", target: "latíssimo", equipment: "barra fixa", gifUrl: "https://media.giphy.com/media/l378p60yRSCeVoyAM/giphy.gif" },
    { id: "back-3", name: "Remada Unilateral", bodyPart: "costas", target: "dorsais", equipment: "halter", gifUrl: "https://media.giphy.com/media/3ohzdQhmr6WP3umEpy/giphy.gif" },
    { id: "back-4", name: "Pulldown", bodyPart: "costas", target: "latíssimo", equipment: "máquina", gifUrl: "https://media.giphy.com/media/l2SpQdJ7u7rfgQp2M/giphy.gif" },
    { id: "back-5", name: "Remada Baixa", bodyPart: "costas", target: "dorsais", equipment: "cabo", gifUrl: "https://media.giphy.com/media/xT0xeGWDzEfcsd8QzC/giphy.gif" },
    { id: "back-6", name: "Hiperextensão", bodyPart: "costas", target: "lombar", equipment: "banco", gifUrl: "https://media.giphy.com/media/l0HlO3BJ8XREU8FUI/giphy.gif" },
  ],
  "ombros": [
    { id: "shoulder-1", name: "Desenvolvimento", bodyPart: "ombros", target: "deltoides", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xT0xeIbYVQcBFDSdVu/giphy.gif" },
    { id: "shoulder-2", name: "Elevação Lateral", bodyPart: "ombros", target: "deltoides lateral", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xT0xeuOy2Fcl9vDGiA/giphy.gif" },
    { id: "shoulder-3", name: "Elevação Frontal", bodyPart: "ombros", target: "deltoides anterior", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
    { id: "shoulder-4", name: "Remada Alta", bodyPart: "ombros", target: "trapézio", equipment: "barra", gifUrl: "https://media.giphy.com/media/3ohzdQhmr6WP3umEpy/giphy.gif" },
    { id: "shoulder-5", name: "Desenvolvimento Arnold", bodyPart: "ombros", target: "deltoides", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xT0xeMA62E1XIlup68/giphy.gif" },
    { id: "shoulder-6", name: "Face Pull", bodyPart: "ombros", target: "deltoides posterior", equipment: "cabo", gifUrl: "https://media.giphy.com/media/l2SpQdJ7u7rfgQp2M/giphy.gif" },
  ],
  "braços": [
    { id: "arms-1", name: "Rosca Direta", bodyPart: "braços", target: "bíceps", equipment: "barra", gifUrl: "https://media.giphy.com/media/l378p60yRSCeVoyAM/giphy.gif" },
    { id: "arms-2", name: "Tríceps Testa", bodyPart: "braços", target: "tríceps", equipment: "barra", gifUrl: "https://media.giphy.com/media/xT0xeGWDzEfcsd8QzC/giphy.gif" },
    { id: "arms-3", name: "Rosca Martelo", bodyPart: "braços", target: "bíceps", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xT0xeMA62E1XIlup68/giphy.gif" },
    { id: "arms-4", name: "Tríceps Corda", bodyPart: "braços", target: "tríceps", equipment: "cabo", gifUrl: "https://media.giphy.com/media/l2SpQdJ7u7rfgQp2M/giphy.gif" },
    { id: "arms-5", name: "Rosca Concentrada", bodyPart: "braços", target: "bíceps", equipment: "halter", gifUrl: "https://media.giphy.com/media/3ohzdQhmr6WP3umEpy/giphy.gif" },
    { id: "arms-6", name: "Mergulho no Banco", bodyPart: "braços", target: "tríceps", equipment: "banco", gifUrl: "https://media.giphy.com/media/l0HlO3BJ8XREU8FUI/giphy.gif" },
  ],
  "pernas": [
    { id: "legs-1", name: "Agachamento", bodyPart: "pernas", target: "quadríceps", equipment: "barra", gifUrl: "https://media.giphy.com/media/1qfKN8Dt0CRdCRxz9q/giphy.gif" },
    { id: "legs-2", name: "Leg Press", bodyPart: "pernas", target: "quadríceps", equipment: "máquina", gifUrl: "https://media.giphy.com/media/xT0xeIbYVQcBFDSdVu/giphy.gif" },
    { id: "legs-3", name: "Stiff", bodyPart: "pernas", target: "posteriores", equipment: "barra", gifUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
    { id: "legs-4", name: "Cadeira Extensora", bodyPart: "pernas", target: "quadríceps", equipment: "máquina", gifUrl: "https://media.giphy.com/media/xT0xeGWDzEfcsd8QzC/giphy.gif" },
    { id: "legs-5", name: "Mesa Flexora", bodyPart: "pernas", target: "posteriores", equipment: "máquina", gifUrl: "https://media.giphy.com/media/l2SpQdJ7u7rfgQp2M/giphy.gif" },
    { id: "legs-6", name: "Panturrilha em Pé", bodyPart: "pernas", target: "panturrilhas", equipment: "máquina", gifUrl: "https://media.giphy.com/media/3ohzdQhmr6WP3umEpy/giphy.gif" },
    { id: "legs-7", name: "Afundo", bodyPart: "pernas", target: "glúteos", equipment: "halteres", gifUrl: "https://media.giphy.com/media/xT0xeMA62E1XIlup68/giphy.gif" },
    { id: "legs-8", name: "Elevação Pélvica", bodyPart: "pernas", target: "glúteos", equipment: "barra", gifUrl: "https://media.giphy.com/media/l0HlO3BJ8XREU8FUI/giphy.gif" },
  ],
  "abdômen": [
    { id: "abs-1", name: "Abdominal Crunch", bodyPart: "abdômen", target: "reto abdominal", equipment: "peso corporal", gifUrl: "https://media.giphy.com/media/23hPPMRgPxbNBlPQe3/giphy.gif" },
    { id: "abs-2", name: "Prancha", bodyPart: "abdômen", target: "core", equipment: "peso corporal", gifUrl: "https://media.giphy.com/media/l378p60yRSCeVoyAM/giphy.gif" },
    { id: "abs-3", name: "Elevação de Pernas", bodyPart: "abdômen", target: "reto abdominal inferior", equipment: "barra fixa", gifUrl: "https://media.giphy.com/media/xT0xeIbYVQcBFDSdVu/giphy.gif" },
    { id: "abs-4", name: "Abdominal Oblíquo", bodyPart: "abdômen", target: "oblíquos", equipment: "peso corporal", gifUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif" },
    { id: "abs-5", name: "Mountain Climber", bodyPart: "abdômen", target: "core", equipment: "peso corporal", gifUrl: "https://media.giphy.com/media/xT0xeGWDzEfcsd8QzC/giphy.gif" },
    { id: "abs-6", name: "Russian Twist", bodyPart: "abdômen", target: "oblíquos", equipment: "peso corporal", gifUrl: "https://media.giphy.com/media/l2SpQdJ7u7rfgQp2M/giphy.gif" },
  ],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bodyPart, search, limit = 20, offset = 0 } = await req.json();

    console.log("Search exercises request:", { bodyPart, search, limit, offset });

    let exercises: any[] = [];

    if (bodyPart && EXERCISES_DB[bodyPart]) {
      exercises = EXERCISES_DB[bodyPart];
    } else if (search) {
      // Search across all exercises
      const searchLower = search.toLowerCase();
      for (const group of Object.values(EXERCISES_DB)) {
        for (const exercise of group) {
          if (
            exercise.name.toLowerCase().includes(searchLower) ||
            exercise.target.toLowerCase().includes(searchLower) ||
            exercise.equipment.toLowerCase().includes(searchLower)
          ) {
            exercises.push(exercise);
          }
        }
      }
    } else {
      // Return all exercises
      for (const group of Object.values(EXERCISES_DB)) {
        exercises.push(...group);
      }
    }

    // Apply pagination
    const paginatedExercises = exercises.slice(offset, offset + limit);

    return new Response(
      JSON.stringify({
        success: true,
        exercises: paginatedExercises,
        total: exercises.length,
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
