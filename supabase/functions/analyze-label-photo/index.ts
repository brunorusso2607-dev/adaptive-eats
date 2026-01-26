import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";

// Modelo hardcoded para consistência com outros módulos
const AI_MODEL = "gemini-2.5-flash-lite";
import {
  getLocaleFromCountry,
  getNutritionalSource
} from "../_shared/nutritionPrompt.ts";
// ============= GLOBAL SAFETY ENGINE - NÚCLEO CENTRALIZADO =============
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  normalizeText,
  validateIngredient,
  validateIngredientList,
  validateFoodWithDecomposition,
  isProcessedFood,
  generateRestrictionsPromptContext,
  getDatabaseStats,
  getIntoleranceLabel,
  getDietaryLabel,
  INTOLERANCE_LABELS,
  DIETARY_LABELS,
  type SafetyDatabase,
  type UserRestrictions,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-LABEL-PHOTO] ${step}${detailsStr}`);
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

    // Fetch API key (model is hardcoded for consistency)
    const GOOGLE_AI_API_KEY = await getGeminiApiKey();
    logStep("Gemini API key fetched", { model: AI_MODEL });

    // Parse body first to get potential userId fallback
    const body = await req.json();
    const { imageBase64, step, userId: bodyUserId } = body;
    if (!imageBase64) throw new Error("No image provided");

    // Try to authenticate user from token, with fallback to body userId
    let userId: string | null = null;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Only try to authenticate if it looks like a JWT (contains dots)
      if (token.includes('.')) {
        try {
          const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
          if (!userError && userData?.user) {
            userId = userData.user.id;
            logStep("User authenticated via token", { userId });
          }
        } catch (authError) {
          logStep("Token auth failed, trying fallback", { error: authError });
        }
      }
    }
    
    // Fallback to userId from body if token auth failed
    if (!userId && bodyUserId) {
      userId = bodyUserId;
      logStep("Using userId from request body", { userId });
    }
    
    if (!userId) {
      throw new Error("User not authenticated. Please log in again.");
    }

    // Fetch user's intolerances and excluded ingredients from profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("intolerances, dietary_preference, excluded_ingredients, country")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
    }

    const userIntolerances = profile?.intolerances || [];
    const dietaryPreference = profile?.dietary_preference || "comum";
    const excludedIngredients = profile?.excluded_ingredients || [];
    const userCountry = profile?.country || "BR";
    
    // Get locale for the user's country
    const userLocale = getLocaleFromCountry(userCountry);
    const nutritionalSource = getNutritionalSource(userCountry);
    
    logStep("User profile loaded", { intolerances: userIntolerances, dietaryPreference, excludedIngredients, userCountry, userLocale });

    logStep("Image received", { imageSize: imageBase64.length, step: step || "single" });

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // ========== LOAD GLOBAL SAFETY DATABASE ==========
    let safetyDatabase: SafetyDatabase | null = null;
    let dynamicIngredientsContext = "";
    
    try {
      safetyDatabase = await loadSafetyDatabase();
      logStep("Loaded Global Safety Database", { stats: getDatabaseStats(safetyDatabase) });
      
      // Build user restrictions object
      const userRestrictions: UserRestrictions = {
        intolerances: userIntolerances,
        dietaryPreference: dietaryPreference,
        excludedIngredients: excludedIngredients
      };
      
      // Generate comprehensive prompt context from database
      dynamicIngredientsContext = generateRestrictionsPromptContext(userRestrictions, safetyDatabase);
    } catch (dbError) {
      logStep("Failed to load safety database", { error: dbError });
    }

    // Build the COMPLETE list of ingredients to watch for based on user profile
    let ingredientsToWatch: string[] = [];
    let intoleranceLabelsToUse: string[] = [];
    
    // Use Global Safety Engine mappings from database
    if (safetyDatabase) {
      const normalizedIntolerances = normalizeUserIntolerances(userIntolerances, safetyDatabase);
      for (const intolerance of normalizedIntolerances) {
        const dbIngredients = safetyDatabase.intoleranceMappings.get(intolerance) || [];
        ingredientsToWatch.push(...dbIngredients);
        intoleranceLabelsToUse.push(getIntoleranceLabel(intolerance, safetyDatabase));
      }
      
      // Add dietary forbidden ingredients
      if (dietaryPreference && dietaryPreference !== "comum") {
        const dietaryForbidden = safetyDatabase.dietaryForbidden.get(dietaryPreference) || [];
        ingredientsToWatch.push(...dietaryForbidden);
        intoleranceLabelsToUse.push(getDietaryLabel(dietaryPreference, safetyDatabase));
      }
    }

    // Add excluded ingredients to watch list
    if (excludedIngredients.length > 0) {
      ingredientsToWatch.push(...excludedIngredients.map((i: string) => i.toLowerCase()));
    }

    // Remove duplicates
    ingredientsToWatch = [...new Set(ingredientsToWatch)];

    // Build excluded ingredients context for prompt
    const excludedContext = excludedIngredients.length > 0 
      ? `- Ingredientes Excluídos Manualmente: ${excludedIngredients.join(", ").toUpperCase()}`
      : "";
    
    // Build dietary restrictions context
    let dietaryRestrictions = "";
    if (dietaryPreference === "vegetariana") {
      dietaryRestrictions = "O usuário é VEGETARIANO.";
    } else if (dietaryPreference === "vegana") {
      dietaryRestrictions = "O usuário é VEGANO.";
    } else if (dietaryPreference === "pescetariana") {
      dietaryRestrictions = "O usuário é PESCETARIANO (come peixe mas não carnes).";
    }

    // INTELLIGENT IDENTIFICATION AND ANALYSIS PROMPT - GLOBAL VERSION
    const systemPrompt = `You are a WORLD-CLASS EXPERT in food label analysis from ANY COUNTRY. Your job is to PROTECT the user from consuming something harmful.

