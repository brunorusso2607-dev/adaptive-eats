import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

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

    // PROMPT INTELIGENTE DE IDENTIFICAÇÃO E ANÁLISE - VERSÃO PESSIMISTA
    const systemPrompt = `Você é um ESPECIALISTA em análise de rótulos alimentícios. Seu trabalho é PROTEGER o usuário de consumir algo que possa prejudicá-lo.

## REGRA FUNDAMENTAL (NUNCA VIOLE):
🚨 **NUNCA diga que um produto é "seguro" se você NÃO CONSEGUIU LER a lista de ingredientes na foto.**
🚨 **Se não viu a lista de ingredientes, SEMPRE peça segunda foto OU classifique como "risco_potencial".**

---

## ETAPA ZERO - CLASSIFICAÇÃO DA IMAGEM (EXECUTAR PRIMEIRO!):

CATEGORIAS POSSÍVEIS:
- "produto_alimenticio": Embalagem de produto alimentício
- "alimento_natural": Alimento sem embalagem (fruta, legume, prato de comida)
- "planta_decorativa": Planta ornamental, vaso, jardim
- "objeto_nao_alimenticio": Eletrônicos, móveis, roupas, etc.
- "animal_vivo": Animal de estimação, fauna
- "pessoa_ambiente": Selfie, paisagem, ambiente
- "documento_outro": Documento que não é rótulo de alimento
- "imagem_ilegivel": Foto borrada, escura ou cortada

⚠️ SE NÃO FOR "produto_alimenticio", retorne:
{
  "erro": "categoria_invalida",
  "categoria_detectada": "[categoria]",
  "descricao_objeto": "Descrição do que foi detectado",
  "mensagem": "Mensagem amigável"
}

---

## SE FOR PRODUTO ALIMENTÍCIO, CONTINUE:

### PERFIL DO USUÁRIO (CRÍTICO - PROTEJA ESTE USUÁRIO!):
- Intolerâncias: ${intoleranceLabels.length > 0 ? intoleranceLabels.join(", ").toUpperCase() : "Nenhuma cadastrada"}
- Preferência alimentar: ${dietaryPreference.toUpperCase()}
${dietaryRestrictions}

---

## ETAPA 1 - IDENTIFICAR PRODUTO E VERIFICAR SE É INDUSTRIALIZADO

### PRODUTOS INDUSTRIALIZADOS QUE NATURALMENTE CONTÊM AÇÚCAR (a menos que tenha selo "zero açúcar"):
- Achocolatados (Ovomaltine, Nescau, Toddy, etc.)
- Chocolates (exceto amargo 70%+)
- Refrigerantes (exceto zero/diet)
- Sucos de caixinha/néctar
- Biscoitos doces, bolachas recheadas
- Bolos, doces, balas, chicletes
- Cereais matinais (Sucrilhos, Froot Loops, etc.)
- Iogurtes com sabor
- Sorvetes
- Geleias, mel, leite condensado
- Molhos prontos (ketchup, molho barbecue)
- Granolas

### PRODUTOS QUE NATURALMENTE CONTÊM LACTOSE:
- Leite e derivados (queijo, iogurte, requeijão, manteiga)
- Chocolate ao leite
- Sorvetes tradicionais
- Whey protein concentrado
- Achocolatados em pó

### PRODUTOS QUE NATURALMENTE CONTÊM GLÚTEN:
- Pães, bolos, biscoitos
- Macarrão, massas
- Cerveja tradicional
- Cereais com trigo/aveia

### PRODUTOS QUE NATURALMENTE CONTÊM OVO:
- Maionese
- Bolos tradicionais
- Massas frescas
- Empanados

---

## ETAPA 2 - BUSCAR LISTA DE INGREDIENTES NA FOTO

⚠️ **VOCÊ CONSEGUE VER A LISTA DE INGREDIENTES NA FOTO?**

Se SIM → Analise cada ingrediente e cruze com as restrições do usuário
Se NÃO → Você DEVE pedir segunda foto OU assumir que contém os ingredientes típicos da categoria

### INGREDIENTES QUE INDICAM CADA RESTRIÇÃO:

**AÇÚCAR:** açúcar, sacarose, glicose, frutose, dextrose, maltose, maltodextrina, xarope de milho, xarope de glicose, xarope de frutose, mel, melado, rapadura, açúcar invertido, açúcar mascavo, açúcar demerara, caramelo

**LACTOSE:** leite, leite em pó, soro de leite, whey, proteína do leite, caseína, caseinato, lactose, lactoalbumina, lactoglobulina, creme de leite, nata, manteiga, gordura de leite, gordura láctea, queijo, requeijão, iogurte, coalhada, ghee, sólidos de leite

**GLÚTEN:** trigo, farinha de trigo, centeio, cevada, malte, extrato de malte, xarope de malte, aveia, triticale, semolina, sêmola, bulgur, couscous, amido de trigo, proteína de trigo, glúten

**AMENDOIM:** amendoim, pasta de amendoim, óleo de amendoim, proteína de amendoim, farinha de amendoim

**OVO:** ovo, clara, gema, albumina, ovoalbumina, lecitina de ovo, lisozima

**FRUTOS DO MAR:** camarão, lagosta, caranguejo, siri, mexilhão, ostra, lula, polvo, surimi, kani, molho de ostra

---

## ETAPA 3 - BUSCAR SELOS NA FOTO

Procure NA FOTO por selos, textos ou indicações claras:
- "ZERO AÇÚCAR", "SEM AÇÚCAR", "SUGAR FREE", "DIET", "SEM ADIÇÃO DE AÇÚCAR"
- "ZERO LACTOSE", "SEM LACTOSE", "LACTOSE FREE", "0% LACTOSE", "DESLACTOSADO"
- "SEM GLÚTEN", "GLUTEN FREE", "NÃO CONTÉM GLÚTEN"
- "VEGANO", "VEGAN", "PLANT-BASED", "100% VEGETAL"
- Selos de certificação (ANVISA, SVB Vegano, etc.)

---

## ETAPA 4 - DETERMINAR VEREDICTO (SEJA PESSIMISTA!)

### PODE DIZER "SEGURO" SOMENTE SE:
✓ Você LEU a lista de ingredientes E não encontrou nenhum ingrediente problemático
✓ OU encontrou selo "ZERO/SEM" visível para TODAS as restrições do usuário
✓ OU o produto é naturalmente livre (ex: água, frutas frescas)

### DEVE DIZER "RISCO_POTENCIAL" OU PEDIR FOTO SE:
✗ Foto é só da frente do produto (sem lista de ingredientes)
✗ Produto é industrializado e pode conter ingredientes problemáticos
✗ Não há selo confirmando que é "zero/sem" para a restrição do usuário

### DEVE DIZER "CONTEM" SE:
✗ Você LEU a lista de ingredientes E encontrou ingrediente problemático
✗ OU o produto naturalmente contém o ingrediente (ex: Ovomaltine contém açúcar)

---

## FORMATO DE RESPOSTA (JSON obrigatório):

### Se você LEU a lista de ingredientes:
{
  "categoria_imagem": "produto_alimenticio",
  "produto_identificado": "Nome do Produto",
  "marca": "Marca",
  "confianca": "alta",
  "requer_foto_ingredientes": false,
  "ingredientes_visiveis": true,
  "encontrou_lista_ingredientes": true,
  "fonte_informacao": "imagem",
  "veredicto": "seguro|risco_potencial|contem",
  "ingredientes_analisados": [
    {
      "nome": "ingrediente encontrado",
      "status": "seguro|risco_potencial|contem",
      "motivo": "Explicação",
      "restricao_afetada": "sugar|lactose|gluten|etc",
      "fonte": "imagem"
    }
  ],
  "alertas": [],
  "analise_seguranca": "Explicação da análise",
  "recomendacao": "Recomendação final"
}

### Se você NÃO LEU a lista de ingredientes (PEDIR FOTO):
{
  "categoria_imagem": "produto_alimenticio",
  "produto_identificado": "Nome do Produto",
  "marca": "Marca",
  "confianca": "baixa",
  "requer_foto_ingredientes": true,
  "ingredientes_visiveis": false,
  "encontrou_lista_ingredientes": false,
  "fonte_informacao": "conhecimento",
  "veredicto": "risco_potencial",
  "motivo_duvida": "Não consegui ver a lista de ingredientes. [Nome do produto] tipicamente contém [ingrediente] que está nas suas restrições.",
  "ingredientes_analisados": [
    {
      "nome": "[ingrediente típico do produto]",
      "status": "risco_potencial",
      "motivo": "Produto industrializado tipicamente contém este ingrediente",
      "restricao_afetada": "[restrição do usuário]",
      "fonte": "conhecimento"
    }
  ],
  "alertas": ["Não foi possível confirmar os ingredientes"],
  "analise_seguranca": "Não posso garantir que é seguro sem ver a lista de ingredientes",
  "recomendacao": "Tire foto da tabela de ingredientes para confirmar",
  "mensagem_segunda_foto": "Para sua segurança, tire foto da lista de ingredientes (geralmente no verso ou lateral da embalagem)."
}

---

## ⚠️ REGRAS CRÍTICAS (NUNCA VIOLE!):

1. **REGRA DE OURO:** Se você NÃO VIU a lista de ingredientes → NUNCA diga "seguro". Peça foto ou assuma risco.

2. **PRODUTOS INDUSTRIALIZADOS DOCES:** Achocolatados, chocolates, biscoitos, refrigerantes, sucos, sorvetes, cereais açucarados → Se o usuário tem restrição de AÇÚCAR e você NÃO viu selo "zero açúcar" → Classifique como "contem" ou "risco_potencial".

3. **LATICÍNIOS:** Se o usuário tem restrição de LACTOSE e você NÃO viu selo "zero lactose" em produtos lácteos → Classifique como "contem" ou "risco_potencial".

4. **NA DÚVIDA, PROTEJA O USUÁRIO:** É melhor pedir uma foto a mais do que deixar o usuário consumir algo prejudicial.

5. **CRUZE TUDO:** Analise TODOS os ingredientes visíveis e cruze com TODAS as restrições do usuário.

6. **Produtos VEGANOS** são seguros para lactose e ovo automaticamente.

---

## EXEMPLO ESPECÍFICO - OVOMALTINE:

Se o usuário fotografar Ovomaltine (frente da embalagem) e tiver restrição de AÇÚCAR:
- Ovomaltine é achocolatado industrializado
- Achocolatados SEMPRE contêm açúcar (a menos que seja versão "zero açúcar")
- Se você NÃO vê selo "zero açúcar" na foto → veredicto: "contem" para açúcar
- Não diga "Não identificamos açúcar" - isso está ERRADO!

---

Lista de ingredientes que este usuário deve evitar:
${ingredientsToWatch.map(i => `• ${i}`).join("\n")}`;

    logStep("Calling Google Gemini API with image");

    // Função para fazer a chamada Gemini
    const callGemini = async () => {
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
            temperature: 0.1,
            maxOutputTokens: 8192, // Aumentado de 4096 para evitar respostas truncadas
          }
        }),
      });
      return response;
    };

    // Função para fazer parse do JSON da resposta
    const parseAIResponse = (content: string) => {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("No JSON found in response");
    };

    // Função principal com retry para erros 503 E erros de parse JSON
    const callGeminiWithRetry = async (maxRetries = 3, delayMs = 2000) => {
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await callGemini();

          if (!response.ok) {
            const errorText = await response.text();
            logStep("Google Gemini error", { status: response.status, error: errorText, attempt });

            // Retry automático para erro 503 (model overloaded)
            if (response.status === 503 && attempt < maxRetries) {
              logStep("Retrying due to 503", { attempt, nextAttemptIn: delayMs });
              await new Promise(resolve => setTimeout(resolve, delayMs));
              continue;
            }

            if (response.status === 429) {
              return { rateLimited: true, status: 429 };
            }

            if (response.status === 503) {
              return { rateLimited: true, status: 503 };
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

          // Tentar fazer parse do JSON
          try {
            const analysis = parseAIResponse(content);
            return { success: true, analysis };
          } catch (parseError) {
            logStep("Parse error - will retry", { 
              error: String(parseError), 
              content: content.slice(0, 500),
              attempt 
            });
            
            // Retry para erros de parse JSON (resposta truncada)
            if (attempt < maxRetries) {
              logStep("Retrying due to JSON parse error", { attempt, nextAttemptIn: delayMs });
              await new Promise(resolve => setTimeout(resolve, delayMs));
              lastError = parseError instanceof Error ? parseError : new Error(String(parseError));
              continue;
            }
            
            // Última tentativa falhou
            logStep("Parse error - all retries exhausted", { error: String(parseError), content: content.slice(0, 500) });
            throw new Error("Não foi possível analisar o rótulo. Tente com uma foto mais clara.");
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Se não é um erro de parse e não é 503, não fazer retry
          if (!String(error).includes("parse") && !String(error).includes("JSON")) {
            throw error;
          }
          
          if (attempt >= maxRetries) {
            throw lastError;
          }
        }
      }
      
      throw lastError || new Error("Failed after all retries");
    };

    const result = await callGeminiWithRetry();

    // Handle rate limit / overload after all retries
    if (result && 'rateLimited' in result) {
      const message = result.status === 429 
        ? "Limite de requisições atingido. Aguarde 30 segundos e tente novamente."
        : "O serviço de IA está temporariamente sobrecarregado. Por favor, tente novamente em alguns segundos.";
      return new Response(JSON.stringify({ 
        success: false,
        error: message,
        rateLimited: true
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (!result || !('analysis' in result)) {
      throw new Error("Failed to get response from AI after retries");
    }
    
    const analysis = result.analysis;

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

    // Check if AI determined we need ingredient photo - ROBUST CHECK for all variations
    // AI may return: requer_foto_ingredientes, requer_foto, confianca="baixa", or low confianca_identificacao
    const needsIngredientPhoto = 
      analysis.requer_foto_ingredientes === true || 
      analysis.requer_foto === true ||
      (analysis.confianca === "baixa") ||
      (typeof analysis.confianca === "number" && analysis.confianca < 90) ||
      (analysis.precisa_tabela_nutricional === true && analysis.confianca_identificacao < 70) ||
      (analysis.e_categoria_duvidosa === true || analysis.categoria_duvidosa === true) && (!analysis.ingredientes_visiveis && !analysis.selos_encontrados?.length);
    
    if (needsIngredientPhoto) {
      const produtoNome = analysis.produto_identificado || analysis.produto || 'produto';
      const motivoDuvida = analysis.motivo_duvida || analysis.motivo || 
        `Preciso verificar os ingredientes de ${produtoNome} para confirmar se é seguro para você.`;
      const mensagemFoto = analysis.mensagem_segunda_foto || 
        `Para confirmar se ${produtoNome} é seguro para você, tire uma foto da tabela de ingredientes.`;
      
      logStep("Needs ingredient photo", { 
        confianca: analysis.confianca_identificacao || analysis.confianca,
        produto: produtoNome,
        requer_foto: analysis.requer_foto_ingredientes || analysis.requer_foto,
        categoria_duvidosa: analysis.e_categoria_duvidosa,
        motivo: motivoDuvida
      });
      
      return new Response(JSON.stringify({
        success: false,
        needsBackPhoto: true,
        message: mensagemFoto,
        analysis: {
          produto_identificado: produtoNome,
          marca: analysis.marca,
          motivo_duvida: motivoDuvida,
          intolerancia_em_duvida: analysis.intolerancia_em_duvida,
          mensagem_segunda_foto: mensagemFoto
        }
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
