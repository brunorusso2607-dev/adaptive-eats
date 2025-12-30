import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[SMART-SUBSTITUTES] ${step}`, details ? JSON.stringify(details) : '');
};

// Categorias de macronutrientes
type MacroCategory = 'proteina' | 'carboidrato' | 'gordura' | 'vegetal' | 'fruta' | 'bebida' | 'outro';

// Detecta a categoria do alimento baseado nos macros
function detectMacroCategory(protein: number, carbs: number, fat: number, name: string): MacroCategory {
  const nameLower = name.toLowerCase();
  
  // Detectar por nome primeiro
  if (nameLower.includes('chá') || nameLower.includes('café') || nameLower.includes('suco') || nameLower.includes('leite')) {
    return 'bebida';
  }
  if (nameLower.includes('salada') || nameLower.includes('alface') || nameLower.includes('brócolis') || 
      nameLower.includes('espinafre') || nameLower.includes('couve') || nameLower.includes('rúcula') ||
      nameLower.includes('tomate') || nameLower.includes('pepino') || nameLower.includes('cenoura')) {
    return 'vegetal';
  }
  if (nameLower.includes('banana') || nameLower.includes('maçã') || nameLower.includes('laranja') ||
      nameLower.includes('morango') || nameLower.includes('manga') || nameLower.includes('abacaxi')) {
    return 'fruta';
  }
  
  // Detectar por macros
  const total = protein + carbs + fat;
  if (total === 0) return 'outro';
  
  const proteinRatio = protein / total;
  const carbRatio = carbs / total;
  const fatRatio = fat / total;
  
  // Alta proteína (>40% das calorias vêm de proteína)
  if (proteinRatio > 0.35 || protein > 15) {
    return 'proteina';
  }
  
  // Alta gordura (>50% das calorias vêm de gordura)
  if (fatRatio > 0.5 || fat > 15) {
    return 'gordura';
  }
  
  // Alto carboidrato (>60% das calorias vêm de carbo)
  if (carbRatio > 0.5 || carbs > 20) {
    return 'carboidrato';
  }
  
  return 'outro';
}

// Tipos de preparo para coerência culinária
function detectPreparationStyle(name: string): string[] {
  const nameLower = name.toLowerCase();
  const styles: string[] = [];
  
  if (nameLower.includes('grelhad')) styles.push('grelhado');
  if (nameLower.includes('cozid')) styles.push('cozido');
  if (nameLower.includes('assad')) styles.push('assado');
  if (nameLower.includes('frit')) styles.push('frito');
  if (nameLower.includes('refogad')) styles.push('refogado');
  if (nameLower.includes('cru') || nameLower.includes('fresc')) styles.push('cru');
  
  if (styles.length === 0) styles.push('neutro');
  return styles;
}

// Mapeamento de tipos de refeição para alimentos adequados
const MEAL_TYPE_FOODS: Record<string, { 
  allowed: string[]; 
  forbidden: string[]; 
  examples: string[];
  label: string;
}> = {
  cafe_manha: {
    label: 'Café da Manhã',
    allowed: ['pão', 'tapioca', 'ovo', 'queijo', 'iogurte', 'fruta', 'aveia', 'granola', 'leite', 'café', 'suco', 'vitamina', 'panqueca', 'crepioca', 'torrada', 'manteiga', 'mel', 'geleia', 'cereal', 'mingau'],
    forbidden: ['arroz', 'feijão', 'carne vermelha', 'frango grelhado', 'salada de almoço', 'macarrão', 'lasanha', 'estrogonofe'],
    examples: ['Tapioca com queijo', 'Pão integral com ovo', 'Iogurte com granola', 'Vitamina de banana', 'Crepioca', 'Panqueca de aveia', 'Torrada com manteiga']
  },
  lanche_manha: {
    label: 'Lanche da Manhã',
    allowed: ['fruta', 'iogurte', 'castanha', 'barrinha', 'queijo', 'biscoito', 'suco', 'shake', 'sanduíche leve'],
    forbidden: ['arroz', 'feijão', 'carne de almoço', 'pratos pesados'],
    examples: ['Maçã com pasta de amendoim', 'Iogurte natural', 'Mix de castanhas', 'Banana', 'Queijo cottage']
  },
  almoco: {
    label: 'Almoço',
    allowed: ['arroz', 'feijão', 'carne', 'frango', 'peixe', 'salada', 'legumes', 'batata', 'macarrão', 'ovo', 'grão de bico', 'lentilha', 'quinoa'],
    forbidden: ['cereal matinal', 'panqueca doce', 'granola com leite'],
    examples: ['Arroz integral', 'Feijão preto', 'Filé de frango grelhado', 'Batata doce', 'Salada verde', 'Bife grelhado', 'Tilápia assada']
  },
  lanche_tarde: {
    label: 'Lanche da Tarde',
    allowed: ['fruta', 'iogurte', 'sanduíche', 'tapioca', 'pão', 'queijo', 'castanha', 'shake', 'suco', 'barrinha', 'torrada'],
    forbidden: ['arroz com feijão', 'pratos de almoço completo', 'refeições pesadas'],
    examples: ['Sanduíche natural', 'Tapioca', 'Frutas com iogurte', 'Shake proteico', 'Torrada com queijo']
  },
  lanche: {
    label: 'Lanche da Tarde',
    allowed: ['fruta', 'iogurte', 'sanduíche', 'tapioca', 'pão', 'queijo', 'castanha', 'shake', 'suco', 'barrinha', 'torrada'],
    forbidden: ['arroz com feijão', 'pratos de almoço completo', 'refeições pesadas'],
    examples: ['Sanduíche natural', 'Tapioca', 'Frutas com iogurte', 'Shake proteico', 'Torrada com queijo']
  },
  jantar: {
    label: 'Jantar',
    allowed: ['sopa', 'salada', 'omelete', 'peixe', 'frango', 'legumes', 'ovo', 'arroz', 'batata', 'carne leve', 'wrap', 'sanduíche'],
    forbidden: ['cereal matinal', 'granola', 'café da manhã típico'],
    examples: ['Sopa de legumes', 'Omelete', 'Salada com frango', 'Peixe grelhado', 'Wrap integral']
  },
  ceia: {
    label: 'Ceia',
    allowed: ['chá', 'fruta', 'iogurte', 'castanha', 'leite', 'queijo cottage', 'aveia'],
    forbidden: ['carne pesada', 'fritura', 'refeição completa', 'arroz com feijão'],
    examples: ['Chá de camomila', 'Iogurte natural', 'Maçã', 'Leite morno', 'Queijo cottage']
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      ingredientName, 
      ingredientGrams, 
      ingredientProtein,
      ingredientCarbs,
      ingredientFat,
      ingredientCalories,
      mealType,
      restrictions,
      strategyKey // Nova prop para identificar dieta flexível
    } = await req.json();

    if (!ingredientName) {
      return new Response(
        JSON.stringify({ error: 'Ingredient name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isFlexibleDiet = strategyKey === 'dieta_flexivel';
    
    logStep('Processing request', { 
      ingredientName, 
      ingredientGrams,
      mealType,
      strategyKey,
      isFlexibleDiet,
      macros: { protein: ingredientProtein, carbs: ingredientCarbs, fat: ingredientFat, calories: ingredientCalories }
    });

    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    // Detectar categoria do macro principal
    const macroCategory = detectMacroCategory(
      ingredientProtein || 0, 
      ingredientCarbs || 0, 
      ingredientFat || 0,
      ingredientName
    );
    
    // Detectar estilo de preparo
    const prepStyles = detectPreparationStyle(ingredientName);
    
    // Obter regras do tipo de refeição
    const mealTypeInfo = MEAL_TYPE_FOODS[mealType] || MEAL_TYPE_FOODS['almoco'];
    
    logStep('Detected categories', { macroCategory, prepStyles, mealType, mealTypeLabel: mealTypeInfo.label });

    // Calcular o macro principal a igualar
    let mainMacro = 'proteína';
    let mainMacroValue = ingredientProtein || 0;
    let mainMacroPer100g = 0;
    
    if (macroCategory === 'carboidrato') {
      mainMacro = 'carboidratos';
      mainMacroValue = ingredientCarbs || 0;
    } else if (macroCategory === 'gordura') {
      mainMacro = 'gordura';
      mainMacroValue = ingredientFat || 0;
    }

    // Calcular macro por 100g do original (para a fórmula)
    const originalGrams = ingredientGrams || 100;
    if (originalGrams > 0) {
      mainMacroPer100g = (mainMacroValue / originalGrams) * 100;
    }

    // Calcular o total de macro que precisa ser igualado
    const totalMacroToMatch = mainMacroValue;

    const restrictionsText = restrictions && restrictions.length > 0 
      ? `RESTRIÇÕES DO USUÁRIO (CRÍTICO - NÃO VIOLAR): ${restrictions.join(', ')}`
      : '';

    // Texto específico para dieta flexível
    const flexibleDietText = isFlexibleDiet ? `
