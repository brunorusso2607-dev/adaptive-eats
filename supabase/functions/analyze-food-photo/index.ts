import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { 
  extractGramsFromPortion
} from "../_shared/calorieTable.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getPortionFormat,
  getLocaleFromCountry
} from "../_shared/nutritionPrompt.ts";
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";
import { getNutritionalTablePrompt } from "../_shared/nutritionalTableInjection.ts";
// ============= GLOBAL SAFETY ENGINE (CENTRALIZED) =============
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredientList,
  generateRestrictionsPromptContext,
  getIntoleranceLabel,
  getDietaryLabel,
  isProcessedFood,
  decomposeFood,
  type UserRestrictions,
  type SafetyCheckResult,
  type ConflictDetail,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-FOOD-PHOTO] ${step}${detailsStr}`);
};

// ============= REMOVED: HARDCODED SINONIMOS_INTOLERANCIA =============
// Now loaded dynamically from globalSafetyEngine via loadSafetyDatabase()

// ============= REMOVED: HARDCODED INTOLERANCE_MAP =============
// Key normalization now handled by globalSafetyEngine.normalizeUserIntolerances()

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
// Database stores: "male" | "female"
function calculateTMB(weight: number, height: number, age: number, sex: string): number {
  if (sex === 'male') {
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

    // Parse body first to get potential userId fallback
    const body = await req.json();
    const { imageBase64, userId: bodyUserId } = body;
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

    // Fetch user's full profile for calorie calculation
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("intolerances, excluded_ingredients, dietary_preference, weight_current, height, age, sex, activity_level, goal, country")
      .eq("id", userId)
      .single();

    if (profileError) {
      logStep("Profile fetch error", { error: profileError.message });
    }

    const userIntolerances = profile?.intolerances || [];
    const excludedIngredients = profile?.excluded_ingredients || [];
    const dietaryPreference = profile?.dietary_preference || "omnivore";
    
    // Calcular meta calórica diária
    let dailyCalorieGoal: number | null = null;
    if (profile?.weight_current && profile?.height && profile?.age && profile?.sex) {
      // Database stores sex as "male" | "female" - use directly
      const tmb = calculateTMB(
        profile.weight_current,
        profile.height,
        profile.age,
        profile.sex
      );
      const tdee = calculateTDEE(tmb, profile.activity_level || 'moderate');
      dailyCalorieGoal = calculateDailyGoal(tdee, profile.goal || 'maintain');
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

    logStep("Image received", { imageSize: imageBase64.length });

    // Extract base64 data (remove data URL prefix if present)
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // ========== FETCH SAFETY DATABASE FROM GLOBAL ENGINE ==========
    const safetyDatabase = await loadSafetyDatabase();
    logStep("Safety database loaded", { 
      intoleranceTypes: safetyDatabase.intoleranceMappings.size,
      dietaryProfiles: safetyDatabase.dietaryForbidden.size,
      totalIngredients: Array.from(safetyDatabase.intoleranceMappings.values()).reduce((sum, arr) => sum + arr.length, 0)
    });

    // Normalize user restrictions for consistent validation
    const normalizedIntolerances = normalizeUserIntolerances(userIntolerances, safetyDatabase);
    const userRestrictionsForEngine: UserRestrictions = {
      intolerances: normalizedIntolerances,
      dietaryPreference: dietaryPreference || "omnivore",
      excludedIngredients: excludedIngredients || [],
    };

    // Generate comprehensive prompt context from centralized engine
    const dynamicIngredientsContext = generateRestrictionsPromptContext(userRestrictionsForEngine, safetyDatabase);

    // Build intolerance context for the prompt
    let intoleranceContext = "";
    // Database now stores dietary_preference as: "omnivore" | "vegetarian" | "vegan" | etc.
    const hasRestrictions = userIntolerances.length > 0 || excludedIngredients.length > 0 || dietaryPreference !== "omnivore";
    
    if (hasRestrictions) {
      intoleranceContext = `
IMPORTANTE - RESTRIÇÕES ALIMENTARES DO USUÁRIO:
${userIntolerances.length > 0 ? `- Intolerâncias/Alergias: ${normalizedIntolerances.map((i: string) => getIntoleranceLabel(i, safetyDatabase)).join(", ")}` : ""}
${excludedIngredients.length > 0 ? `- Ingredientes Excluídos Manualmente: ${excludedIngredients.join(", ")}` : ""}
${dietaryPreference === "vegetarian" ? `- Dieta: ${getDietaryLabel("vegetarian", safetyDatabase)}` : ""}
${dietaryPreference === "vegan" ? `- Dieta: ${getDietaryLabel("vegan", safetyDatabase)}` : ""}
${dietaryPreference === "pescatarian" ? `- Dieta: ${getDietaryLabel("pescatarian", safetyDatabase)}` : ""}

