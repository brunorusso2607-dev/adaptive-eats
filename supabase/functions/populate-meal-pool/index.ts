import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[MEAL-POOL] ${step}`, details ? JSON.stringify(details) : "");
};

// Configurações regionais de templates de refeições
const REGIONAL_TEMPLATES: Record<string, Record<string, string[]>> = {
  BR: {
    cafe_manha: [
      "Proteína (ovos, queijo, iogurte) + Carboidrato (pão, tapioca, aveia) + Bebida (café, leite, suco) + Fruta",
      "Vitamina de frutas + Sanduíche natural",
      "Tapioca recheada + Café + Fruta",
      "Mingau de aveia + Frutas picadas",
    ],
    almoco: [
      "Proteína (frango, carne, peixe) + Arroz + Feijão + Salada + Legume",
      "Proteína grelhada + Arroz integral + Legumes refogados",
      "Prato único (estrogonofe, picadinho) + Arroz + Salada",
    ],
    lanche_tarde: [
      "Fruta + Castanhas ou Iogurte",
      "Sanduíche natural + Suco",
      "Vitamina de frutas",
      "Tapioca + Café",
    ],
    jantar: [
      "Proteína leve + Salada completa + Carboidrato moderado",
      "Sopa de legumes com proteína",
      "Omelete + Salada + Pão integral",
    ],
    ceia: [
      "Chá + Fruta leve",
      "Iogurte natural",
      "Leite morno + Biscoito integral",
    ],
  },
  US: {
    cafe_manha: [
      "Eggs + Toast + Orange juice + Fruit",
      "Oatmeal + Berries + Coffee",
      "Pancakes + Bacon + Milk",
    ],
    almoco: [
      "Protein + Salad + Whole grain",
      "Sandwich + Soup + Fruit",
      "Bowl (rice, protein, vegetables)",
    ],
    lanche_tarde: [
      "Yogurt + Granola",
      "Fruit + Nuts",
      "Cheese + Crackers",
    ],
    jantar: [
      "Protein + Vegetables + Starch",
      "Pasta + Salad",
      "Grilled meat + Rice + Vegetables",
    ],
    ceia: [
      "Herbal tea + Light snack",
      "Warm milk",
    ],
  },
};

// Regras de combinações proibidas
const FORBIDDEN_COMBINATIONS = [
  ["arroz", "macarrão"],
  ["pão", "tapioca"],
  ["feijão", "lentilha"],
  ["café", "chá"], // na mesma refeição
  ["rice", "pasta"],
  ["bread", "tortilla"],
];

interface MealComponent {
  type: string; // protein, carb, vegetable, fruit, beverage, fat, fiber
  name: string;
  portion_grams?: number;
  portion_ml?: number;
  portion_label: string;
}

interface GeneratedMeal {
  name: string;
  description: string;
  components: MealComponent[];
  dietary_tags: string[];
  blocked_for_intolerances: string[];
  flexible_options: Record<string, string[]>;
  instructions: string[];
  prep_time_minutes: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      country_code = "BR", 
      meal_type, 
      quantity = 5,
      dietary_filter = null // ex: "vegetariano", "sem_gluten"
    } = await req.json();

    logStep("Iniciando geração de pool", { country_code, meal_type, quantity, dietary_filter });

    // Validar meal_type
    const validMealTypes = ["cafe_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
    if (!validMealTypes.includes(meal_type)) {
      throw new Error(`meal_type inválido. Use: ${validMealTypes.join(", ")}`);
    }

    // Buscar templates regionais
    const templates = REGIONAL_TEMPLATES[country_code]?.[meal_type] || REGIONAL_TEMPLATES["BR"][meal_type];

    // Buscar intolerâncias do banco para referência
    const { data: intoleranceMappings } = await supabase
      .from("intolerance_mappings")
      .select("intolerance_key, ingredient")
      .limit(500);

    // Agrupar ingredientes por intolerância
    const intoleranceIngredients: Record<string, string[]> = {};
    intoleranceMappings?.forEach((m: { intolerance_key: string; ingredient: string }) => {
      if (!intoleranceIngredients[m.intolerance_key]) {
        intoleranceIngredients[m.intolerance_key] = [];
      }
      intoleranceIngredients[m.intolerance_key].push(m.ingredient);
    });

    // Prompt estruturado para Gemini
    const systemPrompt = `Você é um nutricionista especializado em criar combinações de refeições saudáveis e regionais.