===== DIETA FLEXÍVEL - OPÇÕES EXTRAS =====
O usuário está na DIETA FLEXÍVEL. Você deve gerar:
- 3 opções SAUDÁVEIS (normais)
- 2 opções de "COMFORT FOOD" (mais indulgentes mas equilibradas)

Para as opções de comfort food, marque com "isFlexible": true
Exemplos de comfort food: hambúrguer artesanal, pizza fit, wrap recheado, sanduíche gourmet, panqueca americana, etc.
As opções flexíveis devem respeitar as restrições do usuário mas podem ser mais calóricas.
` : '';

    const numberOfSubstitutes = isFlexibleDiet ? 5 : 5;
    const formatInstructions = isFlexibleDiet 
      ? `[
  {
    "name": "Nome do substituto saudável",
    "grams": NÚMERO_CALCULADO_PELA_FÓRMULA,
    "calories": calorias_proporcionais_à_gramagem,
    "protein": proteína_proporcional_à_gramagem,
    "carbs": carboidratos_proporcionais_à_gramagem,
    "fat": gordura_proporcional_à_gramagem,
    "reason": "Substituto de ${mealTypeInfo.label}, igualando ${mainMacro}. Gramagem calculada: X / Y × 100 = Zg",
    "isFlexible": false
  },
  {
    "name": "Nome do comfort food (ex: Hambúrguer fit, Pizza proteica)",
    "grams": NÚMERO_CALCULADO,
    "calories": calorias,
    "protein": proteína,
    "carbs": carboidratos,
    "fat": gordura,
    "reason": "Opção flexível/comfort food para Dieta Flexível",
    "isFlexible": true
  }
]

