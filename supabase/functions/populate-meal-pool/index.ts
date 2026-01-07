import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// ============= IMPORTS DOS MÓDULOS COMPARTILHADOS =============
import {
  REGIONAL_CONFIGS,
  getRegionalConfig,
  getStrategyPersona,
  normalizeText,
  type RegionalConfig,
} from "../_shared/mealGenerationConfig.ts";

import {
  loadSafetyDatabase,
  type SafetyDatabase,
} from "../_shared/globalSafetyEngine.ts";

import {
  CALORIE_TABLE,
  normalizeForCalorieTable,
} from "../_shared/calorieTable.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[MEAL-POOL] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= TIPOS =============
interface MealComponent {
  type: string; // protein, carb, vegetable, fruit, beverage, fat, fiber, dairy, grain, legume
  name: string;
  name_en?: string;
  portion_grams?: number;
  portion_ml?: number;
  portion_label: string;
}

interface GeneratedMeal {
  name: string;
  description: string;
  components: MealComponent[];
  dietary_tags: string[];
  blocked_for_intolerances: string[];
  flexible_options: Record<string, string[]>;
  instructions: string[];
  prep_time_minutes: number;
}

// ============= REGRAS DE COMBINAÇÕES PROIBIDAS =============
const FORBIDDEN_COMBINATIONS = [
  ["arroz", "macarrão"],
  ["pão", "tapioca"],
  ["feijão", "lentilha"],
  ["café", "chá"],
  ["rice", "pasta"],
  ["bread", "tortilla"],
];

// ============= ALIMENTOS PROIBIDOS POR TIPO DE REFEIÇÃO =============
const MEAL_TYPE_FORBIDDEN_FOODS: Record<string, string[]> = {
  almoco: [
    "omelete", "ovos mexidos", "pão", "tapioca", "panqueca", "crepe doce",
    "cereal", "granola", "aveia com leite", "mingau", "torradas",
    "omelette", "scrambled eggs", "bread", "toast", "pancake", "cereal", "oatmeal"
  ],
  jantar: [
    "omelete", "ovos mexidos", "pão", "tapioca", "panqueca", "crepe doce",
    "cereal", "granola", "aveia com leite", "mingau", "torradas",
    "omelette", "scrambled eggs", "bread", "toast", "pancake", "cereal", "oatmeal"
  ],
  cafe_manha: [
    "feijoada", "moqueca", "churrasco", "lasanha", "macarronada",
    "steak", "feijoada", "moqueca", "barbecue", "lasagna"
  ],
  lanche_manha: [
    "feijoada", "moqueca", "churrasco", "lasanha", "arroz com feijão",
    "steak", "feijoada", "heavy meals"
  ],
  lanche_tarde: [
    "feijoada", "moqueca", "churrasco", "lasanha", "arroz com feijão",
    "steak", "feijoada", "heavy meals"
  ],
  ceia: [
    "feijoada", "moqueca", "churrasco", "lasanha", "arroz com feijão",
    "heavy meals", "fried foods", "frituras"
  ],
};