=== LANGUAGE & OUTPUT RULES ===
- REASON internally in English for maximum accuracy
- OUTPUT all user-facing text in: ${userLocale}
- Use culturally appropriate terms for the user's region (${userCountry})
- JSON KEYS: always English. TEXT VALUES shown to user: ${userLocale}

User country: ${userCountry}
User locale: ${userLocale}
Primary nutritional database: ${nutritionalSource.sourceName}

## GLOBAL FOOD PRODUCT RECOGNITION

You MUST be able to identify and analyze products from ALL regions including:
- **Americas**: US (FDA labels), Brazil (ANVISA), Mexico, Argentina, Canada
- **Europe**: EU allergen regulations, UK, Germany, France, Italy, Spain, Portugal
- **Asia**: Japan, South Korea, China, Thailand, India, Singapore
- **Middle East**: Halal certifications, Arabic labels
- **Oceania**: Australia, New Zealand (FSANZ)

## MULTI-LANGUAGE INGREDIENT DETECTION

Recognize allergens in multiple languages:

**LACTOSE/DAIRY:**
- EN: milk, dairy, lactose, whey, casein, cream, butter, cheese
- PT: leite, lactose, soro de leite, caseína, creme, manteiga, queijo
- ES: leche, lácteo, lactosa, suero de leche, caseína, crema, mantequilla
- DE: Milch, Laktose, Molke, Kasein, Sahne, Butter, Käse
- FR: lait, lactose, lactosérum, caséine, crème, beurre, fromage
- IT: latte, lattosio, siero di latte, caseina, panna, burro, formaggio
- JA: 乳, 乳糖, ホエイ, カゼイン, クリーム, バター, チーズ

**GLUTEN:**
- EN: wheat, gluten, barley, rye, oats, malt
- PT: trigo, glúten, cevada, centeio, aveia, malte
- ES: trigo, gluten, cebada, centeno, avena, malta
- DE: Weizen, Gluten, Gerste, Roggen, Hafer, Malz
- FR: blé, gluten, orge, seigle, avoine, malt
- IT: grano, glutine, orzo, segale, avena, malto
- JA: 小麦, グルテン, 大麦, ライ麦, オーツ麦, 麦芽

**PEANUTS:**
- EN: peanut, groundnut, arachis
- PT: amendoim
- ES: cacahuete, maní
- DE: Erdnuss
- FR: arachide, cacahuète
- IT: arachide
- JA: 落花生, ピーナッツ

**TREE NUTS:**
- EN: almonds, cashews, walnuts, hazelnuts, pistachios, macadamia, pecans
- PT: amêndoas, castanhas, nozes, avelãs, pistache, macadâmia
- ES: almendras, anacardos, nueces, avellanas, pistachos
- DE: Mandeln, Cashews, Walnüsse, Haselnüsse, Pistazien
- FR: amandes, noix de cajou, noix, noisettes, pistaches
- IT: mandorle, anacardi, noci, nocciole, pistacchi
- JA: アーモンド, カシューナッツ, くるみ, ヘーゼルナッツ, ピスタチオ

**EGGS:**
- EN: egg, albumin, ovalbumin, lysozyme
- PT: ovo, albumina, ovalbumina, lisozima
- ES: huevo, albúmina, ovoalbúmina
- DE: Ei, Eiweiß, Albumin
- FR: œuf, albumine, ovalbumine
- IT: uovo, albume, ovalbumina
- JA: 卵, アルブミン, オボアルブミン

