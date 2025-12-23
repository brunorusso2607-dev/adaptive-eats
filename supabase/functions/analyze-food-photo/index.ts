import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-FOOD-PHOTO] ${step}${detailsStr}`);
};

// Mapa expandido de sinônimos por intolerância (consistente com rótulo e geladeira)
const SINONIMOS_INTOLERANCIA: Record<string, string[]> = {
  lactose: [
    'leite', 'queijo', 'manteiga', 'creme de leite', 'nata', 'iogurte', 'requeijão',
    'cream cheese', 'chantilly', 'molho branco', 'bechamel', 'alfredo', 'carbonara',
    'gratinado', 'au gratin', 'fondue', 'raclette', 'lasanha', 'pizza', 'risoto',
    'purê', 'sorvete', 'milk shake', 'cappuccino', 'café com leite', 'chocolate quente',
    'pudim', 'mousse', 'cheesecake', 'petit gateau', 'brigadeiro', 'beijinho',
    'doce de leite', 'leite condensado', 'whey', 'caseína', 'soro de leite',
    'creme', 'cremoso', 'cheese', 'mussarela', 'parmesão', 'gorgonzola', 'brie',
    'camembert', 'provolone', 'ricota', 'cottage', 'mascarpone', 'cream'
  ],
  gluten: [
    'pão', 'torrada', 'farinha', 'trigo', 'massa', 'macarrão', 'espaguete', 'fusilli',
    'penne', 'lasanha', 'ravioli', 'nhoque', 'pizza', 'esfiha', 'empada', 'pastel',
    'coxinha', 'quibe', 'bolinho', 'croquete', 'nuggets', 'empanado', 'à milanesa',
    'breaded', 'panko', 'farinha de rosca', 'biscoito', 'bolacha', 'bolo', 'torta',
    'croissant', 'brioche', 'bagel', 'wrap', 'tortilla de trigo', 'tabule',
    'cerveja', 'malte', 'centeio', 'cevada', 'aveia', 'seitan', 'molho shoyu',
    'molho teriyaki', 'molho inglês', 'ketchup', 'mostarda', 'gravy', 'roux'
  ],
  amendoim: [
    'amendoim', 'pasta de amendoim', 'manteiga de amendoim', 'paçoca', 'pé de moleque',
    'satay', 'molho satay', 'pad thai', 'comida tailandesa', 'kung pao'
  ],
  oleaginosas: [
    'castanha', 'nozes', 'amêndoas', 'pistache', 'avelã', 'macadâmia', 'pecã',
    'castanha de caju', 'castanha do pará', 'pesto', 'baklava', 'marzipã',
    'praline', 'torrone', 'nutella', 'granola', 'cereal', 'barra de cereal'
  ],
  frutos_do_mar: [
    'camarão', 'lagosta', 'caranguejo', 'siri', 'lula', 'polvo', 'marisco',
    'mexilhão', 'ostra', 'vieira', 'surimi', 'kani', 'tempurá de camarão',
    'paella', 'moqueca', 'bobó', 'vatapá', 'acarajé', 'risoto de frutos do mar',
    'sushi', 'sashimi', 'camarão seco', 'pasta de camarão'
  ],
  peixe: [
    'peixe', 'salmão', 'atum', 'tilápia', 'bacalhau', 'sardinha', 'anchova',
    'truta', 'robalo', 'linguado', 'pescada', 'merluza', 'fish', 'sashimi',
    'sushi', 'ceviche', 'molho de peixe', 'fish sauce', 'caesar', 'worcestershire'
  ],
  ovo: [
    'ovo', 'ovos', 'omelete', 'fritada', 'quiche', 'suflê', 'meringue', 'merengue',
    'maionese', 'aioli', 'hollandaise', 'carbonara', 'custard', 'pudim', 'flan',
    'bolo', 'panqueca', 'waffle', 'crepe', 'french toast', 'rabanada',
    'massa fresca', 'macarrão ao ovo', 'tempura', 'empanado'
  ],
  soja: [
    'soja', 'tofu', 'tempeh', 'edamame', 'missô', 'molho shoyu', 'molho de soja',
    'leite de soja', 'proteína de soja', 'lecitina de soja', 'óleo de soja',
    'molho teriyaki', 'yakisoba', 'comida japonesa', 'comida chinesa'
  ],
  acucar: [
    'açúcar', 'doce', 'sobremesa', 'bolo', 'torta', 'sorvete', 'chocolate',
    'pudim', 'mousse', 'brigadeiro', 'beijinho', 'trufa', 'bombom',
    'refrigerante', 'suco industrializado', 'mel', 'xarope', 'geleia',
    'caramelo', 'calda', 'cobertura', 'glacê', 'fondant'
  ]
};

// Mapeamento de intolerâncias do perfil para chaves do mapa
const INTOLERANCE_MAP: Record<string, string> = {
  'lactose': 'lactose',
  'gluten': 'gluten',
  'amendoim': 'amendoim',
  'oleaginosas': 'oleaginosas',
  'frutos_do_mar': 'frutos_do_mar',
  'peixe': 'peixe',
  'ovo': 'ovo',
  'soja': 'soja',
  'acucar': 'acucar',
  'leite': 'lactose',
  'trigo': 'gluten',
  'nozes': 'oleaginosas',
  'castanhas': 'oleaginosas',
  'camarão': 'frutos_do_mar',
  'mariscos': 'frutos_do_mar',
  'ovos': 'ovo'
};

// Calcular TMB (Taxa Metabólica Basal) usando fórmula de Mifflin-St Jeor
function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === 'masculino') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
}

// Calcular TDEE (Gasto Energético Diário Total)
function calculateTDEE(tmb: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very_active': 1.9
  };
  return tmb * (multipliers[activityLevel] || 1.55);
}

// Calcular meta calórica baseada no objetivo
function calculateDailyGoal(tdee: number, goal: string, calorieGoal: string): number {
  if (calorieGoal === 'definir_depois') {
    // Se não definiu, usa o objetivo de peso
    if (goal === 'emagrecer') {
      return Math.round(tdee * 0.8); // Déficit de 20%
    } else if (goal === 'ganhar_peso') {
      return Math.round(tdee * 1.15); // Superávit de 15%
    }
    return Math.round(tdee);
  }
  
  // Baseado na preferência de calorias
  if (calorieGoal === 'reduzir') {
    return Math.round(tdee * 0.8);
  } else if (calorieGoal === 'aumentar') {
    return Math.round(tdee * 1.15);
  }
  return Math.round(tdee);
}

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

    const GOOGLE_AI_API_KEY = await getGeminiApiKey();
    logStep("Gemini API key fetched from database");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Fetch user's full profile for calorie calculation
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("intolerances, dietary_preference, weight_current, height, age, sex, activity_level, goal, calorie_goal")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
    }

    const userIntolerances = profile?.intolerances || [];
    const dietaryPreference = profile?.dietary_preference || "comum";
    
    // Calcular meta calórica diária
    let dailyCalorieGoal: number | null = null;
    if (profile?.weight_current && profile?.height && profile?.age && profile?.sex) {
      const tmb = calculateTMB(
        profile.weight_current,
        profile.height,
        profile.age,
        profile.sex
      );
      const tdee = calculateTDEE(tmb, profile.activity_level || 'moderate');
      dailyCalorieGoal = calculateDailyGoal(tdee, profile.goal || 'manter', profile.calorie_goal || 'manter');
      logStep("Daily calorie goal calculated", { tmb, tdee, dailyCalorieGoal });
    }
    
    logStep("User profile loaded", { 
      intolerances: userIntolerances, 
      dietaryPreference,
      dailyCalorieGoal 
    });

    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");
    logStep("Image received", { imageSize: imageBase64.length });

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // Build intolerance context for the prompt with expanded synonyms
    let intoleranceContext = "";
    if (userIntolerances.length > 0 || dietaryPreference !== "comum") {
      let synonymsList: string[] = [];
      for (const intolerance of userIntolerances) {
        const key = INTOLERANCE_MAP[intolerance.toLowerCase()] || intolerance.toLowerCase();
        const synonyms = SINONIMOS_INTOLERANCIA[key] || [];
        synonymsList = [...synonymsList, ...synonyms];
      }
      
      intoleranceContext = `
