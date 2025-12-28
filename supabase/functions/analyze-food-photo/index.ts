import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { 
  getIntoleranceMappings, 
  generateIngredientsPromptContext,
  getMappingsStats,
  INTOLERANCE_LABELS 
} from "../_shared/getIntoleranceMappings.ts";
import { 
  recalculateWithTable,
  extractGramsFromPortion,
  CALORIE_TABLE
} from "../_shared/calorieTable.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getPortionFormat
} from "../_shared/nutritionPrompt.ts";

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

// ========== FUZZY MATCHING UTILITIES ==========

// Normalize text for comparison (remove accents, lowercase, trim)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s]/g, "") // Keep only alphanumeric and spaces
    .replace(/\s+/g, " "); // Normalize spaces
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  // Create matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

// Calculate similarity score (0-1, where 1 is identical)
function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);
  
  // Exact match after normalization
  if (normalized1 === normalized2) return 1;
  
  // Check if one contains the other (substring match)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const minLen = Math.min(normalized1.length, normalized2.length);
    const maxLen = Math.max(normalized1.length, normalized2.length);
    return 0.8 + (minLen / maxLen) * 0.2; // Score between 0.8 and 1.0
  }
  
  // Word-based matching (check if key words match)
  const words1 = normalized1.split(" ").filter(w => w.length > 2);
  const words2 = normalized2.split(" ").filter(w => w.length > 2);
  
  if (words1.length > 0 && words2.length > 0) {
    let matchingWords = 0;
    for (const w1 of words1) {
      for (const w2 of words2) {
        if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
          matchingWords++;
          break;
        }
      }
    }
    const wordMatchRatio = matchingWords / Math.max(words1.length, words2.length);
    if (wordMatchRatio >= 0.5) {
      return 0.7 + wordMatchRatio * 0.2; // Score between 0.7 and 0.9
    }
  }
  
  // Levenshtein-based similarity
  const maxLen = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(normalized1, normalized2);
  return 1 - distance / maxLen;
}

// Find best matching correction with fuzzy matching
function findBestCorrection(
  foodItem: string,
  correctionMap: Map<string, {
    correctedItem: string;
    calorias: number | null;
    proteinas: number | null;
    carboidratos: number | null;
    gorduras: number | null;
    porcao: string | null;
    culinaria: string | null;
  }>,
  threshold: number = 0.75 // Minimum similarity score to consider a match
): { correction: typeof correctionMap extends Map<string, infer V> ? V : never; matchType: "exact" | "fuzzy"; similarity: number; matchedKey: string } | null {
  const normalizedFood = normalizeText(foodItem);
  
  // First, try exact match
  for (const [key, correction] of correctionMap.entries()) {
    const normalizedKey = normalizeText(key);
    if (normalizedFood === normalizedKey) {
      return { correction, matchType: "exact", similarity: 1.0, matchedKey: key };
    }
  }
  
  // Then, try fuzzy matching
  let bestMatch: { key: string; correction: typeof correctionMap extends Map<string, infer V> ? V : never; similarity: number } | null = null;
  
  for (const [key, correction] of correctionMap.entries()) {
    const similarity = calculateSimilarity(foodItem, key);
    
    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { key, correction, similarity };
      }
    }
  }
  
  if (bestMatch) {
    return { 
      correction: bestMatch.correction, 
      matchType: "fuzzy", 
      similarity: bestMatch.similarity,
      matchedKey: bestMatch.key 
    };
  }
  
  return null;
}

// ========== END FUZZY MATCHING UTILITIES ==========

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