${dynamicIngredientsContext}

Você DEVE analisar cada alimento identificado e verificar se contém ou pode conter ingredientes problemáticos para essas restrições.
Considere também ingredientes "escondidos" em molhos, temperos e preparações.

VERIFICAÇÃO NEGATIVA (FAIL-SAFE):
- Se você NÃO consegue confirmar que um prato é seguro, assuma que PODE conter o alérgeno
- Molhos, gratinados, empanados e pratos cremosos são suspeitos por padrão
- Se detectar algum alimento problemático, adicione ao array "alertas_intolerancia"
`;
    }


    // Get user country and locale for nutritional source
    const userCountry = profile?.country || "BR";
    const userLocale = getLocaleFromCountry(userCountry);
    const globalNutritionPrompt = getGlobalNutritionPrompt(userCountry);
    const nutritionalSource = getNutritionalSource(userCountry);

    // Build user restrictions for prompt
    const userIntolerancesList = userIntolerances.length > 0 ? userIntolerances.join(', ') : 'None specified';
    const excludedIngredientsList = excludedIngredients.length > 0 ? excludedIngredients.join(', ') : 'None specified';
    const dietaryPref = dietaryPreference || 'None specified';

    const systemPrompt = `You are a GLOBAL food safety and nutrition expert specialized in protecting users with food intolerances and allergies.

=== LANGUAGE & FORMAT RULES ===

- REASON and ANALYZE internally in English for maximum accuracy
- OUTPUT all user-facing text in: ${userLocale}
- Use culturally appropriate food names for the user's region

**JSON FORMAT (CRITICAL - NO EXCEPTIONS):**
- All JSON KEYS: English only (name, calories, severity, etc.)
- All ENUM values: English only (high, medium, low, visible, etc.)
- All TEXT values shown to user: ${userLocale} (food names, messages, reasons)

NEVER translate JSON keys. NEVER mix languages in enum values.

=== GLOBAL NUTRITION CONTEXT ===
${globalNutritionPrompt}

User country: ${userCountry}
User locale: ${userLocale}
Primary nutritional database: ${nutritionalSource.sourceName}

=== STEP ZERO - IMAGE CLASSIFICATION ===

Before ANY analysis, classify the image:

1. **FOOD_DETECTED** → type: "food", proceed with full analysis
2. **PARTIAL_FOOD** → type: "partial_food", proceed with lower confidence
3. **NO_FOOD** → type: "not_food", return minimal response
4. **PACKAGED_PRODUCT** → type: "packaged_product", redirect to label scanner (VERY IMPORTANT!)
5. **LABEL_DETECTED** → type: "label", redirect to label analysis module

