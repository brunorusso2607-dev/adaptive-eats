import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  CALORIE_TABLE, 
  normalizeForCalorieTable, 
  findCaloriesPerGram, 
  calculateFoodCalories 
} from "../_shared/calorieTable.ts";
import {
  getGlobalNutritionPrompt,
  getNutritionalSource,
  getPortionFormat
} from "../_shared/nutritionPrompt.ts";
import { getAIPrompt, type AIPromptData } from "../_shared/getAIPrompt.ts";
// Importar cálculos nutricionais centralizados
import {
  calculateNutritionalTargets,
  calculateMealDistribution,
  buildNutritionalContextForPrompt,
  buildMealDistributionForPrompt,
  estimateTimeToGoal,
  validateTargetsHealth,
  type UserPhysicalData,
  type NutritionalTargets,
} from "../_shared/nutritionalCalculations.ts";
// Importar cálculo de macros reais da tabela foods
import {
  calculateRealMacrosForFoods,
  type FoodItem as RealMacrosFoodItem,
} from "../_shared/calculateRealMacros.ts";
// ============= IMPORTAR CONFIGURAÇÃO COMPARTILHADA =============
import {
  REGIONAL_CONFIGS,
  DEFAULT_CONFIG,
  getRegionalConfig,
  FORBIDDEN_INGREDIENTS,
  ANIMAL_INGREDIENTS,
  DAIRY_AND_EGGS,
  FISH_INGREDIENTS,
  normalizeText,
  validateFood,
  fetchIntoleranceMappings,
  getRestrictionText,
  type RegionalConfig,
  type IntoleranceMapping,
  type SafeKeyword,
  type FoodItem,
  type ValidationResult,
} from "../_shared/mealGenerationConfig.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AI-MEAL-PLAN] ${step}${detailsStr}`);
};

// ============= TIPOS - FORMATO SIMPLIFICADO =============
interface SimpleMealOption {
  title: string;
  foods: FoodItem[];
  calories_kcal: number;
  calculated_calories?: number; // Calculado pelo script
}

interface SimpleMeal {
  meal_type: string;
  label: string;
  target_calories: number;
  options: SimpleMealOption[];
}

interface SimpleDayPlan {
  day: number;
  day_name: string;
  meals: SimpleMeal[];
  total_calories: number;
}

// Nota: REGIONAL_CONFIGS, DEFAULT_CONFIG, getRegionalConfig importados de mealGenerationConfig.ts

// Nota: getRestrictionText importado de mealGenerationConfig.ts

