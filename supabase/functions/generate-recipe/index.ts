import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-RECIPE] ${step}${detailsStr}`);
};

const COMPLEXITY_LABELS: Record<string, string> = {
  rapida: "rápida (até 20 minutos)",
  equilibrada: "equilibrada (20-45 minutos)",
  elaborada: "elaborada (mais de 45 minutos)",
};

const DIETARY_LABELS: Record<string, string> = {
  comum: "alimentação comum (sem restrições)",
  vegetariana: "vegetariana (sem carnes)",
  vegana: "vegana (sem produtos animais)",
  low_carb: "low carb (baixo carboidrato)",
};

const GOAL_LABELS: Record<string, string> = {
  emagrecer: "emagrecer (foco em saciedade e déficit calórico)",
  manter: "manter peso (calorias de manutenção)",
  ganhar_peso: "ganhar peso/massa muscular (superávit calórico e proteína alta)",
};

const CALORIE_LABELS: Record<string, string> = {
  reduzir: "reduzir calorias (porções menores, menos calóricas)",
  manter: "manter calorias normais",
  aumentar: "aumentar calorias",
  definir_depois: "calorias normais",
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

    const { ingredients, type } = await req.json();
    logStep("Request received", { type, ingredients });

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
      goal: profile.goal,
      complexity: profile.recipe_complexity
    });

    // Build intolerances string - handle null/undefined case
    const intolerancesList = profile.intolerances || [];
    const intolerancesStr = intolerancesList.length > 0 && !intolerancesList.includes("nenhuma")
      ? intolerancesList.map((i: string) => {
          const labels: Record<string, string> = {
            lactose: "SEM LACTOSE (nenhum leite, queijo, manteiga, creme de leite, iogurte ou derivados)",
            gluten: "SEM GLÚTEN (nenhuma farinha de trigo, aveia, cevada, centeio)",
            acucar: "SEM AÇÚCAR (nenhum açúcar refinado, mascavo, mel, ou adoçantes calóricos)",
            amendoim: "SEM AMENDOIM (nenhum amendoim ou derivados)",
            frutos_mar: "SEM FRUTOS DO MAR (nenhum camarão, peixe, mariscos)",
            ovo: "SEM OVO (nenhum ovo ou derivados)",
          };
          return labels[i] || i;
        }).join(", ")
      : "nenhuma restrição";

    // Modo Kids special prompt
    const isKidsMode = profile.context === "modo_kids";
    
    // Weight goal modes
    const isWeightLossMode = profile.goal === "emagrecer";
    const isWeightGainMode = profile.goal === "ganhar_peso";
    const hasWeightGoal = isWeightLossMode || isWeightGainMode;
    
    // Calculate personalized macros if weight data is available
    let personalizedMacros: { targetCalories: number; protein: number; mode: string } | null = null;
    if (hasWeightGoal && profile.weight_current && profile.height && profile.age && profile.sex) {
      // Mifflin-St Jeor Formula
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
      
      let targetCalories: number;
      let protein: number;
      
      if (isWeightLossMode) {
        targetCalories = Math.max(get - 500, profile.sex === "male" ? 1500 : 1200);
        protein = Math.round((profile.weight_goal || profile.weight_current) * 2);
      } else {
        // Weight gain mode
        targetCalories = get + 400;
        protein = Math.round((profile.weight_goal || profile.weight_current) * 2.2);
      }
      
      personalizedMacros = { targetCalories, protein, mode: isWeightLossMode ? "lose" : "gain" };
      logStep("Personalized macros calculated", personalizedMacros);
    }
    
    const kidsInstructions = isKidsMode ? `
MODO KIDS ATIVO - REGRAS ESPECIAIS:
- Nomes DIVERTIDOS e criativos (ex: "Macarrão Arco-Íris", "Bolinho do Astronauta", "Pizza do Dino")
- Descrições com emojis e linguagem amigável para crianças
- Receitas SIMPLES com no máximo 6-8 ingredientes
- Tempo de preparo CURTO (máximo 25 minutos)
- Sabores suaves e familiares (evitar temperos fortes)
- Ingredientes coloridos e visualmente atrativos
- Instruções simples que uma criança poderia ajudar
- Calorias adequadas para crianças (300-500 kcal por porção)
- Apresentação divertida (formas, cores, decorações simples)
- SEMPRE usar complexity "rapida" no Modo Kids` : "";

    const weightLossInstructions = isWeightLossMode ? `
