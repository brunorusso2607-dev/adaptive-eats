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
      restrictions 
    } = await req.json();

    if (!ingredientName) {
      return new Response(
        JSON.stringify({ error: 'Ingredient name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep('Processing request', { 
      ingredientName, 
      ingredientGrams,
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
    
    logStep('Detected categories', { macroCategory, prepStyles });

    // Calcular o macro principal a igualar
    let mainMacro = 'proteína';
    let mainMacroValue = ingredientProtein || 0;
    
    if (macroCategory === 'carboidrato') {
      mainMacro = 'carboidratos';
      mainMacroValue = ingredientCarbs || 0;
    } else if (macroCategory === 'gordura') {
      mainMacro = 'gordura';
      mainMacroValue = ingredientFat || 0;
    }

    const restrictionsText = restrictions && restrictions.length > 0 
      ? `RESTRIÇÕES DO USUÁRIO (CRÍTICO - NÃO VIOLAR): ${restrictions.join(', ')}`
      : '';

    const prompt = `Você é um nutricionista especializado em substituições alimentares precisas.

TAREFA: Sugerir 5 substitutos para "${ingredientName}" (${ingredientGrams}g)

DADOS DO ALIMENTO ORIGINAL:
- Calorias: ${ingredientCalories} kcal
- Proteína: ${ingredientProtein}g
- Carboidratos: ${ingredientCarbs}g
- Gordura: ${ingredientFat}g
- Categoria detectada: ${macroCategory.toUpperCase()}
- Estilo de preparo: ${prepStyles.join(', ')}

${restrictionsText}

REGRAS CRÍTICAS:
1. MACRO EQUIVALENTE: Cada substituto deve ter gramagem calculada para igualar o macro principal (${mainMacro}: ${mainMacroValue}g)
2. COERÊNCIA CULINÁRIA: Se o original é grelhado, sugerir alimentos que podem ser grelhados
3. ACESSIBILIDADE: Priorizar alimentos de custo e disponibilidade similar (não trocar frango por salmão)
4. CATEGORIA SIMILAR: ${macroCategory === 'proteina' ? 'Sugerir outras proteínas animais ou vegetais de alto teor proteico' : 
   macroCategory === 'carboidrato' ? 'Sugerir outros carboidratos complexos' :
   macroCategory === 'gordura' ? 'Sugerir outras fontes de gordura saudável' :
   macroCategory === 'vegetal' ? 'Sugerir outros vegetais' :
   macroCategory === 'fruta' ? 'Sugerir outras frutas' :
   'Sugerir alimentos da mesma categoria'}

FÓRMULA PARA GRAMAGEM:
nova_gramagem = (${mainMacroValue}g × ${ingredientGrams}g) / macro_do_substituto_por_100g

FORMATO DE RESPOSTA (JSON puro, sem markdown):
[
  {
    "name": "Nome do substituto com preparo",
    "grams": 120,
    "calories": 165,
    "protein": 31,
    "carbs": 0,
    "fat": 3.6,
    "reason": "Breve justificativa"
  }
]

EXEMPLOS DE SUBSTITUIÇÕES COERENTES:
- Frango grelhado → Bife grelhado, Filé de tilápia grelhado, Sobrecoxa grelhada
- Arroz branco → Arroz integral, Quinoa, Batata doce cozida
- Azeite → Óleo de coco, Manteiga, Abacate
- Banana → Maçã, Pêra, Mamão

NÃO SUGERIR:
- Alimentos de preparo incompatível (frango grelhado → atum em lata)
- Alimentos muito mais caros (frango → salmão, camarão)
- Alimentos de categoria diferente (proteína → carboidrato)

Retorne APENAS o array JSON com 5 substitutos.`;

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
            maxOutputTokens: 1024,
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
          .map(s => ({
            name: s.name,
            grams: Math.round(s.grams),
            calories: Math.round(s.calories || 0),
            protein: Math.round((s.protein || 0) * 10) / 10,
            carbs: Math.round((s.carbs || 0) * 10) / 10,
            fat: Math.round((s.fat || 0) * 10) / 10,
            reason: s.reason || ''
          }));
      }
    } catch (parseError) {
      logStep('Parse error', { error: parseError, content });
      suggestions = [];
    }

    logStep('Returning suggestions', { count: suggestions.length, suggestions });

    return new Response(
      JSON.stringify({ 
        suggestions,
        originalCategory: macroCategory,
        mainMacro,
        mainMacroValue
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