TAREFA: Gerar ${quantity} combinações de ${meal_type.replace("_", " ")} para ${country_code === "BR" ? "Brasil" : country_code}.

TEMPLATES DE REFERÊNCIA (siga a estrutura):
${templates.map((t, i) => `${i + 1}. ${t}`).join("\n")}

REGRAS OBRIGATÓRIAS:
1. Cada refeição deve ter componentes claramente separados por tipo
2. Porções devem ser realistas (ex: 1 ovo = 50g, 1 fatia pão = 30g, 1 xícara café = 200ml)
3. NUNCA combine: ${FORBIDDEN_COMBINATIONS.map(c => c.join(" + ")).join("; ")}
4. Identifique quais intolerâncias bloqueiam cada refeição
5. Sugira opções flexíveis para variedade (ex: a fruta pode ser banana, maçã ou pera)

${dietary_filter ? `FILTRO DIETÉTICO: Apenas refeições compatíveis com "${dietary_filter}"` : ""}

RETORNE um JSON array com exatamente ${quantity} objetos no formato:
{
  "meals": [
    {
      "name": "Nome descritivo da refeição",
      "description": "Breve descrição",
      "components": [
        {"type": "protein", "name": "Ovos mexidos", "portion_grams": 100, "portion_label": "2 ovos médios"},
        {"type": "carb", "name": "Pão integral", "portion_grams": 60, "portion_label": "2 fatias"},
        {"type": "beverage", "name": "Café preto", "portion_ml": 200, "portion_label": "1 xícara"},
        {"type": "fruit", "name": "Banana", "portion_grams": 120, "portion_label": "1 unidade média"}
      ],
      "dietary_tags": ["sem_lactose"],
      "blocked_for_intolerances": ["gluten"],
      "flexible_options": {"fruit": ["banana", "maçã", "pera"]},
      "instructions": ["Mexer os ovos em fogo baixo", "Torrar o pão"],
      "prep_time_minutes": 10
    }
  ]
}

TIPOS DE COMPONENTES VÁLIDOS: protein, carb, vegetable, fruit, beverage, fat, fiber, dairy, grain, legume