IMPORTANTE: As primeiras 3 opções devem ser saudáveis (isFlexible: false).
As últimas 2 opções devem ser comfort foods (isFlexible: true).`
      : `[
  {
    "name": "Nome do substituto com preparo adequado à refeição",
    "grams": NÚMERO_CALCULADO_PELA_FÓRMULA,
    "calories": calorias_proporcionais_à_gramagem,
    "protein": proteína_proporcional_à_gramagem,
    "carbs": carboidratos_proporcionais_à_gramagem,
    "fat": gordura_proporcional_à_gramagem,
    "reason": "Substituto de ${mealTypeInfo.label}, igualando ${mainMacro}. Gramagem calculada: X / Y × 100 = Zg"
  }
]`;

    const prompt = `Você é um nutricionista especializado em substituições alimentares PRECISAS e EQUILIBRADAS.

TAREFA: Sugerir ${numberOfSubstitutes} substitutos para "${ingredientName}" (${ingredientGrams}g) no contexto de ${mealTypeInfo.label}

DADOS DO ALIMENTO ORIGINAL:
- Gramagem: ${ingredientGrams}g
- Calorias totais: ${ingredientCalories} kcal
- Proteína total: ${ingredientProtein}g
- Carboidratos totais: ${ingredientCarbs}g
- Gordura total: ${ingredientFat}g
- Categoria detectada: ${macroCategory.toUpperCase()}
- Estilo de preparo: ${prepStyles.join(', ')}

TIPO DE REFEIÇÃO: ${mealTypeInfo.label.toUpperCase()}
- Alimentos PERMITIDOS para esta refeição: ${mealTypeInfo.allowed.join(', ')}
- Alimentos PROIBIDOS para esta refeição: ${mealTypeInfo.forbidden.join(', ')}
- Exemplos típicos: ${mealTypeInfo.examples.join(', ')}

${restrictionsText}
${flexibleDietText}

