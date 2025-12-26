import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SUGGEST-FOOD-AI] ${step}:`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Processing query', { query });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `Você é um especialista em nutrição brasileiro. Sua tarefa é sugerir alimentos baseado no texto do usuário.

REGRAS IMPORTANTES:
- Identifique o alimento que o usuário está tentando buscar
- Se parecer um produto de fast-food ou marca específica, sugira o nome correto completo
- Retorne de 1 a 5 sugestões relevantes
- Para cada sugestão, estime os valores nutricionais por 100g ou por unidade (especifique)
- Considere pratos brasileiros e internacionais populares

FORMATO DE RESPOSTA (JSON):
{
  "suggestions": [
    {
      "name": "Nome do Alimento Completo",
      "portion_description": "1 unidade (250g)" ou "100g",
      "portion_grams": 250,
      "calories": 540,
      "protein": 28,
      "carbs": 42,
      "fat": 29,
      "confidence": "alta" | "média" | "baixa"
    }
  ]
}

EXEMPLOS:
- "big t" → Big Tasty McDonald's
- "mcchick" → McChicken McDonald's
- "açaí" → Açaí na Tigela
- "pao de q" → Pão de Queijo`;

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
          { role: 'user', content: `O usuário digitou: "${query}". Identifique o alimento e sugira opções com valores nutricionais.` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('AI Error', { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded', suggestions: [] }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', suggestions: [] }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{"suggestions":[]}';
    
    logStep('AI Response received', { contentLength: content.length });

    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      logStep('JSON parse error', { error: e, content });
      parsed = { suggestions: [] };
    }

    return new Response(
      JSON.stringify(parsed),
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
