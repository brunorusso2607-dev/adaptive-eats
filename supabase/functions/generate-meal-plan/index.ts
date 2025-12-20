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
const MEAL_TYPES = ["cafe_manha", "almoco", "lanche", "jantar", "ceia"];
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

    const requestBody = await req.json();
    // Limit days to 7 max to ensure AI can generate all recipes reliably
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
    logStep("Profile fetched", { 
      intolerances: profile.intolerances,
      dietary: profile.dietary_preference,
      goal: profile.goal
    });

    // Build intolerances string
    const intolerancesList = profile.intolerances || [];
    const intolerancesStr = intolerancesList.length > 0 && !intolerancesList.includes("nenhuma")
      ? intolerancesList.join(", ")
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
2. Cada dia deve ter 5 refeições: ${MEAL_TYPES.map(m => MEAL_LABELS[m]).join(", ")}
3. NÃO repita a mesma receita em dias diferentes (variedade é essencial)
4. Respeite TODAS as intolerâncias alimentares
5. Distribua as calorias: Café 20%, Almoço 30%, Lanche 10%, Jantar 30%, Ceia 10%
6. Cada receita deve ter ingredientes e instruções completas`;

    logStep("Calling Lovable AI Gateway with gemini-2.5-flash-lite");

    // Call Lovable AI Gateway with tool calling for structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere um plano alimentar completo para ${daysCount} dias com todas as ${daysCount * 5} receitas.` }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_meal_plan",
              description: "Cria um plano alimentar estruturado com receitas para cada refeição do dia",
              parameters: {
                type: "object",
                properties: {
                  days: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        day_index: { type: "number", description: "Índice do dia (0-6)" },
                        day_name: { type: "string", description: "Nome do dia em português" },
                        meals: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              meal_type: { type: "string", enum: ["cafe_manha", "almoco", "lanche", "jantar", "ceia"] },
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
        tool_choice: { type: "function", function: { name: "create_meal_plan" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Lovable AI Gateway error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns minutos e tente novamente." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Lovable AI Gateway error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    logStep("AI response received");

    // Extract structured data from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_meal_plan") {
      logStep("No tool call in response", { aiData: JSON.stringify(aiData).slice(0, 500) });
      throw new Error("A IA não retornou uma resposta válida. Tente novamente.");
    }

    let mealPlanData;
    try {
      mealPlanData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), arguments: toolCall.function.arguments.slice(0, 300) });
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
      // Verify the plan exists and belongs to user
      const { data: existingPlan, error: fetchError } = await supabaseClient
        .from("meal_plans")
        .select("*")
        .eq("id", existingPlanId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !existingPlan) {
        throw new Error("Plano alimentar não encontrado");
      }

      // Update the end_date if this week extends beyond
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
      // Create new meal plan
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

      // Deactivate other plans
      await supabaseClient
        .from("meal_plans")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .neq("id", mealPlanIdToUse);
    }

    // Insert meal plan items - ensure numeric fields are properly typed
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