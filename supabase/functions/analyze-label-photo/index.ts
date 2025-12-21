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

    // PROMPT INTELIGENTE DE IDENTIFICAÇÃO E ANÁLISE COM VALIDAÇÃO DE CATEGORIA
    const systemPrompt = `Você é um especialista em segurança alimentar e nutrição com visão computacional avançada.

🔍 ETAPA ZERO - CLASSIFICAÇÃO DA IMAGEM (EXECUTAR PRIMEIRO!):
Antes de qualquer análise, você DEVE classificar o tipo de conteúdo da imagem:

CATEGORIAS POSSÍVEIS:
- "produto_alimenticio": Embalagem de produto alimentício (com ou sem rótulo visível)
- "alimento_natural": Alimento sem embalagem (fruta, legume, carne, etc.)
- "planta_decorativa": Planta ornamental, vaso, jardim (NÃO é comida)
- "objeto_nao_alimenticio": Eletrônicos, móveis, roupas, etc.
- "animal_vivo": Animal de estimação, fauna, etc.
- "pessoa_ambiente": Selfie, paisagem, ambiente interno/externo
- "documento_outro": Documento que não é rótulo de alimento
- "imagem_ilegivel": Foto borrada, escura ou cortada demais

⚠️ SE A CATEGORIA NÃO FOR "produto_alimenticio":
Retorne IMEDIATAMENTE este JSON e NÃO continue a análise:
{
  "erro": "categoria_invalida",
  "categoria_detectada": "[categoria aqui]",
  "descricao_objeto": "Breve descrição do que foi detectado",
  "mensagem": "Mensagem amigável explicando o problema"
}

MENSAGENS SUGERIDAS POR CATEGORIA:
- planta_decorativa: "Isso parece uma planta 🌱 Para verificar ingredientes, tire foto de um produto alimentício com embalagem."
- alimento_natural: "Esse alimento não tem rótulo de ingredientes. Para verificar restrições alimentares, tire foto de um produto embalado."
- objeto_nao_alimenticio: "Não identifiquei um produto alimentício 📦 Tire foto de uma embalagem de alimento."
- animal_vivo: "Ops! Isso parece um animal 🐾 Para verificar ingredientes, tire foto de um produto alimentício."
- pessoa_ambiente: "Não encontrei um produto alimentício na foto 📸 Tire foto de uma embalagem com rótulo."
- documento_outro: "Esse documento não parece ser um rótulo de alimentos 📄 Tire foto de uma embalagem de produto."
- imagem_ilegivel: "A imagem está difícil de analisar 📷 Tente uma foto mais nítida e bem iluminada."

---

SE A IMAGEM FOR "produto_alimenticio", CONTINUE COM A ANÁLISE:

PERFIL DO USUÁRIO (CRÍTICO - MEMORIZE):
- Intolerâncias/Alergias: ${intoleranceLabels.length > 0 ? intoleranceLabels.join(", ").toUpperCase() : "Nenhuma cadastrada"}
- Preferência alimentar: ${dietaryPreference.toUpperCase()}
${dietaryRestrictions}

⚠️ LISTA DE INGREDIENTES PROBLEMÁTICOS PARA ESTE USUÁRIO:
${ingredientsToWatch.map(i => `• ${i}`).join("\n")}

🔍 SUA TAREFA (EXECUTE EM ORDEM):

ETAPA 1 - IDENTIFICAÇÃO DO PRODUTO:
Analise a imagem da embalagem. Mesmo que a tabela nutricional não esteja visível, utilize:
- Branding e logo
- Nome do produto
- Características visuais da embalagem
- Cores e design típicos da marca

ETAPA 2 - RECUPERAR INFORMAÇÕES DO PRODUTO:
Com base no seu conhecimento de banco de dados alimentares brasileiros:
- Recupere os ingredientes padrão deste produto
- Identifique a composição típica desta marca/produto
- Considere variações comuns (ex: "com sal", "sem sal", "light")

ETAPA 3 - VERIFICAR RESTRIÇÕES DO USUÁRIO:
Para CADA ingrediente (da imagem OU do seu conhecimento do produto):
- Verifique se está na lista de restrições acima
- Classifique usando o sistema de 3 níveis

📊 SISTEMA DE 3 NÍVEIS DE RISCO:

🔴 "contem" = CERTEZA que contém ingrediente problemático
   → Ingrediente aparece claramente OU é ingrediente padrão conhecido do produto

🟡 "risco_potencial" = INCERTEZA ou traços possíveis
   → Termo técnico desconhecido, "pode conter", ou produto não 100% identificado

🟢 "seguro" = CERTEZA de ausência
   → 100% de certeza que NÃO há nenhum ingrediente problemático

📊 NÍVEL DE CONFIANÇA DA IDENTIFICAÇÃO:
- 90-100%: Produto identificado com certeza absoluta (marca + nome + variante claros)
- 70-89%: Produto provavelmente identificado (marca visível, mas detalhes incertos)
- 50-69%: Identificação parcial (apenas marca ou apenas tipo de produto)
- 0-49%: Produto não identificado com segurança

FORMATO DE RESPOSTA PARA PRODUTO ALIMENTÍCIO (JSON obrigatório):
{
  "categoria_imagem": "produto_alimenticio",
  "produto_identificado": "Nome completo do produto (ex: Margarina Qualy com Sal)",
  "marca": "Nome da marca",
  "confianca_identificacao": 0-100,
  "fonte_informacao": "imagem" | "conhecimento" | "ambos",
  "encontrou_lista_ingredientes": true/false,
  "veredicto": "seguro" | "risco_potencial" | "contem",
  "ingredientes_analisados": [
    {
      "nome": "nome do ingrediente",
      "status": "seguro" | "risco_potencial" | "contem",
      "motivo": "explicação clara",
      "restricao_afetada": "qual intolerância é afetada",
      "fonte": "imagem" | "conhecimento"
    }
  ],
  "alertas": ["Lista de alertas CRÍTICOS em ordem de gravidade"],
  "analise_seguranca": "Explicação curta sobre por que o produto é seguro ou não para as restrições do usuário",
  "recomendacao": "Recomendação clara e direta para o usuário",
  "precisa_tabela_nutricional": true/false
}

REGRAS ESPECIAIS:

1. Se confianca_identificacao < 70 E não encontrou lista de ingredientes na imagem:
   → Retorne precisa_tabela_nutricional: true
   → veredicto deve ser "risco_potencial"

2. Se identificar produto pelo branding mas confianca >= 80:
   → Use seu conhecimento para análise mesmo sem tabela visível
   → Informe que análise foi baseada em "conhecimento" do produto

3. EXEMPLOS DE PRODUTOS CONHECIDOS (use seu conhecimento):
   - Margarina Qualy tradicional → CONTÉM derivados de leite (lactose)
   - Leite Ninho → CONTÉM lactose
   - Pão de forma → Geralmente CONTÉM glúten
   - Molho de soja → CONTÉM soja e geralmente glúten

4. Se a qualidade da imagem estiver ruim (borrada, escura, cortada):
   → Retorne: {"erro": "qualidade_ruim", "mensagem": "A imagem está difícil de ler. Por favor, tire uma foto mais nítida e bem iluminada."}

5. Se REALMENTE não conseguir identificar o produto de forma alguma:
   → Retorne: {"erro": "lista_nao_encontrada", "mensagem": "Não consegui identificar o produto. Para sua segurança, tire uma foto da tabela nutricional."}

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
      logStep("AI detected issue", { erro: analysis.erro, mensagem: analysis.mensagem, categoria: analysis.categoria_detectada });
      
      // NEW: Handle category validation errors
      if (analysis.erro === "categoria_invalida") {
        return new Response(JSON.stringify({
          success: false,
          categoryError: true,
          categoria_detectada: analysis.categoria_detectada || "desconhecido",
          descricao_objeto: analysis.descricao_objeto || "",
          message: analysis.mensagem || "Não foi possível identificar um produto alimentício na imagem."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      if (analysis.erro === "lista_nao_encontrada") {
        return new Response(JSON.stringify({
          success: false,
          needsBackPhoto: true,
          message: analysis.mensagem || "Não consegui identificar o produto. Para sua segurança, tire uma foto da tabela nutricional."
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

    // Check if AI determined we need nutritional table (low confidence + no ingredient list)
    if (analysis.precisa_tabela_nutricional === true && analysis.confianca_identificacao < 70) {
      logStep("Low confidence - needs nutritional table", { 
        confianca: analysis.confianca_identificacao,
        produto: analysis.produto_identificado 
      });
      
      return new Response(JSON.stringify({
        success: false,
        needsBackPhoto: true,
        message: `Identifiquei parcialmente como "${analysis.produto_identificado || 'produto desconhecido'}" (confiança: ${analysis.confianca_identificacao}%). Para sua segurança, tire uma foto da tabela nutricional.`
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

    // ========== PÓS-PROCESSAMENTO DE SEGURANÇA - CRUZAMENTO COM PERFIL ==========
    // Esta etapa GARANTE que nenhuma intolerância do usuário escape da detecção
    
    const alertasPersonalizados: Array<{
      ingrediente: string;
      restricao: string;
      status: "seguro" | "risco_potencial" | "contem";
      mensagem: string;
      icone: string;
    }> = [];
    
    // Verificar cada intolerância do usuário contra os ingredientes analisados
    for (const userIntolerance of userIntolerances) {
      const intoleranceKey = userIntolerance.toLowerCase();
      const aliases = ingredientAliases[intoleranceKey] || [userIntolerance];
      
      let found = false;
      let foundStatus: "seguro" | "risco_potencial" | "contem" = "seguro";
      let foundIngredient = "";
      
      // Verificar em ingredientes_analisados
      if (analysis.ingredientes_analisados) {
        for (const ing of analysis.ingredientes_analisados) {
          const ingName = ing.nome?.toLowerCase() || "";
          const ingMotivo = ing.motivo?.toLowerCase() || "";
          const ingRestricao = ing.restricao_afetada?.toLowerCase() || "";
          
          // Verificar se este ingrediente corresponde à intolerância
          const matchesIntolerance = aliases.some(alias => 
            ingName.includes(alias.toLowerCase()) || 
            ingMotivo.includes(alias.toLowerCase()) ||
            ingRestricao.includes(intoleranceKey)
          );
          
          if (matchesIntolerance || ingRestricao.includes(intoleranceKey)) {
            found = true;
            foundIngredient = ing.nome;
            if (ing.status === "contem") {
              foundStatus = "contem";
              break; // Pior caso, não precisa continuar
            } else if (ing.status === "risco_potencial") {
              foundStatus = "risco_potencial";
            }
          }
        }
      }
      
      // Verificar também no conteúdo dos alertas da IA
      if (!found && analysis.alertas) {
        for (const alerta of analysis.alertas) {
          const alertaLower = alerta.toLowerCase();
          if (aliases.some(alias => alertaLower.includes(alias.toLowerCase()))) {
            found = true;
            foundStatus = "contem";
            foundIngredient = userIntolerance;
            break;
          }
        }
      }
      
      // Gerar mensagem personalizada para o usuário
      const restricaoLabel = intoleranceKey === "lactose" ? "Lactose" :
                            intoleranceKey === "gluten" ? "Glúten" :
                            intoleranceKey === "acucar" ? "Açúcar" :
                            intoleranceKey === "amendoim" ? "Amendoim" :
                            intoleranceKey === "frutos_mar" || intoleranceKey === "frutos_do_mar" ? "Frutos do Mar" :
                            intoleranceKey === "ovo" ? "Ovo" :
                            intoleranceKey === "soja" ? "Soja" :
                            intoleranceKey === "nozes" || intoleranceKey === "oleaginosas" ? "Oleaginosas" :
                            userIntolerance;
      
      if (found) {
        alertasPersonalizados.push({
          ingrediente: foundIngredient,
          restricao: restricaoLabel,
          status: foundStatus,
          mensagem: foundStatus === "contem" 
            ? `⚠️ ATENÇÃO: Este produto CONTÉM ${restricaoLabel.toUpperCase()}, que está na sua lista de restrições`
            : `⚡ VERIFICAR: Este produto pode conter ${restricaoLabel}, que está na sua lista de restrições`,
          icone: foundStatus === "contem" ? "🔴" : "🟡"
        });
      } else {
        alertasPersonalizados.push({
          ingrediente: "",
          restricao: restricaoLabel,
          status: "seguro",
          mensagem: `✅ Seguro para você: Não identificamos ${restricaoLabel} neste produto`,
          icone: "🟢"
        });
      }
    }
    
    // Adicionar verificação de preferência alimentar
    if (dietaryPreference === "vegetariana" || dietaryPreference === "vegana") {
      const dietLabel = dietaryPreference === "vegana" ? "Veganismo" : "Vegetarianismo";
      const ingredientsToCheck = dietaryPreference === "vegana" ? animalIngredients : meatIngredients;
      
      let found = false;
      let foundIngredient = "";
      
      if (analysis.ingredientes_analisados) {
        for (const ing of analysis.ingredientes_analisados) {
          const ingName = ing.nome?.toLowerCase() || "";
          if (ingredientsToCheck.some(item => ingName.includes(item.toLowerCase()))) {
            found = true;
            foundIngredient = ing.nome;
            break;
          }
        }
      }
      
      alertasPersonalizados.push({
        ingrediente: foundIngredient,
        restricao: dietLabel,
        status: found ? "contem" : "seguro",
        mensagem: found 
          ? `⚠️ ATENÇÃO: Este produto contém ingredientes incompatíveis com ${dietLabel.toLowerCase()}`
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
        ? "Este produto NÃO é recomendado para você"
        : alertasPersonalizados.some(a => a.status === "risco_potencial")
        ? "Verifique o rótulo com atenção antes de consumir"
        : "Este produto parece seguro para o seu perfil"
    };

    logStep("Analysis complete with profile cross-check", { 
      produto: analysis.produto_identificado,
      marca: analysis.marca,
      confianca: analysis.confianca_identificacao,
      fonte: analysis.fonte_informacao,
      veredicto: analysis.veredicto,
      ingredientCount: analysis.ingredientes_analisados?.length,
      alertCount: analysis.alertas?.length,
      personalizedAlerts: alertasPersonalizados.length,
      profileApplied: true
    });

    return new Response(JSON.stringify({
      success: true,
      analysis,
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
