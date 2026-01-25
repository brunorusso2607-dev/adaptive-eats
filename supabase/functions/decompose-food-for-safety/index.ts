import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ARCHITECTURE: Use globalSafetyEngine as single source of truth for food safety
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredientList,
  type UserRestrictions,
  type SafetyDatabase,
} from "../_shared/globalSafetyEngine.ts";

// PHASE 3: Import calculateRealMacrosForFoods for canonical lookup
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function para decompor alimentos complexos em ingredientes base
 * Usado para validação de segurança em entradas manuais de texto
 * 
 * Exemplo: "Big Mac" → ["pão", "carne bovina", "queijo", "alface", "cebola", "picles", "molho especial"]
 * Exemplo: "pão francês" → ["farinha de trigo", "água", "sal", "fermento"]
 * 
 * ARCHITECTURE v2.0: Now uses globalSafetyEngine.ts as single source of truth
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodName, userIntolerances = [], dietaryPreference = null, excludedIngredients = [] } = await req.json();

    if (!foodName || typeof foodName !== "string") {
      return new Response(
        JSON.stringify({ error: "foodName é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Initialize Supabase for canonical lookup
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[decompose-food] Analisando: "${foodName}"`);
    console.log(`[decompose-food] Intolerâncias do usuário: ${userIntolerances.join(", ") || "nenhuma"}`);
    console.log(`[decompose-food] Preferência dietética: ${dietaryPreference || "nenhuma"}`);

    // Load safety database from globalSafetyEngine (with cache)
    const safetyDatabase: SafetyDatabase = await loadSafetyDatabase();
    console.log(`[decompose-food] Safety database loaded with ${safetyDatabase.intoleranceMappings.size} mappings`);

    // Normalize user intolerances using globalSafetyEngine
    const normalizedIntolerances = normalizeUserIntolerances(userIntolerances, safetyDatabase);
    console.log(`[decompose-food] Normalized intolerances: ${normalizedIntolerances.join(", ")}`);

    // Build user restrictions for validation
    const userRestrictions: UserRestrictions = {
      intolerances: normalizedIntolerances,
      dietaryPreference: dietaryPreference || null,
      excludedIngredients: excludedIngredients || [],
    };

    // Prompt para decompor o alimento
    const systemPrompt = `Você é um especialista em nutrição e composição de alimentos.

Sua tarefa é decompor um alimento ou prato em seus INGREDIENTES BASE.

REGRAS:
1. Liste APENAS os ingredientes principais que compõem o alimento
2. Use nomes simples e diretos (ex: "trigo" não "farinha de trigo refinada tipo 1")
3. Inclua ingredientes ocultos comuns (ex: pão contém trigo, fermento, sal)
4. Para pratos processados, liste os componentes principais
5. Retorne no formato JSON

EXEMPLOS:
- "pão" → ["trigo", "fermento", "sal", "água"]
- "Big Mac" → ["trigo", "carne bovina", "queijo", "alface", "cebola", "picles", "molho"]
- "pizza" → ["trigo", "tomate", "queijo", "orégano"]
- "cerveja" → ["cevada", "lúpulo", "água", "malte"]
- "sorvete" → ["leite", "açúcar", "creme de leite"]
- "macarrão" → ["trigo", "ovo"]
- "frango grelhado" → ["frango"]
- "arroz" → ["arroz"]

IMPORTANTE: Responda APENAS com o JSON, sem texto adicional.`;

    const userPrompt = `Decomponha este alimento em ingredientes base: "${foodName}"

Responda APENAS com um JSON no formato:
{
  "ingredients": ["ingrediente1", "ingrediente2", ...],
  "isProcessedFood": true/false,
  "confidence": "high" | "medium" | "low"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[decompose-food] Erro na API:", response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    console.log(`[decompose-food] Resposta da IA:`, content);

    // Parse do JSON da resposta
    let decomposition;
    try {
      // Remove possíveis markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      decomposition = JSON.parse(cleanContent);
    } catch (e) {
      console.error("[decompose-food] Erro ao parsear resposta:", e);
      // Fallback: retorna o alimento original como único ingrediente
      decomposition = {
        ingredients: [foodName.toLowerCase()],
        isProcessedFood: false,
        confidence: "low"
      };
    }

    const ingredients: string[] = decomposition.ingredients || [foodName.toLowerCase()];

    // ========== VALIDATE USING GLOBAL SAFETY ENGINE ==========
    // This ensures consistent validation with all other modules
    const validationResult = validateIngredientList(ingredients, userRestrictions, safetyDatabase);

    console.log(`[decompose-food] Ingredientes detectados: ${ingredients.join(", ")}`);
    console.log(`[decompose-food] Validation result: isSafe=${validationResult.isSafe}, conflicts=${validationResult.conflicts.length}, warnings=${validationResult.warnings.length}`);

    // Build conflicts array from validation result (using correct ConflictDetail interface)
    const conflicts = validationResult.conflicts.map(c => ({
      ingredient: c.originalIngredient,
      intolerance: c.key,
      type: c.type,
      severity: c.severity,
      label: c.label,
      matchedIngredient: c.matchedIngredient,
    }));

    // Build warnings array
    const warnings = validationResult.warnings.map(w => ({
      ingredient: w.originalIngredient,
      intolerance: w.key,
      type: w.type,
      severity: w.severity,
      label: w.label,
      matchedIngredient: w.matchedIngredient,
    }));

    // ========== PHASE 3: ENRICH INGREDIENTS WITH CANONICAL MACROS ==========
    // Lookup macros for each ingredient from canonical_ingredients
    let enrichedIngredients: Array<{
      name: string;
      calories_per_100g?: number;
      protein_per_100g?: number;
      carbs_per_100g?: number;
      fat_per_100g?: number;
      macro_source?: string;
      canonical_id?: string;
      intolerance_flags?: string[];
    }> = [];

    try {
      // Prepare ingredients for macro lookup (100g each)
      const foodsForLookup = ingredients.map((name: string) => ({
        name,
        grams: 100,
        aiEstimate: { calories: 0, protein: 0, carbs: 0, fat: 0 }
      }));

      const macroResult = await calculateRealMacrosForFoods(supabase, foodsForLookup, 'BR');
      
      for (let i = 0; i < ingredients.length; i++) {
        const ingredient = ingredients[i];
        const macros = macroResult.items[i];
        
        if (macros && macros.source !== 'ai_estimate' && macros.calories > 0) {
          enrichedIngredients.push({
            name: ingredient,
            calories_per_100g: Math.round(macros.calories),
            protein_per_100g: Math.round(macros.protein * 10) / 10,
            carbs_per_100g: Math.round(macros.carbs * 10) / 10,
            fat_per_100g: Math.round(macros.fat * 10) / 10,
            macro_source: macros.source,
            canonical_id: macros.canonical_id || undefined,
            intolerance_flags: macros.intolerance_flags || undefined,
          });
        } else {
          enrichedIngredients.push({ name: ingredient });
        }
      }

      console.log(`[decompose-food] Enriched ${enrichedIngredients.filter(i => i.macro_source).length}/${ingredients.length} ingredients with macros`);
    } catch (enrichError) {
      console.log(`[decompose-food] Error enriching ingredients, returning names only:`, enrichError);
      enrichedIngredients = ingredients.map((name: string) => ({ name }));
    }

    return new Response(
      JSON.stringify({
        success: true,
        foodName,
        ingredients,
        enrichedIngredients,
        isProcessedFood: decomposition.isProcessedFood || false,
        confidence: decomposition.confidence || "medium",
        hasConflict: !validationResult.isSafe,
        conflicts,
        warnings,
        safeToConsume: validationResult.isSafe,
        // Include validation metadata for debugging
        validationMetadata: {
          normalizedIntolerances,
          dietaryPreference,
          excludedIngredients,
          totalConflicts: conflicts.length,
          totalWarnings: warnings.length,
          enrichedWithMacros: enrichedIngredients.filter(i => i.macro_source).length,
          fromCanonical: enrichedIngredients.filter(i => i.macro_source === 'canonical').length,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[decompose-food] Erro:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Erro desconhecido",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

