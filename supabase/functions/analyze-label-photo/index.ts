import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { getAIPrompt } from "../_shared/getAIPrompt.ts";

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

    // Fetch AI configuration from database
    const [GOOGLE_AI_API_KEY, promptConfig] = await Promise.all([
      getGeminiApiKey(),
      getAIPrompt("analyze-label-photo")
    ]);
    logStep("Gemini API key and prompt config fetched from database", { model: promptConfig.model });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Fetch user's intolerances and excluded ingredients from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("intolerances, dietary_preference, excluded_ingredients")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
    }

    const userIntolerances = profile?.intolerances || [];
    const dietaryPreference = profile?.dietary_preference || "comum";
    const excludedIngredients = profile?.excluded_ingredients || [];
    logStep("User profile loaded", { intolerances: userIntolerances, dietaryPreference, excludedIngredients });

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

    // Add excluded ingredients to watch list
    if (excludedIngredients.length > 0) {
      ingredientsToWatch.push(...excludedIngredients.map((i: string) => i.toLowerCase()));
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

    // Build excluded ingredients context for prompt
    const excludedContext = excludedIngredients.length > 0 
      ? `- Ingredientes Excluídos Manualmente: ${excludedIngredients.join(", ").toUpperCase()}`
      : "";

    // INTELLIGENT IDENTIFICATION AND ANALYSIS PROMPT - PESSIMISTIC VERSION
    const systemPrompt = `You are an EXPERT in food label analysis. Your job is to PROTECT the user from consuming something harmful.

**IMPORTANT: Always respond in Brazilian Portuguese (pt-BR).**

## FUNDAMENTAL RULE (NEVER VIOLATE):
🚨 **NEVER say a product is "seguro" (safe) if you COULD NOT READ the ingredient list in the photo.**
🚨 **If you didn't see the ingredient list, ALWAYS request a second photo OR classify as "risco_potencial".**

---

## STEP ZERO - IMAGE CLASSIFICATION (EXECUTE FIRST!):

POSSIBLE CATEGORIES:
- "produto_alimenticio": Food product packaging
- "alimento_natural": Food without packaging (fruit, vegetable, prepared dish)
- "planta_decorativa": Ornamental plant, vase, garden
- "objeto_nao_alimenticio": Electronics, furniture, clothing, etc.
- "animal_vivo": Pet, wildlife
- "pessoa_ambiente": Selfie, landscape, environment
- "documento_outro": Document that is not a food label
- "imagem_ilegivel": Blurry, dark, or cropped photo

⚠️ IF NOT "produto_alimenticio", return:
{
  "erro": "categoria_invalida",
  "categoria_detectada": "[category]",
  "descricao_objeto": "Description of what was detected",
  "mensagem": "Friendly message in Portuguese"
}

---

## IF IT'S A FOOD PRODUCT, CONTINUE:

### USER PROFILE (CRITICAL - PROTECT THIS USER!):
- Intolerances: ${intoleranceLabels.length > 0 ? intoleranceLabels.join(", ").toUpperCase() : "None registered"}
- Dietary preference: ${dietaryPreference.toUpperCase()}
${excludedContext}
${dietaryRestrictions}

---

## STEP 1 - IDENTIFY PRODUCT AND CHECK IF INDUSTRIALIZED

### INDUSTRIALIZED PRODUCTS THAT NATURALLY CONTAIN SUGAR (unless labeled "zero sugar"):
- Chocolate drinks/powders (Ovomaltine, Nescau, Toddy, etc.)
- Chocolates (except 70%+ dark)
- Soft drinks (except zero/diet)
- Boxed juices/nectar
- Sweet cookies, filled wafers
- Cakes, candies, gum
- Breakfast cereals (Frosted Flakes, Froot Loops, etc.)
- Flavored yogurts
- Ice cream
- Jams, honey, condensed milk
- Ready sauces (ketchup, barbecue sauce)
- Granola

### PRODUCTS THAT NATURALLY CONTAIN LACTOSE:
- Milk and dairy (cheese, yogurt, cream cheese, butter)
- Milk chocolate
- Traditional ice cream
- Whey protein concentrate
- Chocolate powder drinks

### PRODUCTS THAT NATURALLY CONTAIN GLUTEN:
- Bread, cakes, cookies
- Pasta, noodles
- Traditional beer
- Cereals with wheat/oats

### PRODUCTS THAT NATURALLY CONTAIN EGG:
- Mayonnaise
- Traditional cakes
- Fresh pasta
- Breaded products

---

## STEP 2 - LOOK FOR INGREDIENT LIST IN THE PHOTO

⚠️ **CAN YOU SEE THE INGREDIENT LIST IN THE PHOTO?**

If YES → Analyze each ingredient and cross-reference with user's restrictions
If NO → You MUST request second photo OR assume it contains typical ingredients for that category

### INGREDIENTS THAT INDICATE EACH RESTRICTION:

**SUGAR:** sugar, sucrose, glucose, fructose, dextrose, maltose, maltodextrin, corn syrup, glucose syrup, fructose syrup, honey, molasses, invert sugar, brown sugar, demerara sugar, caramel, açúcar, sacarose, glicose, frutose, maltodextrina, xarope de milho, mel, melado, rapadura

**LACTOSE:** milk, milk powder, whey, milk protein, casein, caseinate, lactose, lactalbumin, lactoglobulin, cream, butter, milk fat, cheese, yogurt, ghee, milk solids, leite, soro de leite, proteína do leite, caseína, caseinato, creme de leite, nata, manteiga, gordura de leite, queijo, requeijão, iogurte, coalhada

**GLUTEN:** wheat, wheat flour, rye, barley, malt, malt extract, malt syrup, oats, triticale, semolina, bulgur, couscous, wheat starch, wheat protein, gluten, trigo, farinha de trigo, centeio, cevada, malte, aveia, sêmola

**PEANUT:** peanut, peanut butter, peanut oil, peanut protein, peanut flour, amendoim, pasta de amendoim, óleo de amendoim

**EGG:** egg, egg white, yolk, albumin, ovalbumin, egg lecithin, lysozyme, ovo, clara, gema, albumina, ovoalbumina

**SEAFOOD:** shrimp, lobster, crab, mussel, oyster, squid, octopus, surimi, kani, oyster sauce, camarão, lagosta, caranguejo, siri, mexilhão, ostra, lula, polvo

---

## STEP 3 - LOOK FOR SEALS IN THE PHOTO

Search IN THE PHOTO for seals, texts, or clear indications:
- "ZERO AÇÚCAR", "SEM AÇÚCAR", "SUGAR FREE", "DIET", "SEM ADIÇÃO DE AÇÚCAR"
- "ZERO LACTOSE", "SEM LACTOSE", "LACTOSE FREE", "0% LACTOSE", "DESLACTOSADO"
- "SEM GLÚTEN", "GLUTEN FREE", "NÃO CONTÉM GLÚTEN"
- "VEGANO", "VEGAN", "PLANT-BASED", "100% VEGETAL"
- Certification seals (ANVISA, SVB Vegan, etc.)

---

## STEP 4 - DETERMINE VERDICT (BE PESSIMISTIC!)

### CAN SAY "seguro" (safe) ONLY IF:
✓ You READ the ingredient list AND found no problematic ingredients
✓ OR found "ZERO/SEM" seal visible for ALL user's restrictions
✓ OR the product is naturally free (e.g., water, fresh fruits)

### MUST SAY "risco_potencial" OR REQUEST PHOTO IF:
✗ Photo is only of the front (no ingredient list)
✗ Product is industrialized and may contain problematic ingredients
✗ No seal confirming "zero/sem" for user's restriction

### MUST SAY "contem" (contains) IF:
✗ You READ the ingredient list AND found problematic ingredient
✗ OR the product naturally contains the ingredient (e.g., Ovomaltine contains sugar)

---

## RESPONSE FORMAT (JSON required):

### If you READ the ingredient list:
{
  "categoria_imagem": "produto_alimenticio",
  "produto_identificado": "Product Name",
  "marca": "Brand",
  "confianca": "alta",
  "requer_foto_ingredientes": false,
  "ingredientes_visiveis": true,
  "encontrou_lista_ingredientes": true,
  "fonte_informacao": "imagem",
  "veredicto": "seguro|risco_potencial|contem",
  "ingredientes_analisados": [
    {
      "nome": "ingredient found",
      "status": "seguro|risco_potencial|contem",
      "motivo": "Explanation in Portuguese",
      "restricao_afetada": "sugar|lactose|gluten|etc",
      "fonte": "imagem",
      "nome_tecnico": "Technical/scientific name if applicable",
      "sinonimos_detectados": ["List of synonyms found that map to this allergen"]
    }
  ],
  "avisos_contaminacao_cruzada": [
    {
      "texto_original": "Exact text from the label (e.g., 'Pode conter traços de amendoim')",
      "alergenos_mencionados": ["peanut", "tree nuts", etc.],
      "afeta_usuario": true|false,
      "restricao_afetada": "Which user restriction this affects"
    }
  ],
  "alertas": [],
  "analise_seguranca": "Analysis explanation in Portuguese",
  "recomendacao": "Final recommendation in Portuguese",
  "resumo_verificacao": {
    "ingredientes_verificados": 0,
    "ingredientes_problematicos": 0,
    "contaminacao_cruzada_detectada": true|false,
    "status_final": "SEGURO|RISCO POTENCIAL|CONTÉM [intolerância(s)]"
  }
}

### If you DID NOT READ the ingredient list (REQUEST PHOTO):
{
  "categoria_imagem": "produto_alimenticio",
  "produto_identificado": "Product Name",
  "marca": "Brand",
  "confianca": "baixa",
  "requer_foto_ingredientes": true,
  "ingredientes_visiveis": false,
  "encontrou_lista_ingredientes": false,
  "fonte_informacao": "conhecimento",
  "veredicto": "risco_potencial",
  "motivo_duvida": "Não consegui ver a lista de ingredientes. [Product name] tipicamente contém [ingredient] que está nas suas restrições.",
  "ingredientes_analisados": [
    {
      "nome": "[typical ingredient]",
      "status": "risco_potencial",
      "motivo": "Produto industrializado tipicamente contém este ingrediente",
      "restricao_afetada": "[user restriction]",
      "fonte": "conhecimento",
      "nome_tecnico": null,
      "sinonimos_detectados": []
    }
  ],
  "avisos_contaminacao_cruzada": [],
  "alertas": ["Não foi possível confirmar os ingredientes"],
  "analise_seguranca": "Não posso garantir que é seguro sem ver a lista de ingredientes",
  "recomendacao": "Tire foto da tabela de ingredientes para confirmar",
  "mensagem_segunda_foto": "Para sua segurança, tire foto da lista de ingredientes (geralmente no verso ou lateral da embalagem).",
  "resumo_verificacao": {
    "ingredientes_verificados": 0,
    "ingredientes_problematicos": 0,
    "contaminacao_cruzada_detectada": false,
    "status_final": "RISCO POTENCIAL - Ingredientes não verificados"
  }
}

---

## ⚠️ CRITICAL RULES (NEVER VIOLATE!):

1. **GOLDEN RULE:** If you DID NOT SEE the ingredient list → NEVER say "seguro". Request photo or assume risk.

2. **SWEET INDUSTRIALIZED PRODUCTS:** Chocolate drinks, chocolates, cookies, sodas, juices, ice cream, sugary cereals → If user has SUGAR restriction and you DID NOT see "zero açúcar" seal → Classify as "contem" or "risco_potencial".

3. **DAIRY:** If user has LACTOSE restriction and you DID NOT see "zero lactose" seal on dairy products → Classify as "contem" or "risco_potencial".

4. **WHEN IN DOUBT, PROTECT THE USER:** Better to request one more photo than let user consume something harmful.

5. **CROSS-REFERENCE EVERYTHING:** Analyze ALL visible ingredients and cross with ALL user restrictions.

6. **VEGAN products** are safe for lactose and egg automatically.

---

## 🚨 CONTAMINAÇÃO CRUZADA (CRÍTICO):

### SEMPRE PROCURE E REPORTE AVISOS DE CONTAMINAÇÃO:
- "Pode conter traços de..."
- "Produzido em ambiente que processa..."
- "Fabricado em equipamento compartilhado com..."
- "Contém traços de..."
- "May contain traces of..."

### CLASSIFICAÇÃO DE CONTAMINAÇÃO CRUZADA:
- Se o aviso menciona QUALQUER intolerância do usuário → veredicto: "risco_potencial"
- Se o aviso é genérico ("pode conter alérgenos") → veredicto: "risco_potencial" com alerta

### RESPOSTA OBRIGATÓRIA PARA CONTAMINAÇÃO:
No JSON de resposta, SEMPRE inclua o campo "avisos_contaminacao_cruzada" listando todos os avisos encontrados.

---

## 📋 VERIFICAÇÃO COMPLETA DE INGREDIENTES:

Para CADA ingrediente na lista, verifique:
1. Nome direto do ingrediente (ex: "leite", "trigo")
2. Nomes técnicos/científicos (ex: "caseína", "maltodextrina") 
3. Códigos E (ex: "E322" = lecitina, pode ser de soja)
4. Derivados e subprodutos (ex: "soro de leite" = lactose)

### MAPEAMENTO COMPLETO DE SINÔNIMOS:
- GLÚTEN: trigo, centeio, cevada, aveia, malte, amido modificado, proteína de trigo, E1404-E1452 (alguns amidos)
- LACTOSE: leite, caseína, caseinato, soro de leite, whey, lactoalbumina, lactoglobulina, buttermilk, ghee
- OVO: albumina, ovalbumina, lisozima, lecitina de ovo, globulina, livetina
- SOJA: lecitina (E322), proteína de soja, óleo de soja, molho de soja, tempeh, tofu
- AMENDOIM: pasta de amendoim, óleo de amendoim, arachis hypogaea

---

## SPECIFIC EXAMPLE - OVOMALTINE:

If user photographs Ovomaltine (front of package) and has SUGAR restriction:
- Ovomaltine is an industrialized chocolate drink
- Chocolate drinks ALWAYS contain sugar (unless it's "zero açúcar" version)
- If you DON'T see "zero açúcar" seal in the photo → verdict: "contem" for sugar
- Do NOT say "Não identificamos açúcar" - that is WRONG!

---

Ingredients this user should avoid:
${ingredientsToWatch.map(i => `• ${i}`).join("\n")}`;

    logStep("Calling Google Gemini API with image");

    // Função para fazer a chamada Gemini
    const callGemini = async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${promptConfig.model}:generateContent?key=${GOOGLE_AI_API_KEY}`, {
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
