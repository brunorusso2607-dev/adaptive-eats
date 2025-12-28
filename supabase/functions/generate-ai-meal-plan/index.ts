import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-MEAL-PLAN] ${step}${detailsStr}`);
};

// ============= TIPOS =============
interface MealOption {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: number;
  ingredients: {
    item: string;
    quantity: string;
    unit: string;
    calories: number;
  }[];
  instructions: string[];
}

interface MealSlot {
  meal_type: string;
  label: string;
  target_calories: number;
  options: MealOption[];
}

interface DayPlan {
  day: number;
  day_name: string;
  meals: MealSlot[];
  total_calories: number;
}

// ============= PROMPT DO NUTRICIONISTA PROFISSIONAL =============
function buildNutritionistPrompt(params: {
  dailyCalories: number;
  meals: { type: string; label: string; targetCalories: number }[];
  optionsPerMeal: number;
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  };
  dayNumber: number;
  dayName: string;
}): string {
  const { dailyCalories, meals, optionsPerMeal, restrictions, dayNumber, dayName } = params;

  // Mapear intolerâncias para instruções claras
  const intoleranceInstructions = restrictions.intolerances.map(i => {
    const map: Record<string, string> = {
      'lactose': 'SEM LATICÍNIOS (leite, queijo, iogurte, manteiga, creme de leite, requeijão)',
      'gluten': 'SEM GLÚTEN (pão de trigo, macarrão, aveia, biscoitos, bolos com farinha de trigo)',
      'amendoim': 'SEM AMENDOIM E DERIVADOS',
      'frutos_do_mar': 'SEM FRUTOS DO MAR (camarão, lagosta, caranguejo, mexilhão)',
      'peixe': 'SEM PEIXE',
      'ovos': 'SEM OVOS',
      'soja': 'SEM SOJA E DERIVADOS',
      'frutose': 'BAIXO EM FRUTOSE (evitar frutas muito doces)',
      'fodmap': 'LOW FODMAP (evitar alho, cebola, trigo, leite, leguminosas em excesso)',
      'histamina': 'BAIXA HISTAMINA (evitar fermentados, embutidos, queijos curados)',
      'cafeina': 'SEM CAFEÍNA (café, chá preto, chá verde, chocolate)',
      'sulfitos': 'SEM SULFITOS (evitar vinho, frutas secas, conservas)',
      'sorbitol': 'SEM SORBITOL (evitar adoçantes artificiais, algumas frutas)',
      'salicilato': 'BAIXO SALICILATO',
      'milho': 'SEM MILHO E DERIVADOS',
      'leguminosas': 'SEM LEGUMINOSAS (feijão, lentilha, grão-de-bico, ervilha)',
    };
    return map[i] || `SEM ${i.toUpperCase()}`;
  }).join('\n- ');

  // Mapear preferência alimentar
  const dietaryInstructions: Record<string, string> = {
    'comum': 'Dieta onívora - todos os alimentos permitidos (carnes, peixes, ovos, laticínios, vegetais)',
    'vegetariana': 'VEGETARIANA - SEM CARNES (pode incluir ovos, laticínios)',
    'vegana': 'VEGANA - 100% VEGETAL (sem carnes, sem ovos, sem laticínios, sem mel)',
    'low_carb': 'LOW CARB - Máximo 50g de carboidratos por dia. Foco em proteínas e gorduras saudáveis.',
    'pescetariana': 'PESCETARIANA - Sem carnes vermelhas e aves. Pode incluir peixes e frutos do mar.',
    'cetogenica': 'CETOGÊNICA - Máximo 20g de carboidratos por dia. Alto em gorduras, moderado em proteínas.',
    'flexitariana': 'FLEXITARIANA - Predominantemente vegetariana, mas pode incluir carnes ocasionalmente.',
  };

  // Mapear objetivo
  const goalInstructions: Record<string, string> = {
    'emagrecer': 'OBJETIVO: EMAGRECIMENTO - Priorize proteínas magras, fibras, baixa densidade calórica. Evite açúcares e carboidratos refinados.',
    'manter': 'OBJETIVO: MANUTENÇÃO - Dieta equilibrada com todos os macronutrientes.',
    'ganhar_peso': 'OBJETIVO: GANHO DE PESO/MASSA - Incluir alimentos densos em calorias, proteínas de qualidade, carboidratos complexos.',
  };

  const mealsDescription = meals.map(m => 
    `- ${m.label} (${m.type}): ~${m.targetCalories} kcal`
  ).join('\n');

  return `Você é um NUTRICIONISTA PROFISSIONAL brasileiro com 20 anos de experiência em nutrição clínica e esportiva.

