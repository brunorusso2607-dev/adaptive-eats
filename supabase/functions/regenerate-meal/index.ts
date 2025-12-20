import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REGENERATE-MEAL] ${step}${detailsStr}`);
};

const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia"
};

const DIETARY_LABELS: Record<string, string> = {
  comum: "alimentação comum",
  vegetariana: "vegetariana",
  vegana: "vegana",
  low_carb: "low carb",
};

const GOAL_LABELS: Record<string, string> = {
  emagrecer: "emagrecer",
  manter: "manter peso",
  ganhar_peso: "ganhar massa muscular",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const requestBody = await req.json();
    const { mealItemId, mealType, ingredients, mode } = requestBody;
    // mode: "automatic" | "with_ingredients"
    logStep("Request received", { mealItemId, mealType, ingredients, mode });

    if (!mealItemId) throw new Error("mealItemId is required");

    // Fetch the existing meal item
    const { data: mealItem, error: mealError } = await supabaseClient
      .from("meal_plan_items")
      .select("*, meal_plans!inner(user_id)")
      .eq("id", mealItemId)
      .single();

    if (mealError || !mealItem) throw new Error("Refeição não encontrada");
    if (mealItem.meal_plans.user_id !== user.id) throw new Error("Não autorizado");

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);

    const intolerancesList = profile.intolerances || [];
    const intolerancesStr = intolerancesList.length > 0 && !intolerancesList.includes("nenhuma")
      ? intolerancesList.join(", ")
      : "nenhuma";

    // Calculate target calories for this meal type
    const calorieDistribution: Record<string, number> = {
      cafe_manha: 0.20,
      almoco: 0.30,
      lanche: 0.10,
      jantar: 0.30,
      ceia: 0.10,
    };

    let dailyCalories = 2000;
    if (profile.weight_current && profile.height && profile.age && profile.sex) {
      let tmb: number;
      if (profile.sex === "male") {
        tmb = (10 * profile.weight_current) + (6.25 * profile.height) - (5 * profile.age) + 5;
      } else {
        tmb = (10 * profile.weight_current) + (6.25 * profile.height) - (5 * profile.age) - 161;
      }
      const activityFactors: Record<string, number> = {
        sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9
      };
      const factor = activityFactors[profile.activity_level] || 1.55;
      const get = Math.round(tmb * factor);
      
      if (profile.goal === "emagrecer") {
        dailyCalories = Math.max(get - 500, profile.sex === "male" ? 1500 : 1200);
      } else if (profile.goal === "ganhar_peso") {
        dailyCalories = get + 400;
      } else {
        dailyCalories = get;
      }
    }

    const targetCalories = Math.round(dailyCalories * (calorieDistribution[mealType] || 0.20));
    const mealLabel = MEAL_LABELS[mealType] || mealType;

    let ingredientsPrompt = "";
    if (mode === "with_ingredients" && ingredients) {
      ingredientsPrompt = `Use OBRIGATORIAMENTE os seguintes ingredientes: ${ingredients}. Pode adicionar temperos e complementos básicos.`;
    }

    const systemPrompt = `Você é um nutricionista especializado em criar receitas deliciosas e nutritivas.

PERFIL DO USUÁRIO:
- Preferência alimentar: ${DIETARY_LABELS[profile.dietary_preference] || "comum"}
- Objetivo: ${GOAL_LABELS[profile.goal] || "manter peso"}
- Intolerâncias: ${intolerancesStr}
- Contexto: ${profile.context === "familia" ? "família com crianças" : profile.context === "modo_kids" ? "crianças" : "individual"}

REGRAS:
1. A receita deve ter aproximadamente ${targetCalories} calorias
2. Respeite TODAS as intolerâncias alimentares
3. Crie uma receita DIFERENTE e criativa
4. Ingredientes e instruções completas
${ingredientsPrompt}

FORMATO DE RESPOSTA (JSON VÁLIDO):
{
  "recipe_name": "Nome da Receita",
  "recipe_calories": ${targetCalories},
  "recipe_protein": 25,
  "recipe_carbs": 30,
  "recipe_fat": 15,
  "recipe_prep_time": 20,
  "recipe_ingredients": [
    {"item": "ingrediente", "quantity": "100", "unit": "g"}
  ],
  "recipe_instructions": ["Passo 1...", "Passo 2..."]
}

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`;

    const userPrompt = `Crie uma nova receita para ${mealLabel}. ${ingredientsPrompt || "Surpreenda-me com algo delicioso!"}`;

    logStep("Calling Google Gemini API for recipe generation");

    // Call Google Gemini API directly using v1beta endpoint with gemini-1.5-pro
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GOOGLE_AI_API_KEY}`;
    logStep("API URL", { url: apiUrl.replace(GOOGLE_AI_API_KEY, "***") });

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Google API error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Google API error: ${response.status}`);
    }

    const aiData = await response.json();
    logStep("AI response received");

    // Extract content from Gemini response
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("A IA não retornou uma resposta válida. Tente novamente.");
    }

    let recipeData;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recipeData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), content: content.slice(0, 200) });
      throw new Error("Não foi possível processar a receita. Tente novamente.");
    }

    if (!recipeData || !recipeData.recipe_name) {
      throw new Error("A IA não retornou uma receita válida. Tente novamente.");
    }

    // Update the meal item
    const { data: updatedMeal, error: updateError } = await supabaseClient
      .from("meal_plan_items")
      .update({
        recipe_name: recipeData.recipe_name,
        recipe_calories: Math.round(Number(recipeData.recipe_calories) || targetCalories),
        recipe_protein: Number(recipeData.recipe_protein) || 0,
        recipe_carbs: Number(recipeData.recipe_carbs) || 0,
        recipe_fat: Number(recipeData.recipe_fat) || 0,
        recipe_prep_time: Math.round(Number(recipeData.recipe_prep_time) || 30),
        recipe_ingredients: recipeData.recipe_ingredients || [],
        recipe_instructions: recipeData.recipe_instructions || [],
      })
      .eq("id", mealItemId)
      .select()
      .single();

    if (updateError) throw new Error(`Error updating meal: ${updateError.message}`);
    logStep("Meal updated successfully", { mealId: mealItemId });

    return new Response(JSON.stringify({
      success: true,
      meal: updatedMeal
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