// ============= MEAL TYPE MAPPING =============
const MEAL_TYPE_LABELS: Record<string, Record<string, string>> = {
  BR: {
    cafe_manha: "Café da manhã",
    lanche_manha: "Lanche da manhã",
    almoco: "Almoço",
    lanche_tarde: "Lanche da tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  },
  US: {
    cafe_manha: "Breakfast",
    lanche_manha: "Morning Snack",
    almoco: "Lunch",
    lanche_tarde: "Afternoon Snack",
    jantar: "Dinner",
    ceia: "Late Night Snack",
  },
  PT: {
    cafe_manha: "Pequeno-almoço",
    lanche_manha: "Lanche da Manhã",
    almoco: "Almoço",
    lanche_tarde: "Lanche da Tarde",
    jantar: "Jantar",
    ceia: "Ceia",
  },
  MX: {
    cafe_manha: "Desayuno",
    lanche_manha: "Colación Matutina",
    almoco: "Comida",
    lanche_tarde: "Colación Vespertina",
    jantar: "Cena",
    ceia: "Cena Ligera",
  },
  ES: {
    cafe_manha: "Desayuno",
    lanche_manha: "Media Mañana",
    almoco: "Almuerzo",
    lanche_tarde: "Merienda",
    jantar: "Cena",
    ceia: "Cena Tardía",
  },
};

// ============= PORÇÕES PADRÃO POR TIPO DE COMPONENTE =============
const DEFAULT_PORTIONS: Record<string, { grams: number; label_pt: string; label_en: string }> = {
  protein: { grams: 120, label_pt: "1 porção média", label_en: "1 medium portion" },
  carb: { grams: 100, label_pt: "1 porção", label_en: "1 portion" },
  vegetable: { grams: 80, label_pt: "1 xícara", label_en: "1 cup" },
  fruit: { grams: 120, label_pt: "1 unidade média", label_en: "1 medium piece" },
  beverage: { grams: 200, label_pt: "1 xícara", label_en: "1 cup" },
  dairy: { grams: 150, label_pt: "1 porção", label_en: "1 portion" },
  fat: { grams: 15, label_pt: "1 colher de sopa", label_en: "1 tablespoon" },
  fiber: { grams: 30, label_pt: "2 colheres de sopa", label_en: "2 tablespoons" },
  grain: { grams: 80, label_pt: "1/2 xícara", label_en: "1/2 cup" },
  legume: { grams: 100, label_pt: "1 concha", label_en: "1 ladle" },
};

// ============= CONSTRUIR PROMPT COM BASE NO REGIONAL CONFIG =============
function buildMealPoolPrompt(
  regional: RegionalConfig,
  countryCode: string,
  mealType: string,
  quantity: number,
  safetyDb: SafetyDatabase,
  dietaryFilter?: string | null,
  strategyKey?: string | null,
): string {
  const mealLabel = MEAL_TYPE_LABELS[countryCode]?.[mealType] || mealType;
  const language = regional.language || "pt-BR";
  const isPortuguese = language.startsWith("pt");
  const isSpanish = language.startsWith("es");
  
  // Pegar estrutura de refeições do regional config
  const mealStructure = regional.mealStructure;
  
  // Exemplos de estrutura
  let structureExample = "";
  if (mealStructure) {
    if (mealType === "almoco" || mealType === "jantar") {
      structureExample = `
ESTRUTURA TÍPICA: ${mealStructure.lunchDinner.structure}
COMPONENTES: ${mealStructure.lunchDinner.components.join(", ")}
EXEMPLO: ${mealStructure.lunchDinner.example}
PRATOS ÚNICOS PERMITIDOS: ${mealStructure.consolidatedDishes.join(", ")}`;
    } else if (mealType === "cafe_manha") {
      structureExample = `
ESTRUTURA TÍPICA: ${mealStructure.breakfast.structure}
EXEMPLOS: 
${mealStructure.breakfast.examples.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`;
    } else if (mealType.includes("lanche")) {
      structureExample = `
EXEMPLOS DE LANCHES:
${mealStructure.snacks.examples.map((e, i) => `  ${i + 1}. ${e}`).join("\n")}`;
    } else if (mealType === "ceia") {
      structureExample = `
CEIA DEVE SER LEVE: Opte por chás, frutas leves, iogurte ou lanches pequenos.`;
    }
  }
  
  // Contexto de estratégia nutricional
  let strategyContext = "";
  if (strategyKey) {
    const persona = getStrategyPersona(strategyKey);
    strategyContext = `
ESTRATÉGIA NUTRICIONAL: ${persona.label}
FILOSOFIA: ${persona.philosophy}
ESTILO: ${persona.foodStyle}
ALIMENTOS RECOMENDADOS: ${persona.recommendedFoods.slice(0, 8).join(", ")}
EVITAR: ${persona.avoidFoods.slice(0, 5).join(", ")}
ESTILO DE PORÇÃO: ${persona.portionStyle}`;
  }
  
  // Listar intolerâncias conhecidas do banco
  const allIntoleranceKeys = safetyDb.allIntoleranceKeys.slice(0, 20).join(", ");
  
  // Filtro dietético
  const dietaryContext = dietaryFilter 
    ? `\nFILTRO DIETÉTICO: Apenas refeições compatíveis com "${dietaryFilter}". Evitar TODOS os ingredientes proibidos para esta dieta.`
    : "";
  
  // Alimentos proibidos para este tipo de refeição
  const forbiddenForMealType = MEAL_TYPE_FORBIDDEN_FOODS[mealType] || [];
  const mealTypeForbiddenContext = forbiddenForMealType.length > 0
    ? `\n⛔ FORBIDDEN FOODS FOR "${mealLabel}" (NEVER USE):
${forbiddenForMealType.map(f => `- ${f}`).join("\n")}
These foods are culturally inappropriate for ${mealLabel}. Using them will result in INVALID meals.`
    : "";
  
  // Prompt principal
  return `[INTERNAL REASONING: English]
[OUTPUT LANGUAGE: ${language}]

You are a clinical nutritionist with 20 years of experience specializing in ${countryCode} cuisine.

TASK: Generate ${quantity} unique meal combinations for "${mealLabel}" (${mealType}) targeting the ${countryCode} market.

REGIONAL CONTEXT FOR ${countryCode}:
- Language: ${regional.languageName}
- Measurement: ${regional.measurementSystem}
- Typical meals: ${regional.typicalMeals || "Standard regional cuisine"}
- Cultural notes: ${regional.culturalNotes || "Local ingredients preferred"}
- Portion units: ${regional.domesticUnits || "unit, tablespoon, cup, slice"}
${structureExample}
${strategyContext}
${dietaryContext}
${mealTypeForbiddenContext}

COMPONENT TYPES (use these exact values):
- protein: meats, fish, eggs, tofu, legumes as main protein
- carb: rice, bread, pasta, potatoes, grains
- vegetable: salads, cooked vegetables, greens
- fruit: fresh fruits, dried fruits
- beverage: coffee, tea, juice, milk, water
- dairy: yogurt, cheese, milk-based
- fat: oils, butter, nuts, seeds
- fiber: oats, chia, flax, bran
- grain: quinoa, couscous, bulgur
- legume: beans, lentils, chickpeas

FORBIDDEN COMBINATIONS (never together):
${FORBIDDEN_COMBINATIONS.map(c => `- ${c.join(" + ")}`).join("\n")}

PORTION RULES:
- Proteins: 100-150g per meal
- Carbs: 80-120g per meal
- Vegetables: 60-100g per meal
- Fruits: 100-150g per piece
- Beverages: 150-250ml per serving
- Include portion_label in local language (${isPortuguese ? "Portuguese" : isSpanish ? "Spanish" : "English"})

KNOWN INTOLERANCES (for blocked_for_intolerances field):
${allIntoleranceKeys}

For each meal, identify which intolerances would block it based on ingredients used.

RETURN a JSON object with a "meals" array containing exactly ${quantity} meal objects.

CRITICAL: Each meal MUST have a "components" array. Without components, the meal is INVALID.

EXACT JSON STRUCTURE (follow this precisely):
{
  "meals": [
    {
      "name": "Descriptive meal name in ${language}",
      "description": "Brief description in ${language}",
      "components": [
        {"type": "protein", "name": "Frango grelhado", "name_en": "Grilled chicken breast", "portion_grams": 150, "portion_label": "${isPortuguese ? "1 filé médio" : "1 medium fillet"}"},
        {"type": "carb", "name": "Arroz integral", "name_en": "Brown rice", "portion_grams": 100, "portion_label": "${isPortuguese ? "4 colheres de sopa" : "4 tablespoons"}"},
        {"type": "vegetable", "name": "Salada verde", "name_en": "Green salad", "portion_grams": 80, "portion_label": "${isPortuguese ? "1 prato de sobremesa" : "1 small plate"}"}
      ],
      "dietary_tags": ["sem_lactose", "high_protein"],
      "blocked_for_intolerances": ["gluten", "lactose"],
      "flexible_options": {"protein": ["frango", "peixe", "tofu"]},
      "instructions": ["Season chicken with salt and lemon", "Grill for 6 min each side", "Serve with rice and salad"],
      "prep_time_minutes": 20
    }
  ]
}

VALIDATION RULES:
1. Each meal MUST have "components" as an array with 2-6 items
2. Each component MUST have: type, name, name_en, portion_grams (or portion_ml for beverages), portion_label
3. Valid component types: protein, carb, vegetable, fruit, beverage, dairy, fat, fiber, grain, legume
4. Meals must be culturally appropriate for ${countryCode}
5. Return ONLY valid JSON, no markdown, no code blocks

Generate ${quantity} varied, realistic meals for "${mealLabel}" now.`;
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      country_code = "BR", 
      meal_type, 
      quantity = 5,
      dietary_filter = null,
      strategy_key = null,
    } = await req.json();

    logStep("Starting meal pool generation", { country_code, meal_type, quantity, dietary_filter, strategy_key });

    // Validate meal_type
    const validMealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
    if (!validMealTypes.includes(meal_type)) {
      throw new Error(`Invalid meal_type. Use: ${validMealTypes.join(", ")}`);
    }

    // Get regional config from shared module
    const regional = getRegionalConfig(country_code);
    logStep("Regional config loaded", { language: regional.language, country: country_code });

    // Load safety database for intolerance detection
    const safetyDb = await loadSafetyDatabase(supabaseUrl, supabaseServiceKey);
    logStep("Safety database loaded", { 
      intoleranceKeys: safetyDb.allIntoleranceKeys.length,
      dietaryKeys: safetyDb.allDietaryKeys.length,
    });

    // Build prompt using shared config
    const systemPrompt = buildMealPoolPrompt(
      regional,
      country_code,
      meal_type,
      quantity,
      safetyDb,
      dietary_filter,
      strategy_key,
    );

    // Helper function to call AI with retry
    const callAIWithRetry = async (maxRetries = 2): Promise<GeneratedMeal[]> => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        logStep(`Calling Lovable AI Gateway (attempt ${attempt}/${maxRetries})...`);

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Generate ${quantity} meals for ${meal_type} in ${country_code}. Return ONLY valid JSON, no markdown, no code blocks.` },
            ],
            temperature: 0.7,
            max_tokens: 8000, // Ensure enough tokens for complete response
          }),
        });

        if (!aiResponse.ok) {
          const errorText = await aiResponse.text();
          logStep("AI Gateway error", { status: aiResponse.status, error: errorText });
          
          if (aiResponse.status === 429) {
            throw { status: 429, message: "Rate limit exceeded. Try again in a few minutes." };
          }
          if (aiResponse.status === 402) {
            throw { status: 402, message: "Insufficient credits. Please add funds." };
          }
          throw new Error(`AI Gateway error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const aiContent = aiData.choices?.[0]?.message?.content || "";
        const finishReason = aiData.choices?.[0]?.finish_reason;

        logStep("AI response received", { length: aiContent.length, finishReason });

        // Check if response was truncated
        if (finishReason === "length" || aiContent.length < 1500) {
          logStep("Response possibly truncated, retrying...", { finishReason, length: aiContent.length });
          if (attempt < maxRetries) continue;
        }

        // Parse JSON (remove markdown if present)
        let cleanJson = aiContent.trim();
        if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
        }

        try {
          const parsed = JSON.parse(cleanJson);
          
          logStep("Parsed JSON structure", {
            type: typeof parsed,
            isArray: Array.isArray(parsed),
            keys: parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed) : undefined,
          });

          const candidate = Array.isArray((parsed as any)?.meals) ? (parsed as any).meals : parsed;

          if (!Array.isArray(candidate)) {
            throw new Error("meals is not an array");
          }

          return candidate as GeneratedMeal[];
        } catch (parseError) {
          logStep("JSON parse error", { error: String(parseError), content: cleanJson.slice(0, 1000), attempt });
          if (attempt < maxRetries) continue;
          throw new Error("Failed to parse AI response after retries");
        }
      }
      throw new Error("Failed after all retries");
    };

    // Handle rate limit/payment errors separately
    let generatedMeals: GeneratedMeal[];
    try {
      generatedMeals = await callAIWithRetry(2);
    } catch (err: any) {
      if (err.status === 429 || err.status === 402) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: err.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    logStep("Meals generated by AI", { count: generatedMeals.length });

    // Log first meal structure for debugging
    if (generatedMeals.length > 0) {
      const firstMeal = generatedMeals[0] as any;
      logStep("First meal structure", {
        name: firstMeal?.name,
        hasComponents: !!firstMeal?.components,
        componentsType: typeof firstMeal?.components,
        componentsIsArray: Array.isArray(firstMeal?.components),
        componentsLength: Array.isArray(firstMeal?.components) ? firstMeal.components.length : 0,
        allKeys: firstMeal ? Object.keys(firstMeal) : [],
      });
    }

    // Helper to coerce components to array
    const coerceMealComponents = (raw: unknown): MealComponent[] => {
      if (Array.isArray(raw)) return raw as MealComponent[];
      if (raw && typeof raw === "object") {
        return Object.values(raw as Record<string, unknown>).filter((v) => v && typeof v === "object") as MealComponent[];
      }
      return [];
    };

    // Normalize + filter out invalid meals (missing or invalid components)
    const validMeals: GeneratedMeal[] = [];
    for (const meal of generatedMeals) {
      if (!meal || typeof meal !== "object") continue;

      const rawComponents = (meal as any)?.components;
      const components = coerceMealComponents(rawComponents);

      if (components.length === 0) {
        logStep("Skipping invalid meal - no components", {
          name: (meal as any)?.name,
          components_type: Array.isArray(rawComponents) ? "array" : typeof rawComponents,
          rawComponentsValue: JSON.stringify(rawComponents)?.slice(0, 200),
        });
        continue;
      }

      validMeals.push({ ...(meal as any), components });
    }

    logStep("Valid meals after normalization", { count: validMeals.length });

    // If no valid meals, throw an error with details
    if (validMeals.length === 0 && generatedMeals.length > 0) {
      logStep("All meals filtered out - AI returned meals without valid components");
      throw new Error("AI generated meals without valid components. Please try again.");
    }

    // Calculate real macros from foods table (TBCA/TACO)
    const mealsWithMacros = await Promise.all(
      validMeals.map(async (meal) => {
        const components = coerceMealComponents((meal as any)?.components);

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let macroSource = "tbca";
        let macroConfidence = "high";
        let foundCount = 0;

        for (const component of components) {
          const portionGrams = component.portion_grams || component.portion_ml || DEFAULT_PORTIONS[component.type]?.grams || 100;
          
          // Search by name_en first (more accurate), then local name
          const searchTerms = [component.name_en, component.name].filter(Boolean);
          let foodMatch = null;
          
          for (const term of searchTerms) {
            if (!term) continue;
            const { data } = await supabase
              .from("foods")
              .select("calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, source")
              .or(`name.ilike.%${term}%,name_normalized.ilike.%${normalizeText(term)}%`)
              .limit(1)
              .single();
            
            if (data) {
              foodMatch = data;
              break;
            }
          }

          if (foodMatch) {
            const factor = portionGrams / 100;
            totalCalories += Math.round(foodMatch.calories_per_100g * factor);
            totalProtein += Math.round(foodMatch.protein_per_100g * factor * 10) / 10;
            totalCarbs += Math.round(foodMatch.carbs_per_100g * factor * 10) / 10;
            totalFat += Math.round(foodMatch.fat_per_100g * factor * 10) / 10;
            totalFiber += Math.round((foodMatch.fiber_per_100g || 0) * factor * 10) / 10;
            foundCount++;
            
            if (foodMatch.source && !macroSource.includes(foodMatch.source)) {
              macroSource = foodMatch.source;
            }
          } else {
            // FALLBACK 1: Try calorieTable (curated list with official values)
            const normalizedName = normalizeForCalorieTable(component.name);
            const normalizedNameEn = component.name_en ? normalizeForCalorieTable(component.name_en) : null;
            
            let calorieTableMatch: number | null = null;
            
            // Try exact match first
            if (CALORIE_TABLE[normalizedName]) {
              calorieTableMatch = CALORIE_TABLE[normalizedName];
            } else if (normalizedNameEn && CALORIE_TABLE[normalizedNameEn]) {
              calorieTableMatch = CALORIE_TABLE[normalizedNameEn];
            } else {
              // Try partial match
              for (const [key, kcalPer100g] of Object.entries(CALORIE_TABLE)) {
                if (normalizedName.includes(key) || key.includes(normalizedName)) {
                  calorieTableMatch = kcalPer100g;
                  break;
                }
              }
            }
            
            if (calorieTableMatch !== null) {
              // Found in calorieTable - use it
              const factor = portionGrams / 100;
              totalCalories += Math.round(calorieTableMatch * factor);
              // Estimate macros based on component type with table calories
              const macroRatios: Record<string, { prot: number; carb: number; fat: number; fiber: number }> = {
                protein: { prot: 0.20, carb: 0.02, fat: 0.08, fiber: 0 },
                carb: { prot: 0.03, carb: 0.25, fat: 0.01, fiber: 0.02 },
                vegetable: { prot: 0.02, carb: 0.05, fat: 0.005, fiber: 0.025 },
                fruit: { prot: 0.01, carb: 0.12, fat: 0.003, fiber: 0.02 },
                beverage: { prot: 0.005, carb: 0.02, fat: 0.002, fiber: 0 },
                dairy: { prot: 0.04, carb: 0.05, fat: 0.03, fiber: 0 },
                fat: { prot: 0, carb: 0, fat: 0.99, fiber: 0 },
                grain: { prot: 0.03, carb: 0.22, fat: 0.01, fiber: 0.03 },
                legume: { prot: 0.08, carb: 0.18, fat: 0.01, fiber: 0.06 },
                fiber: { prot: 0.03, carb: 0.12, fat: 0.02, fiber: 0.10 },
              };
              const ratios = macroRatios[component.type] || macroRatios.carb;
              totalProtein += Math.round(portionGrams * ratios.prot * 10) / 10;
              totalCarbs += Math.round(portionGrams * ratios.carb * 10) / 10;
              totalFat += Math.round(portionGrams * ratios.fat * 10) / 10;
              totalFiber += Math.round(portionGrams * ratios.fiber * 10) / 10;
              foundCount++; // Count as found since we have official calorie data
              macroSource = "calorie_table";
            } else {
              // FALLBACK 2: Estimate based on component type (last resort)
              macroConfidence = "medium";
              const estimates: Record<string, { cal: number; prot: number; carb: number; fat: number; fiber: number }> = {
                protein: { cal: 150, prot: 25, carb: 0, fat: 5, fiber: 0 },
                carb: { cal: 120, prot: 3, carb: 25, fat: 1, fiber: 2 },
                vegetable: { cal: 25, prot: 2, carb: 5, fat: 0, fiber: 2 },
                fruit: { cal: 60, prot: 1, carb: 15, fat: 0, fiber: 2 },
                beverage: { cal: 5, prot: 0, carb: 1, fat: 0, fiber: 0 },
                dairy: { cal: 80, prot: 5, carb: 8, fat: 3, fiber: 0 },
                fat: { cal: 90, prot: 0, carb: 0, fat: 10, fiber: 0 },
                grain: { cal: 100, prot: 3, carb: 20, fat: 1, fiber: 3 },
                legume: { cal: 120, prot: 8, carb: 20, fat: 1, fiber: 6 },
                fiber: { cal: 30, prot: 2, carb: 7, fat: 0, fiber: 5 },
              };
              const est = estimates[component.type] || estimates.carb;
              const factor = portionGrams / 100;
              totalCalories += Math.round(est.cal * factor);
              totalProtein += Math.round(est.prot * factor * 10) / 10;
              totalCarbs += Math.round(est.carb * factor * 10) / 10;
              totalFat += Math.round(est.fat * factor * 10) / 10;
              totalFiber += Math.round(est.fiber * factor * 10) / 10;
            }
          }
        }

        if (foundCount === 0) {
          macroConfidence = "low";
          macroSource = "ai_estimated";
        } else if (foundCount < components.length / 2) {
          macroConfidence = "medium";
        }

        return {
          name: meal.name,
          description: meal.description,
          meal_type,
          components,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          total_fiber: totalFiber,
          macro_source: macroSource,
          macro_confidence: macroConfidence,
          country_codes: [country_code],
          language_code: regional.language.split("-")[0],
          dietary_tags: meal.dietary_tags || [],
          blocked_for_intolerances: meal.blocked_for_intolerances || [],
          flexible_options: meal.flexible_options || {},
          instructions: meal.instructions || [],
          prep_time_minutes: meal.prep_time_minutes || 15,
          is_active: true,
          source: "ai_generated",
          generated_by: "populate-meal-pool",
        };
      })
    );

    logStep("Macros calculated", { 
      meals: mealsWithMacros.map(m => ({ 
        name: m.name, 
        calories: m.total_calories,
        confidence: m.macro_confidence 
      })) 
    });

    // Insert into database (upsert to avoid duplicates)
    const inserted: string[] = [];
    const skipped: string[] = [];

    for (const meal of mealsWithMacros) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("meal_combinations")
        .select("id")
        .eq("name", meal.name)
        .eq("meal_type", meal.meal_type)
        .contains("country_codes", [country_code])
        .single();

      if (existing) {
        skipped.push(meal.name);
        continue;
      }

      const { error: insertError } = await supabase
        .from("meal_combinations")
        .insert(meal);

      if (insertError) {
        logStep("Insert error", { meal: meal.name, error: insertError.message });
        skipped.push(meal.name);
      } else {
        inserted.push(meal.name);
      }
    }

    logStep("Insertion complete", { inserted: inserted.length, skipped: skipped.length });

    // Log AI usage
    await supabase.from("ai_usage_logs").insert({
      function_name: "populate-meal-pool",
      model_used: "google/gemini-2.5-flash",
      items_generated: inserted.length,
      metadata: { country_code, meal_type, quantity, dietary_filter, strategy_key },
    });

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedMeals.length,
        inserted: inserted.length,
        skipped: skipped.length,
        meals: mealsWithMacros.map(m => ({
          name: m.name,
          calories: m.total_calories,
          protein: m.total_protein,
          carbs: m.total_carbs,
          fat: m.total_fat,
          fiber: m.total_fiber,
          confidence: m.macro_confidence,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logStep("Fatal error", { error: String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
