import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-FOOD-PHOTO] ${step}${detailsStr}`);
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

    // Fetch user's intolerances and dietary preference from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("intolerances, dietary_preference")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
    }

    const userIntolerances = profile?.intolerances || [];
    const dietaryPreference = profile?.dietary_preference || "comum";
    logStep("User profile loaded", { intolerances: userIntolerances, dietaryPreference });

    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");
    logStep("Image received", { imageSize: imageBase64.length });

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // Build intolerance context for the prompt
    let intoleranceContext = "";
    if (userIntolerances.length > 0 || dietaryPreference !== "comum") {
      intoleranceContext = `
IMPORTANTE - RESTRIÇÕES ALIMENTARES DO USUÁRIO:
${userIntolerances.length > 0 ? `- Intolerâncias/Alergias: ${userIntolerances.join(", ")}` : ""}
${dietaryPreference === "vegetariana" ? "- Dieta: VEGETARIANA (não consome carne, peixe, frutos do mar)" : ""}
${dietaryPreference === "vegana" ? "- Dieta: VEGANA (não consome nenhum produto de origem animal)" : ""}

Você DEVE analisar cada alimento identificado e verificar se contém ou pode conter ingredientes problemáticos para essas restrições.
Considere também ingredientes "escondidos" como:
- Lactose: leite, queijo, creme, manteiga, whey, caseína, soro de leite
- Glúten: trigo, centeio, cevada, aveia contaminada, malte
- Soja: lecitina de soja, proteína de soja, molho shoyu
- Ovo: albumina, maionese, alguns molhos
- Frutos do mar: molho de ostra, pasta de camarão

Se detectar algum alimento problemático, adicione ao array "alertas_intolerancia".
`;
    }

    const systemPrompt = `Atue como um nutricionista digital especializado em análise visual de alimentos. Sua tarefa é analisar a imagem enviada e fornecer uma estimativa nutricional detalhada.
${intoleranceContext}
Siga este passo a passo internamente:

1. Identifique cada item visível no prato.
2. Estime o volume/porção de cada item com base na proporção do prato e talheres.
3. Calcule as calorias e macronutrientes (Proteínas, Carboidratos e Gorduras) para cada item.
${userIntolerances.length > 0 || dietaryPreference !== "comum" ? "4. Verifique se algum alimento contém ou pode conter ingredientes problemáticos para as restrições do usuário." : ""}

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

    logStep("Analysis complete", { 
      totalCalories: analysis.total_geral?.calorias_totais,
      foodCount: analysis.alimentos?.length,
      alertCount: analysis.alertas_intolerancia?.length || 0
    });

    return new Response(JSON.stringify({
      success: true,
      analysis
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