IMPORTANTE - RESTRIÇÕES ALIMENTARES DO USUÁRIO:
${userIntolerances.length > 0 ? `- Intolerâncias/Alergias: ${userIntolerances.join(", ")}` : ""}
${dietaryPreference === "vegetariana" ? "- Dieta: VEGETARIANA (não consome carne, peixe, frutos do mar)" : ""}
${dietaryPreference === "vegana" ? "- Dieta: VEGANA (não consome nenhum produto de origem animal)" : ""}

INGREDIENTES/PRATOS A VERIFICAR (podem conter alérgenos):
${synonymsList.slice(0, 50).join(', ')}

Você DEVE analisar cada alimento identificado e verificar se contém ou pode conter ingredientes problemáticos para essas restrições.
Considere também ingredientes "escondidos" em molhos, temperos e preparações.

VERIFICAÇÃO NEGATIVA (FAIL-SAFE):
- Se você NÃO consegue confirmar que um prato é seguro, assuma que PODE conter o alérgeno
- Molhos, gratinados, empanados e pratos cremosos são suspeitos por padrão
- Se detectar algum alimento problemático, adicione ao array "alertas_intolerancia"
`;
    }

    const systemPrompt = `Atue como um nutricionista digital especializado em análise visual de alimentos e SEGURANÇA ALIMENTAR para pessoas com intolerâncias.
