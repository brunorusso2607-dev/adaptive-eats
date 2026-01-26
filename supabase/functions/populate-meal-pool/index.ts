import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// v2.8 - ml para bebidas + placeholder fix

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
  validateIngredient,
  normalizeUserIntolerances,
  type SafetyDatabase,
  type UserRestrictions,
} from "../_shared/globalSafetyEngine.ts";

import {
  CALORIE_TABLE,
  normalizeForCalorieTable,
} from "../_shared/calorieTable.ts";

import { generateMealsForPool } from "../_shared/advanced-meal-generator.ts";
import { processRawMeal, type RawComponent } from "../_shared/unified-meal-core/index.ts";
import type { MealType as UnifiedMealType } from "../_shared/unified-meal-core/types.ts";

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
  canonical_id?: string; // ID do canonical_ingredients
  portion_grams?: number; // Será calculado pelo TypeScript
  portion_ml?: number; // Será calculado pelo TypeScript
  portion_label?: string; // Será calculado pelo TypeScript
}

interface GeneratedMeal {
  name: string;
  description: string;
  cultural_reason?: string; // Por que este prato é comum no país
  meal_density?: "light" | "moderate" | "heavy"; // Densidade calórica para balanceamento de 30 dias
  components: MealComponent[];
  dietary_tags: string[];
  blocked_for_intolerances: string[];
  flexible_options: Record<string, string[]>;
  instructions: string[];
  prep_time_minutes: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  autoFixed: boolean;
  fixedMeal?: GeneratedMeal;
}

interface CanonicalIngredient {
  id: string;
  name_en: string;
  name_pt: string;
  category: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    logStep("Environment variables loaded");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    logStep("Supabase client created");

    const body = await req.json();
    logStep("Request body parsed", { body });
    
    const { 
      country_code = "BR", 
      meal_type, 
      quantity = 5,
      dietary_filter = null,
      strategy_key = null,
      intolerance_filter = null,
    } = body;

    logStep("Starting meal pool generation", { country_code, meal_type, quantity, dietary_filter, strategy_key, intolerance_filter });

    // Validate meal_type
    const validMealTypes = ["cafe_manha", "lanche_manha", "almoco", "lanche_tarde", "jantar", "ceia"];
    if (!validMealTypes.includes(meal_type)) {
      throw new Error(`Invalid meal_type. Use: ${validMealTypes.join(", ")}`);
    }

    // Get regional config from shared module
    const regional = getRegionalConfig(country_code);
    logStep("Regional config loaded", { language: regional.language, country: country_code });

    // ============= USAR GERADOR DE TEMPLATES (SEM IA) =============
    logStep("Using template-based generator (no AI)");
    
    // Preparar lista de intolerâncias
    const intolerances = intolerance_filter ? [intolerance_filter] : [];
    
    // Buscar combinações rejeitadas pelo admin
    const { data: rejectedData } = await supabase
      .from("rejected_meal_combinations")
      .select("combination_hash")
      .eq("meal_type", meal_type)
      .eq("country_code", country_code);
    
    const rejectedCombinations = new Set<string>(
      rejectedData?.map((r: any) => r.combination_hash as string) || []
    );
    
    logStep("Rejected combinations loaded", { count: rejectedCombinations.size });
    
    // Criar perfil simulado para estratégia de integrais
    // Em produção, isso virá do usuário real
    const profile = {
      goal: strategy_key as 'maintain' | 'weight_loss' | 'muscle_gain' | 'diabetes' || 'maintain',
      accepts_whole_grains: null as boolean | null, // null = neutro (usa distribuição padrão)
      has_diabetes: false
    };
    
    logStep("Profile for carb strategy", { profile });
    
    
    // Gerar refeições usando templates TypeScript com estratégia de integrais
    let generatedMeals: GeneratedMeal[];
    try {
      const rawMeals = generateMealsForPool(meal_type, quantity, country_code, intolerances, rejectedCombinations, profile) as any;
      logStep("Meals generated from templates", { count: rawMeals.length });
      
      // Usar refeições diretamente (bypass Unified Core por enquanto)
      generatedMeals = rawMeals;
      
      logStep("Meals ready for processing", { count: generatedMeals.length });
    } catch (error) {
      logStep("Error generating meals from templates", { error: String(error) });
      throw error;
    }

