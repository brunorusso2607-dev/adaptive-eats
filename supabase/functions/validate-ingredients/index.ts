import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, data?: any) => {
  console.log(`[VALIDATE-INGREDIENTS] ${step}`, data ? JSON.stringify(data) : '');
};

// Normaliza ingredientes para comparação
const normalizeIngredients = (ingredients: string[]): string[] => {
  return [...ingredients].map(i => i.toLowerCase().trim()).sort();
};

// Country-specific language config for validation messages
const COUNTRY_VALIDATION_CONFIG: Record<string, { lang: string; invalidMsg: string; validExamples: string }> = {
  'BR': { lang: 'português brasileiro', invalidMsg: 'Combinação inválida', validExamples: 'Arroz + Feijão + Carne, Iogurte + Frutas + Granola' },
  'PT': { lang: 'português europeu', invalidMsg: 'Combinação inválida', validExamples: 'Bacalhau + Batatas + Azeite, Iogurte + Fruta + Mel' },
  'US': { lang: 'English', invalidMsg: 'Invalid combination', validExamples: 'Rice + Beans + Meat, Yogurt + Fruits + Granola' },
  'GB': { lang: 'British English', invalidMsg: 'Invalid combination', validExamples: 'Potatoes + Beef + Gravy, Porridge + Berries + Honey' },
  'MX': { lang: 'español mexicano', invalidMsg: 'Combinación inválida', validExamples: 'Arroz + Frijoles + Carne, Yogurt + Frutas + Granola' },
  'ES': { lang: 'español', invalidMsg: 'Combinación inválida', validExamples: 'Arroz + Pollo + Verduras, Yogur + Frutas + Cereales' },
  'FR': { lang: 'français', invalidMsg: 'Combinaison invalide', validExamples: 'Riz + Poulet + Légumes, Yaourt + Fruits + Granola' },
  'DE': { lang: 'Deutsch', invalidMsg: 'Ungültige Kombination', validExamples: 'Reis + Hähnchen + Gemüse, Joghurt + Obst + Müsli' },
  'IT': { lang: 'italiano', invalidMsg: 'Combinazione non valida', validExamples: 'Riso + Pollo + Verdure, Yogurt + Frutta + Muesli' },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, newIngredient, country: requestCountry } = await req.json();
    
    logStep('Request received', { ingredients, newIngredient, country: requestCountry });

    if (!ingredients || !Array.isArray(ingredients)) {
      return new Response(
        JSON.stringify({ error: 'Ingredientes são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se tem menos de 2 ingredientes (incluindo o novo), não precisa validar
    const allIngredients = newIngredient 
      ? [...ingredients, newIngredient] 
      : ingredients;
    
    if (allIngredients.length < 2) {
      return new Response(
        JSON.stringify({ 
          isValid: true, 
          message: null,
          suggestions: [] 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extrair user_id e country do token se disponível
    let userId: string | null = null;
    let userCountry = requestCountry || 'BR';
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
      
      // Fetch user's country from profile
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('country')
          .eq('id', userId)
          .maybeSingle();
        if (profile?.country) {
          userCountry = profile.country;
        }
      }
    }
    
    const validationConfig = COUNTRY_VALIDATION_CONFIG[userCountry] || COUNTRY_VALIDATION_CONFIG['BR'];

    // Buscar no histórico de validações
    const normalizedIngredients = normalizeIngredients(allIngredients);
    
    const { data: existingValidation } = await supabase
      .from('ingredient_validation_history')
      .select('*')
      .contains('ingredients', normalizedIngredients)
      .eq('ingredients', normalizedIngredients)
      .limit(1)
      .maybeSingle();

    if (existingValidation) {
      logStep('Found in history', { id: existingValidation.id });
      return new Response(
        JSON.stringify({
          isValid: existingValidation.is_valid,
          confidence: existingValidation.confidence || 'media',
          message: existingValidation.message,
          problematicPair: existingValidation.problematic_pair,
          suggestions: existingValidation.suggestions || [],
          validationId: existingValidation.id,
          fromHistory: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar sugestões populares do histórico para enriquecer o prompt
    const { data: popularSuggestions } = await supabase
      .from('ingredient_validation_history')
      .select('suggestions')
      .eq('is_valid', false)
      .not('suggestions', 'is', null)
      .limit(20);

    const historicalSuggestions = popularSuggestions
      ?.flatMap(v => v.suggestions || [])
      .filter((s, i, arr) => arr.indexOf(s) === i)
      .slice(0, 10) || [];

    logStep('Historical suggestions', { count: historicalSuggestions.length });

    // Buscar API key do Gemini do banco de dados
    const geminiApiKey = await getGeminiApiKey();

    const systemPrompt = `You are an experienced and critical chef who evaluates ingredient combinations for recipes.
Your task is to RIGOROUSLY analyze if a list of ingredients makes sense together to create a real and coherent recipe.
IMPORTANT: All messages and suggestions MUST be in ${validationConfig.lang}.

EVALUATION RULES (be rigorous):
1. Ingredients must have CLEAR CULINARY COHERENCE - they must form a recognizable real dish
2. FORBIDDEN to mix sweet with savory inappropriately (e.g., steak with condensed milk = INVALID)
3. Ingredients from VERY different cuisines that don't combine = INVALID
4. BEVERAGES like coffee, tea, juice should NOT be mixed as ingredients in dishes that are not beverages
5. Fruits in savory dishes are valid ONLY when traditional (e.g., pineapple with pork)
6. If an ingredient seems "out of context" or "random" for the recipe = INVALID

EXAMPLES OF INVALID COMBINATIONS:
- Coffee + Yogurt + Fruits (coffee is not a yogurt ingredient)
- Rice + Chocolate (doesn't make culinary sense)
- Beans + Strawberry (absurd combination)
- Pasta + Honey (doesn't combine)

EXAMPLES OF VALID COMBINATIONS:
- ${validationConfig.validExamples}

${historicalSuggestions.length > 0 ? `
POPULAR PREVIOUS SUGGESTIONS (consider using if relevant):
${historicalSuggestions.join(', ')}
` : ''}

FORMATO DE RESPOSTA (JSON):
{
  "isValid": true/false,
  "confidence": "alta" | "media" | "baixa",
  "message": "Explicação breve se inválido",
  "problematicPair": ["ingrediente1", "ingrediente2"] ou null,
  "suggestions": ["sugestão1", "sugestão2"] (ingredientes que combinariam melhor, max 3)
}

Se válido, message e problematicPair devem ser null.
Sugira ingredientes apenas se inválido.
SEJA CRÍTICO - se algo parecer estranho, marque como inválido.`;

    const userPrompt = `Avalie esta combinação de ingredientes para uma receita:

Ingredientes: ${allIngredients.join(', ')}

${newIngredient ? `O ingrediente recém-adicionado foi: "${newIngredient}"` : ''}

Responda APENAS com o JSON, sem texto adicional.`;

    logStep('Calling Gemini API');

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Gemini API error', { status: response.status, error: errorText });
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    logStep('AI Response received', { content });

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse JSON response - remove markdown code blocks if present
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    let result;
    try {
      result = JSON.parse(cleanedContent);
    } catch (parseError) {
      logStep('JSON parse error, returning default valid', { content: cleanedContent });
      result = { isValid: true, message: null, suggestions: [] };
    }

    logStep('Validation complete', result);

    const finalResult = {
      isValid: result.isValid ?? true,
      confidence: result.confidence ?? 'media',
      message: result.message || null,
      problematicPair: result.problematicPair || null,
      suggestions: result.suggestions || [],
    };

    // Salvar no histórico e retornar o ID
    let validationId: string | null = null;
    
    if (userId) {
      const { data: insertedData, error: insertError } = await supabase
        .from('ingredient_validation_history')
        .insert({
          user_id: userId,
          ingredients: normalizedIngredients,
          is_valid: finalResult.isValid,
          confidence: finalResult.confidence,
          message: finalResult.message,
          problematic_pair: finalResult.problematicPair,
          suggestions: finalResult.suggestions,
        })
        .select('id')
        .single();

      if (insertError) {
        logStep('Error saving to history', { error: insertError.message });
      } else {
        validationId = insertedData?.id || null;
        logStep('Saved to history', { id: validationId });
      }
    }

    return new Response(
      JSON.stringify({
        ...finalResult,
        validationId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logStep('Error', { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage || 'Erro ao validar ingredientes' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

