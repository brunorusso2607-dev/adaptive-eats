import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, data?: any) => {
  console.log(`[VALIDATE-INGREDIENTS] ${step}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, newIngredient } = await req.json();
    
    logStep('Request received', { ingredients, newIngredient });

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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    const systemPrompt = `Você é um chef experiente que avalia combinações de ingredientes para receitas.

Sua tarefa é analisar se uma lista de ingredientes faz sentido juntos para criar uma receita real.

REGRAS DE AVALIAÇÃO:
1. Ingredientes devem ter coerência culinária (podem formar um prato real)
2. Não misturar doce com salgado de forma descabida (ex: picanha com leite condensado = inválido)
3. Ingredientes de culinárias diferentes podem combinar se fizerem sentido (ex: frango teriyaki = válido)
4. Considere temperos e condimentos como neutros (combinam com maioria)
5. Frutas em pratos salgados são válidas quando tradicionais (ex: abacaxi com carne de porco)

FORMATO DE RESPOSTA (JSON):
{
  "isValid": true/false,
  "confidence": "alta" | "media" | "baixa",
  "message": "Explicação breve se inválido",
  "problematicPair": ["ingrediente1", "ingrediente2"] ou null,
  "suggestions": ["sugestão1", "sugestão2"] (ingredientes que combinariam melhor, max 3)
}

Se válido, message e problematicPair devem ser null.
Sugira ingredientes apenas se inválido.`;

    const userPrompt = `Avalie esta combinação de ingredientes para uma receita:

Ingredientes: ${allIngredients.join(', ')}

${newIngredient ? `O ingrediente recém-adicionado foi: "${newIngredient}"` : ''}

Responda APENAS com o JSON, sem texto adicional.`;

    logStep('Calling Lovable AI');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Muitas requisições, tente novamente.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      logStep('AI Gateway error', { status: response.status, error: errorText });
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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

    return new Response(
      JSON.stringify({
        isValid: result.isValid ?? true,
        confidence: result.confidence ?? 'media',
        message: result.message || null,
        problematicPair: result.problematicPair || null,
        suggestions: result.suggestions || [],
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