**CRITICAL - PACKAGED_PRODUCT DETECTION:**
If the image shows:
- A product package, box, jar, bottle, can, or container
- Commercial product packaging (even if it's food like Nutella, Ovomaltine, protein powder, etc.)
- Sealed/unopened products with branding visible
- Products on store shelves
- Industrial food packaging (not a prepared meal/dish)

Then return type: "packaged_product" IMMEDIATELY, do NOT proceed with nutritional analysis.
This is NOT food to analyze - it's a product that needs the label scanner module.

If PACKAGED PRODUCT, return:
{
  "type": "packaged_product",
  "product_name": "Name of the product visible (e.g., 'Ovomaltine')",
  "product_category": "drink_powder|chocolate|cereal|snack|dairy|supplement|other",
  "message": "Message in ${userLocale} explaining this is a packaged product and needs label scanning"
}

If NOT food, return:
{
  "type": "not_food",
  "detected_category": "person|animal|object|landscape|document|vehicle|abstract",
  "detected_object": "description of what you see",
  "message": "Message in ${userLocale} explaining this is not food"
}

=== CRITICAL SAFETY MISSION ===

This user has FOOD INTOLERANCES. Your PRIMARY job is to PROTECT them.

**UNIVERSAL SAFETY PRINCIPLE:**
- Wrong portion estimate = minor inconvenience
- Missing allergen = MEDICAL EMERGENCY
- When in doubt, ALERT

**SAFETY IS INDEPENDENT OF NUTRITION:**
- Phase 3 (Safety) executes BEFORE Phase 4 (Nutrition)
- Portion errors must NEVER affect intolerance detection

=== REASONING ORDER (FOLLOW STRICTLY) ===

**PHASE 1 - VISUAL IDENTIFICATION**
1. Identify all visible food items
2. Detect cuisine origin (critical for hidden ingredients)
3. Note visual limitations (overlap, lighting, angle, no scale reference)

**PHASE 2 - INGREDIENT DETECTION**
4. List VISIBLE ingredients with certainty: "high"
5. List PROBABLE HIDDEN ingredients based on:
   - Cuisine patterns (certainty: "medium")
   - Cooking method implications (certainty: "medium")
   - Texture/color analysis (certainty: "low")

**PHASE 3 - SAFETY VALIDATION (BEFORE NUTRITION)**
6. Cross-check ALL ingredients (visible + hidden) against user's intolerances
7. Apply precautionary principle for USER'S SPECIFIC INTOLERANCES
8. Generate safety_score (1-5) and prioritized alerts
9. Safety check is INDEPENDENT of portion accuracy

**PHASE 4 - NUTRITIONAL ESTIMATION (LAST)**
10. Estimate portions WITH MARGIN OF ERROR (never claim exact)
11. Calculate macros using ${nutritionalSource.sourceName}
12. Declare uncertainty honestly

=== PORTION ESTIMATION RULES ===

**CRITICAL: Visual estimation has inherent uncertainty.**

Margin of error by reference:
- Standard plate visible (25cm diameter): 20%
- Utensils visible for scale: 25%
- Hand/common object visible: 25%
- No reference at all: 35-40%

NEVER output exact grams without declaring margin of error.

=== HIDDEN INGREDIENT DETECTION ===

**HIGH PROBABILITY - assume present unless visually contradicted:**
| Visual Cue | Likely Contains | Intolerances Affected |
|------------|-----------------|----------------------|
| Creamy white sauce | Dairy (cream, butter, milk) | lactose, dairy |
| Breaded coating | Wheat flour, eggs | gluten, eggs |
| Shiny glaze on meat | Soy sauce, sugar | soy, gluten |
| Cheese gratinée | Dairy, possibly gluten | lactose, gluten |
| Asian stir-fry | Soy sauce, oyster sauce | soy, gluten, shellfish |
| Baked goods | Wheat, eggs, butter | gluten, eggs, lactose |

**EXCEPTION HANDLING:**
- If texture suggests plant-based alternative → still alert, note "possibly plant-based"
- User confirms after seeing alert

=== SMART ALERT PRIORITIZATION ===

**CRITICAL: Alert based on USER'S ACTUAL INTOLERANCES**

User intolerances: ${userIntolerancesList}
User dietary preference: ${dietaryPref}
User excluded ingredients: ${excludedIngredientsList}

**Prioritization rules:**
1. ALWAYS alert if ingredient matches user's intolerances (even low certainty)
2. ALWAYS alert if ingredient matches user's excluded list
3. ALWAYS alert if conflicts with dietary preference (vegan/vegetarian)
4. DO NOT hyper-alert ingredients user is NOT intolerant to
   - Example: User NOT soy-intolerant → don't flag soy sauce as high-severity
   - Still mention in ingredients list, but don't create intolerance_alert

**Maximum alerts per analysis: 5 most relevant**
Priority order: severity > certainty > user's intolerance list order

=== DAILY CALORIE CONTEXT ===
User's daily goal: ${dailyCalorieGoal} kcal
This meal represents a portion of their daily intake.

=== RAW FOOD DETECTION (IMPORTANT) ===

Detect if the image shows RAW, UNPREPARED food that is NOT a ready-to-eat meal.

**SET is_raw_unprepared: true IF:**
- Raw meat (beef, chicken, pork, fish) NOT on a plate as a meal
- Raw eggs (in shell or cracked raw)
- Raw ingredients on a kitchen counter/cutting board being prepared
- Uncooked ingredients not plated as a meal
- Food still in packaging being prepared

**SET is_raw_unprepared: false (EXCEPTIONS - traditionally served raw):**
- Sushi, Sashimi, Nigiri
- Tartare (steak tartare, tuna tartare)
- Carpaccio
- Ceviche
- Kibbeh cru / Quibe cru
- Oysters, raw seafood appetizers
- Fruits and vegetables (naturally eaten raw)
- Salads

**Context clues for raw unprepared:**
- Kitchen counter/cutting board visible (not dining table)
- Raw meat texture (shiny, wet, no browning)
- No plate/bowl presentation
- Cooking utensils nearby (knives, cutting board)
- Packaging visible

=== OUTPUT FORMAT (JSON) ===

{
  "type": "food" | "partial_food" | "not_food" | "label",
  "is_raw_unprepared": false,
  "raw_food_reason": "reason if is_raw_unprepared is true, in ${userLocale}, or null",
  "analysis_confidence": {
    "level": "high" | "medium" | "low",
    "reasons": ["reason in ${userLocale}"],
    "visual_limitations": ["limitation in ${userLocale}"],
    "recommended_action": "suggestion in ${userLocale} or null"
  },
  "meal_name": "HUMANIZED COMPOSITE MEAL NAME in ${userLocale} - CRITICAL!",
  "meal_description": "Brief description of the meal in ${userLocale}",
  "detected_cuisine": "Cuisine name in ${userLocale}",
  "items": [
    {
      "name": "food name in ${userLocale}",
      "name_in_cuisine_language": "original name if different (e.g., 'Pad Thai', 'Feijoada')",
      "unidentified": false,
      "unidentified_description": null,
      "portion_estimate": {
        "value": 150,
        "unit": "g",
        "method": "visual_estimation",
        "margin_error_percent": 30,
        "reference_used": "plate_size" | "utensil" | "none"
      },
      "calories": 0,
      "macros": {
        "protein": 0,
        "carbs": 0,
        "fat": 0,
        "fiber": 0
      },
      "cuisine_origin": "cuisine in ${userLocale}",
      "detected_ingredients": [
        {
          "name": "ingredient in ${userLocale}",
          "certainty": "high" | "medium" | "low",
          "detection_source": "visible" | "texture_analysis" | "recipe_tradition" | "cooking_method"
        }
      ],
      "probable_hidden_ingredients": [
        {
          "name": "ingredient in ${userLocale}",
          "certainty": "high" | "medium" | "low",
          "reason": "why probably present, in ${userLocale}"
        }
      ],
      "cooking_method": "method in ${userLocale}",
      "nutritional_source": "${nutritionalSource.sourceKey}"
    }
  ],
  "totals": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "margin_error_percent": 30
  },
  "intolerance_alerts": [
    {
      "ingredient": "ingredient in ${userLocale}",
      "intolerance": "intolerance type",
      "presence_certainty": "high" | "medium" | "low",
      "alert_source": "why detected, in ${userLocale}",
      "severity": "high" | "medium"
    }
  ],
  "safety_score": 5,
  "safety_message": "Clear message in ${userLocale}",
  "health_bonus": {
    "score": 0,
    "reasons": ["reason in ${userLocale}"]
  },
  "user_message": "Friendly summary in ${userLocale}"
}

