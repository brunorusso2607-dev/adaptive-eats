import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[FRIDGE-ANALYZER] ${step}`, details ? JSON.stringify(details) : '');
};

// Mapa de produtos de risco por intolerância (inclui nomes comerciais e técnicos)
const PRODUTOS_RISCO: Record<string, string[]> = {
  lactose: [
    // Produtos comuns
    'margarina', 'manteiga', 'iogurte', 'queijo', 'requeijão', 'cream cheese',
    'leite', 'creme de leite', 'chantilly', 'doce de leite', 'leite condensado',
    'sorvete', 'pudim', 'mousse', 'yakult', 'danoninho', 'petit suisse',
    'nata', 'coalhada', 'kefir', 'ricota', 'cottage', 'mussarela', 'parmesão',
    'gorgonzola', 'brie', 'camembert', 'provolone', 'gouda', 'cheddar',
    // Marcas conhecidas com lactose
    'qualy', 'danone', 'activia', 'vigor', 'nestle', 'elegê', 'parmalat',
    // Nomes técnicos (alérgenos ocultos)
    'caseína', 'caseinato', 'lactose', 'soro de leite', 'whey', 'lactoalbumina',
    'lactoglobulina', 'proteína do leite', 'gordura de leite', 'lactato'
  ],
  gluten: [
    // Produtos comuns
    'pão', 'torrada', 'bisnaguinha', 'bolo', 'bolacha', 'biscoito', 'massa',
    'macarrão', 'lasanha', 'pizza', 'cerveja', 'molho shoyu', 'molho teriyaki',
    'empanado', 'nuggets', 'salsicha', 'linguiça', 'hambúrguer', 'ketchup',
    'mostarda', 'maionese', 'molho barbecue', 'molho branco', 'croquete',
    'esfiha', 'pão de queijo', 'croissant', 'wrap', 'tortilla',
    // Marcas conhecidas com glúten
    'bauducco', 'pullman', 'wickbold', 'seven boys', 'visconti', 'adria',
    // Nomes técnicos (alérgenos ocultos)
    'glúten', 'trigo', 'centeio', 'cevada', 'aveia', 'malte', 'maltodextrina',
    'amido de trigo', 'farinha de trigo', 'proteína de trigo', 'seitan',
    'triticale', 'espelta', 'kamut', 'bulgur', 'cuscuz'
  ],
  amendoim: [
    'pasta de amendoim', 'paçoca', 'pé de moleque', 'amendoim', 'manteiga de amendoim',
    'molho satay', 'pad thai', 'cookies', 'brownie', 'sorvete', 'granola',
    'barra de cereal', 'chocolate', 'bombom',
    // Nomes técnicos
    'arachis hypogaea', 'óleo de amendoim', 'proteína de amendoim'
  ],
  oleaginosas: [
    'castanha', 'nozes', 'amêndoas', 'pistache', 'avelã', 'macadâmia',
    'castanha de caju', 'castanha do pará', 'nutella', 'creme de avelã',
    'leite de amêndoas', 'pesto', 'marzipã', 'torrone', 'praline',
    // Nomes técnicos
    'corylus avellana', 'prunus dulcis', 'anacardium occidentale'
  ],
  frutos_do_mar: [
    'camarão', 'lagosta', 'caranguejo', 'siri', 'lula', 'polvo', 'marisco',
    'mexilhão', 'ostra', 'vieira', 'surimi', 'kani', 'tempurá',
    // Nomes técnicos
    'crustáceo', 'molusco', 'extrato de crustáceos'
  ],
  peixe: [
    'atum', 'sardinha', 'salmão', 'tilápia', 'bacalhau', 'anchova',
    'molho de peixe', 'fish sauce', 'caesar', 'molho worcestershire',
    // Nomes técnicos
    'colágeno de peixe', 'gelatina de peixe', 'óleo de peixe', 'ômega-3'
  ],
  ovo: [
    'ovo', 'maionese', 'aioli', 'mousse', 'merengue', 'marshmallow',
    'massa fresca', 'macarrão', 'bolo', 'biscoito', 'pão de ló',
    'quiche', 'omelete', 'fritada', 'panqueca', 'waffle', 'crepe',
    // Nomes técnicos
    'albumina', 'ovalbumina', 'ovomucoide', 'lecitina de ovo', 'lisozima',
    'globulina', 'livetina', 'ovomucina', 'ovovitelina'
  ],
  soja: [
    'tofu', 'molho shoyu', 'missô', 'edamame', 'leite de soja', 'tempeh',
    'proteína de soja', 'óleo de soja', 'lecitina', 'molho teriyaki',
    // Nomes técnicos
    'lecitina de soja', 'proteína vegetal hidrolisada', 'PVT', 'TVP',
    'isolado proteico de soja', 'gordura vegetal hidrogenada'
  ],
  acucar: [
    'refrigerante', 'suco de caixinha', 'iogurte', 'achocolatado', 'gelatina',
    'pudim', 'doce', 'geleia', 'mel', 'açúcar', 'leite condensado',
    'chocolate', 'sorvete', 'bolo', 'biscoito', 'cereal matinal',
    // Nomes técnicos (açúcares ocultos)
    'sacarose', 'frutose', 'glicose', 'dextrose', 'maltose', 'xarope de milho',
    'xarope de glicose', 'açúcar invertido', 'melaço', 'xarope de agave',
    'xarope de malte', 'concentrado de suco de fruta'
  ]
};

// Conhecimento enciclopédico de produtos industrializados conhecidos
const PRODUTOS_CONHECIDOS: Record<string, { contem: string[], marcasTipicas: string[] }> = {
  margarina: {
    contem: ['soro de leite', 'lactose', 'gordura vegetal'],
    marcasTipicas: ['qualy', 'delícia', 'primor', 'claybom']
  },
  iogurte: {
    contem: ['leite', 'lactose', 'açúcar'],
    marcasTipicas: ['danone', 'activia', 'vigor', 'batavo', 'nestlé']
  },
  molho_shoyu: {
    contem: ['trigo', 'glúten', 'soja'],
    marcasTipicas: ['sakura', 'kikkoman', 'hinomoto']
  },
  maionese: {
    contem: ['ovo', 'óleo de soja'],
    marcasTipicas: ['hellmanns', 'heinz', 'quero', 'liza']
  },
  nuggets: {
    contem: ['farinha de trigo', 'glúten', 'soja'],
    marcasTipicas: ['sadia', 'seara', 'perdigão', 'aurora']
  },
  salsicha: {
    contem: ['amido de trigo', 'glúten', 'lactose'],
    marcasTipicas: ['sadia', 'seara', 'perdigão', 'swift']
  },
  presunto: {
    contem: ['amido', 'lactose', 'glúten'],
    marcasTipicas: ['sadia', 'seara', 'aurora', 'frimesa']
  },
  requeijao: {
    contem: ['leite', 'lactose', 'gordura de leite'],
    marcasTipicas: ['catupiry', 'polenguinho', 'vigor', 'polenghi']
  },
  chocolate: {
    contem: ['leite', 'lactose', 'açúcar', 'lecitina de soja'],
    marcasTipicas: ['nestlé', 'lacta', 'garoto', 'hersheys']
  },
  biscoito: {
    contem: ['farinha de trigo', 'glúten', 'açúcar', 'gordura vegetal'],
    marcasTipicas: ['bauducco', 'marilan', 'nestlé', 'piraquê']
  }
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
    const googleAIApiKey = await getGeminiApiKey();
    logStep("Gemini API key fetched from database");

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

    const systemPrompt = `You are a WORLD-CLASS EXPERT in FOOD SAFETY and GLOBAL CUISINE with encyclopedic knowledge of products from all countries.