    // Log TODAS as refeições para debug
    for (let i = 0; i < Math.min(generatedMeals.length, 3); i++) {
      const meal = generatedMeals[i] as any;
      logStep(`DEBUG Meal ${i + 1}`, {
        name: meal?.name,
        hasComponents: !!meal?.components,
        componentsType: typeof meal?.components,
        componentsIsArray: Array.isArray(meal?.components),
        componentsLength: Array.isArray(meal?.components) ? meal.components.length : 0,
        componentsRaw: JSON.stringify(meal?.components)?.slice(0, 500),
        allKeys: meal ? Object.keys(meal) : [],
      });
    }
    
    // Normalize + filter out invalid meals (missing or invalid components)
    const validMeals: GeneratedMeal[] = [];
    for (const meal of generatedMeals) {
      if (!meal || typeof meal !== "object") continue;

      const rawComponents = (meal as any)?.components;
      const components = rawComponents || [];

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

    // ============= FILTRO DE INTOLERÂNCIAS COM SAFETY ENGINE =============
    let filteredMeals = validMeals;
    
    if (intolerances.length > 0) {
      logStep("Applying Safety Engine filter for intolerances", { intolerances });
      
      try {
        // Carregar Safety Database
        const safetyDb = await loadSafetyDatabase();
        logStep("Safety Database loaded");
        
        // Normalizar intolerâncias do usuário
        const normalizedIntolerances = normalizeUserIntolerances(intolerances, safetyDb);
        logStep("Normalized intolerances", { normalizedIntolerances });
        
        // Criar restrições do usuário
        const restrictions: UserRestrictions = {
          intolerances: intolerances,
          dietaryPreference: null,
          excludedIngredients: []
        };
        
        // Filtrar refeições que contêm ingredientes proibidos
        filteredMeals = validMeals.filter(meal => {
          const components = meal.components || [];
          
          for (const component of components) {
            const ingredientName = component.name || '';
            const ingredientKey = (component as any).ingredient_key || '';
            
            // Validar pelo nome do ingrediente
            const nameResult = validateIngredient(ingredientName, restrictions, safetyDb);
            if (!nameResult.isValid) {
              logStep("Meal rejected by Safety Engine", {
                mealName: meal.name,
                ingredient: ingredientName,
                reason: nameResult.reason
              });
              return false;
            }
            
            // Validar também pelo ingredient_key se existir
            if (ingredientKey) {
              const keyResult = validateIngredient(ingredientKey, restrictions, safetyDb);
              if (!keyResult.isValid) {
                logStep("Meal rejected by Safety Engine (key)", {
                  mealName: meal.name,
                  ingredientKey: ingredientKey,
                  reason: keyResult.reason
                });
                return false;
              }
            }
          }
          
          return true;
        });
        
        logStep("Meals after Safety Engine filter", { 
          before: validMeals.length, 
          after: filteredMeals.length,
          filtered: validMeals.length - filteredMeals.length
        });
        
      } catch (safetyError) {
        logStep("Safety Engine error - continuing without filter", { error: String(safetyError) });
        // Se o Safety Engine falhar, continuar com as refeições originais
        filteredMeals = validMeals;
      }
    }

    // Warning se gerou menos que solicitado
    if (filteredMeals.length < quantity && filteredMeals.length > 0) {
      logStep("Warning: Generated fewer meals than requested", {
        requested: quantity,
        generated: filteredMeals.length,
        missing: quantity - filteredMeals.length,
        message: "Continuing with available meals. Consider relaxing validations or adding more templates."
      });
    }

    // If no valid meals, throw an error with details
    if (filteredMeals.length === 0 && generatedMeals.length > 0) {
      logStep("All meals filtered out - generator returned meals without valid components or all rejected by Safety Engine");
      throw new Error("No valid meals after filtering. Please try again or adjust intolerance settings.");
    }

    // Load canonical ingredients for lookup
    const { data: canonicalIngredients } = await supabase
      .from("canonical_ingredients")
      .select("*")
      .eq("is_active", true);
    
    const canonicalMap = new Map<string, CanonicalIngredient>();
    const canonicalByNamePt = new Map<string, CanonicalIngredient>();
    const canonicalByNameEn = new Map<string, CanonicalIngredient>();
    
    if (canonicalIngredients) {
      for (const ing of canonicalIngredients) {
        canonicalMap.set(ing.id, ing as CanonicalIngredient);
        canonicalByNamePt.set(normalizeText(ing.name_pt), ing as CanonicalIngredient);
        canonicalByNameEn.set(normalizeText(ing.name_en), ing as CanonicalIngredient);
      }
    }
    
    logStep("Canonical ingredients loaded", { count: canonicalMap.size });
    
    // Function to find canonical ingredient
    const findCanonicalIngredient = (name: string, nameEn?: string): CanonicalIngredient | null => {
      // Try exact match by normalized name
      const normalizedPt = normalizeText(name);
      if (canonicalByNamePt.has(normalizedPt)) {
        return canonicalByNamePt.get(normalizedPt)!;
      }
      
      if (nameEn) {
        const normalizedEn = normalizeText(nameEn);
        if (canonicalByNameEn.has(normalizedEn)) {
          return canonicalByNameEn.get(normalizedEn)!;
        }
      }
      
      // Try partial match
      for (const [key, ing] of canonicalByNamePt) {
        if (normalizedPt.includes(key) || key.includes(normalizedPt)) {
          return ing;
        }
      }
      
      return null;
    };
    
    // Calculate real macros - prefer canonical_ingredients, then foods table
    const mealsWithMacros = await Promise.all(
      filteredMeals.map(async (meal) => {
        // VERIFICAR SE REFEIÇÃO JÁ VEM ENRIQUECIDA (do gerador de templates)
        const mealAny = meal as any;
        if (mealAny.total_calories && mealAny.total_protein && mealAny.macro_source) {
          logStep("Meal already enriched by template generator", { name: mealAny.name });
          
          // Refeição já vem com macros calculados, apenas formatar para o banco
          return {
            name: mealAny.name,
            description: mealAny.description || `Refeição típica para ${meal_type}`,
            meal_type,
            meal_density: mealAny.meal_density || null,
            components: mealAny.components,
            total_calories: mealAny.total_calories,
            total_protein: mealAny.total_protein,
            total_carbs: mealAny.total_carbs,
            total_fat: mealAny.total_fat,
            total_fiber: mealAny.total_fiber,
            macro_source: mealAny.macro_source,
            macro_confidence: mealAny.macro_confidence,
            country_codes: mealAny.country_codes || [country_code],
            language_code: regional.language.split("-")[0],
            dietary_tags: mealAny.dietary_tags || [],
            blocked_for_intolerances: mealAny.blocked_for_intolerances || [],
            flexible_options: mealAny.flexible_options || {},
            instructions: mealAny.instructions || [],
            prep_time_minutes: mealAny.prep_time_minutes || 15,
            is_active: true,
            approval_status: "approved", // Templates são pré-aprovados
            source: "template_generated",
            generated_by: "populate-meal-pool-templates",
          };
        }

        // FLUXO ANTIGO: Enriquecer refeições (caso não venham com macros)
        const components = mealAny.components || [];

        let totalCalories = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let macroSource = "canonical";
        let macroConfidence = "high";
        let foundCount = 0;
        let allIntoleranceFlags: string[] = [];

        // Enrich components with canonical IDs
        const enrichedComponents: MealComponent[] = [];
        
        for (const component of components) {
          // Determinar porção: 1) do componente, 2) da tabela por nome, 3) da tabela por tipo, 4) padrão 100g
          const portionGrams = component.portion_grams || 
                               component.portion_ml || 
                               100; // Padrão 100g
          
          // Try to find in canonical_ingredients first
          const canonical = findCanonicalIngredient(component.name, component.name_en);
          
          if (canonical) {
            // Use canonical data
            const factor = portionGrams / 100;
            totalCalories += Math.round(canonical.calories_per_100g * factor);
            totalProtein += Math.round(canonical.protein_per_100g * factor * 10) / 10;
            totalCarbs += Math.round(canonical.carbs_per_100g * factor * 10) / 10;
            totalFat += Math.round(canonical.fat_per_100g * factor * 10) / 10;
            totalFiber += Math.round(canonical.fiber_per_100g * factor * 10) / 10;
            foundCount++;
            
            // Add intolerance flags
            if (canonical.category) {
              allIntoleranceFlags.push(canonical.category);
            }
            
            enrichedComponents.push({
              type: component.type,
              name: component.name,
              name_en: component.name_en || canonical.name_en,
              canonical_id: canonical.id,
              portion_grams: portionGrams,
              portion_label: `${portionGrams}g`,
            });
          } else {
            // Use CALORIE_TABLE as fallback
            const normalized = normalizeForCalorieTable(component.name);
            const calorieData = CALORIE_TABLE[normalized];
            
            if (calorieData) {
              const factor = portionGrams / 100;
              totalCalories += Math.round(calorieData.calories * factor);
              totalProtein += Math.round(calorieData.protein * factor * 10) / 10;
              totalCarbs += Math.round(calorieData.carbs * factor * 10) / 10;
              totalFat += Math.round(calorieData.fat * factor * 10) / 10;
              totalFiber += Math.round(calorieData.fiber * factor * 10) / 10;
              macroSource = "calorie_table";
              macroConfidence = "medium";
              
              enrichedComponents.push({
                type: component.type,
                name: component.name,
                name_en: component.name_en,
                portion_grams: portionGrams,
                portion_label: `${portionGrams}g`,
              });
            } else {
              // Default values if not found
              const defaultCalories = component.type === "beverage" ? 50 : 100;
              totalCalories += defaultCalories;
              macroSource = "estimated";
              macroConfidence = "low";
              
              enrichedComponents.push({
                type: component.type,
                name: component.name,
                name_en: component.name_en,
                portion_grams: portionGrams,
                portion_label: `${portionGrams}g`,
              });
            }
          }
        }
        
        logStep("Meal macros calculated", {
          name: mealAny.name,
          totalCalories,
          foundCount,
          macroSource,
          macroConfidence
        });

        return {
          name: mealAny.name,
          description: mealAny.description || `Refeição típica para ${meal_type}`,
          meal_type,
          meal_density: mealAny.meal_density || null,
          components: enrichedComponents,
          total_calories: totalCalories,
          total_protein: totalProtein,
          total_carbs: totalCarbs,
          total_fat: totalFat,
          total_fiber: totalFiber,
          macro_source: macroSource,
          macro_confidence: macroConfidence,
          country_codes: mealAny.country_codes || [country_code],
          language_code: regional.language.split("-")[0],
          dietary_tags: mealAny.dietary_tags || [],
          blocked_for_intolerances: [...new Set(allIntoleranceFlags)],
          flexible_options: mealAny.flexible_options || {},
          instructions: mealAny.instructions || [],
          prep_time_minutes: mealAny.prep_time_minutes || 15,
          is_active: true,
          approval_status: "approved",
          source: "template_generated",
          generated_by: "populate-meal-pool-templates",
        };
      })
    );

    // Filter duplicate names within batch
    const uniqueMeals = mealsWithMacros.filter((meal, index, self) => 
      index === self.findIndex(m => m.name === meal.name)
    );

    logStep("Unique meals after filtering batch", { 
      total: mealsWithMacros.length, 
      unique: uniqueMeals.length 
    });

    // Insert meals into database (constraint UNIQUE previne duplicatas automaticamente)
    // Inserir uma por uma para ignorar duplicatas silenciosamente
    const inserted = [];
    let duplicateCount = 0;
    
    for (const meal of uniqueMeals) {
      const { data, error } = await supabase
        .from("meal_combinations")
        .insert([meal])
        .select();
      
      if (error) {
        // Se for erro de duplicata (constraint UNIQUE), ignorar silenciosamente
        if (error.message?.includes("duplicate") || error.message?.includes("unique") || error.code === "23505") {
          duplicateCount++;
          continue;
        }
        // Outros erros, logar mas não falhar
        logStep("Database insertion error (non-duplicate)", { error: error.message });
        continue;
      }
      
      if (data && data.length > 0) {
        inserted.push(data[0]);
      }
    }

    logStep("Meals inserted successfully", { 
      count: inserted.length,
      duplicates: duplicateCount,
      total_attempted: uniqueMeals.length
    });

    // Log template usage (sem IA)
    await supabase.from("ai_usage_logs").insert({
      function_name: "populate-meal-pool",
      model_used: "typescript-templates",
      items_generated: inserted.length,
      metadata: { country_code, meal_type, quantity, dietary_filter, strategy_key, intolerance_filter },
    });

    return new Response(
      JSON.stringify({
        success: true,
        inserted: inserted.length,
        message: `${inserted.length} meals generated successfully using TypeScript templates`,
        meals: inserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    logStep("Error in meal pool generation", { error: error.message, stack: error.stack });
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

