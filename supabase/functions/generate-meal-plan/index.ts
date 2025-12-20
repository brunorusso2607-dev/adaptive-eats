import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-MEAL-PLAN] ${step}${detailsStr}`);
};

const MEAL_TYPES = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia"
};

const DIETARY_LABELS: Record<string, string> = {
  comum: "alimentação comum (onívora)",
  vegetariana: "vegetariana (sem carnes)",
  vegana: "vegana (sem produtos de origem animal)",
  low_carb: "low carb (baixo carboidrato)",
};

const GOAL_LABELS: Record<string, string> = {
  emagrecer: "emagrecimento (déficit calórico)",
  manter: "manutenção de peso",
  ganhar_peso: "ganho de massa muscular (superávit calórico)",
};

const COMPLEXITY_LABELS: Record<string, string> = {
  rapida: "rápidas e práticas (até 20 min de preparo)",
  equilibrada: "equilibradas (20-40 min de preparo)",
  elaborada: "elaboradas (mais de 40 min, receitas mais sofisticadas)",
};

const CONTEXT_LABELS: Record<string, string> = {
  individual: "pessoa solteira/individual",
  familia: "família (receitas que servem mais pessoas)",
  modo_kids: "família com crianças (receitas kid-friendly)",
};

const SEX_LABELS: Record<string, string> = {
  male: "homem",
  female: "mulher",
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
    const daysCount = Math.min(requestBody.daysCount || 7, 7);
    const { planName, startDate, existingPlanId, weekNumber } = requestBody;
    logStep("Request received", { planName, startDate, daysCount, existingPlanId, weekNumber });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    logStep("Profile fetched", profile);

    // Build intolerances string
    const intolerancesList = profile.intolerances || [];
    const intolerancesStr = intolerancesList.length > 0 && !intolerancesList.includes("nenhuma")
      ? intolerancesList.join(", ")
      : "nenhuma";

    // Calculate personalized macros using Mifflin-St Jeor formula
    let dailyCalories = 2000;
    let dailyProtein = 60;
    
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
        dailyProtein = Math.round((profile.weight_goal || profile.weight_current) * 2);
      } else if (profile.goal === "ganhar_peso") {
        dailyCalories = get + 400;
        dailyProtein = Math.round((profile.weight_goal || profile.weight_current) * 2.2);
      } else {
        dailyCalories = get;
        dailyProtein = Math.round(profile.weight_current * 1.6);
      }
    }

    logStep("Daily targets calculated", { dailyCalories, dailyProtein });

    // Determine number of meals based on complexity
    const mealsPerDay = profile.recipe_complexity === "rapida" ? 4 : 5;
    const selectedMealTypes = mealsPerDay === 4 
      ? ["cafe_manha", "almoco", "lanche", "jantar"]
      : MEAL_TYPES;

    // Build optimized prompt 100% based on user profile
    const prompt = `Gere um plano alimentar de ${daysCount} dias para:

PERFIL COMPLETO:
- Sexo: ${SEX_LABELS[profile.sex] || "não informado"}
- Idade: ${profile.age || "não informada"} anos
- Peso atual: ${profile.weight_current || "não informado"}kg
- Altura: ${profile.height || "não informada"}cm
- Peso meta: ${profile.weight_goal || profile.weight_current || "não informado"}kg

OBJETIVO: ${GOAL_LABELS[profile.goal] || "manutenção de peso"}

METAS NUTRICIONAIS DIÁRIAS:
- Calorias: ${dailyCalories}kcal/dia
- Proteína mínima: ${dailyProtein}g/dia

PREFERÊNCIA ALIMENTAR: ${DIETARY_LABELS[profile.dietary_preference] || "comum"}

RESTRIÇÕES/INTOLERÂNCIAS: ${intolerancesStr}

CONTEXTO: ${CONTEXT_LABELS[profile.context] || "individual"}

COMPLEXIDADE DAS RECEITAS: ${COMPLEXITY_LABELS[profile.recipe_complexity] || "equilibradas"}

ESTRUTURA: ${mealsPerDay} refeições por dia (${selectedMealTypes.map(m => MEAL_LABELS[m]).join(", ")})

DISTRIBUIÇÃO CALÓRICA:
${mealsPerDay === 5 ? 
  "- Café da Manhã: 20%\n- Almoço: 30%\n- Lanche: 10%\n- Jantar: 30%\n- Ceia: 10%" :
  "- Café da Manhã: 25%\n- Almoço: 35%\n- Lanche: 10%\n- Jantar: 30%"
}

REGRAS IMPORTANTES:
1. NÃO repita a mesma receita em dias diferentes (variedade é essencial)
2. Respeite TODAS as restrições e intolerâncias alimentares
3. Use ingredientes comuns em supermercados brasileiros
4. Cada receita deve ter ingredientes com quantidades exatas e instruções de preparo detalhadas
5. Os macros (calorias, proteínas, carboidratos, gorduras) devem ser realistas para cada receita