MISSÃO: Criar um cardápio COMPLETO para ${dayName} (Dia ${dayNumber}) com EXATAMENTE ${optionsPerMeal} opções por refeição.

═══════════════════════════════════════════════════
META CALÓRICA DIÁRIA: ${dailyCalories} kcal
═══════════════════════════════════════════════════

REFEIÇÕES DO DIA:
${mealsDescription}

═══════════════════════════════════════════════════
RESTRIÇÕES OBRIGATÓRIAS (NUNCA VIOLAR):
═══════════════════════════════════════════════════

PREFERÊNCIA ALIMENTAR:
${dietaryInstructions[restrictions.dietaryPreference] || dietaryInstructions['comum']}

${restrictions.intolerances.length > 0 ? `INTOLERÂNCIAS/ALERGIAS:
- ${intoleranceInstructions}` : 'Sem intolerâncias registradas.'}

${restrictions.excludedIngredients.length > 0 ? `INGREDIENTES EXCLUÍDOS PELO USUÁRIO:
${restrictions.excludedIngredients.map(i => `- ${i}`).join('\n')}` : ''}

${goalInstructions[restrictions.goal] || goalInstructions['manter']}

═══════════════════════════════════════════════════
REGRAS DE CRIAÇÃO DAS REFEIÇÕES:
═══════════════════════════════════════════════════

1. CAFÉ DA MANHÃ (~20-25% das calorias):
   - SEMPRE inclua: bebida + carboidrato + proteína + fruta
   - Exemplos: pão com ovos e suco, tapioca com queijo, aveia com frutas
   - Para low carb/cetogênica: ovos, queijos, abacate, iogurte grego

2. LANCHES (~8-10% das calorias cada):
   - Combinações simples: fruta + oleaginosa, iogurte + granola, sanduíche leve
   - Para low carb: castanhas, queijo, vegetais com homus

3. ALMOÇO (~30% das calorias):
   - Estrutura clássica brasileira: arroz + feijão + proteína + salada + legume
   - Alternativas: massas, risotos, pratos únicos equilibrados
   - Para low carb: proteína + vegetais abundantes + gordura boa

4. JANTAR (~20-25% das calorias):
   - Similar ao almoço mas pode ser mais leve
   - Sopas, omeletes, saladas completas, peixes
   - Evitar carboidratos pesados à noite para quem quer emagrecer

5. CEIA (~5% das calorias):
   - Leve e de fácil digestão
   - Chá + biscoito integral, iogurte, fruta

═══════════════════════════════════════════════════
IMPORTANTE - FORMATO DE RESPOSTA:
═══════════════════════════════════════════════════

Responda EXCLUSIVAMENTE com um JSON válido, sem markdown, sem explicações.
Use aspas duplas para todas as strings.
Não use caracteres especiais que quebrem o JSON.