// ============= PROMPT DO NUTRICIONISTA HIBRIDO (SIMPLES + INTELIGENTE) =============
function buildSimpleNutritionistPrompt(params: {
  dailyCalories: number;
  meals: { type: string; label: string; targetCalories: number; targetProtein?: number; targetCarbs?: number; targetFat?: number }[];
  optionsPerMeal: number;
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
    goal: string;
  };
  dayNumber: number;
  dayName: string;
  regional: RegionalConfig;
  countryCode: string;
  baseSystemPrompt?: string; // Prompt base do banco de dados
  nutritionalContext?: string; // Contexto nutricional enriquecido
}): string {
  const { dailyCalories, meals, optionsPerMeal, restrictions, dayNumber, dayName, regional, countryCode, baseSystemPrompt, nutritionalContext } = params;

  const restrictionText = getRestrictionText(restrictions, regional.language);
  
  // Descrição das refeições para o dia
  const mealsDescription = meals.map(m => 
    `- ${m.label}: ${m.targetCalories} kcal`
  ).join('\n');

  // Template JSON MÍNIMO - apenas estrutura, sem exemplos que possam conflitar com o prompt do banco
  const mealsJsonTemplate = meals.map(m => `
    {
      "meal_type": "${m.type}",
      "label": "${m.label}",
      "target_calories": ${m.targetCalories},
      "options": []
    }`).join(',');

  // Usar o prompt do banco como FONTE ÚNICA DE VERDADE
  // Não adicionamos instruções que possam conflitar com as regras do prompt
  const systemPromptBase = baseSystemPrompt || `You are a world-class CLINICAL NUTRITIONIST with over 20 years of practical experience.
You create meals like a human professional would create for themselves, their family, or their real patients.
GOLDEN RULE: Prioritize FOOD NATURALNESS over nutritional optimization. Food with soul, not formula.`;

  // APENAS dados dinâmicos que o prompt do banco precisa saber
  // NÃO incluímos instruções de formato - essas vêm do banco
  const dynamicData = `
==========================================================
DYNAMIC DATA FOR THIS GENERATION:
==========================================================

IDIOMA: ${regional.languageName}
PAÍS: ${countryCode}

CALORIAS DIÁRIAS: ${dailyCalories} kcal

REFEIÇÕES DO DIA:
${mealsDescription}

--------------------------------------------------
RESTRIÇÕES OBRIGATÓRIAS:
--------------------------------------------------
${restrictionText}

--------------------------------------------------
TAREFA:
--------------------------------------------------
Gerar cardápio para ${dayName} (Dia ${dayNumber})${optionsPerMeal > 1 ? ` com ${optionsPerMeal} variações por refeição` : ''}.

--------------------------------------------------
RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO:
--------------------------------------------------
{
  "day": ${dayNumber},
  "day_name": "${dayName}",
  "meals": [${mealsJsonTemplate}
  ],
  "total_calories": ${dailyCalories}
}

IMPORTANTE: 
- O campo "title" DEVE ser o NOME DESCRITIVO DA REFEIÇÃO (ex: "Omelete de queijo com torradas", "Salada Caesar com frango grelhado").
- NUNCA use nomes genéricos como "Opção 1", "Opção 2", "Refeição 1", etc.

📐 FORMATO DOS ALIMENTOS (foods):
Cada item: {"name": "QUANTIDADE + ALIMENTO", "grams": NÚMERO}
- O campo "name" DEVE incluir APENAS medida caseira qualitativa (NUNCA números de gramas)
- O campo "grams" DEVE ser um NÚMERO PURO (sem "g"): 120, 150, 100

🚫 REGRA ANTI-DUPLICAÇÃO DE GRAMAGEM (CRÍTICO):
- NUNCA inclua números de gramas no campo "name" - a gramagem já aparece no campo "grams"
- ERRADO: "100g de atum em conserva" ❌
- CERTO: "1 porção de atum em conserva" ✓

🥪 REGRA DE ALIMENTOS-VEÍCULO (wraps, pães, tortillas):
- Wraps, pães e tortillas são "veículos" que PRECISAM de recheio
- SEMPRE apresentar como item COMPOSTO incluindo o recheio principal
- ERRADO: listar "1 wrap integral" separado do recheio ❌
- CERTO: "1 wrap integral recheado com atum e alface" ✓
- CERTO: "1 sanduíche de pão integral com frango e tomate" ✓

⚠️ REGRA DE MEDIDAS CASEIRAS (OBRIGATÓRIO):
- LÍQUIDOS (água, sucos, chás, leite, caldos, sopas): usar "xícara", "copo", "ml"
- PROTEÍNAS (carnes, peixes, frango): usar "filé", "pedaço", "porção"
- OVOS: usar "unidade" (ex: "2 ovos cozidos")
- GRÃOS/ARROZ/MASSAS: usar "colher de sopa", "colher de servir", "porção"
- VEGETAIS SÓLIDOS (brócolis, cenoura, alface): usar "porção", "folhas", "floretes", "ramos" (NUNCA "xícara")
- FRUTAS: usar "unidade" + tamanho (ex: "1 banana média", "1 maçã pequena")
- GORDURAS/ÓLEOS: usar "colher de sopa", "colher de chá"

Exemplos CORRETOS:
{"name": "1 filé médio de salmão grelhado", "grams": 120}
{"name": "2 colheres de sopa de arroz integral", "grams": 150}
{"name": "1 porção de brócolis cozido", "grams": 100}
{"name": "1 banana média", "grams": 120}
{"name": "1 xícara de chá verde", "grams": 200}
{"name": "1 wrap integral recheado com atum e alface", "grams": 200}
{"name": "1 porção de atum em conserva", "grams": 100}

Exemplos INCORRETOS (NÃO FAZER):
{"name": "100g de atum em conserva", "grams": 100} ❌ (gramagem duplicada)
{"name": "1 wrap integral", "grams": 50} ❌ (wrap sem recheio)
{"name": "1 xícara de brócolis", "grams": 100} ❌ (brócolis é sólido)
{"name": "Salmão", "grams": "120g"} ❌ (sem medida caseira)
{"name": "Arroz", "grams": 150} ❌ (sem medida caseira)

Cada opção deve ter: "title" (nome descritivo), "foods" (array), "calories_kcal"`;

  // PROMPT LIMPO: apenas prompt do banco + dados dinâmicos
  // Removido: globalNutritionPrompt, enrichedNutritionalContext, exemplos conflitantes
  return `${systemPromptBase}

${dynamicData}`;
}