${intoleranceContext}
Siga este passo a passo internamente:

1. Identifique cada item visível no prato.
2. Estime o volume/porção de cada item com base na proporção do prato e talheres.
3. Calcule as calorias e macronutrientes (Proteínas, Carboidratos e Gorduras) para cada item.
${userIntolerances.length > 0 || dietaryPreference !== "comum" ? "4. Verifique CUIDADOSAMENTE se algum alimento contém ou pode conter ingredientes problemáticos. Em caso de DÚVIDA, adicione um alerta." : ""}

Formato de Saída (Obrigatório em JSON):
{
  "alimentos": [
    {
      "item": "nome do alimento",
      "porcao_estimada": "quantidade em g ou ml",
      "calorias": 0,
      "macros": {
        "proteinas": 0,
        "carboidratos": 0,
        "gorduras": 0
      }
    }
  ],
  "total_geral": {
    "calorias_totais": 0,
    "proteinas_totais": 0,
    "carboidratos_totais": 0,
    "gorduras_totais": 0
  },
  "observacoes": "Menção a possíveis ingredientes ocultos como óleos ou temperos.",
  "alertas_intolerancia": [
    {
      "alimento": "nome do alimento problemático",
      "intolerancia": "qual intolerância afeta",
      "risco": "alto" | "medio" | "baixo",
      "motivo": "explicação do porquê é problemático"
    }
  ]
}

REGRAS:
- O array "alertas_intolerancia" deve estar vazio [] se não houver problemas detectados
- O campo "risco" deve ser:
  - "alto": contém definitivamente o ingrediente problemático
  - "medio": provavelmente contém ou é preparado com
  - "baixo": pode conter traços ou contaminação cruzada