FORMATO DE RESPOSTA:
Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com a estrutura:
{
  "days": [
    {
      "day_index": 0,
      "day_name": "Segunda-feira",
      "meals": [
        {
          "meal_type": "cafe_manha",
          "recipe_name": "Nome da receita",
          "recipe_calories": 400,
          "recipe_protein": 20,
          "recipe_carbs": 50,
          "recipe_fat": 15,
          "recipe_prep_time": 15,
          "recipe_ingredients": [
            {"item": "ingrediente", "quantity": "100", "unit": "g"}
          ],
          "recipe_instructions": ["Passo 1", "Passo 2"]
        }
      ]
    }
  ]
}`;

    logStep("Calling Google Gemini 2.5 Flash-Lite");

    // Call Google Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 32000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Gemini API error", { status: response.status, error: errorText });
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    logStep("Gemini response received");

    // Extract text from Gemini response
    const textContent = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      logStep("No text in response", { aiData: JSON.stringify(aiData).slice(0, 500) });
      throw new Error("A IA não retornou uma resposta válida. Tente novamente.");
    }

    // Clean and parse the JSON response
    let cleanedJson = textContent.trim();
    // Remove markdown code blocks if present
    if (cleanedJson.startsWith("```json")) {
      cleanedJson = cleanedJson.slice(7);
    } else if (cleanedJson.startsWith("```")) {
      cleanedJson = cleanedJson.slice(3);
    }
    if (cleanedJson.endsWith("```")) {
      cleanedJson = cleanedJson.slice(0, -3);
    }
    cleanedJson = cleanedJson.trim();

    let mealPlanData;
    try {
      mealPlanData = JSON.parse(cleanedJson);
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), text: cleanedJson.slice(0, 500) });
      throw new Error("Não foi possível processar o plano alimentar. Tente novamente.");
    }

    if (!mealPlanData || !mealPlanData.days || !Array.isArray(mealPlanData.days)) {
      const dataPreview = mealPlanData ? JSON.stringify(mealPlanData).slice(0, 200) : "undefined";
      logStep("Invalid meal plan data structure", { dataPreview });
      throw new Error("A IA não retornou um plano alimentar válido. Por favor, tente novamente.");
    }

    logStep("Meal plan parsed", { daysCount: mealPlanData.days?.length });

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date();
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + daysCount - 1);

    let mealPlanIdToUse = existingPlanId;
    let mealPlan;

    // Use existing plan or create a new one
    if (existingPlanId) {
      const { data: existingPlan, error: fetchError } = await supabaseClient
        .from("meal_plans")
        .select("*")
        .eq("id", existingPlanId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !existingPlan) {
        throw new Error("Plano alimentar não encontrado");
      }

      const newEndDate = endDate.toISOString().split('T')[0];
      if (newEndDate > existingPlan.end_date) {
        await supabaseClient
          .from("meal_plans")
          .update({ end_date: newEndDate, updated_at: new Date().toISOString() })
          .eq("id", existingPlanId);
      }

      mealPlan = existingPlan;
      mealPlanIdToUse = existingPlan.id;
      logStep("Using existing meal plan", { planId: mealPlanIdToUse });
    } else {
      const { data: newPlan, error: planError } = await supabaseClient
        .from("meal_plans")
        .insert({
          user_id: user.id,
          name: planName || `Plano ${start.toLocaleDateString('pt-BR')}`,
          start_date: start.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_active: true
        })
        .select()
        .single();

      if (planError) throw new Error(`Error creating meal plan: ${planError.message}`);
      
      mealPlan = newPlan;
      mealPlanIdToUse = newPlan.id;
      logStep("Meal plan created", { planId: mealPlanIdToUse });

      await supabaseClient
        .from("meal_plans")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .neq("id", mealPlanIdToUse);
    }

    // Insert meal plan items
    const items = mealPlanData.days.flatMap((day: any) =>
      day.meals.map((meal: any) => ({
        meal_plan_id: mealPlanIdToUse,
        day_of_week: Math.round(Number(day.day_index) || 0),
        meal_type: meal.meal_type,
        recipe_name: meal.recipe_name,
        recipe_calories: Math.round(Number(meal.recipe_calories) || 0),
        recipe_protein: Number(meal.recipe_protein) || 0,
        recipe_carbs: Number(meal.recipe_carbs) || 0,
        recipe_fat: Number(meal.recipe_fat) || 0,
        recipe_prep_time: Math.round(Number(meal.recipe_prep_time) || 30),
        recipe_ingredients: meal.recipe_ingredients || [],
        recipe_instructions: meal.recipe_instructions || [],
        week_number: weekNumber || 1
      }))
    );

    const { error: itemsError } = await supabaseClient
      .from("meal_plan_items")
      .insert(items);

    if (itemsError) throw new Error(`Error creating meal plan items: ${itemsError.message}`);
    logStep("Meal plan items created", { count: items.length });

    return new Response(JSON.stringify({
      success: true,
      mealPlan: {
        id: mealPlanIdToUse,
        ...mealPlan,
        items: items
      }
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