// ============= DISTRIBUICAO CALORICA =============
const CALORIE_DISTRIBUTION: Record<string, number> = {
  cafe_manha: 0.22,
  lanche_manha: 0.08,
  almoco: 0.30,
  lanche_tarde: 0.10,
  jantar: 0.22,
  ceia: 0.08,
};

// Nota: FORBIDDEN_INGREDIENTS, ANIMAL_INGREDIENTS, DAIRY_AND_EGGS, FISH_INGREDIENTS,
// fetchIntoleranceMappings, normalizeText, validateFood, IntoleranceMapping, SafeKeyword
// são importados de mealGenerationConfig.ts

// Função local para verificar ingredientes proibidos (wrapper para uso interno)
function checkForbiddenIngredient(
  food: string,
  forbiddenList: string[],
  safeKeywords: string[] = []
): boolean {
  const normalizedFood = normalizeText(food);
  
  // Primeiro verifica se é seguro (ex: "leite de coco" é seguro para lactose)
  for (const safe of safeKeywords) {
    if (normalizedFood.includes(normalizeText(safe))) {
      return false; // É seguro, não é proibido
    }
  }
  
  // Depois verifica se contém ingrediente proibido
  for (const forbidden of forbiddenList) {
    if (normalizedFood.includes(normalizeText(forbidden))) {
      return true; // Contém ingrediente proibido
    }
  }
  
  return false;
}

// ============= CÁLCULO DE CALORIAS (usa tabela compartilhada) =============
function calculateOptionCalories(foods: FoodItem[]): number {
  return foods.reduce((total, food) => {
    const result = calculateFoodCalories(food.name, food.grams);
    return total + result.calories;
  }, 0);
}

function validateMealPlan(
  dayPlan: SimpleDayPlan,
  restrictions: {
    intolerances: string[];
    dietaryPreference: string;
    excludedIngredients: string[];
  },
  dbMappings: IntoleranceMapping[],
  dbSafeKeywords: SafeKeyword[]
): {
  validatedPlan: SimpleDayPlan;
  violations: Array<{ meal: string; food: string; reason: string; restriction: string }>;
  needsRegeneration: boolean;
} {
  const violations: Array<{ meal: string; food: string; reason: string; restriction: string }> = [];
  let needsRegeneration = false;
  
  const validatedMeals = dayPlan.meals.map(meal => {
    const validatedOptions = meal.options.map(option => {
      const cleanedFoods: FoodItem[] = [];
      
      for (const food of option.foods) {
        const foodName = typeof food === 'string' ? food : food.name;
        const validation = validateFood(foodName, restrictions, dbMappings, dbSafeKeywords);
        
        if (validation.isValid) {
          cleanedFoods.push(food);
        } else {
          violations.push({
            meal: meal.label,
            food: foodName,
            reason: validation.reason || 'Restrição violada',
            restriction: validation.restriction || 'unknown',
          });
        }
      }
      
      // Calcular calorias baseado na tabela
      const calculatedCalories = calculateOptionCalories(cleanedFoods);
      
      // CRITICAL: Se todos os alimentos foram removidos, marca para regeneração
      // NÃO coloca placeholder - isso cria receitas inválidas
      if (cleanedFoods.length === 0) {
        needsRegeneration = true;
        logStep(`❌ CRITICAL: Option "${option.title}" has all foods removed by restrictions - needs regeneration`);
      }
      
      return {
        ...option,
        // Manter os alimentos originais se cleanedFoods estiver vazio para permitir regeneração
        // O sistema deve regenerar essa refeição, não exibir um placeholder
        foods: cleanedFoods.length > 0 ? cleanedFoods : option.foods,
        calculated_calories: calculatedCalories > 0 ? calculatedCalories : option.calories_kcal,
        calories_kcal: calculatedCalories > 0 ? calculatedCalories : option.calories_kcal,
        _needsRegeneration: cleanedFoods.length === 0, // Flag interna para marcar opções problemáticas
      };
    });
    
    return {
      ...meal,
      options: validatedOptions,
    };
  });
  
  return {
    validatedPlan: {
      ...dayPlan,
      meals: validatedMeals,
    },
    violations,
    needsRegeneration,
  };
}

