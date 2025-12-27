import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { ingredient, restrictions } = await req.json();

    if (!ingredient) {
      return new Response(
        JSON.stringify({ error: 'Ingredient is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Generating suggestions', { ingredient, restrictions });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const restrictionsText = restrictions && restrictions.length > 0 
      ? `O usuário tem as seguintes restrições alimentares: ${restrictions.join(', ')}. Não sugira ingredientes que conflitem com essas restrições.`
      : '';

    const prompt = `Você é um especialista em culinária e nutrição. Sua tarefa é sugerir ingredientes substitutos para receitas.

REGRAS IMPORTANTES:
- Sugira APENAS ingredientes puros que podem substituir o ingrediente dado em receitas
- NÃO sugira pratos prontos, receitas ou produtos processados
- Considere similaridade de textura, sabor e função culinária
- Retorne exatamente 6 sugestões
- Retorne APENAS um array JSON com os nomes dos ingredientes, nada mais

Ingrediente original: "${ingredient}"
${restrictionsText}

Retorne apenas o array JSON com os nomes dos ingredientes substitutos. Exemplo: ["ingrediente1", "ingrediente2", "ingrediente3", "ingrediente4", "ingrediente5", "ingrediente6"]`;

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
    let suggestions: string[] = [];
    try {
      // Handle markdown code blocks
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0];
      }
      
      suggestions = JSON.parse(jsonStr.trim());
      
      // Ensure it's an array of strings
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      } else {
        suggestions = suggestions.filter(s => typeof s === 'string').slice(0, 6);
      }
    } catch (parseError) {
      logStep('Parse error', { error: parseError, content });
      suggestions = [];
    }

    logStep('Returning suggestions', { count: suggestions.length, suggestions });

    return new Response(
      JSON.stringify({ suggestions }),
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