// Calcular meta calórica baseada no objetivo do usuário
function calculateDailyGoal(tdee: number, goal: string): number {
  // Baseado no objetivo de peso do perfil
  if (goal === 'emagrecer') {
    return Math.round(tdee * 0.8); // Déficit de 20%
  } else if (goal === 'ganhar_peso') {
    return Math.round(tdee * 1.15); // Superávit de 15%
  }
  return Math.round(tdee); // manter peso
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
      .select("intolerances, excluded_ingredients, dietary_preference, weight_current, height, age, sex, activity_level, goal")
      .eq("id", user.id)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
    }

    const userIntolerances = profile?.intolerances || [];
    const excludedIngredients = profile?.excluded_ingredients || [];
    const dietaryPreference = profile?.dietary_preference || "comum";
    
    // Calcular meta calórica diária
    let dailyCalorieGoal: number | null = null;
    if (profile?.weight_current && profile?.height && profile?.age && profile?.sex) {
      // Normalizar sexo para o formato esperado pela função
      const normalizedSex = profile.sex === 'male' ? 'masculino' : 
                            profile.sex === 'female' ? 'feminino' : 
                            profile.sex;
      const tmb = calculateTMB(
        profile.weight_current,
        profile.height,
        profile.age,
        normalizedSex
      );
      const tdee = calculateTDEE(tmb, profile.activity_level || 'moderate');
      dailyCalorieGoal = calculateDailyGoal(tdee, profile.goal || 'manter');
      logStep("Daily calorie goal calculated", { tmb, tdee, dailyCalorieGoal });
    }
    
    logStep("User profile loaded", { 
      intolerances: userIntolerances, 
      excludedIngredients,
      dietaryPreference,
      dailyCalorieGoal 
    });

    // ========== DISABLED: AUTO-CORRECTION APPLICATION ==========
    // Previously, we fetched saved corrections and applied them to new photos.
    // This has been disabled because:
    // 1. Each new photo should be analyzed fresh by the AI
    // 2. A "pêssego" today may be a different size than yesterday's
    // 3. Corrections were meant for the current session, not as permanent overrides
    // 4. Users found it confusing when new photos showed as "corrected"
    //
    // The food_corrections table is still populated for potential future use
    // (e.g., training data, admin analytics) but corrections are NOT auto-applied.
    
    const correctionMap = new Map<string, {
      correctedItem: string;
      calorias: number | null;
      proteinas: number | null;
      carboidratos: number | null;
      gorduras: number | null;
      porcao: string | null;
      culinaria: string | null;
    }>();
    
    logStep("Auto-correction disabled - each analysis starts fresh");

    const { imageBase64 } = await req.json();
    if (!imageBase64) throw new Error("No image provided");
    logStep("Image received", { imageSize: imageBase64.length });

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // ========== FETCH DYNAMIC INTOLERANCE MAPPINGS FROM DATABASE ==========
    let intoleranceData;
    let dynamicIngredientsContext = "";
    try {
      intoleranceData = await getIntoleranceMappings();
      logStep("Loaded dynamic intolerance mappings", { stats: getMappingsStats(intoleranceData) });
      
      // Generate context from database mappings (much more comprehensive than hardcoded)
      dynamicIngredientsContext = generateIngredientsPromptContext(userIntolerances, intoleranceData);
    } catch (mappingsError) {
      logStep("Failed to load dynamic mappings, using fallback", { error: mappingsError });
    }

    // Build intolerance context for the prompt - now using database mappings
    let intoleranceContext = "";
    const hasRestrictions = userIntolerances.length > 0 || excludedIngredients.length > 0 || dietaryPreference !== "comum";
    
    if (hasRestrictions) {
      // Use dynamic mappings from database if available, otherwise fallback to hardcoded
      let synonymsList: string[] = [];
      
      if (intoleranceData) {
        // Use database mappings
        for (const intolerance of userIntolerances) {
          const ingredients = intoleranceData.mappings.get(intolerance.toLowerCase()) || [];
          synonymsList = [...synonymsList, ...ingredients];
        }
      } else {
        // Fallback to hardcoded mappings
        for (const intolerance of userIntolerances) {
          const key = INTOLERANCE_MAP[intolerance.toLowerCase()] || intolerance.toLowerCase();
          const synonyms = SINONIMOS_INTOLERANCIA[key] || [];
          synonymsList = [...synonymsList, ...synonyms];
        }
      }
      
      // Adicionar ingredientes excluídos manualmente à lista de verificação
      const allExcluded = [...new Set([...synonymsList, ...excludedIngredients.map((i: string) => i.toLowerCase())])];
      
      intoleranceContext = `
IMPORTANTE - RESTRIÇÕES ALIMENTARES DO USUÁRIO:
${userIntolerances.length > 0 ? `- Intolerâncias/Alergias: ${userIntolerances.map((i: string) => INTOLERANCE_LABELS[i] || i).join(", ")}` : ""}
${excludedIngredients.length > 0 ? `- Ingredientes Excluídos Manualmente: ${excludedIngredients.join(", ")}` : ""}
${dietaryPreference === "vegetariana" ? "- Dieta: VEGETARIANA (não consome carne, peixe, frutos do mar)" : ""}
${dietaryPreference === "vegana" ? "- Dieta: VEGANA (não consome nenhum produto de origem animal)" : ""}

${dynamicIngredientsContext || `INGREDIENTES/PRATOS A VERIFICAR (podem conter alérgenos ou ingredientes excluídos):
${allExcluded.slice(0, 80).join(', ')}`}

Você DEVE analisar cada alimento identificado e verificar se contém ou pode conter ingredientes problemáticos para essas restrições.
Considere também ingredientes "escondidos" em molhos, temperos e preparações.

VERIFICAÇÃO NEGATIVA (FAIL-SAFE):
- Se você NÃO consegue confirmar que um prato é seguro, assuma que PODE conter o alérgeno
- Molhos, gratinados, empanados e pratos cremosos são suspeitos por padrão
- Se detectar algum alimento problemático, adicione ao array "alertas_intolerancia"
`;
    }


    const systemPrompt = `You are an expert nutritionist AI specialized in GLOBAL CUISINE visual analysis and FOOD SAFETY for people with intolerances and allergies.

=== STEP ZERO - IMAGE CLASSIFICATION (EXECUTE FIRST!) ===

BEFORE analyzing any food, you MUST classify what type of image this is.

POSSIBLE CATEGORIES:
- "prato_refeicao": Plate of food, prepared meal, dish, snack on a plate
- "alimento_individual": Single food item (fruit, vegetable, drink, packaged food being eaten)
- "pessoa_corpo": Person, body part (hand, face, leg, arm, torso, foot, finger, selfie)
- "animal_pet": Pet, animal, wildlife (dog, cat, bird, fish, etc.)
- "objeto_domestico": Furniture, electronics, household item, appliance
- "paisagem_ambiente": Landscape, room, outdoor environment, scenery
- "documento_tela": Screen, phone, document, text, label (use label analyzer instead)
- "veiculo": Car, motorcycle, bicycle, bus, any vehicle
- "roupa_acessorio": Clothing, shoes, bags, jewelry, accessories
- "imagem_abstrata": Blurry, unclear, artistic, too dark, too bright to identify

⚠️ IF NOT "prato_refeicao" OR "alimento_individual", return IMMEDIATELY:

{
  "erro": "imagem_nao_alimenticia",
  "categoria_detectada": "[exact category from list above]",
  "objeto_identificado": "[Describe EXACTLY what you see: e.g., 'perna humana com pé', 'cachorro dormindo', 'controle remoto de TV', 'paisagem de montanha']",
  "confianca": "alta|media|baixa",
  "mensagem": "Não consegui identificar comida nesta imagem. Parece ser [description in Portuguese]. Por favor, tire uma foto do seu prato ou alimento.",
  "dica": "Para melhores resultados, fotografe seu prato de cima, com boa iluminação, mostrando todos os alimentos."
}

CRITICAL RULES:
- NEVER try to analyze calories or nutrition for non-food images
- NEVER mark a non-food image as "seguro" for intolerances
- NEVER return the normal food analysis JSON if the image is not food
- BE STRICT: If you see a person, body part, pet, object, or anything that is NOT food, return the error format above
- When in doubt, return the error format rather than guessing food

=== IF AND ONLY IF THE IMAGE IS FOOD, CONTINUE BELOW ===

=== CRITICAL: MULTI-CULTURAL FOOD RECOGNITION ===

You MUST be able to identify dishes from ALL world cuisines including but not limited to:
- **Latin American**: Brazilian (feijoada, farofa, pernil, churrasco, moqueca, acarajé), Mexican (tacos, enchiladas, mole), Peruvian (ceviche, lomo saltado), Argentine (asado, empanadas)
- **European**: Italian (pasta, risotto, ossobuco), French (coq au vin, cassoulet), Spanish (paella, tapas), German (schnitzel, bratwurst), Portuguese (bacalhau)
- **Asian**: Japanese (sushi, ramen, tempura), Chinese (dim sum, stir-fry, hot pot), Thai (pad thai, curry), Indian (biryani, tikka masala), Vietnamese (pho, banh mi), Korean (bibimbap, kimchi)
- **Middle Eastern**: Lebanese (shawarma, falafel, hummus), Turkish (kebab, lahmacun), Persian (tahdig, ghormeh sabzi)
- **African**: Ethiopian (injera, doro wat), Moroccan (tagine, couscous), Nigerian (jollof rice, egusi)
- **North American**: BBQ, burgers, soul food, Cajun/Creole
- **Caribbean**: Jamaican jerk, Cuban sandwiches, rice and beans

=== IDENTIFICATION METHODOLOGY ===

1. **VISUAL ANALYSIS** - Examine:
   - Color, texture, shape of each food item
   - Cooking method indicators (grilled marks, fried coating, steamed appearance)
   - Presentation style and plating (cultural indicators)
   - Side dishes and accompaniments (helps identify cuisine)

2. **CONTEXTUAL REASONING** - Consider:
   - What combinations make sense together
   - Regional cooking traditions
   - Common pairings in different cuisines

3. **CONFIDENCE ASSESSMENT** - For EACH food item, assign:
   - "alta" (high): Clear, unmistakable identification
   - "media" (medium): Likely correct but some uncertainty
   - "baixa" (low): Best guess, multiple possibilities exist

4. **ALTERNATIVE SUGGESTIONS** - When confidence is NOT "alta", provide 2-3 alternative identifications

${intoleranceContext}

=== HIDDEN INGREDIENTS DETECTION (CRITICAL) ===

Always consider non-visible ingredients that are COMMON in preparations:
- **SAUCES**: White sauce (lactose), soy sauce (gluten/soy), mayonnaise (egg), pesto (tree nuts)
- **BREADED/FRIED**: Wheat flour (gluten), egg (binder), milk (buttermilk)
- **GRATINATED**: Cheese (lactose), cream (lactose), flour (gluten)
- **SEASONINGS**: Worcestershire sauce (gluten), industrial bouillon (gluten/lactose/soy)
- **FRIED FOODS**: Reused oil may have cross-contamination

When identifying a dish that TYPICALLY contains problematic ingredients but you cannot visually confirm, ALWAYS alert the user.

=== UNCERTAINTY COMMUNICATION ===

When NOT sure about an ingredient or preparation:
- Be EXPLICIT about uncertainty: "Cannot confirm if sauce contains lactose"
- Suggest VERIFICATION: "Recommend confirming with the restaurant/who prepared it"
- Classify as MEDIUM or LOW risk (never ignore)

=== OUTPUT FORMAT (Mandatory JSON) ===

{
  "alimentos": [
    {
      "item": "food name",
      "item_original_language": "name in original cuisine language if applicable",
      "porcao_estimada": "quantity in g or ml",
      "calorias": 0,
      "macros": {
        "proteinas": 0,
        "carboidratos": 0,
        "gorduras": 0
      },
      "confianca_identificacao": "alta|media|baixa",
      "alternativas_possiveis": ["alternative 1", "alternative 2"],
      "culinaria_origem": "cuisine of origin (e.g., Brazilian, Italian, Thai)",
      "ingredientes_visiveis": ["list of visible ingredients"],
      "ingredientes_provaveis_ocultos": ["typical ingredients that may be present but not visible"],
      "metodo_preparo_provavel": "probable cooking method"
    }
  ],
  "total_geral": {
    "calorias_totais": 0,
    "proteinas_totais": 0,
    "carboidratos_totais": 0,
    "gorduras_totais": 0
  },
  "prato_identificado": {
    "nome": "main dish name if identifiable",
    "culinaria": "cuisine type",
    "descricao_curta": "brief description",
    "confianca": "alta|media|baixa"
  },
  "observacoes": "Notes about possible hidden ingredients, verification questions, and any analysis uncertainties.",
  "perguntas_seguranca": ["List of questions user should ask to the restaurant/who prepared to confirm safety"],
  "alertas_intolerancia": [
    {
      "alimento": "problematic food name",
      "intolerancia": "which intolerance it affects",
      "risco": "alto|medio|baixo",
      "motivo": "explanation of why it is problematic",
      "fonte": "visivel|conhecimento|suspeita",
      "acao_recomendada": "What user should do (avoid, verify, etc.)"
    }
  ],
  "resumo_seguranca": {
    "status": "seguro|verificar|evitar",
    "mensagem": "Clear and direct summary about dish safety for user"
  }
}

RULES:
- "alertas_intolerancia" array should be empty [] if no problems detected
- "risco" field should be:
  - "alto": definitely contains problematic ingredient (source: visivel)
  - "medio": probably contains or is prepared with (source: conhecimento)
  - "baixo": may contain traces or cross-contamination (source: suspeita)
- "fonte" field indicates how you reached the conclusion:
  - "visivel": you SEE the ingredient in the photo
  - "conhecimento": you KNOW dishes of this type typically contain it
  - "suspeita": you SUSPECT based on context
- When "confianca_identificacao" is "baixa", ALWAYS add verification alert and alternatives
- Respond ONLY with valid JSON
- REMEMBER: If image is NOT food, you MUST return the "erro": "imagem_nao_alimenticia" format from STEP ZERO above. Never try to analyze non-food images.`;

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
          maxOutputTokens: 8192,
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

    // ========== RECÁLCULO DE CALORIAS COM TABELA COMPARTILHADA ==========
    // Garante consistência com o módulo de plano alimentar
    let caloriasRecalculadas = 0;
    const detalhesRecalculo: Array<{ item: string; original: number; recalculado: number; source: string; note: string }> = [];
    
    if (analysis.alimentos && Array.isArray(analysis.alimentos)) {
      for (let i = 0; i < analysis.alimentos.length; i++) {
        const food = analysis.alimentos[i];
        const originalCalories = food.calorias || 0;
        
        // Usa a função compartilhada para recalcular
        const result = recalculateWithTable(
          food.item || "",
          food.porcao_estimada || "",
          originalCalories
        );
        
        // Atualiza as calorias se foi recalculado com sucesso pela tabela
        if (result.source === 'table') {
          analysis.alimentos[i].calorias = result.calories;
          analysis.alimentos[i].calculo_fonte = 'tabela_referencia';
          analysis.alimentos[i].gramas_extraidas = result.grams;
          caloriasRecalculadas++;
          
          detalhesRecalculo.push({
            item: food.item,
            original: originalCalories,
            recalculado: result.calories,
            source: result.source,
            note: result.note
          });
        } else {
          // Mantém o valor da IA mas marca a fonte
          analysis.alimentos[i].calculo_fonte = result.source;
          if (result.grams) {
            analysis.alimentos[i].gramas_extraidas = result.grams;
          }
        }
      }
      
      // Recalcular totais se houve recálculos
      if (caloriasRecalculadas > 0) {
        let totalCalorias = 0;
        let totalProteinas = 0;
        let totalCarboidratos = 0;
        let totalGorduras = 0;
        
        for (const food of analysis.alimentos) {
          totalCalorias += food.calorias || 0;
          totalProteinas += food.macros?.proteinas || 0;
          totalCarboidratos += food.macros?.carboidratos || 0;
          totalGorduras += food.macros?.gorduras || 0;
        }
        
        analysis.total_geral = {
          calorias_totais: Math.round(totalCalorias),
          proteinas_totais: Math.round(totalProteinas * 10) / 10,
          carboidratos_totais: Math.round(totalCarboidratos * 10) / 10,
          gorduras_totais: Math.round(totalGorduras * 10) / 10
        };
        
        logStep("Calorias recalculadas com tabela compartilhada", { 
          itensRecalculados: caloriasRecalculadas,
          detalhes: detalhesRecalculo,
          novosTotais: analysis.total_geral 
        });
      }
    }

    // ========== APPLY SAVED CORRECTIONS AUTOMATICALLY WITH FUZZY MATCHING ==========
    let correctionsApplied = 0;
    const appliedCorrectionsList: string[] = [];
    const fuzzyMatchDetails: Array<{ original: string; matched: string; similarity: number; matchType: string }> = [];

    if (analysis.alimentos && correctionMap.size > 0) {
      for (let i = 0; i < analysis.alimentos.length; i++) {
        const food = analysis.alimentos[i];
        const foodItem = food.item || "";
        
        // Use fuzzy matching to find the best correction
        const matchResult = findBestCorrection(foodItem, correctionMap, 0.75);
        
        if (matchResult) {
          const { correction, matchType, similarity, matchedKey } = matchResult;
          
          logStep("Applying saved correction", { 
            original: food.item, 
            corrected: correction.correctedItem,
            matchType,
            similarity: Math.round(similarity * 100) + "%",
            matchedKey
          });
          
          fuzzyMatchDetails.push({
            original: food.item,
            matched: matchedKey,
            similarity: Math.round(similarity * 100),
            matchType
          });
          
          // Update the food item with corrected values
          analysis.alimentos[i] = {
            ...food,
            item: correction.correctedItem,
            item_original_ai: food.item, // Keep the original AI identification
            correcao_aplicada: true,
            correcao_tipo: matchType, // Indicate if it was exact or fuzzy match
            correcao_similaridade: Math.round(similarity * 100), // Similarity percentage
            porcao_estimada: correction.porcao || food.porcao_estimada,
            calorias: correction.calorias ?? food.calorias,
            macros: {
              proteinas: correction.proteinas ?? food.macros?.proteinas ?? 0,
              carboidratos: correction.carboidratos ?? food.macros?.carboidratos ?? 0,
              gorduras: correction.gorduras ?? food.macros?.gorduras ?? 0
            },
            culinaria_origem: correction.culinaria || food.culinaria_origem,
            confianca_identificacao: matchType === "exact" ? "alta" : "media" // Fuzzy matches get medium confidence
          };
          
          correctionsApplied++;
          const matchLabel = matchType === "fuzzy" ? ` (${Math.round(similarity * 100)}% similar)` : "";
          appliedCorrectionsList.push(`${food.item} → ${correction.correctedItem}${matchLabel}`);
        }
      }
      
      // Recalculate totals if corrections were applied
      if (correctionsApplied > 0) {
        let totalCalorias = 0;
        let totalProteinas = 0;
        let totalCarboidratos = 0;
        let totalGorduras = 0;
        
        for (const food of analysis.alimentos) {
          totalCalorias += food.calorias || 0;
          totalProteinas += food.macros?.proteinas || 0;
          totalCarboidratos += food.macros?.carboidratos || 0;
          totalGorduras += food.macros?.gorduras || 0;
        }
        
        analysis.total_geral = {
          calorias_totais: Math.round(totalCalorias),
          proteinas_totais: Math.round(totalProteinas * 10) / 10,
          carboidratos_totais: Math.round(totalCarboidratos * 10) / 10,
          gorduras_totais: Math.round(totalGorduras * 10) / 10
        };
        
        logStep("Totals recalculated after corrections", { 
          correctionsApplied,
          exactMatches: fuzzyMatchDetails.filter(d => d.matchType === "exact").length,
          fuzzyMatches: fuzzyMatchDetails.filter(d => d.matchType === "fuzzy").length,
          appliedCorrectionsList,
          fuzzyMatchDetails,
          newTotals: analysis.total_geral 
        });
      }
    }
    
    // Add correction metadata to the response
    if (correctionsApplied > 0) {
      analysis.correcoes_aplicadas = {
        total: correctionsApplied,
        exatas: fuzzyMatchDetails.filter(d => d.matchType === "exact").length,
        fuzzy: fuzzyMatchDetails.filter(d => d.matchType === "fuzzy").length,
        detalhes: appliedCorrectionsList,
        matches: fuzzyMatchDetails
      };
    }

    // Check for error response from AI (not food detected)
    if (analysis.erro) {
      logStep("Not food detected", { 
        erro: analysis.erro,
        categoria: analysis.categoria_detectada,
        objeto: analysis.objeto_identificado 
      });
      
      // New structured error format
      if (analysis.erro === "imagem_nao_alimenticia") {
        return new Response(JSON.stringify({
          success: false,
          notFood: true,
          categoryError: true,
          categoria_detectada: analysis.categoria_detectada || "desconhecido",
          objeto_identificado: analysis.objeto_identificado || "",
          message: analysis.mensagem || "Não consegui identificar comida nesta imagem.",
          dica: analysis.dica || "Tire uma foto do seu prato de cima com boa iluminação."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      // Legacy error format fallback
      return new Response(JSON.stringify({
        success: false,
        notFood: true,
        message: typeof analysis.erro === 'string' ? analysis.erro : "Não foi possível identificar alimentos na imagem."
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
    
    // Adicionar verificação de ingredientes excluídos manualmente
    for (const excludedIngredient of excludedIngredients) {
      let found = false;
      let foundFood = "";
      const excludedLower = excludedIngredient.toLowerCase();
      
      if (analysis.alimentos) {
        for (const food of analysis.alimentos) {
          const foodName = food.item?.toLowerCase() || "";
          const ingredientesVisiveis = (food.ingredientes_visiveis || []).map((i: string) => i.toLowerCase());
          const ingredientesOcultos = (food.ingredientes_provaveis_ocultos || []).map((i: string) => i.toLowerCase());
          
          // Verificar no nome do alimento e nos ingredientes identificados
          if (
            foodName.includes(excludedLower) ||
            ingredientesVisiveis.some((i: string) => i.includes(excludedLower)) ||
            ingredientesOcultos.some((i: string) => i.includes(excludedLower))
          ) {
            found = true;
            foundFood = food.item;
            break;
          }
        }
      }
      
      if (found) {
        alertasPersonalizados.push({
          ingrediente: foundFood,
          restricao: excludedIngredient,
          status: "contem",
          mensagem: `⚠️ ATENÇÃO: "${foundFood}" pode conter ${excludedIngredient.toUpperCase()}, que você excluiu da sua dieta`,
          icone: "🔴"
        });
      }
    }
    
    // Ordenar alertas: primeiro os problemas, depois os seguros
    alertasPersonalizados.sort((a, b) => {
      const order = { "contem": 0, "risco_potencial": 1, "seguro": 2 };
      return order[a.status] - order[b.status];
    });
    
    // Adicionar ao response
    const perfilUsuarioAplicado = {
      intolerances: userIntolerances,
      excluded_ingredients: excludedIngredients,
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
      profileApplied: true,
      correctionsApplied
    });

    return new Response(JSON.stringify({
      success: true,
      analysis,
      meta_diaria: metaDiaria,
      perfil_usuario_aplicado: perfilUsuarioAplicado,
      correcoes_aplicadas: correctionsApplied > 0 ? {
        quantidade: correctionsApplied,
        itens: appliedCorrectionsList,
        mensagem: `${correctionsApplied} correção(ões) aplicada(s) automaticamente baseado em feedbacks anteriores`
      } : null
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
