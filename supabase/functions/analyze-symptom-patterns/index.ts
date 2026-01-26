import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { days = 30 } = await req.json();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`Analyzing symptom patterns for user ${user.id} over ${days} days`);

    // Fetch symptom logs
    const { data: symptomLogs, error: symptomError } = await supabase
      .from("symptom_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", startDate.toISOString())
      .order("logged_at", { ascending: false });

    if (symptomError) {
      console.error("Error fetching symptom logs:", symptomError);
      throw symptomError;
    }

    // Fetch meal consumption with items
    const { data: mealConsumption, error: mealError } = await supabase
      .from("meal_consumption")
      .select(`
        *,
        consumption_items (*)
      `)
      .eq("user_id", user.id)
      .gte("consumed_at", startDate.toISOString())
      .order("consumed_at", { ascending: false });

    if (mealError) {
      console.error("Error fetching meal consumption:", mealError);
      throw mealError;
    }

    // Fetch user intolerances
    const { data: profile } = await supabase
      .from("profiles")
      .select("intolerances, excluded_ingredients")
      .eq("id", user.id)
      .single();

    // If no data, return empty insights
    if (!symptomLogs || symptomLogs.length === 0) {
      return new Response(JSON.stringify({
        insights: [],
        safetyScore: 100,
        totalSymptomDays: 0,
        correlations: [],
        message: "Registre sintomas para receber insights personalizados."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Analyze correlations between symptoms and foods
    const symptomFoodCorrelations: Record<string, Record<string, number>> = {};
    const symptomCounts: Record<string, number> = {};

    for (const log of symptomLogs) {
      // Count symptom occurrences
      for (const symptom of log.symptoms) {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
      }

      // Find meals consumed within 6 hours before the symptom
      const symptomTime = new Date(log.logged_at).getTime();
      const sixHoursAgo = symptomTime - (6 * 60 * 60 * 1000);

      const recentMeals = mealConsumption?.filter(meal => {
        const mealTime = new Date(meal.consumed_at).getTime();
        return mealTime >= sixHoursAgo && mealTime <= symptomTime;
      }) || [];

      // Extract foods from recent meals
      for (const meal of recentMeals) {
        const items = meal.consumption_items || [];
        for (const item of items) {
          const foodName = item.food_name.toLowerCase();
          
          for (const symptom of log.symptoms) {
            if (!symptomFoodCorrelations[symptom]) {
              symptomFoodCorrelations[symptom] = {};
            }
            symptomFoodCorrelations[symptom][foodName] = 
              (symptomFoodCorrelations[symptom][foodName] || 0) + 1;
          }
        }
      }
    }

    // Generate insights using Gemini
    let aiInsights: string[] = [];
    
    if (Object.keys(symptomFoodCorrelations).length > 0) {
      try {
        const geminiApiKey = await getGeminiApiKey();
        
        const correlationSummary = Object.entries(symptomFoodCorrelations)
          .map(([symptom, foods]) => {
            const topFoods = Object.entries(foods)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([food, count]) => `${food} (${count}x)`);
            return `${symptom}: ${topFoods.join(", ")}`;
          })
          .join("\n");

        const userIntolerances = profile?.intolerances?.join(", ") || "nenhuma informada";
        
        const prompt = `Você é um nutricionista especializado em intolerâncias alimentares. Seja direto e prático.

Analise os seguintes padrões de sintomas e alimentos consumidos de um usuário com intolerâncias alimentares.

Intolerâncias do usuário: ${userIntolerances}

Correlações encontradas (sintoma: alimentos consumidos antes):
${correlationSummary}

Total de registros de sintomas: ${symptomLogs.length}
Período analisado: ${days} dias

Forneça até 3 insights curtos e acionáveis em português brasileiro. Cada insight deve ter no máximo 100 caracteres.
Foque em:
1. Padrões óbvios de correlação
2. Alimentos que podem estar causando problemas
3. Sugestões práticas

Responda apenas com os insights, um por linha, sem numeração.`;

        const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + geminiApiKey, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 300,
            }
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          aiInsights = content.split("\n").filter((line: string) => line.trim().length > 0).slice(0, 3);
          console.log("AI insights generated:", aiInsights);
        }
      } catch (aiError) {
        console.error("Error generating AI insights:", aiError);
      }
    }

    // Calculate safety score (days without symptoms / total days * 100)
    const uniqueSymptomDays = new Set(
      symptomLogs.map(log => new Date(log.logged_at).toDateString())
    ).size;
    const safetyScore = Math.round(((days - uniqueSymptomDays) / days) * 100);

    // Build correlation list for frontend
    const correlations = Object.entries(symptomFoodCorrelations)
      .map(([symptom, foods]) => ({
        symptom,
        foods: Object.entries(foods)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([food, count]) => ({ food, count }))
      }))
      .filter(c => c.foods.length > 0)
      .slice(0, 5);

    console.log(`Analysis complete. Safety score: ${safetyScore}, Correlations: ${correlations.length}`);

    return new Response(JSON.stringify({
      insights: aiInsights,
      safetyScore,
      totalSymptomDays: uniqueSymptomDays,
      totalDays: days,
      correlations,
      topSymptoms: Object.entries(symptomCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([symptom, count]) => ({ symptom, count })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-symptom-patterns:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