${dietaryContext}
${intoleranceContext}
${goalContext}
${complexityContext}
${contextInfo}

=== GLOBAL PRODUCT RECOGNITION ===

You MUST recognize products from ALL regions including:
- **Americas**: US brands (Kraft, General Mills, Tyson), Brazilian brands (Sadia, Seara, Nestlé BR), Mexican, Argentine
- **Europe**: UK, German (Dr. Oetker), French, Italian, Spanish, Portuguese brands
- **Asia**: Japanese (Ajinomoto, Kikkoman), Korean (CJ, Ottogi), Chinese, Thai, Indian brands
- **Middle East**: Halal products, Arabic brands
- **Oceania**: Australian, New Zealand brands

=== MULTI-LANGUAGE ALLERGEN DETECTION ===

Recognize allergens in products from any language:

**LACTOSE/DAIRY in different languages:**
- EN: milk, whey, casein, lactose | PT: leite, soro de leite, caseína | ES: leche, suero | DE: Milch, Molke | FR: lait, lactosérum | JA: 乳, ホエイ

**GLUTEN in different languages:**
- EN: wheat, gluten, barley, malt | PT: trigo, glúten, cevada, malte | ES: trigo, gluten | DE: Weizen, Gluten | FR: blé, gluten | JA: 小麦, グルテン