MODO EMAGRECIMENTO ATIVO - REGRAS ESPECIAIS:
- PRIORIZE ingredientes com ALTO PODER DE SACIEDADE (fibras, proteínas, água)
- Use vegetais volumosos (brócolis, couve-flor, abobrinha, folhas verdes)
- Inclua proteínas magras (frango, peixe, ovos, leguminosas)
- Adicione fibras (aveia, chia, linhaça, legumes)
- EVITE carboidratos refinados e açúcares
${personalizedMacros 
  ? `- META CALÓRICA PERSONALIZADA: ${personalizedMacros.targetCalories} kcal/dia - adapte a receita para ~${Math.round(personalizedMacros.targetCalories / 3)} kcal por refeição
- META DE PROTEÍNA: ${personalizedMacros.protein}g por dia - inclua ~${Math.round(personalizedMacros.protein / 3)}g por refeição`
  : `- Calorias por porção: 300-450 kcal (déficit calórico controlado)
- Proteína alta: mínimo 25g por porção`}
- Prefira métodos de cocção: grelhado, assado, cozido no vapor
- Adicione um campo "satiety_tip" com dica de saciedade
- Adicione um campo "satiety_score" de 1-10 (quanto maior, mais saciante)
- Inclua ingredientes termogênicos quando possível (gengibre, pimenta, canela)` : "";

    const weightGainInstructions = isWeightGainMode ? `
MODO GANHO DE PESO/MASSA ATIVO - REGRAS ESPECIAIS:
- PRIORIZE receitas com ALTA DENSIDADE CALÓRICA e nutritiva
- Use fontes de proteína de qualidade (frango, carne, ovos, peixe, leguminosas)
- Inclua carboidratos complexos (arroz, batata, macarrão integral, aveia)
- Adicione gorduras saudáveis (azeite, abacate, castanhas, pasta de amendoim)
- AUMENTE porções de proteína e carboidratos
${personalizedMacros 
  ? `- META CALÓRICA PERSONALIZADA: ${personalizedMacros.targetCalories} kcal/dia - adapte a receita para ~${Math.round(personalizedMacros.targetCalories / 3)} kcal por refeição
- META DE PROTEÍNA: ${personalizedMacros.protein}g por dia - inclua ~${Math.round(personalizedMacros.protein / 3)}g por refeição`
  : `- Calorias por porção: 550-700 kcal (superávit calórico controlado)
- Proteína alta: mínimo 35g por porção`}
- Inclua snacks calóricos saudáveis
- Adicione um campo "muscle_tip" com dica para ganho de massa
- Adicione um campo "calorie_density_score" de 1-10 (quanto maior, mais calórico)` : "";
    
    const systemPrompt = `Você é um nutricionista e chef especializado em receitas personalizadas.
Você DEVE gerar receitas com valores nutricionais REAIS e PRECISOS baseados em tabelas nutricionais.
${kidsInstructions}
${weightLossInstructions}
${weightGainInstructions}

REGRAS ABSOLUTAS - NUNCA VIOLAR:
1. INTOLERÂNCIAS: ${intolerancesStr}
   - NUNCA inclua ingredientes proibidos
   - Use APENAS substitutos seguros (ex: leite de amêndoas em vez de leite se sem lactose)
   
2. PREFERÊNCIA ALIMENTAR: ${DIETARY_LABELS[profile.dietary_preference]}

3. OBJETIVO: ${GOAL_LABELS[profile.goal]}

4. META CALÓRICA: ${CALORIE_LABELS[profile.calorie_goal]}

5. COMPLEXIDADE: ${isKidsMode ? "rápida (até 20 minutos) - OBRIGATÓRIO no Modo Kids" : COMPLEXITY_LABELS[profile.recipe_complexity]}

6. CONTEXTO: ${profile.context === "familia" ? "receita para família (4 porções)" : isKidsMode ? "MODO KIDS: receita divertida para crianças (2-3 porções), nomes criativos, emojis na descrição!" : "receita individual (2 porções)"}

