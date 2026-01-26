import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVIEW-BLOCKED] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting blocked ingredients review");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Buscar API key do Gemini do banco de dados
    const geminiApiKey = await getGeminiApiKey();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Busca ingredientes pendentes de revisão (máximo 20 por execução)
    const { data: pendingItems, error: fetchError } = await supabase
      .from('blocked_ingredients_review')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      throw new Error(`Error fetching pending items: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      logStep("No pending items to review");
      return new Response(JSON.stringify({ 
        success: true, 
        message: "No pending items",
        reviewed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep(`Found ${pendingItems.length} pending items to review`);

    // Agrupa por ingrediente único para evitar análises duplicadas
    const uniqueIngredients = new Map<string, typeof pendingItems[0][]>();
    for (const item of pendingItems) {
      const key = `${item.ingredient.toLowerCase()}_${item.intolerance_or_diet}`;
      if (!uniqueIngredients.has(key)) {
        uniqueIngredients.set(key, []);
      }
      uniqueIngredients.get(key)!.push(item);
    }

    logStep(`Grouped into ${uniqueIngredients.size} unique ingredient+diet combinations`);

    let reviewed = 0;
    let falsePositives = 0;
    let trueBlocks = 0;

    // Processa cada ingrediente único
    for (const [key, items] of uniqueIngredients) {
      const firstItem = items[0];
      
      try {
        logStep(`Analyzing: "${firstItem.ingredient}" for ${firstItem.intolerance_or_diet}`);

        // Chama a IA para analisar
        const analysisResult = await analyzeIngredientWithGemini(
          geminiApiKey,
          firstItem.ingredient,
          firstItem.intolerance_or_diet,
          firstItem.recipe_context,
          firstItem.blocked_reason
        );

        logStep(`AI Decision: ${analysisResult.decision}`, { 
          reason: analysisResult.reason.substring(0, 100) 
        });

        // Atualiza todos os items deste ingrediente
        const itemIds = items.map(i => i.id);
        
        await supabase
          .from('blocked_ingredients_review')
          .update({
            status: analysisResult.decision === 'false_positive' ? 'approved' : 'confirmed_block',
            ai_analysis: analysisResult.reason,
            ai_decision: analysisResult.decision,
            reviewed_at: new Date().toISOString()
          })
          .in('id', itemIds);

        // Se for falso positivo, adiciona à lista de exceções dinâmicas
        if (analysisResult.decision === 'false_positive') {
          falsePositives++;
          
          // Verifica se já existe
          const { data: existing } = await supabase
            .from('dynamic_safe_ingredients')
            .select('id')
            .eq('ingredient', firstItem.ingredient.toLowerCase())
            .eq('safe_for', firstItem.intolerance_or_diet)
            .single();

          if (!existing) {
            await supabase
              .from('dynamic_safe_ingredients')
              .insert({
                ingredient: firstItem.ingredient.toLowerCase(),
                safe_for: firstItem.intolerance_or_diet,
                reason: analysisResult.reason,
                confidence: analysisResult.confidence || 'high',
                review_id: firstItem.id,
                source: 'ai_review'
              });
            
            logStep(`Added to dynamic safe list: "${firstItem.ingredient}" for ${firstItem.intolerance_or_diet}`);
          }
        } else {
          trueBlocks++;
        }

        reviewed += items.length;

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (itemError) {
        logStep(`Error processing ${firstItem.ingredient}`, { error: String(itemError) });
        
        // Marca como erro para revisão manual
        await supabase
          .from('blocked_ingredients_review')
          .update({
            status: 'error',
            ai_analysis: `Error: ${String(itemError)}`
          })
          .in('id', items.map(i => i.id));
      }
    }

    const summary = {
      success: true,
      reviewed,
      falsePositives,
      trueBlocks,
      message: `Reviewed ${reviewed} items: ${falsePositives} false positives, ${trueBlocks} confirmed blocks`
    };

    logStep("Review complete", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep("Error in review function", { error: String(error) });
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Analisa um ingrediente bloqueado usando Gemini
 */
async function analyzeIngredientWithGemini(
  apiKey: string,
  ingredient: string,
  intoleranceOrDiet: string,
  recipeContext: string | null,
  blockedReason: string
): Promise<{ decision: 'false_positive' | 'true_block'; reason: string; confidence: string }> {
  
  const prompt = `Você é um especialista em nutrição e alergias alimentares. Sua tarefa é analisar se um ingrediente foi CORRETAMENTE bloqueado para uma dieta/intolerância específica.

REGRAS IMPORTANTES:
1. Analise o NOME COMPLETO do ingrediente, não apenas palavras isoladas
2. Considere que:
   - "queijo vegano" NÃO contém lactose
   - "leite de coco" NÃO contém lactose
   - "pimenta calabresa" NÃO é linguiça calabresa (é apenas tempero)
   - "couve manteiga" NÃO contém manteiga (é um vegetal)
   - "aveia sem glúten" NÃO contém glúten
   - "ovo vegano" NÃO contém ovo real
3. Produtos rotulados como "vegano/vegetal/plant-based" geralmente NÃO contêm derivados animais
4. Verifique se o contexto da receita ajuda a entender o ingrediente

Analise este ingrediente bloqueado:

INGREDIENTE: "${ingredient}"
DIETA/INTOLERÂNCIA: ${intoleranceOrDiet}
MOTIVO DO BLOQUEIO: ${blockedReason}
CONTEXTO DA RECEITA: ${recipeContext || 'Não disponível'}

Este ingrediente foi CORRETAMENTE bloqueado ou é um FALSO POSITIVO?

RESPONDA APENAS no formato JSON:
{
  "decision": "false_positive" ou "true_block",
  "reason": "explicação clara e concisa em português",
  "confidence": "high", "medium" ou "low"
}`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
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
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Extrai JSON da resposta
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not parse AI response as JSON');
  }

  const result = JSON.parse(jsonMatch[0]);
  
  return {
    decision: result.decision === 'false_positive' ? 'false_positive' : 'true_block',
    reason: result.reason || 'Análise não disponível',
    confidence: result.confidence || 'medium'
  };
}