// ============= MAIN SERVER =============
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
    logStep("AI Meal Plan Generator - Hybrid Mode (Simple + Smart)");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Parse request
    const requestBody = await req.json();
    const {
      dailyCalories: requestedCalories, // Pode ser undefined, será calculado
      daysCount = 1,
      optionsPerMeal = 3,
      mealTypes: requestedMealTypes, // Pode ser undefined, será buscado do perfil
      // Novos parâmetros para salvar no banco (vindos do MealPlanGenerator)
      planName,
      startDate,
      existingPlanId,
      weekNumber,
      customMealTimes,
      saveToDatabase = false, // Por padrão não salva (modo teste admin)
    } = requestBody;
    
    // Detectar automaticamente se deve salvar no banco
    const shouldSaveToDatabase = saveToDatabase || planName || startDate;

    logStep("Request params", { requestedCalories, daysCount, optionsPerMeal, requestedMealTypes, shouldSaveToDatabase });

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    
    // ============= DETERMINAR MEAL TYPES BASEADO NO PERFIL =============
    // Prioridade: 1) requestedMealTypes (da request), 2) enabled_meals (do perfil), 3) default 5 refeições
    const DEFAULT_MEAL_TYPES = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar"];
    
    logStep("🔍 DEBUG: Checking mealTypes sources", { 
      requestedMealTypes, 
      profileEnabledMeals: profile.enabled_meals,
      hasRequestedTypes: !!(requestedMealTypes && Array.isArray(requestedMealTypes) && requestedMealTypes.length > 0),
      hasProfileTypes: !!(profile.enabled_meals && Array.isArray(profile.enabled_meals) && profile.enabled_meals.length > 0)
    });
    
    let mealTypes: string[];
    if (requestedMealTypes && Array.isArray(requestedMealTypes) && requestedMealTypes.length > 0) {
      // Usar os tipos passados na request
      mealTypes = requestedMealTypes;
      logStep("✅ Using mealTypes from REQUEST", { mealTypes, count: mealTypes.length });
    } else if (profile.enabled_meals && Array.isArray(profile.enabled_meals) && profile.enabled_meals.length > 0) {
      // Usar os tipos do perfil do usuário
      // Normalizar nomes: "lanche" -> "lanche_tarde" para manter consistência
      mealTypes = profile.enabled_meals.map((meal: string) => {
        if (meal === "lanche") return "lanche_tarde";
        return meal;
      });
      logStep("✅ Using mealTypes from PROFILE (enabled_meals)", { mealTypes, count: mealTypes.length, original: profile.enabled_meals });
    } else {
      // Fallback para default
      mealTypes = DEFAULT_MEAL_TYPES;
      logStep("⚠️ Using DEFAULT mealTypes (no source found)", { mealTypes, count: mealTypes.length });
    }
    
    logStep("📋 FINAL mealTypes to generate", { mealTypes, count: mealTypes.length });
    
    // Get regional configuration based on user's country
    const userCountry = profile.country || 'BR';
    const regional = getRegionalConfig(userCountry);
    
    logStep("Regional config", { country: userCountry, language: regional.language });

    const restrictions = {
      intolerances: profile.intolerances || [],
      dietaryPreference: profile.dietary_preference || 'comum',
      excludedIngredients: profile.excluded_ingredients || [],
      goal: profile.goal || 'manter',
    };

    logStep("User restrictions", restrictions);

    // ============= CÁLCULOS NUTRICIONAIS CENTRALIZADOS =============
    // Calcular targets nutricionais baseados no perfil do usuário
    let nutritionalTargets: NutritionalTargets | null = null;
    let dailyCalories = requestedCalories || 2000; // Fallback padrão
    let nutritionalContext = ""; // Contexto para enriquecer o prompt
    
    if (profile.weight_current && profile.height && profile.age && profile.sex) {
      const physicalData: UserPhysicalData = {
        sex: profile.sex ?? null,
        age: profile.age ?? null,
        height: profile.height ?? null,
        weight_current: profile.weight_current ?? null,
        weight_goal: profile.weight_goal ?? null,
        activity_level: profile.activity_level ?? null,
      };

      // Determinar parâmetros de estratégia baseado no objetivo
      const goal = profile.goal || 'manter';
      const dietaryPreference = profile.dietary_preference || 'comum';
      
      let calorieModifier = 0;
      let proteinPerKg = 1.6;
      let carbRatio = 0.45;
      let fatRatio = 0.30;

      // Ajustes por objetivo
      if (goal === 'emagrecer') {
        calorieModifier = -500;
        proteinPerKg = 2.0;
      } else if (goal === 'ganhar_peso') {
        calorieModifier = 400;
        proteinPerKg = 2.2;
      }

      // Ajustes por dieta
      if (dietaryPreference === 'cetogenica') {
        carbRatio = 0.10;
        fatRatio = 0.70;
      } else if (dietaryPreference === 'low_carb') {
        carbRatio = 0.25;
        fatRatio = 0.40;
      }

      const strategyParams = {
        calorieModifier,
        proteinPerKg,
        carbRatio,
        fatRatio,
      };

      nutritionalTargets = calculateNutritionalTargets(physicalData, strategyParams);
      
      if (nutritionalTargets) {
        // Se não foi passado dailyCalories na request, usar o calculado
        if (!requestedCalories) {
          dailyCalories = nutritionalTargets.targetCalories;
        }
        
        // Gerar contexto nutricional para o prompt
        nutritionalContext = buildNutritionalContextForPrompt(nutritionalTargets);
        nutritionalContext += "\n" + buildMealDistributionForPrompt(nutritionalTargets, mealTypes);
        
        // Validar saúde dos targets
        const healthCheck = validateTargetsHealth(nutritionalTargets);
        if (!healthCheck.isHealthy) {
          logStep("⚠️ Health warnings", { warnings: healthCheck.warnings });
        }
        
        // Estimar tempo para atingir meta (se aplicável)
        if (profile.weight_goal && calorieModifier !== 0) {
          const timeEstimate = estimateTimeToGoal(
            profile.weight_current,
            profile.weight_goal,
            calorieModifier
          );
          if (timeEstimate) {
            logStep("Goal time estimate", { weeks: timeEstimate.weeks, months: timeEstimate.months });
          }
        }
        
        logStep("Nutritional targets calculated", {
          bmr: nutritionalTargets.bmr,
          tdee: nutritionalTargets.tdee,
          targetCalories: nutritionalTargets.targetCalories,
          protein: nutritionalTargets.protein,
          carbs: nutritionalTargets.carbs,
          fat: nutritionalTargets.fat,
        });
      }
    } else {
      logStep("Incomplete profile data, using default calories", { dailyCalories });
    }

    // Fetch intolerance mappings from database for validation
    logStep("Fetching intolerance mappings from database");
    const { mappings: dbMappings, safeKeywords: dbSafeKeywords } = await fetchIntoleranceMappings(supabaseClient);
    logStep("Intolerance mappings loaded", { 
      mappingsCount: dbMappings.length, 
      safeKeywordsCount: dbSafeKeywords.length 
    });

    // Buscar prompt do banco de dados
    let aiPromptData: AIPromptData | null = null;
    try {
      aiPromptData = await getAIPrompt('generate-ai-meal-plan');
      logStep("AI Prompt loaded from database", { 
        functionId: aiPromptData.function_id,
        model: aiPromptData.model,
        promptLength: aiPromptData.system_prompt.length,
        promptPreview: aiPromptData.system_prompt.substring(0, 200) + '...'
      });
    } catch (promptError) {
      logStep("❌ CRITICAL: Could not load AI prompt from database, using fallback", { 
        error: promptError instanceof Error ? promptError.message : 'Unknown error' 
      });
    }

    // Build meals with target calories and regional labels
    // IMPORTANTE: Se o usuário passou dailyCalories explicitamente, devemos respeitar essa preferência
    // mesmo que tenhamos nutritionalTargets calculados do perfil
    let meals;
    if (nutritionalTargets) {
      // Se o usuário passou calorias explicitamente, ajustar os targets para respeitar
      const effectiveTargets = requestedCalories 
        ? {
            ...nutritionalTargets,
            targetCalories: dailyCalories, // Usar as calorias solicitadas pelo usuário
            // Recalcular macros proporcionalmente
            protein: Math.round(nutritionalTargets.protein * (dailyCalories / nutritionalTargets.targetCalories)),
            carbs: Math.round(nutritionalTargets.carbs * (dailyCalories / nutritionalTargets.targetCalories)),
            fat: Math.round(nutritionalTargets.fat * (dailyCalories / nutritionalTargets.targetCalories)),
          }
        : nutritionalTargets;
      
      logStep("Using effective calorie target", { 
        requested: requestedCalories, 
        calculated: nutritionalTargets.targetCalories, 
        effective: effectiveTargets.targetCalories 
      });
      
      const mealDistribution = calculateMealDistribution(effectiveTargets, mealTypes);
      meals = mealDistribution.map((dist) => ({
        type: dist.mealType,
        label: regional.mealLabels[dist.mealType] || dist.label,
        targetCalories: dist.calories,
        targetProtein: dist.protein,
        targetCarbs: dist.carbs,
        targetFat: dist.fat,
      }));
      logStep("Meal distribution calculated from nutritional targets", { 
        meals: meals.map(m => ({ type: m.type, cal: m.targetCalories, prot: m.targetProtein })) 
      });
    } else {
      meals = mealTypes.map((type: string) => ({
        type,
        label: regional.mealLabels[type] || type,
        targetCalories: Math.round(dailyCalories * (CALORIE_DISTRIBUTION[type] || 0.10)),
      }));
    }

    // Generate plan for each day
    const generatedDays: SimpleDayPlan[] = [];
    const allViolations: Array<{ day: number; meal: string; food: string; reason: string; restriction: string }> = [];

    for (let dayIndex = 0; dayIndex < daysCount; dayIndex++) {
      const dayName = regional.dayNames?.[dayIndex % 7] || `Day ${dayIndex + 1}`;
      
      logStep(`Generating day ${dayIndex + 1}`, { dayName, language: regional.language });

      const prompt = buildSimpleNutritionistPrompt({
        dailyCalories,
        meals,
        optionsPerMeal,
        restrictions,
        dayNumber: dayIndex + 1,
        dayName,
        regional,
        countryCode: userCountry,
        baseSystemPrompt: aiPromptData?.system_prompt, // Passa o prompt do banco
        nutritionalContext, // Contexto nutricional enriquecido
      });

      // Call Google AI API directly
      const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY not configured");

      // Usar modelo do banco ou fallback para gemini-2.0-flash-lite
      const modelName = aiPromptData?.model || 'gemini-2.0-flash-lite';
      logStep(`Using AI model: ${modelName}`);

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8192,
            }
          }),
        }
      );

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        logStep("AI API Error", { status: aiResponse.status, error: errorText });
        
        if (aiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a few minutes.");
        }
        throw new Error(`AI API error: ${aiResponse.status} - ${errorText}`);
      }

      const aiData = await aiResponse.json();
      let content = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      logStep("AI response received", { contentLength: content.length });

      // Parse JSON from response
      let dayPlanValidated: SimpleDayPlan | null = null;
      let retryCount = 0;
      const MAX_RETRIES = 2; // Máximo de tentativas para regenerar se houver violações críticas
      
      while (!dayPlanValidated && retryCount <= MAX_RETRIES) {
        try {
          // Remove markdown code blocks if present
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          const dayPlan: SimpleDayPlan = JSON.parse(content);
          
          // ============= VALIDAÇÃO PÓS-GERAÇÃO =============
          logStep(`Validating day ${dayIndex + 1} against restrictions (attempt ${retryCount + 1})`);
          
          const validationResult = validateMealPlan(
            dayPlan,
            {
              intolerances: restrictions.intolerances,
              dietaryPreference: restrictions.dietaryPreference,
              excludedIngredients: restrictions.excludedIngredients,
            },
            dbMappings,
            dbSafeKeywords
          );
          
          // Registrar violações encontradas
          if (validationResult.violations.length > 0) {
            logStep(`⚠️ VIOLATIONS FOUND on day ${dayIndex + 1}`, {
              count: validationResult.violations.length,
              violations: validationResult.violations,
              needsRegeneration: validationResult.needsRegeneration,
            });
            
            // Adicionar ao array de todas as violações
            validationResult.violations.forEach(v => {
              allViolations.push({
                day: dayIndex + 1,
                ...v,
              });
            });
            
            // Se precisa regenerar e ainda tem tentativas, tenta de novo
            if (validationResult.needsRegeneration && retryCount < MAX_RETRIES) {
              logStep(`🔄 Regenerating day ${dayIndex + 1} due to critical violations...`);
              retryCount++;
              
              // Fazer nova chamada à API com temperatura um pouco maior
              const retryResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${aiPromptData?.model || 'gemini-2.0-flash-lite'}:generateContent?key=${GOOGLE_AI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt + `\n\nIMPORTANTE: O plano anterior continha alimentos proibidos. Gere um plano COMPLETAMENTE novo com APENAS alimentos seguros para as restrições do usuário.` }] }],
                    generationConfig: {
                      temperature: 0.7 + (retryCount * 0.1), // Aumenta temperatura a cada retry
                      maxOutputTokens: 8192,
                    }
                  }),
                }
              );
              
              if (retryResponse.ok) {
                const retryData = await retryResponse.json();
                content = retryData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                logStep(`Retry ${retryCount} response received`, { contentLength: content.length });
                continue; // Tenta validar novamente
              }
            }
          } else {
            logStep(`✓ Day ${dayIndex + 1} passed validation - no violations`);
          }
          
          // Usar o plano validado
          dayPlanValidated = validationResult.validatedPlan;
          
          logStep(`Day ${dayIndex + 1} generated and validated`, { 
            mealsCount: validationResult.validatedPlan.meals?.length,
            totalCalories: validationResult.validatedPlan.total_calories,
            violationsRemoved: validationResult.violations.length,
            retries: retryCount,
          });
        } catch (parseError) {
          logStep("JSON parse error", { error: parseError, content: content.substring(0, 500) });
          retryCount++;
          if (retryCount > MAX_RETRIES) {
            throw new Error(`Failed to parse AI response for day ${dayIndex + 1}`);
          }
        }
      }
      
      if (dayPlanValidated) {
        generatedDays.push(dayPlanValidated);
      } else {
        throw new Error(`Failed to generate valid plan for day ${dayIndex + 1} after ${MAX_RETRIES} retries`);
      }
    }

    // Log summary of all violations
    if (allViolations.length > 0) {
      logStep("⚠️ TOTAL VIOLATIONS SUMMARY", {
        totalViolations: allViolations.length,
        byRestriction: allViolations.reduce((acc, v) => {
          acc[v.restriction] = (acc[v.restriction] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      });
    } else {
      logStep("✓ ALL DAYS PASSED VALIDATION - no violations detected");
    }

    logStep("All days generated and validated", { totalDays: generatedDays.length });

    // ============= SALVAR NO BANCO DE DADOS (se solicitado) =============
    if (shouldSaveToDatabase) {
      logStep("Saving to database...");
      
      const start = startDate ? new Date(startDate) : new Date();
      const endDate = new Date(start);
      endDate.setDate(endDate.getDate() + daysCount - 1);
      
      let mealPlanIdToUse = existingPlanId;
      let mealPlan;
      
      if (existingPlanId) {
        // Atualizar plano existente
        const { data: existingPlan, error: fetchError } = await supabaseClient
          .from("meal_plans")
          .select("*")
          .eq("id", existingPlanId)
          .eq("user_id", user.id)
          .single();

        if (fetchError || !existingPlan) {
          throw new Error("Plano alimentar não encontrado");
        }

        const newEndDate = endDate.toISOString().split('T')[0];
        
        const updateData: any = { 
          updated_at: new Date().toISOString(),
          custom_meal_times: customMealTimes || existingPlan.custom_meal_times || null
        };
        
        if (newEndDate > existingPlan.end_date) {
          updateData.end_date = newEndDate;
        }
        
        await supabaseClient
          .from("meal_plans")
          .update(updateData)
          .eq("id", existingPlanId);
        
        mealPlan = { ...existingPlan, custom_meal_times: customMealTimes || existingPlan.custom_meal_times };
        mealPlanIdToUse = existingPlan.id;
        logStep("Updated existing meal plan", { planId: mealPlanIdToUse });
      } else {
        // Criar novo plano
        const { data: newPlan, error: planError } = await supabaseClient
          .from("meal_plans")
          .insert({
            user_id: user.id,
            name: planName || `Plano ${start.toLocaleDateString('pt-BR')}`,
            start_date: start.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            is_active: true,
            custom_meal_times: customMealTimes || null
          })
          .select()
          .single();

        if (planError) throw new Error(`Error creating meal plan: ${planError.message}`);
        
        mealPlan = newPlan;
        mealPlanIdToUse = newPlan.id;
        logStep("Meal plan created", { planId: mealPlanIdToUse });

        // Desativar outros planos
        await supabaseClient
          .from("meal_plans")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .neq("id", mealPlanIdToUse);
      }

      // Converter os dias gerados para meal_plan_items COM MACROS REAIS
      const items: any[] = [];
      const targetWeekNum = weekNumber || 1;
      let totalFromDb = 0;
      let totalFromAi = 0;
      
      for (let dayIndex = 0; dayIndex < generatedDays.length; dayIndex++) {
        const day = generatedDays[dayIndex];
        
        for (const meal of day.meals) {
          // Pegar a primeira opção de cada refeição (optionsPerMeal = 1)
          const firstOption = meal.options?.[0];
          if (!firstOption) continue;
          
          // CRITICAL: Não salvar opções que foram marcadas para regeneração
          if ((firstOption as any)._needsRegeneration) {
            logStep(`⚠️ Skipping meal "${firstOption.title}" - marked for regeneration due to restriction violations`);
            continue;
          }
          
          // Preparar foods para cálculo de macros reais
          const foodsForCalculation: RealMacrosFoodItem[] = (firstOption.foods || []).map((food: any) => {
            if (typeof food === 'string') {
              return { name: food, grams: 100 }; // Estimativa padrão
            }
            return {
              name: food.name || food.item || "",
              grams: food.grams || 100,
            };
          });
          
          // CALCULAR MACROS REAIS usando a tabela foods
          logStep(`Calculating real macros for meal: ${firstOption.title}`, { 
            ingredients: foodsForCalculation.length 
          });
          
          const macroResult = await calculateRealMacrosForFoods(
            supabaseClient,
            foodsForCalculation
          );
          
          totalFromDb += macroResult.fromDb;
          totalFromAi += macroResult.fromAi;
          
          // Calcular totais dos macros
          const totalMacros = macroResult.items.reduce(
            (acc, item) => ({
              calories: acc.calories + item.calories,
              protein: acc.protein + item.protein,
              carbs: acc.carbs + item.carbs,
              fat: acc.fat + item.fat,
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );
          
          // Converter foods para o formato recipe_ingredients (com macros individuais)
          const recipeIngredients = macroResult.items.map((item) => ({
            item: item.name,
            quantity: `${item.grams}g`,
            unit: "",
            calories: item.calories,
            protein: item.protein,
            carbs: item.carbs,
            fat: item.fat,
            source: item.source,
            food_id: item.food_id,
          }));
          
          items.push({
            meal_plan_id: mealPlanIdToUse,
            day_of_week: dayIndex,
            meal_type: meal.meal_type,
            recipe_name: firstOption.title || meal.label,
            recipe_calories: Math.round(totalMacros.calories),
            recipe_protein: Math.round(totalMacros.protein * 10) / 10,
            recipe_carbs: Math.round(totalMacros.carbs * 10) / 10,
            recipe_fat: Math.round(totalMacros.fat * 10) / 10,
            recipe_prep_time: 15,
            recipe_ingredients: recipeIngredients,
            recipe_instructions: [],
            week_number: targetWeekNum
          });
        }
      }

      const totalIngredients = totalFromDb + totalFromAi;
      const matchRate = totalIngredients > 0 ? Math.round((totalFromDb / totalIngredients) * 100) : 0;
      
      logStep("Real macros calculation complete", { 
        matchRate: `${matchRate}%`,
        fromDatabase: totalFromDb,
        fromAI: totalFromAi,
      });

      logStep("Inserting meal items with real macros", { count: items.length });

      const { error: itemsError } = await supabaseClient
        .from("meal_plan_items")
        .insert(items);

      if (itemsError) throw new Error(`Error creating meal plan items: ${itemsError.message}`);
      logStep("Meal plan items created", { count: items.length });

      return new Response(
        JSON.stringify({
          success: true,
          plan: {
            id: mealPlanIdToUse,
            daily_calories: dailyCalories,
            options_per_meal: optionsPerMeal,
            restrictions,
            regional: {
              country: userCountry,
              language: regional.language,
              measurement_system: regional.measurementSystem,
            },
            days: generatedDays,
            items: items
          },
          mealPlan: {
            id: mealPlanIdToUse,
            ...mealPlan,
            items: items
          },
          stats: {
            daysGenerated: generatedDays.length,
            totalMeals: items.length,
            macrosFromDatabase: totalFromDb,
            macrosFromAI: totalFromAi,
            databaseMatchRate: matchRate,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Retorno padrão para modo teste (sem salvar no banco)
    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          daily_calories: dailyCalories,
          options_per_meal: optionsPerMeal,
          restrictions,
          regional: {
            country: userCountry,
            language: regional.language,
            measurement_system: regional.measurementSystem,
          },
          days: generatedDays,
        },
        validation: {
          totalViolationsRemoved: allViolations.length,
          violations: allViolations.length > 0 ? allViolations : undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    logStep("Error", { message: errorMessage, stack: errorStack });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