**SEAFOOD:**
- EN: fish, shrimp, crab, lobster, shellfish, crustacean, mollusc
- PT: peixe, camarão, caranguejo, lagosta, marisco, crustáceo, molusco
- ES: pescado, camarón, cangrejo, langosta, marisco, crustáceo
- DE: Fisch, Garnele, Krabbe, Hummer, Schalentier, Krebs, Weichtier
- FR: poisson, crevette, crabe, homard, fruit de mer, crustacé
- IT: pesce, gambero, granchio, aragosta, frutti di mare, crostacei
- JA: 魚, えび, かに, ロブスター, 貝類, 甲殻類

**SOY:**
- EN: soy, soya, soybean, lecithin E322
- PT: soja, lecitina de soja
- ES: soja, soya, lecitina de soja
- DE: Soja, Sojalecithin
- FR: soja, lécithine de soja
- IT: soia, lecitina di soia
- JA: 大豆, レシチン

---

## FUNDAMENTAL RULE (NEVER VIOLATE):
🚨 **NEVER say a product is "seguro" (safe) if you COULD NOT READ the ingredient list in the photo.**
🚨 **If you didn't see the ingredient list, ALWAYS request a second photo OR classify as "risco_potencial".**

---

## STEP ZERO - IMAGE CLASSIFICATION (EXECUTE FIRST!):

POSSIBLE CATEGORIES:
- "produto_alimenticio": Food product WITH VISIBLE PACKAGING/LABEL (from any country) - cans, bottles, boxes, bags with brand/text visible
- "alimento_preparado": PREPARED FOOD WITHOUT PACKAGING - plates, bowls, cooked meals, restaurant food, home-cooked dishes, fruits on a plate
- "alimento_natural": Fresh produce without packaging - loose fruits/vegetables at market
- "planta_decorativa": Ornamental plant, vase, garden
- "objeto_nao_alimenticio": Electronics, furniture, clothing, etc.
- "animal_vivo": Pet, wildlife
- "pessoa_ambiente": Selfie, landscape, environment
- "documento_outro": Document that is not a food label
- "imagem_ilegivel": Blurry, dark, or cropped photo

⚠️ CRITICAL: If image shows FOOD ON A PLATE, PREPARED DISH, or FOOD WITHOUT PACKAGING (category = "alimento_preparado" or "alimento_natural"), return:
{
  "erro": "comida_nao_rotulo",
  "is_food_not_label": true,
  "categoria_detectada": "alimento_preparado",
  "alimento_identificado": "Name of the food detected",
  "mensagem": "Este módulo é para análise de rótulos de produtos embalados. Para analisar pratos e refeições, use o módulo 'Analisar Prato'.",
  "food_redirect_message": "Detectamos que você fotografou um prato de comida. Para análise nutricional de refeições, use o módulo 'Analisar Prato' que é mais preciso para este tipo de análise."
}

⚠️ IF other invalid category (not food product or prepared food), return:
{
  "erro": "categoria_invalida",
  "categoria_detectada": "[category]",
  "descricao_objeto": "Description of what was detected",
  "mensagem": "Friendly message"
}

---

## IF IT'S A FOOD PRODUCT, CONTINUE:

### USER PROFILE (CRITICAL - PROTECT THIS USER!):
- Intolerances: ${intoleranceLabelsToUse.length > 0 ? intoleranceLabelsToUse.join(", ").toUpperCase() : "None registered"}
- Dietary preference: ${dietaryPreference.toUpperCase()}
${excludedContext}
${dietaryRestrictions}

---

## STEP 1 - IDENTIFY PRODUCT AND COUNTRY OF ORIGIN

- Identify the product name, brand, and likely country of origin
- Use packaging design, language, and regulatory markings to determine origin
- Different countries have different labeling requirements

### GLOBAL CERTIFICATION SEALS TO LOOK FOR:
- **Lactose-free**: "Lactose Free", "0% Lactose", "Sem Lactose", "Sin Lactosa", "Laktosefrei", "Sans Lactose"
- **Gluten-free**: "Gluten Free", "Sem Glúten", "Sin Gluten", "Glutenfrei", "Sans Gluten", "グルテンフリー"
- **Vegan**: "Vegan", "Vegano", "Plant-Based", "100% Vegetal"
- **Kosher**: OU, OK, Star-K symbols
- **Halal**: Halal certification marks
- **Organic**: USDA Organic, EU Organic, JAS Organic

---

## STEP 2 - LOOK FOR INGREDIENT LIST

⚠️ **CAN YOU SEE THE INGREDIENT LIST IN THE PHOTO?**

If YES → Analyze each ingredient in the original language and cross-reference with user's restrictions
If NO → You MUST request second photo OR assume it contains typical ingredients for that category

---

## STEP 3 - CROSS-CONTAMINATION WARNINGS

ALWAYS look for and report cross-contamination warnings in ANY language:
- "May contain traces of..." / "Pode conter traços de..."
- "Produced in facility that processes..." / "Produzido em ambiente que processa..."
- "Manufactured on shared equipment with..." / "Fabricado em equipamento compartilhado com..."