**PEANUTS/TREE NUTS in different languages:**
- EN: peanut, almond, cashew, walnut | PT: amendoim, amêndoa, castanha | ES: cacahuete, almendra | DE: Erdnuss, Mandel | FR: arachide, amande | JA: 落花生, アーモンド

**EGGS in different languages:**
- EN: egg, albumin | PT: ovo, albumina | ES: huevo | DE: Ei | FR: œuf | JA: 卵

**SEAFOOD in different languages:**
- EN: fish, shrimp, crab, shellfish | PT: peixe, camarão, marisco | ES: pescado, camarón | DE: Fisch, Garnele | FR: poisson, crevette | JA: 魚, えび, かに

**SOY in different languages:**
- EN: soy, soya, lecithin | PT: soja, lecitina | ES: soja | DE: Soja | FR: soja | JA: 大豆

=== GLOBAL PRODUCT KNOWLEDGE ===

Known products and their typical allergens (from any country):
- **Margarine/Spreads** (any brand): typically contains whey/lactose
- **Soy Sauce** (Kikkoman, Sakura, any): contains wheat/gluten + soy
- **Mayonnaise** (Hellmann's, Kewpie, any): contains egg + soy
- **Breaded products** (nuggets, schnitzel, tonkatsu): contains gluten + soy
- **Processed meats** (sausages, ham, bacon): may contain gluten, lactose
- **Yogurt** (any brand unless labeled): contains lactose
- **Chocolate** (any brand): typically contains milk + soy lecithin
- **Ice cream** (any brand unless labeled): contains lactose

=== IDENTIFICATION GUIDELINES ===

1. VISUAL CONTEXT IDENTIFICATION:
   - Use branding, colors, logos, packaging shape, and typical fridge position
   - Even without seeing label clearly, identify product by brand/packaging
   - Consider the COUNTRY of the user when identifying products

2. ENCYCLOPEDIC KNOWLEDGE:
   - Retrieve TYPICAL ingredients from identified product in your knowledge base
   - If you identify "Margarine" → assume IMMEDIATELY presence of whey/lactose
   - If you identify "Soy Sauce" → assume presence of wheat/gluten

3. HIDDEN ALLERGEN DETECTION:
   Signal hidden substances in technical names:
   - LACTOSE: casein, caseinate, whey, lactalbumin, lactoglobulin
   - GLUTEN: maltodextrin, wheat starch, wheat protein, malt, seitan
   - EGG: albumin, ovalbumin, egg lecithin, lysozyme
   - SOY: soy lecithin, PVT, TVP, hydrolyzed vegetable protein

4. SAFETY PESSIMISM (FAIL-SAFE):
   - IF IN DOUBT = CLASSIFY AS UNSAFE
   - Better a false-negative than a health risk
   - If confidence < 85%, add alert to check manually

=== RECIPE SUGGESTION RULES ===

⚠️ NEVER USE UNIDENTIFIED INGREDIENTS IN RECIPES:
- If an item has "baixa" confidence or confianca_percentual < 70%, DO NOT include it in recipes
- ONLY suggest recipes with HIGH CONFIDENCE and SAFE ingredients

⚠️ CONSIDER GLOBAL CUISINES:
- Suggest recipes from the user's likely culture AND international options
- Brazilian user? Include Brazilian recipes but also global options
- Consider what makes sense with the identified ingredients

=== RESPONSE FORMAT (JSON required) ===

IMPORTANT: If the image is NOT a fridge/pantry, respond:
{"notFridge": true, "message": "Please photograph the inside of your fridge or pantry"}

{
  "ingredientes_identificados": [
    {
      "nome": "ingredient name",
      "nome_original": "name in original product language if different",
      "quantidade_estimada": "approximate quantity",
      "confianca": "alta|media|baixa",
      "confianca_percentual": 0-100,
      "pode_usar_em_receita": true|false,
      "motivo_restricao": "If pode_usar_em_receita=false, explain why",
      "alerta_seguranca": "Alert if applicable, or null",
      "tipo": "in_natura|industrializado|nao_identificado",
      "pais_origem_provavel": "Country code if identifiable",
      "substancias_detectadas": ["List of detected or presumed allergens"],
      "identificado_por": "rotulo|embalagem|marca|contexto|incerto",
      "recomendacao_verificacao": "Text suggesting user verify label, if applicable"
    }
  ],
  "receitas_sugeridas": [
    {
      "nome": "Recipe Name",
      "nome_original": "Original name if from specific cuisine",
      "culinaria_origem": "Cuisine of origin (Brazilian, Italian, Japanese, etc.)",
      "descricao": "Brief description",
      "tempo_preparo": 30,
      "dificuldade": "fácil|média|difícil",
      "ingredientes_da_geladeira": ["ONLY high confidence and safe ingredients"],
      "ingredientes_extras": ["needed ingredients with safe version spec if applicable"],
      "calorias_estimadas": 350,
      "instrucoes_resumidas": ["Step 1", "Step 2", "Step 3"],
      "seguro_para_usuario": true|false,
      "alerta_receita": "General alert about recipe if applicable, or null"
    }
  ],
  "ingredientes_nao_utilizados": [
    {
      "nome": "unused ingredient name",
      "motivo": "Why not included in recipes"
    }
  ],
  "alertas_gerais": ["List of important food safety alerts"],
  "resumo_seguranca": {
    "ingredientes_seguros": 0,
    "ingredientes_risco": 0,
    "ingredientes_verificar": 0,
    "mensagem": "Clear summary about ingredient safety"
  },
  "dica": "A quick tip about the ingredients"
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

    // ========== PÓS-PROCESSAMENTO: ENRIQUECIMENTO COM PRODUTOS_CONHECIDOS ==========
    // Esta etapa usa conhecimento enciclopédico para GARANTIR detecção de alérgenos
    
    if (analysis.ingredientes_identificados) {
      logStep('Starting post-processing with PRODUTOS_CONHECIDOS');
      
      for (const ingrediente of analysis.ingredientes_identificados) {
        const nomeNormalizado = ingrediente.nome.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, '');
        
        // 1. BUSCAR NO MAPA DE PRODUTOS CONHECIDOS
        let produtoEncontrado: { contem: string[], marcasTipicas: string[] } | null = null;
        let produtoKey = '';
        
        for (const [key, value] of Object.entries(PRODUTOS_CONHECIDOS)) {
          const keyNormalizado = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          // Verificar se o nome do ingrediente corresponde à chave do produto
          if (nomeNormalizado.includes(keyNormalizado) || keyNormalizado.includes(nomeNormalizado)) {
            produtoEncontrado = value;
            produtoKey = key;
            break;
          }
          // Verificar também pelas marcas típicas
          const matchesMarca = value.marcasTipicas.some(marca => 
            nomeNormalizado.includes(marca.toLowerCase())
          );
          if (matchesMarca) {
            produtoEncontrado = value;
            produtoKey = key;
            break;
          }
        }
        
        // 2. SE ENCONTROU PRODUTO CONHECIDO, ENRIQUECER COM INFORMAÇÕES
        if (produtoEncontrado) {
          logStep('Product matched in PRODUTOS_CONHECIDOS', { produto: produtoKey, ingrediente: ingrediente.nome });
          
          // Adicionar substâncias detectadas se não existir
          if (!ingrediente.substancias_detectadas || ingrediente.substancias_detectadas.length === 0) {
            ingrediente.substancias_detectadas = produtoEncontrado.contem;
          } else {
            // Mesclar com as substâncias já detectadas pela IA
            const substanciasExistentes = new Set(ingrediente.substancias_detectadas.map((s: string) => s.toLowerCase()));
            for (const substancia of produtoEncontrado.contem) {
              if (!substanciasExistentes.has(substancia.toLowerCase())) {
                ingrediente.substancias_detectadas.push(substancia);
              }
            }
          }
          
          // 3. VERIFICAR CONFLITOS COM INTOLERÂNCIAS DO USUÁRIO
          if (intolerances.length > 0) {
            const substanciasDoIngrediente = ingrediente.substancias_detectadas.map((s: string) => 
              s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            );
            
            const conflitosDetectados: string[] = [];
            
            for (const userIntolerance of intolerances) {
              const intoleranceKey = INTOLERANCE_MAP[userIntolerance.toLowerCase()] || userIntolerance.toLowerCase();
              const produtosRisco = PRODUTOS_RISCO[intoleranceKey] || [];
              
              // Verificar se alguma substância do ingrediente conflita com a intolerância
              for (const substancia of substanciasDoIngrediente) {
                const conflito = produtosRisco.some(produto => 
                  substancia.includes(produto.toLowerCase()) || 
                  produto.toLowerCase().includes(substancia)
                );
                if (conflito && !conflitosDetectados.includes(intoleranceKey)) {
                  conflitosDetectados.push(intoleranceKey);
                }
              }
            }
            
            // 4. ADICIONAR ALERTA DE SEGURANÇA SE HOUVER CONFLITO
            if (conflitosDetectados.length > 0) {
              const restricoesLabel = conflitosDetectados.map(c => 
                c === 'lactose' ? 'LACTOSE' :
                c === 'gluten' ? 'GLÚTEN' :
                c === 'ovo' ? 'OVO' :
                c === 'soja' ? 'SOJA' :
                c === 'acucar' ? 'AÇÚCAR' :
                c.toUpperCase()
              ).join(', ');
              
              const alertaAtual = ingrediente.alerta_seguranca || '';
              const novoAlerta = `🔴 CONTÉM ${restricoesLabel} (baseado em conhecimento do produto "${produtoKey}")`;
              
              if (!alertaAtual.includes(restricoesLabel)) {
                ingrediente.alerta_seguranca = alertaAtual 
                  ? `${alertaAtual} | ${novoAlerta}`
                  : novoAlerta;
              }
              
              // Marcar como industrializado se não estiver
              if (!ingrediente.tipo) {
                ingrediente.tipo = 'industrializado';
              }
              
              // Baixar confiança se IA tinha dado alta mas não viu rótulo
              if (ingrediente.confianca === 'alta' && ingrediente.identificado_por !== 'rotulo') {
                ingrediente.confianca = 'media';
                ingrediente.confianca_percentual = Math.min(ingrediente.confianca_percentual || 75, 75);
              }
            }
          }
        }
        
        // 5. VERIFICAÇÃO ADICIONAL COM PRODUTOS_RISCO (mesmo sem match em PRODUTOS_CONHECIDOS)
        if (intolerances.length > 0) {
          for (const userIntolerance of intolerances) {
            const intoleranceKey = INTOLERANCE_MAP[userIntolerance.toLowerCase()] || userIntolerance.toLowerCase();
            const produtosRisco = PRODUTOS_RISCO[intoleranceKey] || [];
            
            const isRisco = produtosRisco.some(produto => 
              nomeNormalizado.includes(produto.toLowerCase()) || 
              produto.toLowerCase().includes(nomeNormalizado)
            );
            
            if (isRisco && ingrediente.tipo === 'industrializado' && ingrediente.confianca !== 'alta') {
              if (!ingrediente.alerta_seguranca) {
                const versaoSegura = intoleranceKey === 'lactose' ? 'sem lactose' :
                                     intoleranceKey === 'gluten' ? 'sem glúten' :
                                     intoleranceKey === 'acucar' ? 'sem açúcar' :
                                     `sem ${userIntolerance}`;
                ingrediente.alerta_seguranca = `⚠️ Verifique se este produto é a versão ${versaoSegura} antes de usar.`;
              }
            }
          }
        }
      }
      
      // 6. ALERTAS GERAIS
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
      
      // 7. CONTAR ENRIQUECIMENTOS REALIZADOS
      const ingredientesEnriquecidos = analysis.ingredientes_identificados.filter(
        (i: any) => i.substancias_detectadas && i.substancias_detectadas.length > 0
      ).length;
      
      logStep('Post-processing complete', { 
        ingredientesEnriquecidos,
        totalIngredientes: analysis.ingredientes_identificados.length
      });
    }

    // ========== PÓS-PROCESSAMENTO DE SEGURANÇA - CRUZAMENTO COM PERFIL ==========
    // Esta etapa GARANTE que nenhuma intolerância do usuário escape da detecção
    
    const alertasPersonalizados: Array<{
      ingrediente: string;
      restricao: string;
      status: "seguro" | "risco_potencial" | "contem";
      mensagem: string;
      icone: string;
    }> = [];
    
    // Verificar cada intolerância do usuário contra os ingredientes identificados
    for (const userIntolerance of intolerances) {
      const intoleranceKey = INTOLERANCE_MAP[userIntolerance.toLowerCase()] || userIntolerance.toLowerCase();
      const produtosRisco = PRODUTOS_RISCO[intoleranceKey] || [];
      
      let found = false;
      let foundStatus: "seguro" | "risco_potencial" | "contem" = "seguro";
      let foundIngredient = "";
      
      // Verificar em ingredientes identificados
      if (analysis.ingredientes_identificados) {
        for (const ing of analysis.ingredientes_identificados) {
          const ingName = ing.nome?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || "";
          
          // Verificar se este ingrediente corresponde à intolerância
          const matchesIntolerance = produtosRisco.some(produto => 
            ingName.includes(produto.toLowerCase()) || 
            produto.toLowerCase().includes(ingName)
          );
          
          if (matchesIntolerance) {
            found = true;
            foundIngredient = ing.nome;
            // Se temos alerta de segurança ou confiança baixa, é risco_potencial
            // Se é industrializado sem alerta e alta confiança, assumimos que contém
            if (ing.alerta_seguranca || ing.confianca === 'baixa') {
              foundStatus = "risco_potencial";
            } else {
              foundStatus = "contem";
            }
          }
        }
      }
      
      // Gerar mensagem personalizada para o usuário
      const restricaoLabel = intoleranceKey === "lactose" ? "Lactose" :
                            intoleranceKey === "gluten" ? "Glúten" :
                            intoleranceKey === "acucar" ? "Açúcar" :
                            intoleranceKey === "amendoim" ? "Amendoim" :
                            intoleranceKey === "frutos_do_mar" ? "Frutos do Mar" :
                            intoleranceKey === "ovo" ? "Ovo" :
                            intoleranceKey === "soja" ? "Soja" :
                            intoleranceKey === "oleaginosas" ? "Oleaginosas" :
                            userIntolerance;
      
      if (found) {
        alertasPersonalizados.push({
          ingrediente: foundIngredient,
          restricao: restricaoLabel,
          status: foundStatus,
          mensagem: foundStatus === "contem" 
            ? `⚠️ "${foundIngredient}" contém ${restricaoLabel.toUpperCase()} - na sua lista de restrições`
            : `⚡ Verificar "${foundIngredient}" - pode conter ${restricaoLabel}`,
          icone: foundStatus === "contem" ? "🔴" : "🟡"
        });
      } else {
        alertasPersonalizados.push({
          ingrediente: "",
          restricao: restricaoLabel,
          status: "seguro",
          mensagem: `✅ Nenhum produto com ${restricaoLabel} identificado na geladeira`,
          icone: "🟢"
        });
      }
    }
    
    // Adicionar verificação de preferência alimentar
    if (dietaryPreference === "vegetariana" || dietaryPreference === "vegana") {
      const dietLabel = dietaryPreference === "vegana" ? "Veganismo" : "Vegetarianismo";
      const meatKeywords = ["carne", "frango", "peixe", "camarão", "bacon", "linguiça", "presunto", "salsicha", "boi"];
      const animalKeywords = [...meatKeywords, "leite", "queijo", "ovo", "manteiga", "iogurte", "mel"];
      const keywordsToCheck = dietaryPreference === "vegana" ? animalKeywords : meatKeywords;
      
      let foundIngredients: string[] = [];
      
      if (analysis.ingredientes_identificados) {
        for (const ing of analysis.ingredientes_identificados) {
          const ingName = ing.nome?.toLowerCase() || "";
          if (keywordsToCheck.some(keyword => ingName.includes(keyword))) {
            foundIngredients.push(ing.nome);
          }
        }
      }
      
      alertasPersonalizados.push({
        ingrediente: foundIngredients.join(", "),
        restricao: dietLabel,
        status: foundIngredients.length > 0 ? "contem" : "seguro",
        mensagem: foundIngredients.length > 0 
          ? `⚠️ ${foundIngredients.length} item(s) incompatível(s) com ${dietLabel.toLowerCase()}`
          : `✅ Ingredientes compatíveis com ${dietLabel.toLowerCase()}`,
        icone: foundIngredients.length > 0 ? "🔴" : "🟢"
      });
    }
    
    // Ordenar alertas: primeiro os problemas, depois os seguros
    alertasPersonalizados.sort((a, b) => {
      const order = { "contem": 0, "risco_potencial": 1, "seguro": 2 };
      return order[a.status] - order[b.status];
    });
    
    // Adicionar ao response
    const perfilUsuarioAplicado = {
      intolerances: intolerances,
      dietary_preference: dietaryPreference,
      alertas_personalizados: alertasPersonalizados,
      resumo: alertasPersonalizados.some(a => a.status === "contem")
        ? "Sua geladeira contém itens que requerem atenção"
        : alertasPersonalizados.some(a => a.status === "risco_potencial")
        ? "Alguns itens precisam de verificação"
        : "Todos os itens parecem seguros para seu perfil"
    };

    logStep('Analysis complete with safety checks and profile cross-check', { 
      ingredientCount: analysis.ingredientes_identificados?.length,
      recipeCount: analysis.receitas_sugeridas?.length,
      alertCount: analysis.alertas_gerais?.length || 0,
      personalizedAlerts: alertasPersonalizados.length,
      profileApplied: true
    });

    return new Response(JSON.stringify({ 
      analysis,
      perfil_usuario_aplicado: perfilUsuarioAplicado
    }), {
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