FORMATO DE RESPOSTA (JSON VÁLIDO):
{
  "name": "${isKidsMode ? "Nome DIVERTIDO e criativo (ex: Macarrão Arco-Íris 🌈)" : "Nome da Receita"}",
  "description": "${isKidsMode ? "Descrição curta e divertida COM EMOJIS para crianças!" : "Breve descrição em 1 frase"}",
  "ingredients": [
    {"item": "nome do ingrediente", "quantity": "quantidade", "unit": "unidade"},
    ...
  ],
  "instructions": [
    "${isKidsMode ? "Passo simples que uma criança poderia ajudar..." : "Passo 1..."}",
    ...
  ],
  "prep_time": ${isKidsMode ? 20 : 30},
  "complexity": "${isKidsMode ? "rapida" : profile.recipe_complexity}",
  "servings": ${profile.context === "familia" ? 4 : isKidsMode ? 3 : 2},
  "calories": ${isKidsMode ? 400 : isWeightLossMode ? 380 : isWeightGainMode ? 600 : 450},
  "protein": ${isWeightLossMode ? 30 : isWeightGainMode ? 40 : 25.5},
  "carbs": ${isWeightLossMode ? 25 : isWeightGainMode ? 60 : 35.2},
  "fat": ${isWeightLossMode ? 12 : isWeightGainMode ? 22 : 18.3}${isWeightLossMode ? `,
  "satiety_score": 8,
  "satiety_tip": "Dica de saciedade para ajudar no emagrecimento"` : isWeightGainMode ? `,
  "calorie_density_score": 8,
  "muscle_tip": "Dica para ganho de massa muscular"` : ""}
}

IMPORTANTE:
- calories, protein, carbs, fat são POR PORÇÃO
- Use valores nutricionais REAIS baseados nos ingredientes
- prep_time em minutos${isKidsMode ? " (MÁXIMO 25 no Modo Kids)" : ""}${isWeightLossMode ? "\n- satiety_score de 1-10 baseado na composição (fibras + proteínas = maior score)\n- satiety_tip: uma dica prática de como a receita ajuda na saciedade" : ""}${isWeightGainMode ? "\n- calorie_density_score de 1-10 baseado na densidade calórica\n- muscle_tip: uma dica prática para maximizar ganho muscular" : ""}
- Responda APENAS com o JSON, sem texto adicional`;

    const userPrompt = type === "automatica"
      ? "Gere uma receita saudável e deliciosa que se encaixe no meu perfil."
      : `Gere uma receita usando estes ingredientes: ${ingredients}. Pode adicionar outros ingredientes básicos se necessário.`;

    logStep("Calling Lovable AI");

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
              name: "generate_recipe",
              description: "Generate a recipe with nutritional information",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Recipe name" },
                  description: { type: "string", description: "Brief description" },
                  ingredients: {
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
                  instructions: {
                    type: "array",
                    items: { type: "string" }
                  },
                  prep_time: { type: "number", description: "Preparation time in minutes" },
                  complexity: { type: "string", enum: ["rapida", "equilibrada", "elaborada"] },
                  servings: { type: "number", description: "Number of servings" },
                  calories: { type: "number", description: "Calories per serving" },
                  protein: { type: "number", description: "Protein in grams per serving" },
                  carbs: { type: "number", description: "Carbohydrates in grams per serving" },
                  fat: { type: "number", description: "Fat in grams per serving" },
                  satiety_score: { type: "number", description: "Satiety score from 1-10 (only for weight loss mode)" },
                  satiety_tip: { type: "string", description: "Satiety tip for weight loss (only for weight loss mode)" },
                  calorie_density_score: { type: "number", description: "Calorie density score from 1-10 (only for weight gain mode)" },
                  muscle_tip: { type: "string", description: "Muscle gain tip (only for weight gain mode)" }
                },
                required: ["name", "description", "ingredients", "instructions", "prep_time", "complexity", "servings", "calories", "protein", "carbs", "fat"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_recipe" } },
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
    logStep("AI response received");

    // Extract recipe from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "generate_recipe") {
      throw new Error("Invalid AI response format");
    }

    const recipe = JSON.parse(toolCall.function.arguments);
    logStep("Recipe parsed", { name: recipe.name, calories: recipe.calories });

    return new Response(JSON.stringify({
      success: true,
      recipe: {
        ...recipe,
        input_ingredients: ingredients || null,
        is_kids_mode: isKidsMode,
        is_weight_loss_mode: isWeightLossMode,
        is_weight_gain_mode: isWeightGainMode,
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
