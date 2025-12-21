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

// Mapa de produtos de risco por intolerância
const PRODUTOS_RISCO: Record<string, string[]> = {
  lactose: [
    'margarina', 'manteiga', 'iogurte', 'queijo', 'requeijão', 'cream cheese',
    'leite', 'creme de leite', 'chantilly', 'doce de leite', 'leite condensado',
    'sorvete', 'pudim', 'mousse', 'yakult', 'danoninho', 'petit suisse',
    'nata', 'coalhada', 'kefir', 'ricota', 'cottage', 'mussarela', 'parmesão',
    'gorgonzola', 'brie', 'camembert', 'provolone', 'gouda', 'cheddar'
  ],
  gluten: [
    'pão', 'torrada', 'bisnaguinha', 'bolo', 'bolacha', 'biscoito', 'massa',
    'macarrão', 'lasanha', 'pizza', 'cerveja', 'molho shoyu', 'molho teriyaki',
    'empanado', 'nuggets', 'salsicha', 'linguiça', 'hambúrguer', 'ketchup',
    'mostarda', 'maionese', 'molho barbecue', 'molho branco', 'croquete',
    'esfiha', 'pão de queijo', 'croissant', 'wrap', 'tortilla'
  ],
  amendoim: [
    'pasta de amendoim', 'paçoca', 'pé de moleque', 'amendoim', 'manteiga de amendoim',
    'molho satay', 'pad thai', 'cookies', 'brownie', 'sorvete', 'granola',
    'barra de cereal', 'chocolate', 'bombom'
  ],
  oleaginosas: [
    'castanha', 'nozes', 'amêndoas', 'pistache', 'avelã', 'macadâmia',
    'castanha de caju', 'castanha do pará', 'nutella', 'creme de avelã',
    'leite de amêndoas', 'pesto', 'marzipã', 'torrone', 'praline'
  ],
  frutos_do_mar: [
    'camarão', 'lagosta', 'caranguejo', 'siri', 'lula', 'polvo', 'marisco',
    'mexilhão', 'ostra', 'vieira', 'surimi', 'kani', 'tempurá'
  ],
  peixe: [
    'atum', 'sardinha', 'salmão', 'tilápia', 'bacalhau', 'anchova',
    'molho de peixe', 'fish sauce', 'caesar', 'molho worcestershire'
  ],
  ovo: [
    'ovo', 'maionese', 'aioli', 'mousse', 'merengue', 'marshmallow',
    'massa fresca', 'macarrão', 'bolo', 'biscoito', 'pão de ló',
    'quiche', 'omelete', 'fritada', 'panqueca', 'waffle', 'crepe'
  ],
  soja: [
    'tofu', 'molho shoyu', 'missô', 'edamame', 'leite de soja', 'tempeh',
    'proteína de soja', 'óleo de soja', 'lecitina', 'molho teriyaki'
  ],
  acucar: [
    'refrigerante', 'suco de caixinha', 'iogurte', 'achocolatado', 'gelatina',
    'pudim', 'doce', 'geleia', 'mel', 'açúcar', 'leite condensado',
    'chocolate', 'sorvete', 'bolo', 'biscoito', 'cereal matinal'
  ]
};