===== REGRAS CRÍTICAS =====

1. GRAMAGEM POR MACRONUTRIENTE (MAIS IMPORTANTE):
   O macro principal é ${mainMacro.toUpperCase()} = ${totalMacroToMatch}g
   
   FÓRMULA OBRIGATÓRIA:
   nova_gramagem = (${totalMacroToMatch} / macro_do_substituto_por_100g) × 100
   
   EXEMPLO:
   - Original: Panqueca 100g com 5g proteína
   - Substituto: Pão integral (10g prot/100g)
   - Cálculo: (5 / 10) × 100 = 50g de pão integral
   
   ⚠️ A gramagem NUNCA deve ser igual (100g) para todos. Deve variar conforme o teor de macro de cada substituto!

2. ADEQUAÇÃO POR REFEIÇÃO:
   Esta é uma refeição de ${mealTypeInfo.label}.
   - SÓ sugerir alimentos típicos desta refeição
   - NÃO sugerir: ${mealTypeInfo.forbidden.join(', ')}

3. COERÊNCIA CULINÁRIA:
   - Se o original é ${prepStyles[0]}, sugerir alimentos com preparo similar
   - Manter mesma categoria: ${macroCategory === 'proteina' ? 'outras proteínas' : macroCategory === 'carboidrato' ? 'outros carboidratos' : 'mesma categoria'}
   - Acessibilidade similar (não trocar frango por salmão caro)

===== FORMATO DE RESPOSTA (JSON puro, sem markdown) =====
${formatInstructions}

===== VERIFICAÇÃO ANTES DE RETORNAR =====
Para CADA substituto, verifique:
□ A gramagem foi calculada pela fórmula? (NÃO é 100g para todos)
□ O ${mainMacro} está próximo de ${totalMacroToMatch}g?
□ É apropriado para ${mealTypeInfo.label}?
□ Respeita o estilo de preparo (${prepStyles[0]})?
□ É acessível (custo/disponibilidade similar)?

Retorne APENAS o array JSON com ${numberOfSubstitutes} substitutos que passem em TODAS as verificações.`;

    logStep('Sending prompt to AI', { totalMacroToMatch, mainMacro, mealType });

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
            maxOutputTokens: 2048,
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
    
    logStep('AI Response received', { contentLength: content.length });
    
    // Parse JSON from response
    let suggestions: any[] = [];
    try {
      // Handle markdown code blocks
      let jsonStr = content;
      if (content.includes('```json')) {
        jsonStr = content.split('```json')[1].split('```')[0];
      } else if (content.includes('```')) {
        jsonStr = content.split('```')[1].split('```')[0];
      }
      
      suggestions = JSON.parse(jsonStr.trim());
      
      // Ensure it's an array
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      } else {
        // Validate and clean each suggestion
        suggestions = suggestions
          .filter(s => s && typeof s.name === 'string' && typeof s.grams === 'number')
          .slice(0, 5)
          .map((s, index) => ({
            name: s.name,
            grams: Math.round(s.grams),
            calories: Math.round(s.calories || 0),
            protein: Math.round((s.protein || 0) * 10) / 10,
            carbs: Math.round((s.carbs || 0) * 10) / 10,
            fat: Math.round((s.fat || 0) * 10) / 10,
            reason: s.reason || '',
            // Incluir isFlexible se presente na resposta (para dieta flexível)
            isFlexible: s.isFlexible === true || (isFlexibleDiet && index >= 3) // Fallback: últimas 2 são flexíveis
          }));
      }
    } catch (parseError) {
      logStep('Parse error', { error: parseError, content });
      suggestions = [];
    }

    logStep('Returning suggestions', { 
      count: suggestions.length,
      isFlexibleDiet,
      suggestions: suggestions.map(s => ({ 
        name: s.name, 
        grams: s.grams, 
        isFlexible: s.isFlexible,
        [mainMacro]: macroCategory === 'proteina' ? s.protein : macroCategory === 'carboidrato' ? s.carbs : s.fat 
      }))
    });

    return new Response(
      JSON.stringify({ 
        suggestions,
        originalCategory: macroCategory,
        mainMacro,
        mainMacroValue: totalMacroToMatch,
        mealType: mealTypeInfo.label,
        isFlexibleDiet
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
