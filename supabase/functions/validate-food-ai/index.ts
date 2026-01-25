import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recalculatePer100g } from "../_shared/calorieTable.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[VALIDATE-FOOD-AI] ${step}:`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodName } = await req.json();
    
    if (!foodName || foodName.length < 2) {
      return new Response(
        JSON.stringify({ isValid: false, error: 'Nome muito curto' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Validating food', { foodName });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const prompt = `Você é um especialista em nutrição. Analise se o texto é um alimento REAL e válido.

REGRAS:
1. Retorne APENAS um objeto JSON válido
2. Se for um alimento real (ingrediente, prato, fast-food, bebida), retorne isValid: true com valores nutricionais por 100g
3. Se NÃO for alimento (texto aleatório, objetos, nomes próprios), retorne isValid: false
4. Valores nutricionais devem ser realistas e baseados em tabelas nutricionais reais
5. Sugira uma porção padrão adequada para o tipo de alimento

EXEMPLOS DE ALIMENTOS VÁLIDOS:
- Ingredientes: arroz, feijão, frango, ovo, banana
- Fast-food: Big Mac, Whopper, McChicken, Pizza Hut
- Pratos: feijoada, lasanha, strogonoff
- Bebidas: suco de laranja, café, leite

EXEMPLOS INVÁLIDOS:
- "asdfgh", "123", "mesa", "João", "carro"

Texto para analisar: "${foodName}"

Responda APENAS com JSON no formato:
{
  "isValid": true/false,
  "name": "Nome correto do alimento (se válido)",
  "confidence": "alta" | "média" | "baixa",
  "portion": {
    "size": número em gramas ou ml,
    "unit": "g" | "ml" | "un" | "fatia",
    "description": "descrição da porção ex: 1 unidade média"
  },
  "nutrition": {
    "calories": número,
    "protein": número,
    "carbs": número,
    "fat": número
  },
  "reason": "razão se inválido"
}`;

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
            temperature: 0.2,
            maxOutputTokens: 512,
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
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{"isValid": false}';
    
    logStep('AI Response', { content });

    // Parse JSON from response
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0];
      }
      parsed = JSON.parse(jsonStr.trim());
    } catch (e) {
      logStep('JSON parse error', { error: e, content });
      parsed = { isValid: false, reason: 'Erro ao processar resposta' };
    }

    // Recalcular calorias usando tabela compartilhada
    if (parsed.isValid && parsed.nutrition?.calories && parsed.name) {
      const recalculated = recalculatePer100g(parsed.name, parsed.nutrition.calories);
      parsed.nutrition.calories = recalculated.calories_per_100g;
      parsed.calorie_source = recalculated.calorie_source;
      logStep('Calories recalculated', { 
        name: parsed.name,
        source: recalculated.calorie_source 
      });
    }

    logStep('Returning validation result', { isValid: parsed.isValid });

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error', { message: errorMessage });
    return new Response(
      JSON.stringify({ isValid: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

