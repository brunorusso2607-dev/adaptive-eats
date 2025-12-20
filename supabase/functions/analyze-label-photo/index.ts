import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-LABEL-PHOTO] ${step}${detailsStr}`);
};

// Map of ingredient aliases to their allergen categories
const ingredientAliases: Record<string, string[]> = {
  "lactose": ["leite", "lactose", "laticínios", "derivados de leite"],
  "gluten": ["glúten", "trigo", "centeio", "cevada", "aveia", "malte"],
  "soja": ["soja", "lecitina de soja", "proteína de soja", "óleo de soja"],
  "ovo": ["ovo", "ovos", "albumina", "lisozima", "lecitina de ovo"],
  "amendoim": ["amendoim", "pasta de amendoim", "óleo de amendoim"],
  "nozes": ["nozes", "castanhas", "amêndoas", "avelãs", "pistache", "macadâmia", "pecã"],
  "frutos_do_mar": ["camarão", "caranguejo", "lagosta", "marisco", "moluscos", "crustáceos"],
  "peixe": ["peixe", "anchova", "atum", "sardinha", "salmão"],
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

    // Fetch user's intolerances from profile
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

    // Build the list of ingredients to watch for based on user intolerances
    let ingredientsToWatch: string[] = [];
    for (const intolerance of userIntolerances) {
      const aliases = ingredientAliases[intolerance.toLowerCase()];
      if (aliases) {
        ingredientsToWatch.push(...aliases);
      } else {
        ingredientsToWatch.push(intolerance);
      }
    }

    // Add dietary preference restrictions
    let dietaryRestrictions = "";
    if (dietaryPreference === "vegetariana") {
      dietaryRestrictions = "O usuário é VEGETARIANO. Alerte sobre qualquer ingrediente de origem animal (carne, peixe, frutos do mar, gelatina animal, banha, gordura animal).";
    } else if (dietaryPreference === "vegana") {
      dietaryRestrictions = "O usuário é VEGANO. Alerte sobre QUALQUER ingrediente de origem animal (carne, peixe, laticínios, ovos, mel, gelatina, corantes de origem animal como carmim/cochonilha).";
    }

    const systemPrompt = `Você é um especialista em análise de rótulos de alimentos, focado em identificar ingredientes que podem ser problemáticos para pessoas com intolerâncias alimentares.

CONTEXTO DO USUÁRIO:
- Intolerâncias/Alergias: ${userIntolerances.length > 0 ? userIntolerances.join(", ") : "Nenhuma cadastrada"}
- Preferência alimentar: ${dietaryPreference}
${dietaryRestrictions}

${ingredientsToWatch.length > 0 ? `
INGREDIENTES PARA VERIFICAR COM ATENÇÃO:
${ingredientsToWatch.join(", ")}

Também verifique sinônimos e derivados desses ingredientes. Por exemplo:
- Lactose pode aparecer como: caseína, soro de leite, whey, lactoalbumina, lactoglobulina
- Glúten pode aparecer como: farinha de trigo, malte, extrato de malte, amido de trigo
- Soja pode aparecer como: lecitina de soja (E322), proteína texturizada de soja
` : ""}

TAREFA:
Analise a imagem do rótulo de ingredientes e:
1. Identifique o nome do produto (se visível)
2. Liste todos os ingredientes identificados
3. Classifique cada ingrediente como:
   - "seguro": Não representa risco para as intolerâncias do usuário
   - "atencao": Pode conter traços ou derivados problemáticos
   - "evitar": Contém ingrediente que o usuário deve evitar
4. Dê um veredicto geral do produto

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "produto": "Nome do produto (se identificável)",
  "veredicto": "seguro" | "atencao" | "evitar",
  "ingredientes_analisados": [
    {
      "nome": "nome do ingrediente",
      "status": "seguro" | "atencao" | "evitar",
      "motivo": "explicação se status não for seguro"
    }
  ],
  "alertas": ["Lista de alertas importantes"],
  "recomendacao": "Recomendação final para o usuário"
}

Se a imagem não for de um rótulo de ingredientes, retorne:
{"erro": "Não foi possível identificar um rótulo de ingredientes na imagem. Por favor, fotografe a lista de ingredientes do produto."}`;

    logStep("Calling Google Gemini API with image");

    // Call Google Gemini API with image
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
          temperature: 0.2,
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
      throw new Error("Não foi possível analisar o rótulo. Tente com uma foto mais clara.");
    }

    // Check for error response from AI (not a label detected)
    if (analysis.erro) {
      logStep("Not a label detected", { message: analysis.erro });
      return new Response(JSON.stringify({
        success: false,
        notLabel: true,
        message: analysis.erro
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Analysis complete", { 
      veredicto: analysis.veredicto,
      ingredientCount: analysis.ingredientes_analisados?.length,
      alertCount: analysis.alertas?.length
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
