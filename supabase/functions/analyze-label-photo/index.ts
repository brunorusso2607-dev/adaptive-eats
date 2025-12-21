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

// Mapa EXPANDIDO de sinônimos por intolerância - inclui termos técnicos brasileiros
const ingredientAliases: Record<string, string[]> = {
  "lactose": [
    "leite", "lactose", "laticínios", "derivados de leite", "soro de leite", "whey",
    "caseína", "caseinato", "caseinato de sódio", "caseinato de cálcio",
    "lactoalbumina", "lactoglobulina", "proteína do leite", "proteína láctea",
    "manteiga", "creme de leite", "nata", "gordura láctea", "gordura de leite",
    "coalho", "queijo", "requeijão", "iogurte", "coalhada", "kefir",
    "leite em pó", "leite condensado", "leite integral", "leite desnatado",
    "buttermilk", "ghee", "sólidos de leite", "extrato de leite",
    "lactato", "ácido láctico" // alguns podem ser veganos, mas melhor alertar
  ],
  "gluten": [
    "glúten", "trigo", "farinha de trigo", "farinha branca", "farinha integral",
    "centeio", "cevada", "aveia", "malte", "extrato de malte", "xarope de malte",
    "semolina", "sêmola", "espelta", "kamut", "triticale",
    "amido de trigo", "amido modificado", "proteína de trigo",
    "bulgur", "couscous", "seitan", "pão", "massa", "macarrão",
    "cerveja", "whisky", "uísque", "farinha de rosca", "panko"
  ],
  "amendoim": [
    "amendoim", "pasta de amendoim", "manteiga de amendoim", "óleo de amendoim",
    "farinha de amendoim", "proteína de amendoim", "arachis hypogaea",
    "traços de amendoim", "pode conter amendoim"
  ],
  "nozes": [
    "nozes", "castanhas", "castanha de caju", "castanha do pará", "castanha do brasil",
    "amêndoas", "avelãs", "pistache", "macadâmia", "pecã", "noz pecã",
    "pinhão", "pralinê", "marzipã", "maçapão", "nougat",
    "traços de castanhas", "pode conter castanhas", "frutas oleaginosas"
  ],
  "frutos_do_mar": [
    "camarão", "caranguejo", "siri", "lagosta", "lagostim", "marisco",
    "moluscos", "crustáceos", "mexilhão", "ostra", "vieira", "lula",
    "polvo", "surimi", "kani", "crab stick",
    "traços de crustáceos", "pode conter crustáceos"
  ],
  "peixe": [
    "peixe", "anchova", "atum", "sardinha", "salmão", "bacalhau", "tilápia",
    "merluza", "pescada", "linguado", "robalo", "dourado",
    "óleo de peixe", "colágeno de peixe", "gelatina de peixe",
    "molho de peixe", "fish sauce", "pasta de peixe",
    "traços de peixe", "pode conter peixe"
  ],
  "ovo": [
    "ovo", "ovos", "gema", "clara", "albumina", "ovoalbumina",
    "lisozima", "lecitina de ovo", "globulina", "livetina",
    "ovo em pó", "ovo líquido", "ovo pasteurizado",
    "maionese", "merengue", "gemada",
    "traços de ovo", "pode conter ovo"
  ],
  "soja": [
    "soja", "lecitina de soja", "E322", "proteína de soja", "proteína texturizada de soja",
    "óleo de soja", "molho de soja", "shoyu", "missô", "miso", "tofu",
    "tempeh", "edamame", "leite de soja", "farinha de soja",
    "extrato de soja", "isolado de soja", "concentrado de soja",
    "traços de soja", "pode conter soja"
  ],
  "sugar": [
    "açúcar", "sacarose", "glicose", "frutose", "dextrose", "maltose",
    "xarope de milho", "xarope de glicose", "xarope de frutose", "high fructose corn syrup",
    "maltodextrina", "açúcar invertido", "açúcar mascavo", "açúcar demerara",
    "melado", "melaço", "rapadura", "mel", "xarope de agave",
    "caramelo", "glucose-fructose", "açúcar de coco", "néctar"
  ]
};