If warning mentions ANY of user's intolerances → verdict: "risco_potencial"

---

## STEP 4 - DETERMINE VERDICT (BE PESSIMISTIC!)

### CAN SAY "seguro" (safe) ONLY IF:
✓ You READ the ingredient list AND found no problematic ingredients in ANY language
✓ OR found certification seal visible for ALL user's restrictions
✓ OR the product is naturally free (e.g., water, fresh fruits)

### MUST SAY "risco_potencial" OR REQUEST PHOTO IF:
✗ Photo is only of the front (no ingredient list visible)
✗ Product is industrialized and may contain problematic ingredients
✗ Text is in a language you cannot fully read
✗ No seal confirming the product is safe for user's restriction

### MUST SAY "contem" (contains) IF:
✗ You READ the ingredient list AND found problematic ingredient
✗ OR the product naturally contains the ingredient

---

## RESPONSE FORMAT (JSON required):

### If you READ the ingredient list:
{
  "categoria_imagem": "produto_alimenticio",
  "produto_identificado": "Product Name",
  "marca": "Brand",
  "pais_origem_provavel": "Country code (BR, US, JP, etc.)",
  "idioma_rotulo": "Label language",
  "confianca": "alta",
  "requer_foto_ingredientes": false,
  "ingredientes_visiveis": true,
  "encontrou_lista_ingredientes": true,
  "fonte_informacao": "imagem",
  "veredicto": "seguro|risco_potencial|contem",
  "ingredientes_analisados": [
    {
      "nome": "ingredient (original language)",
      "nome_traduzido": "ingredient translated",
      "status": "seguro|risco_potencial|contem",
      "motivo": "Explanation",
      "restricao_afetada": "sugar|lactose|gluten|etc",
      "fonte": "imagem",
      "nome_tecnico": "Technical name if applicable",
      "sinonimos_detectados": ["Synonyms found"]
    }
  ],
  "avisos_contaminacao_cruzada": [
    {
      "texto_original": "Exact text from label",
      "alergenos_mencionados": ["allergens"],
      "afeta_usuario": true|false,
      "restricao_afetada": "restriction affected"
    }
  ],
  "alertas": [],
  "analise_seguranca": "Analysis explanation",
  "recomendacao": "Final recommendation",
  "resumo_verificacao": {
    "ingredientes_verificados": 0,
    "ingredientes_problematicos": 0,
    "contaminacao_cruzada_detectada": true|false,
    "status_final": "SEGURO|RISCO POTENCIAL|CONTÉM [restriction(s)]"
  }
}

### If you DID NOT READ the ingredient list (REQUEST PHOTO):
{
  "categoria_imagem": "produto_alimenticio",
  "produto_identificado": "Product Name",
  "marca": "Brand",
  "pais_origem_provavel": "Country code",
  "idioma_rotulo": "Label language",
  "confianca": "baixa",
  "requer_foto_ingredientes": true,
  "ingredientes_visiveis": false,
  "encontrou_lista_ingredientes": false,
  "fonte_informacao": "conhecimento",
  "veredicto": "risco_potencial",
  "motivo_duvida": "Could not see ingredient list. [Product] typically contains [ingredient].",
  "intolerancia_em_duvida": "[restriction that might be affected]",
  "ingredientes_analisados": [],
  "avisos_contaminacao_cruzada": [],
  "alertas": ["Could not confirm ingredients"],
  "analise_seguranca": "Cannot guarantee safety without seeing ingredient list",
  "recomendacao": "Take a photo of the ingredient list",
  "mensagem_segunda_foto": "For your safety, please take a photo of the ingredient list.",
  "resumo_verificacao": {
    "ingredientes_verificados": 0,
    "ingredientes_problematicos": 0,
    "contaminacao_cruzada_detectada": false,
    "status_final": "RISCO POTENCIAL - Ingredientes não verificados"
  }
}

---

## ⚠️ CRITICAL RULES:

1. **GOLDEN RULE:** If you DID NOT SEE the ingredient list → NEVER say "seguro".
2. **MULTI-LANGUAGE:** Recognize allergens in ANY language.
3. **WHEN IN DOUBT, PROTECT THE USER.**
4. **VEGAN products** are safe for lactose and egg automatically.

