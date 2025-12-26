import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { foodName, userIntolerances } = await req.json();
    
    if (!foodName) {
      return new Response(
        JSON.stringify({ error: 'Nome do alimento é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log(`Analisando alimento: ${foodName}`);
    console.log(`Intolerâncias do usuário: ${userIntolerances?.join(', ') || 'nenhuma'}`);

    // Mapeamento de intolerâncias para ingredientes problemáticos
    const intoleranceIngredients: Record<string, string[]> = {
      lactose: ['leite', 'queijo', 'manteiga', 'creme de leite', 'iogurte', 'requeijão', 'nata', 'chantilly', 'cream cheese', 'catupiry', 'mussarela', 'parmesão', 'cheddar', 'provolone', 'gorgonzola', 'ricota', 'cottage', 'coalho', 'leite condensado', 'doce de leite', 'sorvete', 'chocolate ao leite'],
      gluten: ['trigo', 'farinha', 'pão', 'massa', 'macarrão', 'biscoito', 'bolacha', 'cerveja', 'cevada', 'centeio', 'aveia', 'semolina', 'bulgur', 'cuscuz', 'seitan', 'empanado', 'breading'],
      ovo: ['ovo', 'gema', 'clara', 'maionese', 'meringue'],
      frutos_do_mar: ['peixe', 'camarão', 'lagosta', 'lula', 'polvo', 'marisco', 'ostra', 'mexilhão', 'caranguejo', 'siri', 'vieira', 'salmão', 'atum', 'bacalhau', 'sardinha'],
      amendoim: ['amendoim', 'pasta de amendoim', 'óleo de amendoim'],
      soja: ['soja', 'tofu', 'shoyu', 'molho de soja', 'edamame', 'missô', 'tempeh', 'lecitina de soja'],
      castanhas: ['castanha', 'noz', 'amêndoa', 'avelã', 'pistache', 'macadâmia', 'pecã', 'pinhão'],
      acucar: ['açúcar', 'mel', 'melado', 'xarope', 'caramelo', 'glucose'],
    };

    const systemPrompt = `Você é um nutricionista especialista em análise de alimentos e intolerâncias alimentares.
Sua tarefa é analisar um alimento e identificar TODOS os ingredientes típicos que ele contém.

IMPORTANTE:
- Liste TODOS os ingredientes comuns desse alimento
- Seja específico (ex: "farinha de trigo" em vez de apenas "farinha")
- Considere ingredientes ocultos (ex: maionese contém ovo)
- Para pratos compostos, liste os ingredientes de cada componente

Responda SEMPRE em formato JSON válido.`;

    const userPrompt = `Analise o alimento: "${foodName}"

Liste todos os ingredientes típicos deste alimento em formato JSON:
{
  "ingredientes": ["ingrediente1", "ingrediente2", ...],
  "descricao": "breve descrição do alimento"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido, tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes para análise de IA." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta da IA vazia");
    }

    console.log("Resposta da IA:", content);

    // Parse JSON da resposta
    let analysisResult: { ingredientes: string[]; descricao: string };
    try {
      // Remove possíveis backticks de markdown
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Erro ao parsear resposta:", parseError);
      // Fallback: tentar extrair ingredientes do texto
      analysisResult = {
        ingredientes: [],
        descricao: content
      };
    }

    // Detectar conflitos com intolerâncias do usuário
    const conflicts: Array<{
      intolerance: string;
      intoleranceLabel: string;
      foundIngredients: string[];
    }> = [];

    if (userIntolerances && userIntolerances.length > 0) {
      const intoleranceLabels: Record<string, string> = {
        lactose: "Lactose",
        gluten: "Glúten",
        ovo: "Ovo",
        frutos_do_mar: "Frutos do Mar",
        amendoim: "Amendoim",
        soja: "Soja",
        castanhas: "Castanhas",
        acucar: "Açúcar",
      };

      for (const intolerance of userIntolerances) {
        if (intolerance === "nenhuma") continue;
        
        const problematicIngredients = intoleranceIngredients[intolerance] || [];
        const foundProblematic: string[] = [];

        for (const ingredient of analysisResult.ingredientes) {
          const normalizedIngredient = ingredient.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          
          for (const problematic of problematicIngredients) {
            const normalizedProblematic = problematic.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
            
            if (normalizedIngredient.includes(normalizedProblematic) || 
                normalizedProblematic.includes(normalizedIngredient)) {
              if (!foundProblematic.includes(ingredient)) {
                foundProblematic.push(ingredient);
              }
            }
          }
        }

        if (foundProblematic.length > 0) {
          conflicts.push({
            intolerance,
            intoleranceLabel: intoleranceLabels[intolerance] || intolerance,
            foundIngredients: foundProblematic,
          });
        }
      }
    }

    const result = {
      foodName,
      ingredients: analysisResult.ingredientes,
      description: analysisResult.descricao,
      conflicts,
      hasConflicts: conflicts.length > 0,
    };

    console.log("Resultado da análise:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na análise de intolerâncias:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