- Responda apenas o JSON
- Se a imagem não for de comida, retorne: {"erro": "Não foi possível identificar alimentos na imagem."}`;

    logStep("Calling Google Gemini API with image");

    // Call Google Gemini API with image - using gemini-2.5-flash-lite
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Google Gemini error", { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns minutos e tente novamente." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Google Gemini API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    logStep("AI response received");

    // Extract analysis from Google Gemini response format
    const content = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("Invalid AI response format");
    }

    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      logStep("Parse error", { error: String(parseError), content: content.slice(0, 200) });
      throw new Error("Não foi possível analisar a imagem. Tente com uma foto mais clara.");
    }

    // Ensure alertas_intolerancia exists
    if (!analysis.alertas_intolerancia) {
      analysis.alertas_intolerancia = [];
    }

    // Check for error response from AI (not food detected)
    if (analysis.erro) {
      logStep("Not food detected", { message: analysis.erro });
      return new Response(JSON.stringify({
        success: false,
        notFood: true,
        message: analysis.erro
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========== PÓS-PROCESSAMENTO DE SEGURANÇA - CRUZAMENTO COM PERFIL ==========
    // Esta etapa GARANTE que nenhuma intolerância do usuário escape da detecção
    
    const alertasPersonalizados: Array<{
      ingrediente: string;
      restricao: string;
      status: "seguro" | "risco_potencial" | "contem";
      mensagem: string;
      icone: string;
    }> = [];
    
    // Verificar cada intolerância do usuário contra os alimentos identificados
    for (const userIntolerance of userIntolerances) {
      const intoleranceKey = INTOLERANCE_MAP[userIntolerance.toLowerCase()] || userIntolerance.toLowerCase();
      const synonyms = SINONIMOS_INTOLERANCIA[intoleranceKey] || [userIntolerance];
      
      let found = false;
      let foundStatus: "seguro" | "risco_potencial" | "contem" = "seguro";
      let foundFood = "";
      
      // Verificar em alimentos identificados
      if (analysis.alimentos) {
        for (const food of analysis.alimentos) {
          const foodName = food.item?.toLowerCase() || "";
          
          // Verificar se este alimento corresponde à intolerância
          const matchesIntolerance = synonyms.some(syn => 
            foodName.includes(syn.toLowerCase())
          );
          
          if (matchesIntolerance) {
            found = true;
            foundFood = food.item;
            foundStatus = "contem";
            break;
          }
        }
      }
      
      // Verificar também nos alertas da IA
      if (!found && analysis.alertas_intolerancia) {
        for (const alerta of analysis.alertas_intolerancia) {
          if (alerta.intolerancia?.toLowerCase().includes(intoleranceKey)) {
            found = true;
            foundFood = alerta.alimento;
            foundStatus = alerta.risco === "alto" ? "contem" : "risco_potencial";
            break;
          }
        }
      }
      
      // Gerar mensagem personalizada para o usuário
      const restricaoLabel = intoleranceKey === "lactose" ? "Lactose" :
                            intoleranceKey === "gluten" ? "Glúten" :
                            intoleranceKey === "acucar" ? "Açúcar" :
                            intoleranceKey === "amendoim" ? "Amendoim" :
                            intoleranceKey === "frutos_do_mar" ? "Frutos do Mar" :
                            intoleranceKey === "ovo" ? "Ovo" :
                            intoleranceKey === "soja" ? "Soja" :
                            intoleranceKey === "oleaginosas" ? "Oleaginosas" :
                            userIntolerance;
      
      if (found) {
        alertasPersonalizados.push({
          ingrediente: foundFood,
          restricao: restricaoLabel,
          status: foundStatus,
          mensagem: foundStatus === "contem" 
            ? `⚠️ ATENÇÃO: "${foundFood}" contém ${restricaoLabel.toUpperCase()}, que está na sua lista de restrições`
            : `⚡ VERIFICAR: "${foundFood}" pode conter ${restricaoLabel}`,
          icone: foundStatus === "contem" ? "🔴" : "🟡"
        });
      } else {
        alertasPersonalizados.push({
          ingrediente: "",
          restricao: restricaoLabel,
          status: "seguro",
          mensagem: `✅ Seguro para você: Não identificamos ${restricaoLabel} nesta refeição`,
          icone: "🟢"
        });
      }
    }
    
    // Adicionar verificação de preferência alimentar
    if (dietaryPreference === "vegetariana" || dietaryPreference === "vegana") {
      const dietLabel = dietaryPreference === "vegana" ? "Veganismo" : "Vegetarianismo";
      const meatKeywords = ["carne", "frango", "peixe", "camarão", "bacon", "linguiça", "presunto", "salsicha"];
      const animalKeywords = [...meatKeywords, "leite", "queijo", "ovo", "manteiga", "iogurte", "mel"];
      const keywordsToCheck = dietaryPreference === "vegana" ? animalKeywords : meatKeywords;
      
      let found = false;
      let foundFood = "";
      
      if (analysis.alimentos) {
        for (const food of analysis.alimentos) {
          const foodName = food.item?.toLowerCase() || "";
          if (keywordsToCheck.some(keyword => foodName.includes(keyword))) {
            found = true;
            foundFood = food.item;
            break;
          }
        }
      }
      
      alertasPersonalizados.push({
        ingrediente: foundFood,
        restricao: dietLabel,
        status: found ? "contem" : "seguro",
        mensagem: found 
          ? `⚠️ ATENÇÃO: "${foundFood}" é incompatível com ${dietLabel.toLowerCase()}`
          : `✅ Compatível com ${dietLabel.toLowerCase()}`,
        icone: found ? "🔴" : "🟢"
      });
    }
    
    // Ordenar alertas: primeiro os problemas, depois os seguros
    alertasPersonalizados.sort((a, b) => {
      const order = { "contem": 0, "risco_potencial": 1, "seguro": 2 };
      return order[a.status] - order[b.status];
    });
    
    // Adicionar ao response
    const perfilUsuarioAplicado = {
      intolerances: userIntolerances,
      dietary_preference: dietaryPreference,
      alertas_personalizados: alertasPersonalizados,
      resumo: alertasPersonalizados.some(a => a.status === "contem")
        ? "Esta refeição contém itens NÃO recomendados para você"
        : alertasPersonalizados.some(a => a.status === "risco_potencial")
        ? "Verifique os ingredientes desta refeição com atenção"
        : "Esta refeição parece segura para o seu perfil"
    };

    // Adicionar informações de meta diária
    let metaDiaria = null;
    if (dailyCalorieGoal && analysis.total_geral?.calorias_totais) {
      const caloriasConsumidas = analysis.total_geral.calorias_totais;
      const caloriasRestantes = dailyCalorieGoal - caloriasConsumidas;
      const percentualConsumido = Math.round((caloriasConsumidas / dailyCalorieGoal) * 100);
      
      metaDiaria = {
        meta_calorica_diaria: dailyCalorieGoal,
        calorias_esta_refeicao: caloriasConsumidas,
        calorias_restantes: Math.max(0, caloriasRestantes),
        percentual_consumido: percentualConsumido,
        status: percentualConsumido <= 30 ? 'leve' : 
                percentualConsumido <= 50 ? 'moderado' : 
                percentualConsumido <= 75 ? 'substancial' : 'pesado',
        mensagem: caloriasRestantes > 0 
          ? `Esta refeição representa ${percentualConsumido}% da sua meta diária. Restam aproximadamente ${caloriasRestantes} kcal para hoje.`
          : `⚠️ Esta refeição excede sua meta diária em ${Math.abs(caloriasRestantes)} kcal.`
      };
      
      logStep("Daily goal integration", metaDiaria);
    }

    logStep("Analysis complete with profile cross-check", { 
      totalCalories: analysis.total_geral?.calorias_totais,
      foodCount: analysis.alimentos?.length,
      alertCount: analysis.alertas_intolerancia?.length || 0,
      personalizedAlerts: alertasPersonalizados.length,
      hasMetaDiaria: !!metaDiaria,
      profileApplied: true
    });

    return new Response(JSON.stringify({
      success: true,
      analysis,
      meta_diaria: metaDiaria,
      perfil_usuario_aplicado: perfilUsuarioAplicado
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