Ingredients this user should avoid:
${ingredientsToWatch.map(i => `• ${i}`).join("\n")}`;

    logStep("Calling Google Gemini API with image");

    // Função para fazer a chamada Gemini com response_mime_type para forçar JSON
    const callGemini = async () => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent?key=${GOOGLE_AI_API_KEY}`, {
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
            maxOutputTokens: 8192,
            responseMimeType: "application/json", // Força resposta JSON estruturada
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

    // Função principal com retry para erros 503 E erros de parse JSON (reduzido para 2 tentativas)
    const callGeminiWithRetry = async (maxRetries = 2, delayMs = 2000) => {
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
            
            // Última tentativa falhou - mensagem mais amigável
            logStep("Parse error - all retries exhausted", { error: String(parseError), content: content.slice(0, 500) });
            throw new Error("A análise demorou muito. Por favor, tente novamente com uma foto mais clara ou em melhor iluminação.");
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
      
      // NEW: Handle food detected in label scanner - redirect to food photo module
      if (analysis.erro === "comida_nao_rotulo" || analysis.is_food_not_label) {
        logStep("Food detected in label scanner - suggesting food module redirect", {
          erro: analysis.erro,
          alimento: analysis.alimento_identificado,
          categoria: analysis.categoria_detectada
        });
        
        return new Response(JSON.stringify({
          success: false,
          foodNotLabelError: true,
          descricao_objeto: analysis.alimento_identificado || analysis.descricao_objeto || "alimento",
          message: analysis.food_redirect_message || analysis.mensagem || "Detectamos um alimento, não um rótulo. Use o módulo 'Analisar Prato' para verificar calorias e segurança do seu prato."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Handle category validation errors
      if (analysis.erro === "categoria_invalida") {
        const detectedCategory = analysis.categoria_detectada || "desconhecido";
        
        // Special case: food detected in label scanner - redirect to food photo module
        if (detectedCategory === "alimento_natural" || detectedCategory === "alimento_preparado") {
          logStep("Food detected in label scanner - suggesting food module redirect", {
            categoria: detectedCategory,
            descricao: analysis.descricao_objeto
          });
          
          return new Response(JSON.stringify({
            success: false,
            foodNotLabelError: true,
            descricao_objeto: analysis.descricao_objeto || "alimento",
            message: analysis.mensagem || "Detectamos um alimento, não um rótulo. Use o módulo 'Analisar Prato' para verificar calorias e segurança do seu prato."
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        // Generic category error for other non-food-product categories
        return new Response(JSON.stringify({
          success: false,
          categoryError: true,
          categoria_detectada: detectedCategory,
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
    
    // ========== FALLBACK OPENFOODFACTS - TENTAR ENRIQUECER COM DADOS DO PRODUTO ==========
    // Se a IA não conseguiu ver ingredientes, tentar buscar no OpenFoodFacts antes de pedir segunda foto
    if (needsIngredientPhoto && analysis.produto_identificado) {
      logStep("Trying OpenFoodFacts fallback before requesting second photo", {
        produto: analysis.produto_identificado,
        marca: analysis.marca
      });
      
      try {
        // Montar query de busca com produto e marca
        const searchQuery = analysis.marca 
          ? `${analysis.marca} ${analysis.produto_identificado}` 
          : analysis.produto_identificado;
        
        const offResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/lookup-openfoodfacts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({ 
              query: searchQuery,
              country: userCountry,
              saveToDatabase: true
            }),
          }
        );
        
        if (offResponse.ok) {
          const offResult = await offResponse.json();
          
          if (offResult.success && offResult.ingredients?.length > 0) {
            logStep("OpenFoodFacts found ingredients", {
              product: offResult.product_name,
              ingredientCount: offResult.ingredients.length,
              savedToDb: offResult.saved_to_database
            });
            
            // Enriquecer análise com ingredientes do OpenFoodFacts
            analysis.ingredientes_visiveis = true;
            analysis.encontrou_lista_ingredientes = true;
            analysis.fonte_informacao = "openfoodfacts";
            analysis.confianca = "media";
            analysis.requer_foto_ingredientes = false;
            
            // Adicionar ingredientes à análise
            analysis.ingredientes_analisados = offResult.ingredients.map((ing: string) => {
              // Verificar se o ingrediente é problemático para o usuário
              let status: "seguro" | "risco_potencial" | "contem" = "seguro";
              let restricaoAfetada = "";
              
              const ingLower = ing.toLowerCase();
              for (const intolerance of userIntolerances) {
                const intoleranceKey = safetyDatabase 
                  ? (safetyDatabase.keyNormalization.get(intolerance.toLowerCase()) || intolerance.toLowerCase())
                  : intolerance.toLowerCase();
                
                const forbiddenIngredients: string[] = safetyDatabase 
                  ? (safetyDatabase.intoleranceMappings.get(intoleranceKey) || [])
                  : [];
                
                if (forbiddenIngredients.some((forbidden: string) => ingLower.includes(forbidden) || forbidden.includes(ingLower))) {
                  status = "contem";
                  restricaoAfetada = safetyDatabase 
                    ? getIntoleranceLabel(intoleranceKey, safetyDatabase)
                    : (INTOLERANCE_LABELS[intoleranceKey] || intolerance);
                  break;
                }
              }
              
              return {
                nome: ing,
                status,
                fonte: "openfoodfacts",
                restricao_afetada: restricaoAfetada || undefined
              };
            });
            
            // Calcular veredicto baseado nos ingredientes
            const hasContem = analysis.ingredientes_analisados.some((i: any) => i.status === "contem");
            const hasRisco = analysis.ingredientes_analisados.some((i: any) => i.status === "risco_potencial");
            analysis.veredicto = hasContem ? "contem" : (hasRisco ? "risco_potencial" : "seguro");
            
            // Adicionar nota sobre fonte
            analysis.alertas = analysis.alertas || [];
            analysis.alertas.push(`Ingredientes obtidos do banco de dados OpenFoodFacts (${offResult.product_name})`);
            
            // NÃO pedir segunda foto - temos os ingredientes do OpenFoodFacts
            logStep("Skipping second photo request - got ingredients from OpenFoodFacts");
          }
        }
      } catch (offError) {
        logStep("OpenFoodFacts fallback failed", { error: String(offError) });
        // Continuar com o fluxo normal de pedir segunda foto
      }
    }
    
    // Re-check if we still need ingredient photo after OpenFoodFacts enrichment
    const stillNeedsIngredientPhoto = 
      (analysis.requer_foto_ingredientes === true || analysis.requer_foto === true) &&
      analysis.fonte_informacao !== "openfoodfacts";
    
    if (stillNeedsIngredientPhoto) {
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

    // ========== PÓS-PROCESSAMENTO: DECOMPOSIÇÃO VIA GLOBAL SAFETY ENGINE ==========
    // Usa a função centralizada validateFoodWithDecomposition para garantir consistência
    // com todos os outros módulos do app (food-photo, fridge-photo, meal-generation)
    
    const productName = (analysis.produto_identificado || "").toLowerCase().trim();
    const brandName = (analysis.marca || "").toLowerCase().trim();
    const combinedName = brandName ? `${brandName} ${productName}` : productName;
    
    // Verificar se precisamos decompor o produto identificado
    if (combinedName && safetyDatabase) {
      const needsDecomposition = isProcessedFood(combinedName) || isProcessedFood(productName);
      
      if (needsDecomposition) {
        logStep("Using Global Safety Engine for product decomposition", { 
          productName, 
          brandName,
          combinedName 
        });
        
        try {
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          
          // Build user restrictions for validation
          const decompRestrictions: UserRestrictions = {
            intolerances: userIntolerances,
            dietaryPreference: dietaryPreference,
            excludedIngredients: excludedIngredients
          };
          
          // Usar a função centralizada do globalSafetyEngine
          const decompositionResult = await validateFoodWithDecomposition(
            combinedName,
            decompRestrictions,
            safetyDatabase,
            supabaseUrl,
            supabaseKey,
            userCountry || 'BR'
          );
          
          if (decompositionResult.wasDecomposed && decompositionResult.decomposedIngredients) {
            logStep("Product decomposed by Global Safety Engine", {
              ingredients: decompositionResult.decomposedIngredients,
              isSafe: decompositionResult.isSafe,
              conflicts: decompositionResult.conflicts.length
            });
            
            // Adicionar ingredientes decompostos à análise
            // CORRIGIDO: Re-validar cada ingrediente individualmente para obter status correto
            // A lógica anterior procurava match exato nos conflitos, mas o conflito
            // pode vir de um ingrediente que CONTÉM o item (ex: 'cevada' contém 'cevada' do mapping)
            
            analysis.ingredientes_analisados = decompositionResult.decomposedIngredients.map((ing: string) => {
              // Validar este ingrediente específico contra as restrições do usuário
              const ingredientValidation = validateIngredient(ing, decompRestrictions, safetyDatabase);
              
              let status: "seguro" | "risco_potencial" | "contem" = "seguro";
              let restricaoAfetada = "";
              
              if (!ingredientValidation.isValid) {
                // Ingrediente bloqueado
                status = "contem";
                if (ingredientValidation.restriction) {
                  if (ingredientValidation.restriction.startsWith('intolerance_')) {
                    const key = ingredientValidation.restriction.replace('intolerance_', '');
                    restricaoAfetada = getIntoleranceLabel(key, safetyDatabase);
                  } else if (ingredientValidation.restriction.startsWith('dietary_')) {
                    const key = ingredientValidation.restriction.replace('dietary_', '');
                    restricaoAfetada = getDietaryLabel(key, safetyDatabase);
                  } else {
                    restricaoAfetada = 'Ingrediente Excluído';
                  }
                }
              } else if (ingredientValidation.isCaution) {
                // Ingrediente com warning
                status = "risco_potencial";
                if (ingredientValidation.restriction) {
                  const key = ingredientValidation.restriction.replace('intolerance_', '');
                  restricaoAfetada = getIntoleranceLabel(key, safetyDatabase);
                }
              }
              
              return {
                nome: ing,
                status,
                fonte: "global_safety_engine",
                restricao_afetada: restricaoAfetada || undefined
              };
            });
            
            // Atualizar veredicto baseado na validação centralizada
            if (!decompositionResult.isSafe) {
              analysis.veredicto = "contem";
            } else if (decompositionResult.warnings.length > 0) {
              analysis.veredicto = "risco_potencial";
            }
            
            analysis.fonte_informacao = "global_safety_engine";
            analysis.confianca = "alta";
          }
        } catch (decompError) {
          logStep("Error in Global Safety Engine decomposition", { error: String(decompError) });
        }
      }
    }

    // ========== PÓS-PROCESSAMENTO: ENRIQUECIMENTO DE MACROS COM TABELA FOODS ==========
    // Se o rótulo foi analisado, enriquecer ingredientes com macros reais da tabela foods
    
    if (analysis.ingredientes_analisados && analysis.ingredientes_analisados.length > 0) {
      logStep("Enriching label ingredients with real macros from foods table");
      
      // Prepare ingredients for macro lookup
      const ingredientsForLookup = analysis.ingredientes_analisados.map((ing: any) => ({
        name: ing.nome || ing.nome_traduzido || '',
        grams: 100, // Labels typically don't specify exact grams per ingredient, use 100g as reference
        estimated_calories: undefined,
        estimated_protein: undefined,
        estimated_carbs: undefined,
        estimated_fat: undefined
      })).filter((ing: any) => ing.name);
      
      if (ingredientsForLookup.length > 0) {
        try {
          const { items, matchRate, fromDb, fromAi } = await calculateRealMacrosForFoods(supabaseClient, ingredientsForLookup);
          
          // Enrich original analysis with macro data
          analysis.ingredientes_analisados = analysis.ingredientes_analisados.map((ing: any, index: number) => {
            const matchedItem = items.find(item => 
              item.name.toLowerCase().includes(ing.nome?.toLowerCase() || '') ||
              (ing.nome?.toLowerCase() || '').includes(item.name.toLowerCase())
            );
            
            if (matchedItem) {
              return {
                ...ing,
                macros_per_100g: {
                  calorias: Math.round(matchedItem.calories),
                  proteinas: Math.round(matchedItem.protein),
                  carboidratos: Math.round(matchedItem.carbs),
                  gorduras: Math.round(matchedItem.fat),
                  fibras: matchedItem.fiber ? Math.round(matchedItem.fiber) : undefined
                },
                macro_source: matchedItem.source,
                food_id: matchedItem.food_id
              };
            }
            return ing;
          });
          
          // Add macro enrichment stats to analysis
          analysis.macro_enrichment = {
            match_rate: Math.round(matchRate),
            from_database: fromDb,
            from_ai_estimate: fromAi,
            total_ingredients: ingredientsForLookup.length
          };
          
          logStep("Label ingredients enriched with real macros", { 
            matchRate: Math.round(matchRate), 
            fromDb, 
            fromAi 
          });
        } catch (macroError) {
          logStep("Error enriching label macros", { error: String(macroError) });
          // Continue without macro enrichment
        }
      }
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
    
    // ========== ARQUITETURA CORRETA: PERFIL DERIVA DO SAFETY ENGINE ==========
    // O Safety Engine já validou cada ingrediente e marcou:
    // - status: "seguro" | "risco_potencial" | "contem"
    // - restricao_afetada: a intolerância que causou o conflito
    // 
    // O Perfil NÃO faz nova consulta - apenas REFLETE o que o Safety Engine decidiu.
    // Se algum ingrediente tem status="contem" e restricao_afetada corresponde à 
    // intolerância do usuário, então é conflito.
    
    for (const userIntolerance of userIntolerances) {
      // Normalizar a key do usuário para comparação
      const normalizedUserKey = normalizeText(userIntolerance);
      
      // Obter todas as formas normalizadas desta intolerância
      const normalizedKeys: string[] = safetyDatabase 
        ? (safetyDatabase.keyNormalization.get(userIntolerance.toLowerCase()) || [userIntolerance.toLowerCase()])
        : [userIntolerance.toLowerCase()];
      
      // Obter o label amigável para esta intolerância
      const intoleranceKey = normalizedKeys[0];
      const restricaoLabel = safetyDatabase 
        ? getIntoleranceLabel(intoleranceKey, safetyDatabase)
        : (INTOLERANCE_LABELS[intoleranceKey] || userIntolerance);
      
      // Normalizar TODAS as variações para matching
      const allNormalizedForms = new Set<string>();
      allNormalizedForms.add(normalizeText(userIntolerance));
      allNormalizedForms.add(normalizeText(restricaoLabel));
      for (const key of normalizedKeys) {
        allNormalizedForms.add(normalizeText(key));
        const keyLabel = safetyDatabase ? getIntoleranceLabel(key, safetyDatabase) : key;
        allNormalizedForms.add(normalizeText(keyLabel));
      }
      
      let found = false;
      let foundStatus: "seguro" | "risco_potencial" | "contem" = "seguro";
      let foundIngredient = "";
      
      // ========== ÚNICA FONTE DE VERDADE: ingredientes_analisados do Safety Engine ==========
      if (analysis.ingredientes_analisados) {
        for (const ing of analysis.ingredientes_analisados) {
          // Se o Safety Engine marcou como "contem" ou "risco_potencial", RESPEITAR
          if (ing.status === "contem" || ing.status === "risco_potencial") {
            const ingRestricao = normalizeText(ing.restricao_afetada || "");
            
            // Verificar se a restrição afetada corresponde a esta intolerância do usuário
            // Matching bidirecional para cobrir todas as variações linguísticas
            const matchesThisIntolerance = Array.from(allNormalizedForms).some(form => 
              ingRestricao.includes(form) || form.includes(ingRestricao)
            );
            
            if (matchesThisIntolerance) {
              found = true;
              foundIngredient = ing.nome;
              
              // Priorizar o status mais grave
              if (ing.status === "contem") {
                foundStatus = "contem";
                logStep("Perfil DERIVANDO do Safety Engine", {
                  ingredient: ing.nome,
                  restricao_original: ing.restricao_afetada,
                  intolerance_usuario: userIntolerance,
                  status_safety_engine: ing.status,
                  matched_forms: Array.from(allNormalizedForms)
                });
                break; // "contem" é o pior caso, não precisa continuar
              } else if (ing.status === "risco_potencial" && foundStatus === "seguro") {
                foundStatus = "risco_potencial";
              }
            }
          }
        }
      }
      
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
    
    // Adicionar verificação de preferência alimentar usando Global Safety Engine
    if (dietaryPreference && dietaryPreference !== "comum" && safetyDatabase) {
      const dietLabel = getDietaryLabel(dietaryPreference, safetyDatabase);
      // Obter ingredientes proibidos do banco de dados
      const ingredientsToCheck: string[] = safetyDatabase.dietaryForbidden.get(dietaryPreference) || [];
      
      let found = false;
      let foundIngredient = "";
      
      // 1. Verificar no NOME DO PRODUTO (ex: "Fish Oil", "Óleo de Peixe")
      const productName = (analysis.produto_identificado || "").toLowerCase();
      const productBrand = (analysis.marca || "").toLowerCase();
      const productFull = `${productName} ${productBrand}`;
      
      for (const item of ingredientsToCheck) {
        if (productFull.includes(item)) {
          found = true;
          foundIngredient = analysis.produto_identificado;
          logStep("Product name contains forbidden ingredient", { 
            product: analysis.produto_identificado, 
            forbiddenIngredient: item,
            dietaryPreference 
          });
          break;
        }
      }
      
      // 2. Verificar nos ingredientes analisados
      if (!found && analysis.ingredientes_analisados) {
        for (const ing of analysis.ingredientes_analisados) {
          const ingName = ing.nome?.toLowerCase() || "";
          const matchedItem = ingredientsToCheck.find((item: string) => ingName.includes(item) || item.includes(ingName));
          if (matchedItem) {
            found = true;
            foundIngredient = ing.nome;
            break;
          }
        }
      }
      
      // 3. Verificar nos alertas da IA (fallback)
      if (!found && analysis.alertas) {
        for (const alerta of analysis.alertas) {
          const alertaLower = alerta.toLowerCase();
          const matchedItem = ingredientsToCheck.find((item: string) => alertaLower.includes(item));
          if (matchedItem) {
            found = true;
            foundIngredient = alerta;
            break;
          }
        }
      }
      
      // Se encontrou ingrediente proibido, remover alertas duplicados
      const existingAlertIndex = alertasPersonalizados.findIndex(a => 
        a.restricao.toLowerCase().includes("peixe") || 
        a.restricao.toLowerCase().includes("fish") ||
        a.restricao.toLowerCase().includes("frutos")
      );
      
      if (existingAlertIndex >= 0 && found) {
        alertasPersonalizados.splice(existingAlertIndex, 1);
      }
      
      alertasPersonalizados.push({
        ingrediente: foundIngredient,
        restricao: dietLabel,
        status: found ? "contem" : "seguro",
        mensagem: found 
          ? `⚠️ ATENÇÃO: "${foundIngredient}" contém ingredientes incompatíveis com ${dietLabel.toLowerCase()}`
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

