import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[FRIDGE-ANALYZER] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const googleAIApiKey = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!googleAIApiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    // Create supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { userId: user.id });

    // Fetch user profile for personalized suggestions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('intolerances, dietary_preference, recipe_complexity, goal, context')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep('Error fetching profile', profileError);
    }

    const intolerances = profile?.intolerances || [];
    const dietaryPreference = profile?.dietary_preference || 'comum';
    const complexity = profile?.recipe_complexity || 'equilibrada';
    const goal = profile?.goal || 'manter';
    const context = profile?.context || 'individual';

    logStep('Profile loaded', { intolerances, dietaryPreference, complexity, goal, context });

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Image data required');
    }

    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    
    logStep('Analyzing fridge photo');

    // Build personalized prompt
    let dietaryContext = '';
    if (dietaryPreference === 'vegetariana') {
      dietaryContext = 'O usuário é VEGETARIANO - sugira apenas receitas sem carne.';
    } else if (dietaryPreference === 'vegana') {
      dietaryContext = 'O usuário é VEGANO - sugira apenas receitas sem ingredientes de origem animal.';
    } else if (dietaryPreference === 'low_carb') {
      dietaryContext = 'O usuário segue dieta LOW CARB - priorize receitas com baixo carboidrato.';
    }

    let intoleranceContext = '';
    if (intolerances.length > 0) {
      intoleranceContext = `ATENÇÃO: O usuário tem as seguintes intolerâncias/restrições: ${intolerances.join(', ')}. 
      NÃO sugira receitas que contenham esses ingredientes ou derivados.`;
    }

    let goalContext = '';
    if (goal === 'emagrecer') {
      goalContext = 'O usuário quer EMAGRECER - priorize receitas leves e com menos calorias.';
    } else if (goal === 'ganhar_peso') {
      goalContext = 'O usuário quer GANHAR PESO - sugira receitas mais calóricas e nutritivas.';
    }

    let complexityContext = '';
    if (complexity === 'rapida') {
      complexityContext = 'Priorize receitas RÁPIDAS e simples (até 20 minutos).';
    } else if (complexity === 'elaborada') {
      complexityContext = 'Pode sugerir receitas mais ELABORADAS e complexas.';
    }

    let contextInfo = '';
    if (context === 'familia') {
      contextInfo = 'Sugira receitas que sirvam uma FAMÍLIA (porções maiores).';
    } else if (context === 'modo_kids') {
      contextInfo = 'Sugira receitas INFANTIS, atrativas para crianças.';
    }

    const systemPrompt = `Você é um chef de cozinha experiente que analisa fotos de geladeiras e despensas para sugerir receitas personalizadas.

${dietaryContext}
${intoleranceContext}
${goalContext}
${complexityContext}
${contextInfo}

Analise a imagem da geladeira/despensa e:
1. Identifique todos os ingredientes visíveis
2. Sugira 3 receitas que podem ser feitas com esses ingredientes
3. Para cada receita, liste os ingredientes da geladeira que serão usados e quais ingredientes básicos podem ser necessários

IMPORTANTE: Se a imagem NÃO for de uma geladeira, despensa, ou não mostrar ingredientes/alimentos, responda APENAS com:
{"notFridge": true, "message": "Por favor, fotografe o interior da sua geladeira ou despensa"}

Se for uma geladeira/despensa com ingredientes, responda APENAS com JSON válido no formato:
{
  "ingredientes_identificados": [
    {"nome": "nome do ingrediente", "quantidade_estimada": "quantidade aproximada"}
  ],
  "receitas_sugeridas": [
    {
      "nome": "Nome da Receita",
      "descricao": "Breve descrição da receita",
      "tempo_preparo": 30,
      "dificuldade": "fácil",
      "ingredientes_da_geladeira": ["ingrediente1", "ingrediente2"],
      "ingredientes_extras": ["ingrediente básico que pode precisar"],
      "calorias_estimadas": 350,
      "instrucoes_resumidas": ["Passo 1", "Passo 2", "Passo 3"]
    }
  ],
  "dica": "Uma dica rápida sobre os ingredientes"
}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${googleAIApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { inline_data: { mime_type: "image/jpeg", data: base64Data } }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logStep('Gemini API error', { status: response.status, error: errorText });
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    logStep('AI response received');

    const textContent = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    // Check if it's not a fridge
    if (analysis.notFridge) {
      logStep('Not a fridge image');
      return new Response(JSON.stringify({
        notFridge: true,
        message: analysis.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    logStep('Analysis complete', { 
      ingredientCount: analysis.ingredientes_identificados?.length,
      recipeCount: analysis.receitas_sugeridas?.length 
    });

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep('Error', { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