// Mapeamento de intolerâncias do perfil para chaves do mapa
const INTOLERANCE_MAP: Record<string, string> = {
  'lactose': 'lactose',
  'gluten': 'gluten',
  'amendoim': 'amendoim',
  'oleaginosas': 'oleaginosas',
  'frutos_do_mar': 'frutos_do_mar',
  'peixe': 'peixe',
  'ovo': 'ovo',
  'soja': 'soja',
  'acucar': 'acucar',
  // Sinônimos comuns
  'leite': 'lactose',
  'trigo': 'gluten',
  'nozes': 'oleaginosas',
  'castanhas': 'oleaginosas',
  'camarão': 'frutos_do_mar',
  'mariscos': 'frutos_do_mar',
  'ovos': 'ovo'
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
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    logStep('User authenticated', { userId: user.id });

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

    const { imageBase64, additionalImages, areas } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Image data required');
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const additionalBase64 = (additionalImages || []).map((img: string) => 
      img.replace(/^data:image\/\w+;base64,/, '')
    );
    
    const areaLabels = areas || ['Geladeira'];
    logStep('Analyzing fridge photo', { areas: areaLabels, imageCount: 1 + additionalBase64.length });

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
      intoleranceContext = `ATENÇÃO CRÍTICA - SEGURANÇA ALIMENTAR:
O usuário tem as seguintes intolerâncias/alergias: ${intolerances.join(', ')}.

REGRAS DE SEGURANÇA:
1. NÃO sugira receitas que contenham esses ingredientes ou derivados
2. Para CADA ingrediente identificado na geladeira, avalie o nível de confiança
3. Se um produto for identificado apenas pela embalagem/marca (sem ver o rótulo), marque confiança como "baixa"
4. Adicione alertas de segurança para produtos que PODEM conter alérgenos mesmo que não confirmado`;
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

    const systemPrompt = `Você é um chef de cozinha especializado em SEGURANÇA ALIMENTAR para pessoas com intolerâncias e alergias.

${dietaryContext}
${intoleranceContext}
${goalContext}
${complexityContext}
${contextInfo}

Analise a imagem da geladeira/despensa e:
1. Identifique todos os ingredientes visíveis
2. Para CADA ingrediente, avalie:
   - Nível de confiança na identificação (alta/media/baixa)
   - Se é "baixa", significa que você vê apenas a embalagem/marca, não o rótulo com ingredientes
3. Sugira 3 receitas SEGURAS com esses ingredientes
4. Adicione alertas de segurança quando necessário

VERIFICAÇÃO NEGATIVA (FAIL-SAFE):
- Se você NÃO consegue ver claramente o rótulo de um produto industrializado, assuma que PODE conter alérgenos
- Para margarinas, iogurtes, molhos, embutidos: SEMPRE adicionar alerta se não confirmar versão sem alérgeno
- Priorize ingredientes in natura (frutas, vegetais, carnes frescas) que são naturalmente seguros

IMPORTANTE: Se a imagem NÃO for de uma geladeira, despensa, ou não mostrar ingredientes/alimentos, responda APENAS com:
{"notFridge": true, "message": "Por favor, fotografe o interior da sua geladeira ou despensa"}

Se for uma geladeira/despensa com ingredientes, responda APENAS com JSON válido:
{
  "ingredientes_identificados": [
    {
      "nome": "nome do ingrediente",
      "quantidade_estimada": "quantidade aproximada",
      "confianca": "alta|media|baixa",
      "alerta_seguranca": "Alerta se aplicável, ou null",
      "tipo": "in_natura|industrializado"
    }
  ],
  "receitas_sugeridas": [
    {
      "nome": "Nome da Receita",
      "descricao": "Breve descrição da receita",
      "tempo_preparo": 30,
      "dificuldade": "fácil|média|difícil",
      "ingredientes_da_geladeira": ["ingrediente1", "ingrediente2"],
      "ingredientes_extras": ["ingrediente básico que pode precisar"],
      "calorias_estimadas": 350,
      "instrucoes_resumidas": ["Passo 1", "Passo 2", "Passo 3"],
      "alerta_receita": "Alerta geral sobre a receita se aplicável, ou null"
    }
  ],
  "alertas_gerais": ["Lista de alertas importantes sobre segurança alimentar"],
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
          temperature: 0.4, // Mais conservador para segurança
          topP: 0.95,
          maxOutputTokens: 3000,
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

    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format');
    }

    const analysis = JSON.parse(jsonMatch[0]);
    
    if (analysis.notFridge) {
      logStep('Not a fridge image');
      return new Response(JSON.stringify({
        notFridge: true,
        message: analysis.message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Pós-processamento: adicionar alertas extras baseado no mapa de produtos de risco
    if (analysis.ingredientes_identificados && intolerances.length > 0) {
      const alertasAdicionais: string[] = [];
      
      for (const ingrediente of analysis.ingredientes_identificados) {
        const nomeNormalizado = ingrediente.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Verificar cada intolerância do usuário
        for (const userIntolerance of intolerances) {
          const intoleranceKey = INTOLERANCE_MAP[userIntolerance.toLowerCase()] || userIntolerance.toLowerCase();
          const produtosRisco = PRODUTOS_RISCO[intoleranceKey] || [];
          
          // Verificar se o ingrediente está na lista de risco
          const isRisco = produtosRisco.some(produto => 
            nomeNormalizado.includes(produto.toLowerCase()) || 
            produto.toLowerCase().includes(nomeNormalizado)
          );
          
          if (isRisco && ingrediente.tipo === 'industrializado' && ingrediente.confianca !== 'alta') {
            // Se é industrializado e não temos confiança alta, adicionar alerta
            if (!ingrediente.alerta_seguranca) {
              const versaoSegura = intoleranceKey === 'lactose' ? 'sem lactose' :
                                   intoleranceKey === 'gluten' ? 'sem glúten' :
                                   `sem ${userIntolerance}`;
              ingrediente.alerta_seguranca = `⚠️ Verifique se este produto é a versão ${versaoSegura} antes de usar.`;
            }
          }
        }
      }
      
      // Adicionar alerta geral se há produtos de confiança baixa
      const produtosBaixaConfianca = analysis.ingredientes_identificados.filter(
        (i: any) => i.confianca === 'baixa' && i.tipo === 'industrializado'
      );
      
      if (produtosBaixaConfianca.length > 0) {
        if (!analysis.alertas_gerais) {
          analysis.alertas_gerais = [];
        }
        analysis.alertas_gerais.push(
          `⚠️ ${produtosBaixaConfianca.length} produto(s) não puderam ter o rótulo verificado. Por segurança, confirme que são adequados para suas restrições antes de usar.`
        );
      }
    }

    logStep('Analysis complete with safety checks', { 
      ingredientCount: analysis.ingredientes_identificados?.length,
      recipeCount: analysis.receitas_sugeridas?.length,
      alertCount: analysis.alertas_gerais?.length || 0
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