=== CRITICAL RULE: meal_name FIELD ===

The "meal_name" field is the MOST IMPORTANT field for user experience.
It MUST be a HUMANIZED, COMPOSITE name that describes the ENTIRE meal, not just one food.

**RULES FOR meal_name:**
1. If there are multiple food items, COMBINE them naturally
2. Use connecting words like "com", "e", "acompanhado de" (in ${userLocale})
3. The name should sound like how a human would describe the meal

**EXAMPLES (in Portuguese):**
- ❌ WRONG: "Café preto" (when there are also biscuits)
- ✅ CORRECT: "Café preto com biscoitos"

- ❌ WRONG: "Arroz cozido" (when there's rice, beans, fries, salad)
- ✅ CORRECT: "Arroz, feijão, batata frita e salada"

- ❌ WRONG: "Filé de frango" (when there's chicken, rice, vegetables)
- ✅ CORRECT: "Filé de frango com arroz e legumes"

- ❌ WRONG: "Ovos mexidos" (when there's eggs, toast, juice)
- ✅ CORRECT: "Ovos mexidos com torrada e suco"

**STRUCTURE:**
- For 2 items: "Item1 com Item2"
- For 3+ items: "Item1, Item2, Item3 e Item4"
- If there's a clear main dish: "MainDish com/acompanhado de sides"

=== SAFETY SCORE RULES (UNIVERSAL) ===

5 = No conflicts, low-risk ingredients
4 = No conflicts, some medium-probability hidden ingredients
3 = Possible conflict (medium certainty) - user should verify
2 = Probable conflict - recommend avoiding
1 = High certainty conflict - DO NOT CONSUME

**health_bonus: ONLY include when safety_score >= 4 AND intolerance_alerts is empty**
If any alert exists, set health_bonus to null.

=== UNIDENTIFIED FOOD ITEMS ===

When you CANNOT confidently identify a specific food item, you MUST:
1. Set "unidentified": true for that item
2. Set "unidentified_description": A brief visual description (e.g., "substância cremosa branca", "molho escuro", "grãos marrons")
3. Set "name": The visual description (same as unidentified_description)
4. Set "calories": 0 (DO NOT ESTIMATE CALORIES FOR UNIDENTIFIED ITEMS)
5. Set all macros to 0

**UNIDENTIFIED triggers (set unidentified: true if ANY apply):**
- Generic descriptions like "substância", "pasta", "molho", "mistura", "creme" without specific identification
- Names containing words like "desconhecido", "não identificado", "unknown"
- Cannot distinguish between multiple possibilities (e.g., could be mayonnaise, sour cream, or cream cheese)
- Very low visual confidence on what the item actually is

**Examples of UNIDENTIFIED items:**
- ❌ "Substância cremosa branca" → unidentified: true, calories: 0
- ❌ "Molho escuro não identificado" → unidentified: true, calories: 0
- ❌ "Grãos marrons" (could be beans, lentils, or coffee) → unidentified: true, calories: 0
- ✅ "Arroz branco" → unidentified: false (clearly rice)
- ✅ "Tomate cereja" → unidentified: false (clearly identified)

**CRITICAL: NEVER assign calories to items you cannot confidently identify.**
This protects user trust - better to ask for correction than guess wrong.

=== FINAL PRINCIPLES ===

1. SAFETY FIRST: Over-alert rather than under-alert for user's intolerances
2. HONESTY: Declare what you cannot see
3. UNCERTAINTY: Never claim precision you don't have
4. EMPOWERMENT: Give actionable info, not just warnings
5. CONSISTENCY: Same logic regardless of user's country
6. FOCUS: Prioritize alerts relevant to THIS user's restrictions`;

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

    // ========== CHECK FOR PACKAGED_PRODUCT RESPONSE ==========
    // The prompt asks AI to return type: "packaged_product" for product packages
    if (analysis.type === "packaged_product") {
      logStep("Packaged product detected - redirecting to label scanner", { 
        type: analysis.type,
        product_name: analysis.product_name,
        product_category: analysis.product_category
      });
      
      return new Response(JSON.stringify({
        success: false,
        packagedProduct: true,
        product_name: analysis.product_name || "produto",
        product_category: analysis.product_category || "other",
        message: analysis.message || "Este é um produto embalado. Para verificar se é seguro para você, use o módulo 'Verificar Rótulo' para analisar os ingredientes.",
        redirect_to: "label"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========== CHECK FOR NOT_FOOD RESPONSE (NEW FORMAT) ==========
    // The prompt asks AI to return type: "not_food" for non-food images
    if (analysis.type === "not_food") {
      logStep("Not food detected (type format)", { 
        type: analysis.type,
        detected_category: analysis.detected_category,
        detected_object: analysis.detected_object 
      });
      
      return new Response(JSON.stringify({
        success: false,
        notFood: true,
        categoryError: true,
        categoria_detectada: analysis.detected_category || "objeto",
        objeto_identificado: analysis.detected_object || "",
        message: analysis.message || "Não consegui identificar comida nesta imagem.",
        dica: "Tire uma foto do seu prato de cima com boa iluminação."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ========== TRANSFORM AI RESPONSE FORMAT ==========
    // The AI returns 'items' and 'totals', but we need 'alimentos' and 'total_geral'
    if (analysis.items && !analysis.alimentos) {
      analysis.alimentos = analysis.items.map((item: any) => {
        // Check if this item is marked as unidentified by the AI
        const isUnidentified = item.unidentified === true;
        
        return {
          item: item.name || item.item || '',
          item_original_language: item.name_in_cuisine_language,
          porcao_estimada: item.portion_estimate 
            ? `${item.portion_estimate.value}${item.portion_estimate.unit}` 
            : '',
          // If unidentified, force calories to 0
          calorias: isUnidentified ? 0 : (item.calories || 0),
          macros: {
            proteinas: isUnidentified ? 0 : (item.macros?.protein || 0),
            carboidratos: isUnidentified ? 0 : (item.macros?.carbs || 0),
            gorduras: isUnidentified ? 0 : (item.macros?.fat || 0),
          },
          confianca_identificacao: isUnidentified ? 'baixa' : (
            item.portion_estimate?.margin_error_percent 
              ? (item.portion_estimate.margin_error_percent <= 25 ? 'alta' : item.portion_estimate.margin_error_percent <= 35 ? 'media' : 'baixa')
              : 'media'
          ),
          culinaria_origem: item.cuisine_origin,
          ingredientes_visiveis: item.detected_ingredients?.filter((i: any) => i.certainty === 'high').map((i: any) => i.name) || [],
          ingredientes_provaveis_ocultos: item.probable_hidden_ingredients?.map((i: any) => i.name) || [],
          metodo_preparo_provavel: item.cooking_method,
          // Unidentified food item properties
          nao_identificado: isUnidentified,
          descricao_visual: isUnidentified ? (item.unidentified_description || item.name || '') : undefined,
        };
      });
      delete analysis.items;
      
      const unidentifiedCount = analysis.alimentos.filter((a: any) => a.nao_identificado).length;
      logStep("Transformed items → alimentos", { 
        count: analysis.alimentos.length,
        unidentifiedCount 
      });
    }
    
    if (analysis.totals && !analysis.total_geral) {
      analysis.total_geral = {
        calorias_totais: analysis.totals.calories || 0,
        proteinas_totais: analysis.totals.protein || 0,
        carboidratos_totais: analysis.totals.carbs || 0,
        gorduras_totais: analysis.totals.fat || 0,
      };
      delete analysis.totals;
      logStep("Transformed totals → total_geral", analysis.total_geral);
    }
    
    // ========== ALERTAS DE INTOLERÂNCIA - GERADO VIA GLOBAL SAFETY ENGINE ==========
    // IMPORTANTE: NÃO usamos os alertas da IA (intolerance_alerts) diretamente!
    // A IA pode inventar alertas falsos (ex: "FODMAP" em biscoito de maisena).
    // Em vez disso, validamos cada ingrediente contra o banco de dados real.
    // Isso será feito mais abaixo após processar os alimentos.
    
    // Descartar alertas da IA - serão regenerados via globalSafetyEngine
    if (analysis.intolerance_alerts) {
      logStep("Discarding AI intolerance_alerts - will validate via database", { 
        count: analysis.intolerance_alerts.length 
      });
      delete analysis.intolerance_alerts;
    }
    
    // Inicializar como array vazio - será preenchido pela validação do globalSafetyEngine
    analysis.alertas_intolerancia = [];
    
    // Transform meal_name → prato_identificado with composite humanized name
    if (!analysis.prato_identificado) {
      // Use meal_name from AI if available, otherwise generate from items
      let mealName = analysis.meal_name || "";
      
      // If AI didn't provide meal_name, generate composite name from items
      if (!mealName && analysis.alimentos && analysis.alimentos.length > 0) {
        const itemNames = analysis.alimentos.map((food: any) => food.item || "").filter(Boolean);
        if (itemNames.length === 1) {
          mealName = itemNames[0];
        } else if (itemNames.length === 2) {
          mealName = `${itemNames[0]} com ${itemNames[1]}`;
        } else if (itemNames.length > 2) {
          const lastItem = itemNames.pop();
          mealName = `${itemNames.join(", ")} e ${lastItem}`;
        }
      }
      
      analysis.prato_identificado = {
        nome: mealName || analysis.summary || "Refeição",
        culinaria: analysis.detected_cuisine || null,
        descricao_curta: analysis.meal_description || analysis.summary || null,
        confianca: analysis.analysis_confidence?.level || "media",
        motivos_confianca: analysis.analysis_confidence?.reasons || [],
        limitacoes_visuais: analysis.analysis_confidence?.visual_limitations || []
      };
      
      logStep("Generated prato_identificado", { nome: analysis.prato_identificado.nome });
    }
    
    // ========== RAW UNPREPARED FOOD DETECTION ==========
    // Transfer is_raw_unprepared flag from AI response
    if (analysis.is_raw_unprepared !== undefined) {
      analysis.alimento_cru_nao_preparado = analysis.is_raw_unprepared;
      analysis.motivo_cru = analysis.raw_food_reason || null;
      logStep("Raw food detection", { 
        is_raw_unprepared: analysis.is_raw_unprepared,
        reason: analysis.raw_food_reason 
      });
    } else {
      analysis.alimento_cru_nao_preparado = false;
      analysis.motivo_cru = null;
    }

    // ========== HYBRID MACRO CALCULATION: Use real data from foods table ==========
    // PHASE 3: Now includes canonical_ingredients as Layer 0 priority
    let macrosFromDatabase = 0;
    let macrosFromAI = 0;
    let macrosFromCanonical = 0;
    const detalhesRecalculo: Array<{ item: string; original: number; recalculado: number; source: string }> = [];
    
    if (analysis.alimentos && Array.isArray(analysis.alimentos)) {
      try {
        // Prepare foods for calculation
        const foodsForCalculation = analysis.alimentos.map((food: any) => {
          const name = food.item || '';
          let grams = 100;
          
          // Try to extract grams from portion description
          if (food.porcao_estimada) {
            const extracted = extractGramsFromPortion(food.porcao_estimada);
            if (extracted !== null && extracted > 0) grams = extracted;
          }
          
          return {
            name,
            grams,
            // Pass AI estimates as fallback
            estimated_calories: food.calorias || 0,
            estimated_protein: food.macros?.proteinas || 0,
            estimated_carbs: food.macros?.carboidratos || 0,
            estimated_fat: food.macros?.gorduras || 0,
          };
        });
        
        // Calculate real macros from database (now with canonical as Layer 0)
        const macroResult = await calculateRealMacrosForFoods(supabaseClient, foodsForCalculation);
        const calculatedItems = macroResult.items;
        
        // Update each food with real macros
        for (let i = 0; i < analysis.alimentos.length; i++) {
          const calc = calculatedItems[i];
          if (calc) {
            const originalCalorias = analysis.alimentos[i].calorias || 0;
            
            analysis.alimentos[i].calorias = Math.round(calc.calories);
            analysis.alimentos[i].macros = {
              proteinas: Math.round(calc.protein * 10) / 10,
              carboidratos: Math.round(calc.carbs * 10) / 10,
              gorduras: Math.round(calc.fat * 10) / 10,
            };
            
            // PHASE 3: Track canonical as highest priority source
            // 'canonical' = verified canonical_ingredients table
            // 'database' and 'database_global' = official tables (TACO/USDA)
            // 'category_fallback' and 'ai_estimate' = AI estimation
            const isFromCanonical = calc.source === 'canonical';
            const isFromDatabase = calc.source === 'database' || calc.source === 'database_global';
            
            analysis.alimentos[i].calculo_fonte = isFromCanonical ? 'canonical' : (isFromDatabase ? 'tabela_foods' : 'estimativa_ia');
            analysis.alimentos[i].gramas_usadas = calc.grams;
            
            // Add canonical-specific metadata
            if (calc.canonical_id) {
              analysis.alimentos[i].canonical_id = calc.canonical_id;
            }
            if (calc.intolerance_flags && calc.intolerance_flags.length > 0) {
              analysis.alimentos[i].intolerance_flags = calc.intolerance_flags;
            }
            if (calc.food_id) {
              analysis.alimentos[i].food_id = calc.food_id;
            }
            if (calc.matched_name) {
              analysis.alimentos[i].alimento_encontrado = calc.matched_name;
            }
            
            if (isFromCanonical) {
              macrosFromCanonical++;
              detalhesRecalculo.push({
                item: analysis.alimentos[i].item,
                original: originalCalorias,
                recalculado: calc.calories,
                source: 'canonical'
              });
            } else if (isFromDatabase) {
              macrosFromDatabase++;
              detalhesRecalculo.push({
                item: analysis.alimentos[i].item,
                original: originalCalorias,
                recalculado: calc.calories,
                source: calc.source
              });
            } else {
              macrosFromAI++;
            }
          }
        }
        
        // Recalculate totals
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
        
        // Add match rate to response
        analysis.macro_match_rate = macroResult.matchRate;
        analysis.macros_from_database = macrosFromDatabase;
        analysis.macros_from_ai = macrosFromAI;
        analysis.macros_from_canonical = macrosFromCanonical;
        
        logStep("✅ Real macros calculated", { 
          fromCanonical: macrosFromCanonical,
          fromDatabase: macrosFromDatabase,
          fromAI: macrosFromAI,
          matchRate: `${macroResult.matchRate}%`,
          novosTotais: analysis.total_geral 
        });
      } catch (macroError) {
        logStep("⚠️ Error calculating real macros, keeping AI estimates", { error: String(macroError) });
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

    // ========== PÓS-PROCESSAMENTO DE SEGURANÇA - USANDO GLOBAL SAFETY ENGINE ==========
    // Esta etapa GARANTE que nenhuma intolerância do usuário escape da detecção
    // Usa validateIngredientList do globalSafetyEngine que respeita safe keywords!
    
    const alertasPersonalizados: Array<{
      ingrediente: string;
      restricao: string;
      status: "seguro" | "risco_potencial" | "contem";
      mensagem: string;
      icone: string;
      safeReason?: string;
    }> = [];
    
    // Coletar todos os alimentos identificados para validação centralizada
    const identifiedFoods = analysis.alimentos?.map((food: { item?: string }) => food.item || "") || [];
    
    // ========== DECOMPOSIÇÃO DE INGREDIENTES PARA ALIMENTOS PROCESSADOS ==========
    // Usa funções centralizadas do globalSafetyEngine para consistência
    // isProcessedFood e decomposeFood são importados de ../shared/globalSafetyEngine.ts
    
    // Coletar ingredientes para validação (incluindo decomposição de processados)
    // Usando funções centralizadas do globalSafetyEngine
    let ingredientsToValidate: string[] = [];
    const decompositionSupabaseUrl = Deno.env.get("SUPABASE_URL");
    const decompositionSupabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const decompositionUserCountry = profile?.country || 'BR';
    
    for (const food of identifiedFoods) {
      if (!food) continue;
      
      if (isProcessedFood(food)) {
        // Decompor usando função centralizada do globalSafetyEngine
        const decomposedIngredients = await decomposeFood(food, decompositionSupabaseUrl, decompositionSupabaseKey, decompositionUserCountry);
        ingredientsToValidate.push(...decomposedIngredients);
        logStep(`Processed food detected and decomposed (centralizado)`, { 
          original: food, 
          decomposed: decomposedIngredients 
        });
      } else {
        // Alimento simples, adicionar diretamente
        ingredientsToValidate.push(food);
      }
    }
    
    // Remover duplicatas
    ingredientsToValidate = [...new Set(ingredientsToValidate)].filter(Boolean);
    
    logStep("Ingredients prepared for validation", { 
      originalFoods: identifiedFoods,
      ingredientsToValidate,
      count: ingredientsToValidate.length
    });
    
    // Variável para armazenar resultado fora do escopo do if
    let validationResult: SafetyCheckResult | null = null;
    
    if (ingredientsToValidate.length > 0) {
      // Usar validateIngredientList do globalSafetyEngine com ingredientes decompostos
      validationResult = validateIngredientList(ingredientsToValidate, userRestrictionsForEngine, safetyDatabase);
      
      logStep("Global safety validation complete", { 
        isSafe: validationResult.isSafe,
        conflictCount: validationResult.conflicts.length 
      });
      
      // Converter conflicts para alertasPersonalizados E alertas_intolerancia
      // Isso garante que APENAS conflitos VALIDADOS contra o banco de dados sejam exibidos
      for (const conflict of validationResult.conflicts) {
        const restricaoLabel = conflict.label;
        
        // Adicionar ao alertasPersonalizados (usado na UI)
        alertasPersonalizados.push({
          ingrediente: conflict.originalIngredient,
          restricao: restricaoLabel,
          status: "contem",
          mensagem: `⚠️ ATENÇÃO: "${conflict.originalIngredient}" contém ${restricaoLabel.toUpperCase()}, que está na sua lista de restrições`,
          icone: "🔴"
        });
        
        // Adicionar ao alertas_intolerancia (formato legado para compatibilidade)
        // Este é o formato esperado pelo frontend para análises anteriores
        analysis.alertas_intolerancia.push({
          alimento: conflict.originalIngredient,
          intolerancia: restricaoLabel,
          risco: conflict.severity === 'low' ? 'baixo' : 'alto',
          motivo: `Ingrediente "${conflict.matchedIngredient}" detectado via validação de segurança`,
          validado_banco: true // Flag para indicar que foi validado contra o banco
        });
      }
      
      logStep("Populated alertas_intolerancia from validated conflicts", {
        count: analysis.alertas_intolerancia.length
      });
      
      // Se não houve conflitos, adicionar alertas de segurança para cada restrição
      if (validationResult.isSafe) {
        for (const intolerance of normalizedIntolerances) {
          const restricaoLabel = getIntoleranceLabel(intolerance, safetyDatabase);
          alertasPersonalizados.push({
            ingrediente: "",
            restricao: restricaoLabel,
            status: "seguro",
            mensagem: `✅ Seguro para você: Não identificamos ${restricaoLabel} nesta refeição`,
            icone: "🟢"
          });
        }
      }
    }
    
    // Verificação de preferência alimentar JÁ é feita pelo globalSafetyEngine
    // mas mantemos fallback visual para clareza
    // Database now stores: "omnivore" | "vegetarian" | "vegan" | etc.
    if (dietaryPreference === "vegetarian" || dietaryPreference === "vegan" || dietaryPreference === "pescatarian") {
      const dietLabel = getDietaryLabel(dietaryPreference, safetyDatabase);
      
      // Verificar se há conflitos de dieta nos resultados
      const dietaryConflicts = validationResult?.conflicts?.filter((c: ConflictDetail) => c.type === "dietary") || [];
      
      if (dietaryConflicts.length > 0) {
        for (const conflict of dietaryConflicts) {
          alertasPersonalizados.push({
            ingrediente: conflict.originalIngredient,
            restricao: dietLabel,
            status: "contem",
            mensagem: `⚠️ ATENÇÃO: "${conflict.originalIngredient}" é incompatível com ${dietLabel.toLowerCase()}`,
            icone: "🔴"
          });
        }
      } else {
        alertasPersonalizados.push({
          ingrediente: "",
          restricao: dietLabel,
          status: "seguro",
          mensagem: `✅ Compatível com ${dietLabel.toLowerCase()}`,
          icone: "🟢"
        });
      }
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

