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

const DAY_NAMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const MEAL_TYPES = ["cafe_manha", "almoco", "lanche", "jantar"];
const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  almoco: "Almoço",
  lanche: "Lanche da Tarde",
  jantar: "Jantar"
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { planName, startDate, daysCount = 7 } = await req.json();
    logStep("Request received", { planName, startDate, daysCount });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    logStep("Profile fetched", { 
      intolerances: profile.intolerances,
      dietary: profile.dietary_preference,
      goal: profile.goal
    });

    // Build intolerances string
    const intolerancesStr = profile.intolerances?.length > 0 && !profile.intolerances.includes("nenhuma")
      ? profile.intolerances.join(", ")
      : "nenhuma";

    // Calculate personalized macros if weight data is available
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

    const systemPrompt = `Você é um nutricionista especializado em planejamento alimentar semanal.
Você DEVE gerar planos com receitas VARIADAS e DIFERENTES a cada dia.

PERFIL DO USUÁRIO:
- Preferência alimentar: ${DIETARY_LABELS[profile.dietary_preference] || "comum"}
- Objetivo: ${GOAL_LABELS[profile.goal] || "manter peso"}
- Intolerâncias: ${intolerancesStr}
- Meta calórica diária: ${dailyCalories} kcal
- Meta de proteína diária: ${dailyProtein}g

REGRAS ABSOLUTAS:
1. Gere exatamente ${daysCount} dias de refeições
2. Cada dia deve ter 4 refeições: ${MEAL_TYPES.map(m => MEAL_LABELS[m]).join(", ")}
3. NÃO repita a mesma receita em dias diferentes (variedade é essencial)
4. Respeite TODAS as intolerâncias alimentares
5. Distribua as calorias: Café 20%, Almoço 35%, Lanche 15%, Jantar 30%
6. Cada receita deve ter ingredientes e instruções completas

FORMATO DE RESPOSTA (JSON VÁLIDO):
{
  "days": [
    {
      "day_index": 0,
      "day_name": "Segunda",
      "meals": [
        {
          "meal_type": "cafe_manha",
          "recipe_name": "Nome da Receita",
          "recipe_calories": 400,
          "recipe_protein": 15,
          "recipe_carbs": 45,
          "recipe_fat": 18,
          "recipe_prep_time": 15,
          "recipe_ingredients": [
            {"item": "ingrediente", "quantity": "100", "unit": "g"}
          ],
          "recipe_instructions": ["Passo 1...", "Passo 2..."]
        }
      ]
    }
  ]
}`;

    const userPrompt = `Gere um plano alimentar completo para ${daysCount} dias começando ${startDate ? `em ${startDate}` : 'hoje'}.
Inclua receitas variadas, saborosas e que se encaixem no meu perfil nutricional.
Cada dia deve ter 4 refeições completas com ingredientes e instruções.`;

    logStep("Calling Lovable AI for meal plan generation");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_meal_plan",
              description: "Generate a weekly meal plan with recipes",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day_index: { type: "number" },
                        day_name: { type: "string" },
                        meals: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              meal_type: { type: "string", enum: MEAL_TYPES },
                              recipe_name: { type: "string" },
                              recipe_calories: { type: "number" },
                              recipe_protein: { type: "number" },
                              recipe_carbs: { type: "number" },
                              recipe_fat: { type: "number" },
                              recipe_prep_time: { type: "number" },
                              recipe_ingredients: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    item: { type: "string" },
                                    quantity: { type: "string" },
                                    unit: { type: "string" }
                                  },
                                  required: ["item", "quantity", "unit"]
                                }
                              },
                              recipe_instructions: {
                                type: "array",
                                items: { type: "string" }
                              }
                            },
                            required: ["meal_type", "recipe_name", "recipe_calories", "recipe_protein", "recipe_carbs", "recipe_fat", "recipe_prep_time", "recipe_ingredients", "recipe_instructions"]
                          }
                        }
                      },
                      required: ["day_index", "day_name", "meals"]
                    }
                  }
                },
                required: ["days"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_meal_plan" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Entre em contato com o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      logStep("AI gateway error", { status: response.status, error: errorText });
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    logStep("AI response received", { hasToolCalls: !!aiData.choices?.[0]?.message?.tool_calls });

    let mealPlanData;
    
    // Try to get response from tool_calls first
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && toolCall.function.name === "generate_meal_plan") {
      mealPlanData = JSON.parse(toolCall.function.arguments);
      logStep("Parsed from tool_calls");
    } else {
      // Fallback: try to parse from content if tool_calls not available
      const content = aiData.choices?.[0]?.message?.content;
      if (content) {
        logStep("Trying to parse from content", { contentLength: content.length });
        try {
          // Try to extract JSON from content
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            mealPlanData = JSON.parse(jsonMatch[0]);
            logStep("Parsed from content");
          }
        } catch (parseError) {
          logStep("Failed to parse content", { error: String(parseError) });
        }
      }
    }

    if (!mealPlanData || !mealPlanData.days || !Array.isArray(mealPlanData.days)) {
      logStep("Invalid meal plan data structure", { data: JSON.stringify(mealPlanData).slice(0, 200) });
      throw new Error("A IA não retornou um plano alimentar válido. Tente novamente.");
    }

    logStep("Meal plan parsed", { daysCount: mealPlanData.days?.length });

    // Calculate dates
    const start = startDate ? new Date(startDate) : new Date();
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + daysCount - 1);

    // Create meal plan in database
    const { data: mealPlan, error: planError } = await supabaseClient
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
    logStep("Meal plan created", { planId: mealPlan.id });

    // Deactivate other plans
    await supabaseClient
      .from("meal_plans")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .neq("id", mealPlan.id);

    // Insert meal plan items
    const items = mealPlanData.days.flatMap((day: any) =>
      day.meals.map((meal: any) => ({
        meal_plan_id: mealPlan.id,
        day_of_week: day.day_index,
        meal_type: meal.meal_type,
        recipe_name: meal.recipe_name,
        recipe_calories: meal.recipe_calories,
        recipe_protein: meal.recipe_protein,
        recipe_carbs: meal.recipe_carbs,
        recipe_fat: meal.recipe_fat,
        recipe_prep_time: meal.recipe_prep_time,
        recipe_ingredients: meal.recipe_ingredients,
        recipe_instructions: meal.recipe_instructions
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