{
  "day": ${dayNumber},
  "day_name": "${dayName}",
  "meals": [
    {
      "meal_type": "cafe_manha",
      "label": "Café da Manhã",
      "target_calories": 500,
      "options": [
        {
          "name": "Nome do Prato Completo",
          "description": "Descrição curta do prato",
          "calories": 485,
          "protein": 22,
          "carbs": 45,
          "fat": 18,
          "prep_time": 15,
          "ingredients": [
            {"item": "Pão francês", "quantity": "2", "unit": "unidades", "calories": 150},
            {"item": "Ovo", "quantity": "2", "unit": "unidades", "calories": 140},
            {"item": "Manteiga", "quantity": "1", "unit": "colher de sopa", "calories": 100},
            {"item": "Banana", "quantity": "1", "unit": "unidade média", "calories": 95}
          ],
          "instructions": [
            "Aqueça a frigideira em fogo médio",
            "Prepare os ovos mexidos com um fio de azeite",
            "Passe manteiga no pão",
            "Sirva acompanhado da banana"
          ]
        }
      ]
    }
  ],
  "total_calories": 2000
}

GERE AGORA o cardápio completo com ${optionsPerMeal} opções DIFERENTES para cada refeição.
Cada opção deve ser um PRATO COMPLETO com todos os ingredientes e instruções.
Os valores nutricionais devem ser REALISTAS e somar aproximadamente as calorias alvo de cada refeição.`;
}

// ============= DISTRIBUIÇÃO CALÓRICA =============
const CALORIE_DISTRIBUTION: Record<string, number> = {
  cafe_manha: 0.22,
  lanche_manha: 0.08,
  almoco: 0.30,
  lanche_tarde: 0.10,
  jantar: 0.22,
  ceia: 0.08,
};

const MEAL_LABELS: Record<string, string> = {
  cafe_manha: "Café da Manhã",
  lanche_manha: "Lanche da Manhã",
  almoco: "Almoço",
  lanche_tarde: "Lanche da Tarde",
  jantar: "Jantar",
  ceia: "Ceia",
};

const DAY_NAMES = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

// ============= MAIN SERVER =============
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
    logStep("AI Meal Plan Generator started");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request
    const requestBody = await req.json();
    const {
      dailyCalories = 2000,
      daysCount = 1,
      optionsPerMeal = 3,
      mealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"],
    } = requestBody;

    logStep("Request params", { dailyCalories, daysCount, optionsPerMeal, mealTypes });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    
    const restrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || 'comum',
      excludedIngredients: profile.excluded_ingredients || [],
      goal: profile.goal || 'manter',
    };

    logStep("User restrictions", restrictions);

    // Build meals with target calories
    const meals = mealTypes.map((type: string) => ({
      type,
      label: MEAL_LABELS[type] || type,
      targetCalories: Math.round(dailyCalories * (CALORIE_DISTRIBUTION[type] || 0.10)),
    }));

    // Generate plan for each day
    const generatedDays: DayPlan[] = [];

    for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
      const dayName = DAY_NAMES[dayIndex % 7];
      
      logStep(`Generating day ${dayIndex + 1}`, { dayName });

      const prompt = buildNutritionistPrompt({
        dailyCalories,
        meals,
        optionsPerMeal,
        restrictions,
        dayNumber: dayIndex + 1,
        dayName,
      });

      // Call Lovable AI Gateway
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        logStep("AI API Error", { status: aiResponse.status, error: errorText });
        
        if (aiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }
        if (aiResponse.status === 402) {
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }
        throw new Error(`AI API error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "";
      
      logStep("AI response received", { contentLength: content.length });

      // Parse JSON from response
      try {
        // Remove markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const dayPlan: DayPlan = JSON.parse(content);
        generatedDays.push(dayPlan);
        
        logStep(`Day ${dayIndex + 1} generated successfully`, { 
          mealsCount: dayPlan.meals?.length,
          totalCalories: dayPlan.total_calories 
        });
      } catch (parseError) {
        logStep("JSON parse error", { error: parseError, content: content.substring(0, 500) });
        throw new Error(`Failed to parse AI response for day ${dayIndex + 1}`);
      }
    }

    logStep("All days generated", { totalDays: generatedDays.length });

    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          daily_calories: dailyCalories,
          options_per_meal: optionsPerMeal,
          restrictions,
          days: generatedDays,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("Error", { message: errorMessage, stack: errorStack });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
