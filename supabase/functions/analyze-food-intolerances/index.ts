import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { 
  getIntoleranceMappings, 
  checkFoodAgainstUserIntolerances,
  generateIngredientsPromptContext,
  getMappingsStats,
  INTOLERANCE_LABELS,
  normalizeText
} from "../_shared/getIntoleranceMappings.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ANALYZE-FOOD-INTOLERANCES] ${step}${detailsStr}`);
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

    logStep("Starting analysis", { foodName, intolerances: userIntolerances });

    // Buscar mapeamentos dinâmicos do banco de dados
    const intoleranceData = await getIntoleranceMappings();
    logStep("Loaded intolerance mappings from database", { stats: getMappingsStats(intoleranceData) });

    // Gerar contexto de ingredientes para o prompt
    const ingredientsContext = generateIngredientsPromptContext(
      userIntolerances || [],
      intoleranceData
    );

    // Prompt SUPERINTELIGENTE com conhecimento enciclopédico
    const systemPrompt = `Você é o MAIOR ESPECIALISTA MUNDIAL em segurança alimentar e intolerâncias.

## SUA MISSÃO
Analisar alimentos com PRECISÃO MÁXIMA para proteger pessoas com intolerâncias e alergias alimentares.

## SEU CONHECIMENTO ENCICLOPÉDICO INCLUI:

### 1. CULINÁRIA GLOBAL
- Pratos brasileiros (feijoada, moqueca, acarajé, vatapá, etc.)
- Culinária internacional (italiana, japonesa, tailandesa, indiana, etc.)
- Ingredientes ocultos em cada tipo de preparo
- Variações regionais e seus ingredientes típicos

### 2. INDÚSTRIA ALIMENTÍCIA
- Aditivos alimentares e seus códigos (E-numbers)
- Ingredientes técnicos (caseinato, maltodextrina, lecitina, etc.)
- Contaminação cruzada em processos industriais
- Ingredientes derivados e suas origens

### 3. BIOQUÍMICA ALIMENTAR
- Proteínas alergênicas e suas estruturas
- Carboidratos fermentáveis (FODMAPs)
- Histamina e aminas biogênicas
- Reações cruzadas entre alérgenos

### 4. REGULAMENTAÇÃO
- ANVISA (Brasil), FDA (EUA), EFSA (Europa)
- Legislação de rotulagem de alérgenos
- Limites de traços e contaminação

${ingredientsContext}

## REGRAS DE ANÁLISE

### DETECÇÃO DE INGREDIENTES:
1. Liste TODOS os ingredientes típicos do alimento
2. Considere ingredientes "ocultos" em molhos e temperos
3. Inclua possíveis contaminações cruzadas
4. Seja específico (ex: "farinha de trigo" não apenas "farinha")

### NÍVEL DE RISCO:
- **ALTO**: Ingrediente principal ou presente em quantidade significativa
- **MÉDIO**: Ingrediente secundário ou em molhos/temperos
- **BAIXO**: Possível traço ou contaminação cruzada

### FAIL-SAFE (REGRA DE OURO):
- Em caso de QUALQUER dúvida, assuma que CONTÉM o alérgeno
- Pratos gratinados, empanados e com molhos são SEMPRE suspeitos
- Alimentos processados geralmente contêm múltiplos alérgenos

## FORMATO DE RESPOSTA (JSON obrigatório):
{
  "ingredientes": ["lista completa de ingredientes identificados"],
  "descricao": "descrição detalhada do alimento e método de preparo",
  "analise_detalhada": {
    "ingredientes_principais": ["..."],
    "ingredientes_secundarios": ["..."],
    "possiveis_contaminacoes": ["..."]
  },
  "notas_especialista": "observações importantes sobre o alimento"
}`;

    const userPrompt = `Analise o seguinte alimento com MÁXIMA PRECISÃO: "${foodName}"

Considere:
1. Todos os ingredientes típicos deste prato/alimento
2. Variações comuns de preparo
3. Ingredientes que podem estar "escondidos"
4. Possíveis fontes de contaminação cruzada

INTOLERÂNCIAS DO USUÁRIO PARA VERIFICAR: ${userIntolerances?.length > 0 ? userIntolerances.join(", ") : "nenhuma registrada"}

Forneça uma análise completa em formato JSON.`;

    logStep("Calling AI gateway with enhanced prompt");

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
        temperature: 0.2, // Baixa temperatura para respostas mais precisas
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

    logStep("AI response received", { contentLength: content.length });

    // Parse JSON da resposta
    let analysisResult: { 
      ingredientes: string[]; 
      descricao: string;
      analise_detalhada?: {
        ingredientes_principais?: string[];
        ingredientes_secundarios?: string[];
        possiveis_contaminacoes?: string[];
      };
      notas_especialista?: string;
    };
    
    try {
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      analysisResult = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      analysisResult = {
        ingredientes: [],
        descricao: content
      };
    }

    // Detectar conflitos usando os mapeamentos do banco de dados
    const conflicts: Array<{
      intolerance: string;
      intoleranceLabel: string;
      foundIngredients: string[];
      riskLevel: string;
      details: string;
    }> = [];

    if (userIntolerances && userIntolerances.length > 0) {
      // Juntar todos os ingredientes identificados para análise
      const allIngredients = [
        ...(analysisResult.ingredientes || []),
        ...(analysisResult.analise_detalhada?.ingredientes_principais || []),
        ...(analysisResult.analise_detalhada?.ingredientes_secundarios || []),
        ...(analysisResult.analise_detalhada?.possiveis_contaminacoes || [])
      ];

      for (const intolerance of userIntolerances) {
        if (intolerance === "nenhuma" || !intolerance) continue;
        
        const problematicIngredients = intoleranceData.mappings.get(intolerance) || [];
        const safeWords = intoleranceData.safeKeywords.get(intolerance) || [];
        const foundProblematic: string[] = [];
        let isSafe = false;
        let safeReason = "";

        // Verificar se o alimento tem indicadores de segurança
        const normalizedFood = normalizeText(foodName);
        for (const safeWord of safeWords) {
          if (normalizedFood.includes(normalizeText(safeWord))) {
            isSafe = true;
            safeReason = safeWord;
            break;
          }
        }

        if (!isSafe) {
          // Verificar cada ingrediente identificado
          for (const ingredient of allIngredients) {
            const normalizedIngredient = normalizeText(ingredient);
            
            for (const problematic of problematicIngredients) {
              const normalizedProblematic = normalizeText(problematic);
              
              // Match mais inteligente: substring bidirecional
              if (normalizedIngredient.includes(normalizedProblematic) || 
                  normalizedProblematic.includes(normalizedIngredient)) {
                if (!foundProblematic.includes(ingredient)) {
                  foundProblematic.push(ingredient);
                }
              }
            }
          }
        }

        if (foundProblematic.length > 0) {
          // Determinar nível de risco
          let riskLevel = "medio";
          const mainIngredients = analysisResult.analise_detalhada?.ingredientes_principais || [];
          const contaminations = analysisResult.analise_detalhada?.possiveis_contaminacoes || [];
          
          if (foundProblematic.some(fp => 
            mainIngredients.some(mi => normalizeText(mi).includes(normalizeText(fp)))
          )) {
            riskLevel = "alto";
          } else if (foundProblematic.every(fp => 
            contaminations.some(c => normalizeText(c).includes(normalizeText(fp)))
          )) {
            riskLevel = "baixo";
          }

          conflicts.push({
            intolerance,
            intoleranceLabel: INTOLERANCE_LABELS[intolerance] || intolerance,
            foundIngredients: foundProblematic,
            riskLevel,
            details: `Encontrado(s) ${foundProblematic.length} ingrediente(s) problemático(s) para ${INTOLERANCE_LABELS[intolerance] || intolerance}`
          });
        }
      }
    }

    const result = {
      foodName,
      ingredients: analysisResult.ingredientes,
      description: analysisResult.descricao,
      detailedAnalysis: analysisResult.analise_detalhada,
      expertNotes: analysisResult.notas_especialista,
      conflicts,
      hasConflicts: conflicts.length > 0,
      conflictSummary: conflicts.length > 0 
        ? `⚠️ ${conflicts.length} conflito(s) detectado(s): ${conflicts.map(c => c.intoleranceLabel).join(", ")}`
        : "✅ Nenhum conflito detectado com suas intolerâncias",
      analysisSource: "database_mappings_v2",
      mappingsUsed: {
        totalIntolerances: intoleranceData.allIntoleranceKeys.length,
        totalIngredients: Array.from(intoleranceData.mappings.values()).reduce((sum, arr) => sum + arr.length, 0),
        totalSafeKeywords: Array.from(intoleranceData.safeKeywords.values()).reduce((sum, arr) => sum + arr.length, 0)
      }
    };

    logStep("Analysis complete", { 
      hasConflicts: result.hasConflicts, 
      conflictCount: conflicts.length,
      ingredientsFound: analysisResult.ingredientes?.length || 0
    });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-food-intolerances:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