// Ingredientes de origem animal (para veganos)
const animalIngredients = [
  "carne", "frango", "galinha", "peru", "pato", "porco", "bacon", "presunto",
  "linguiça", "salsicha", "boi", "vaca", "vitela", "cordeiro", "carneiro",
  "gelatina", "gelatina animal", "colágeno", "colágeno animal", "banha", "toucinho",
  "gordura animal", "sebo", "tutano", "caldo de carne", "extrato de carne",
  "mel", "própolis", "geleia real", "cera de abelha",
  "carmim", "cochonilha", "E120", "corante natural vermelho",
  "queratina", "lanolina", "seda", "albumina", "caseína",
  // inclui laticínios e ovos também
  "leite", "queijo", "manteiga", "iogurte", "ovo", "clara", "gema"
];

// Ingredientes de carne/peixe (para vegetarianos)
const meatIngredients = [
  "carne", "frango", "galinha", "peru", "pato", "porco", "bacon", "presunto",
  "linguiça", "salsicha", "boi", "vaca", "vitela", "cordeiro", "carneiro",
  "peixe", "atum", "sardinha", "salmão", "camarão", "camarões", "marisco",
  "crustáceo", "molusco", "anchova", "surimi",
  "gelatina", "gelatina animal", "banha", "gordura animal", "sebo",
  "caldo de carne", "caldo de galinha", "extrato de carne"
];

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

    const { imageBase64, step } = await req.json();
    if (!imageBase64) throw new Error("No image provided");
    logStep("Image received", { imageSize: imageBase64.length, step: step || "single" });

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // Build the COMPLETE list of ingredients to watch for based on user profile
    let ingredientsToWatch: string[] = [];
    let intoleranceLabels: string[] = [];
    
    for (const intolerance of userIntolerances) {
      const aliases = ingredientAliases[intolerance.toLowerCase()];
      if (aliases) {
        ingredientsToWatch.push(...aliases);
        intoleranceLabels.push(intolerance);
      } else {
        ingredientsToWatch.push(intolerance);
        intoleranceLabels.push(intolerance);
      }
    }

    // Add dietary preference restrictions
    let dietaryRestrictions = "";
    let dietaryIngredientsToWatch: string[] = [];
    
    if (dietaryPreference === "vegetariana") {
      dietaryRestrictions = "O usuário é VEGETARIANO.";
      dietaryIngredientsToWatch = meatIngredients;
      intoleranceLabels.push("vegetarianismo");
    } else if (dietaryPreference === "vegana") {
      dietaryRestrictions = "O usuário é VEGANO.";
      dietaryIngredientsToWatch = animalIngredients;
      intoleranceLabels.push("veganismo");
    }

    ingredientsToWatch = [...new Set([...ingredientsToWatch, ...dietaryIngredientsToWatch])];

    // PROMPT DE VERIFICAÇÃO NEGATIVA COM FAIL-SAFE
    const systemPrompt = `Você é um especialista em segurança alimentar, especializado em identificar ingredientes perigosos para pessoas com restrições alimentares.

PERFIL DO USUÁRIO (CRÍTICO - MEMORIZE):
- Intolerâncias/Alergias: ${intoleranceLabels.length > 0 ? intoleranceLabels.join(", ").toUpperCase() : "Nenhuma cadastrada"}
- Preferência alimentar: ${dietaryPreference.toUpperCase()}
${dietaryRestrictions}

⚠️ LISTA DE INGREDIENTES A PROCURAR ATIVAMENTE (inclui sinônimos e termos técnicos):
${ingredientsToWatch.map(i => `• ${i}`).join("\n")}

🔍 REGRAS DE ANÁLISE (SIGA À RISCA):

1. LEIA CADA INGREDIENTE DA LISTA - um por um, letra por letra
2. Para CADA ingrediente encontrado, pergunte-se: "Este ingrediente está na lista de restrições do usuário?"
3. SE NÃO RECONHECER um termo químico ou ingrediente técnico → CLASSIFIQUE COMO "risco_potencial" (não como seguro!)
4. SE ENCONTRAR "pode conter traços de..." → CLASSIFIQUE COMO "risco_potencial"
5. SE ENCONTRAR qualquer ingrediente da lista acima → CLASSIFIQUE COMO "contem"

📊 SISTEMA DE 3 NÍVEIS DE RISCO (OBRIGATÓRIO):

🔴 "contem" = CERTEZA que contém ingrediente problemático
   → Use quando o ingrediente aparece claramente na lista

🟡 "risco_potencial" = INCERTEZA ou traços possíveis
   → Use quando: termo técnico desconhecido, "pode conter", derivados suspeitos

🟢 "seguro" = CERTEZA de ausência
   → APENAS quando você tem 100% de certeza que NÃO há nenhum ingrediente problemático

FORMATO DE RESPOSTA (JSON obrigatório):
{
  "produto": "Nome do produto (se identificável)",
  "encontrou_lista_ingredientes": true/false,
  "veredicto": "seguro" | "risco_potencial" | "contem",
  "ingredientes_analisados": [
    {
      "nome": "nome exato do ingrediente como aparece no rótulo",
      "status": "seguro" | "risco_potencial" | "contem",
      "motivo": "explicação clara do motivo (sempre preencher se não for seguro)",
      "restricao_afetada": "qual intolerância/preferência é afetada (se aplicável)"
    }
  ],
  "alertas": ["Lista de alertas CRÍTICOS em ordem de gravidade"],
  "ingredientes_suspeitos": ["Lista de ingredientes que você não reconheceu ou tem dúvida"],
  "recomendacao": "Recomendação clara e direta para o usuário"
}

IMPORTANTE:
- Se a imagem NÃO mostrar informações suficientes para análise (rótulo ilegível, produto não identificado), retorne:
  {"erro": "lista_nao_encontrada", "mensagem": "Não reconheci o produto somente pela embalagem. Para a sua segurança, tire uma foto da tabela nutricional que consta em algum lugar da embalagem."}

- Se a qualidade da imagem estiver ruim (borrada, escura, cortada), retorne:
  {"erro": "qualidade_ruim", "mensagem": "A imagem está difícil de ler. Por favor, tire uma foto mais nítida e bem iluminada."}

LEMBRE-SE: É melhor alertar sobre um ingrediente duvidoso do que deixar passar algo perigoso. NA DÚVIDA, CLASSIFIQUE COMO "risco_potencial".`;

    logStep("Calling Google Gemini API with image");

    // Call Google Gemini API with image (usando modelo mais capaz para segurança)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
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
          temperature: 0.1, // Baixa temperatura para mais precisão
          maxOutputTokens: 4096,
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
      logStep("Parse error", { error: String(parseError), content: content.slice(0, 500) });
      throw new Error("Não foi possível analisar o rótulo. Tente com uma foto mais clara.");
    }

    // Check for error responses from AI
    if (analysis.erro) {
      logStep("AI detected issue", { erro: analysis.erro, mensagem: analysis.mensagem });
      
      if (analysis.erro === "lista_nao_encontrada") {
        return new Response(JSON.stringify({
          success: false,
          needsBackPhoto: true,
          message: analysis.mensagem || "Não reconheci o produto somente pela embalagem. Para a sua segurança, tire uma foto da tabela nutricional."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      if (analysis.erro === "qualidade_ruim") {
        return new Response(JSON.stringify({
          success: false,
          qualityIssue: true,
          message: analysis.mensagem || "A imagem está difícil de ler. Tente uma foto mais nítida."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      return new Response(JSON.stringify({
        success: false,
        notLabel: true,
        message: analysis.mensagem || analysis.erro
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Normalize veredicto to match the 3-level system
    if (analysis.veredicto === "atencao") {
      analysis.veredicto = "risco_potencial";
    }
    if (analysis.veredicto === "evitar") {
      analysis.veredicto = "contem";
    }

    // Normalize ingredient status
    if (analysis.ingredientes_analisados) {
      analysis.ingredientes_analisados = analysis.ingredientes_analisados.map((ing: any) => {
        let status = ing.status;
        if (status === "atencao") status = "risco_potencial";
        if (status === "evitar") status = "contem";
        return { ...ing, status };
      });
    }

    logStep("Analysis complete", { 
      veredicto: analysis.veredicto,
      ingredientCount: analysis.ingredientes_analisados?.length,
      alertCount: analysis.alertas?.length,
      suspiciousCount: analysis.ingredientes_suspeitos?.length
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