INTOLERÂNCIAS CONHECIDAS (para preencher blocked_for_intolerances):
${Object.keys(intoleranceIngredients).slice(0, 20).join(", ")}`;

    logStep("Chamando Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere ${quantity} refeições de ${meal_type} para ${country_code}. Retorne APENAS o JSON, sem markdown.` },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logStep("Erro na API AI", { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione fundos à sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    logStep("Resposta AI recebida", { length: aiContent.length });

    // Parse do JSON (remover markdown se houver)
    let cleanJson = aiContent.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
    }

    let generatedMeals: GeneratedMeal[];
    try {
      const parsed = JSON.parse(cleanJson);
      generatedMeals = parsed.meals || parsed;
    } catch (parseError) {
      logStep("Erro ao parsear JSON da AI", { error: String(parseError), content: cleanJson.slice(0, 500) });
      throw new Error("Falha ao parsear resposta da AI");
    }

    logStep("Refeições geradas pela AI", { count: generatedMeals.length });

    // Calcular macros reais consultando a tabela foods (TBCA/TACO)
    const mealsWithMacros = await Promise.all(
      generatedMeals.map(async (meal) => {
        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let macroSource = "tbca";
        let macroConfidence = "high";
        let foundCount = 0;

        for (const component of meal.components) {
          const portionGrams = component.portion_grams || component.portion_ml || 100;

          // Buscar na tabela foods
          const { data: foodMatch } = await supabase
            .from("foods")
            .select("calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source")
            .or(`name.ilike.%${component.name}%,name_normalized.ilike.%${component.name.toLowerCase()}%`)
            .limit(1)
            .single();

          if (foodMatch) {
            const factor = portionGrams / 100;
            totalCalories += Math.round(foodMatch.calories_per_100g * factor);
            totalProtein += Math.round(foodMatch.protein_per_100g * factor * 10) / 10;
            totalCarbs += Math.round(foodMatch.carbs_per_100g * factor * 10) / 10;
            totalFat += Math.round(foodMatch.fat_per_100g * factor * 10) / 10;
            totalFiber += Math.round((foodMatch.fiber_per_100g || 0) * factor * 10) / 10;
            foundCount++;
            
            if (foodMatch.source && !macroSource.includes(foodMatch.source)) {
              macroSource = foodMatch.source;
            }
          } else {
            // Fallback: estimativa baseada no tipo
            macroConfidence = "medium";
            const estimates: Record<string, { cal: number; prot: number; carb: number; fat: number }> = {
              protein: { cal: 150, prot: 25, carb: 0, fat: 5 },
              carb: { cal: 120, prot: 3, carb: 25, fat: 1 },
              vegetable: { cal: 25, prot: 2, carb: 5, fat: 0 },
              fruit: { cal: 60, prot: 1, carb: 15, fat: 0 },
              beverage: { cal: 5, prot: 0, carb: 1, fat: 0 },
              dairy: { cal: 80, prot: 5, carb: 8, fat: 3 },
              fat: { cal: 90, prot: 0, carb: 0, fat: 10 },
              grain: { cal: 100, prot: 3, carb: 20, fat: 1 },
              legume: { cal: 120, prot: 8, carb: 20, fat: 1 },
              fiber: { cal: 30, prot: 2, carb: 7, fat: 0 },
            };
            const est = estimates[component.type] || estimates.carb;
            const factor = portionGrams / 100;
            totalCalories += Math.round(est.cal * factor);
            totalProtein += Math.round(est.prot * factor * 10) / 10;
            totalCarbs += Math.round(est.carb * factor * 10) / 10;
            totalFat += Math.round(est.fat * factor * 10) / 10;
          }
        }

        if (foundCount === 0) {
          macroConfidence = "low";
          macroSource = "ai_estimated";
        } else if (foundCount < meal.components.length / 2) {
          macroConfidence = "medium";
        }

        return {
          name: meal.name,
          description: meal.description,
          meal_type,
          components: meal.components,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          total_fiber: totalFiber,
          macro_source: macroSource,
          macro_confidence: macroConfidence,
          country_codes: [country_code],
          language_code: country_code === "BR" ? "pt" : "en",
          dietary_tags: meal.dietary_tags || [],
          blocked_for_intolerances: meal.blocked_for_intolerances || [],
          flexible_options: meal.flexible_options || {},
          instructions: meal.instructions || [],
          prep_time_minutes: meal.prep_time_minutes || 15,
          is_active: true,
          source: "ai_generated",
          generated_by: "populate-meal-pool",
        };
      })
    );

    logStep("Macros calculados", { 
      meals: mealsWithMacros.map(m => ({ 
        name: m.name, 
        calories: m.total_calories,
        confidence: m.macro_confidence 
      })) 
    });

    // Inserir no banco (upsert para evitar duplicatas)
    const inserted: string[] = [];
    const skipped: string[] = [];

    for (const meal of mealsWithMacros) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from("meal_combinations")
        .select("id")
        .eq("name", meal.name)
        .eq("meal_type", meal.meal_type)
        .contains("country_codes", [country_code])
        .single();

      if (existing) {
        skipped.push(meal.name);
        continue;
      }

      const { error: insertError } = await supabase
        .from("meal_combinations")
        .insert(meal);

      if (insertError) {
        logStep("Erro ao inserir", { meal: meal.name, error: insertError.message });
        skipped.push(meal.name);
      } else {
        inserted.push(meal.name);
      }
    }

    logStep("Inserção concluída", { inserted: inserted.length, skipped: skipped.length });

    // Log de uso
    await supabase.from("ai_usage_logs").insert({
      function_name: "populate-meal-pool",
      model_used: "google/gemini-2.5-flash",
      items_generated: inserted.length,
      metadata: { country_code, meal_type, quantity, dietary_filter },
    });

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedMeals.length,
        inserted: inserted.length,
        skipped: skipped.length,
        meals: mealsWithMacros.map(m => ({
          name: m.name,
          calories: m.total_calories,
          protein: m.total_protein,
          carbs: m.total_carbs,
          fat: m.total_fat,
          confidence: m.macro_confidence,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Erro fatal", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
