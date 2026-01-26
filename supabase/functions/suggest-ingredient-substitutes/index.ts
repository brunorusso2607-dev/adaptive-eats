import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ARCHITECTURE: Use globalSafetyEngine as single source of truth for food safety
import {
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredient,
  type UserRestrictions,
  type SafetyDatabase,
} from "../_shared/globalSafetyEngine.ts";

// PHASE 2: Import calculateRealMacrosForFoods for canonical lookup
import { calculateRealMacrosForFoods } from "../_shared/calculateRealMacros.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SUGGEST-SUBSTITUTES] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredient, restrictions, dietaryPreference, excludedIngredients } = await req.json();

    if (!ingredient) {
      return new Response(
        JSON.stringify({ error: 'Ingredient is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Generating suggestions', { ingredient, restrictions, dietaryPreference });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    // Initialize Supabase for canonical lookup
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load safety database from globalSafetyEngine (with cache)
    const safetyDatabase: SafetyDatabase = await loadSafetyDatabase();
    logStep('Safety database loaded', { mappingsCount: safetyDatabase.intoleranceMappings.size });

    // Normalize user intolerances using globalSafetyEngine
    const normalizedIntolerances = normalizeUserIntolerances(restrictions || [], safetyDatabase);
    logStep('Normalized intolerances', { normalized: normalizedIntolerances });

    // Build user restrictions for validation
    const userRestrictions: UserRestrictions = {
      intolerances: normalizedIntolerances,
      dietaryPreference: dietaryPreference || null,
      excludedIngredients: excludedIngredients || [],
    };

    const restrictionsText = restrictions && restrictions.length > 0 
      ? `O usuário tem as seguintes restrições alimentares: ${restrictions.join(', ')}. Não sugira ingredientes que conflitem com essas restrições.`
      : '';

    const dietaryText = dietaryPreference 
      ? `O usuário segue uma dieta ${dietaryPreference}. Respeite esta preferência.`
      : '';

    const prompt = `Você é um especialista em culinária e nutrição. Sua tarefa é sugerir ingredientes substitutos para receitas.

REGRAS IMPORTANTES:
- Sugira APENAS ingredientes puros que podem substituir o ingrediente dado em receitas
- NÃO sugira pratos prontos, receitas ou produtos processados
- Considere similaridade de textura, sabor e função culinária
- Retorne exatamente 8 sugestões (para permitir margem após validação)
- Retorne APENAS um array JSON com os nomes dos ingredientes, nada mais

Ingrediente original: "${ingredient}"
${restrictionsText}
${dietaryText}

Retorne apenas o array JSON com os nomes dos ingredientes substitutos. Exemplo: ["ingrediente1", "ingrediente2", "ingrediente3", "ingrediente4", "ingrediente5", "ingrediente6", "ingrediente7", "ingrediente8"]`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 256,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Google AI Error', { status: response.status, error: errorText });
      throw new Error(`Google AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    
    logStep('AI Response', { content });
    
    // Parse JSON from response
    let rawSuggestions: string[] = [];
    try {
      // Handle markdown code blocks
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0];
      }
      
      rawSuggestions = JSON.parse(jsonStr.trim());
      
      // Ensure it's an array of strings
      if (!Array.isArray(rawSuggestions)) {
        rawSuggestions = [];
      } else {
        rawSuggestions = rawSuggestions.filter(s => typeof s === 'string');
      }
    } catch (parseError) {
      logStep('Parse error', { error: parseError, content });
      rawSuggestions = [];
    }

    // ========== POST-AI VALIDATION USING GLOBAL SAFETY ENGINE ==========
    // This ensures suggestions are validated AFTER generation, not just in the prompt
    const validatedSuggestions: string[] = [];
    const rejectedSuggestions: { ingredient: string; reason: string }[] = [];

    for (const suggestion of rawSuggestions) {
      const validation = validateIngredient(suggestion, userRestrictions, safetyDatabase);
      
      if (validation.isValid) {
        validatedSuggestions.push(suggestion);
      } else {
        rejectedSuggestions.push({
          ingredient: suggestion,
          reason: validation.restriction 
            ? `${validation.category || 'conflict'}: ${validation.restriction}`
            : 'conflict'
        });
      }

      // Stop at 6 valid suggestions
      if (validatedSuggestions.length >= 6) break;
    }

    logStep('Validation complete', { 
      total: rawSuggestions.length,
      valid: validatedSuggestions.length, 
      rejected: rejectedSuggestions.length,
      rejectedItems: rejectedSuggestions
    });

    // ========== PHASE 2: ENRICH WITH CANONICAL MACROS ==========
    // Lookup macros from canonical_ingredients for each suggestion
    const enrichedSuggestions: Array<{
      name: string;
      calories_per_100g?: number;
      protein_per_100g?: number;
      carbs_per_100g?: number;
      fat_per_100g?: number;
      macro_source?: string;
      canonical_id?: string;
    }> = [];

    if (validatedSuggestions.length > 0) {
      try {
        // Prepare foods for macro lookup (assume 100g for per-100g data)
        const foodsForLookup = validatedSuggestions.map(name => ({
          name,
          grams: 100,
          aiEstimate: { calories: 0, protein: 0, carbs: 0, fat: 0 }
        }));

        const macroResult = await calculateRealMacrosForFoods(supabase, foodsForLookup, 'BR');
        
        for (let i = 0; i < validatedSuggestions.length; i++) {
          const suggestion = validatedSuggestions[i];
          const macros = macroResult.items[i];
          
          if (macros && macros.source !== 'ai_estimate') {
            enrichedSuggestions.push({
              name: suggestion,
              calories_per_100g: Math.round(macros.calories),
              protein_per_100g: Math.round(macros.protein * 10) / 10,
              carbs_per_100g: Math.round(macros.carbs * 10) / 10,
              fat_per_100g: Math.round(macros.fat * 10) / 10,
              macro_source: macros.source,
              canonical_id: macros.canonical_id || undefined,
            });
          } else {
            enrichedSuggestions.push({ name: suggestion });
          }
        }

        logStep('Enriched with macros', {
          total: enrichedSuggestions.length,
          withMacros: enrichedSuggestions.filter(s => s.macro_source).length,
          fromCanonical: enrichedSuggestions.filter(s => s.macro_source === 'canonical').length
        });
      } catch (enrichError) {
        logStep('Error enriching with macros, returning names only', { error: String(enrichError) });
        for (const suggestion of validatedSuggestions) {
          enrichedSuggestions.push({ name: suggestion });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        suggestions: validatedSuggestions,
        enrichedSuggestions,
        // Include metadata for debugging
        validationMetadata: {
          totalGenerated: rawSuggestions.length,
          totalValid: validatedSuggestions.length,
          rejected: rejectedSuggestions,
          enrichedWithMacros: enrichedSuggestions.filter(s => s.macro_source).length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error', { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

