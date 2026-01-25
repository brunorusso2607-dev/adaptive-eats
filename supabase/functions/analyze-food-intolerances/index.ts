import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { 
  loadSafetyDatabase,
  normalizeUserIntolerances,
  validateIngredientList,
  generateRestrictionsPromptContext,
  getIntoleranceLabel,
  getDatabaseStats,
  type UserRestrictions,
} from "../_shared/globalSafetyEngine.ts";

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

    // Buscar API key do Gemini do banco de dados
    const geminiApiKey = await getGeminiApiKey();

    logStep("Starting analysis", { foodName, intolerances: userIntolerances });

    // Load global safety database
    const safetyDatabase = await loadSafetyDatabase();
    logStep("Loaded safety database", { stats: getDatabaseStats(safetyDatabase) });

    // Normalize user intolerances
    const normalizedIntolerances = normalizeUserIntolerances(userIntolerances || [], safetyDatabase);
    
    // Build user restrictions
    const userRestrictions: UserRestrictions = {
      intolerances: normalizedIntolerances,
      dietaryPreference: "comum",
      excludedIngredients: [],
    };

    // Generate context for prompt
    const ingredientsContext = generateRestrictionsPromptContext(userRestrictions, safetyDatabase, 'pt');

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

INTOLERÂNCIAS DO USUÁRIO PARA VERIFICAR: ${normalizedIntolerances.length > 0 ? normalizedIntolerances.map(i => getIntoleranceLabel(i, safetyDatabase)).join(", ") : "nenhuma registrada"}

Forneça uma análise completa em formato JSON.`;

    logStep("Calling Gemini API");

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + geminiApiKey, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt + '\n\n' + userPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
      
      // DEBUG: Log o que a IA retornou
      console.log("[DEBUG] Resposta da IA parseada:", JSON.stringify(analysisResult, null, 2));
      
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.error("[DEBUG] Raw content:", content);
      analysisResult = {
        ingredientes: [],
        descricao: content
      };
    }

    // Validate ingredients using global safety engine
    // IMPORTANTE: NÃO incluir possiveis_contaminacoes pois são textos descritivos, não ingredientes reais
    // Eles descrevem riscos teóricos que não fazem parte do alimento real
    const allIngredients = [
      ...(analysisResult.ingredientes || []),
      ...(analysisResult.analise_detalhada?.ingredientes_principais || []),
      ...(analysisResult.analise_detalhada?.ingredientes_secundarios || []),
      // REMOVIDO: possiveis_contaminacoes - são textos explicativos, não ingredientes reais
    ];

    // Filtrar ingredientes: remover strings muito longas (provavelmente são descrições, não ingredientes)
    const filteredIngredients = allIngredients.filter(ing => {
      const cleanIngredient = ing.trim();
      // Ingredientes reais não têm mais de 50 caracteres
      // Se tiver mais, provavelmente é uma descrição/nota
      return cleanIngredient.length > 0 && cleanIngredient.length <= 50;
    });

    // DEBUG: Log dos ingredientes que a IA retornou
    console.log("[DEBUG] Ingredientes filtrados para validação:", JSON.stringify(filteredIngredients));

    const validationResult = validateIngredientList(filteredIngredients, userRestrictions, safetyDatabase);

    // DEBUG: Log do resultado da validação
    console.log("[DEBUG] Validation result:", JSON.stringify({
      isSafe: validationResult.isSafe,
      conflictsCount: validationResult.conflicts?.length || 0,
      conflicts: validationResult.conflicts?.slice(0, 5) // Apenas os primeiros 5 para debug
    }));

    // Build conflicts array from validation result
    const conflicts: Array<{
      intolerance: string;
      intoleranceLabel: string;
      foundIngredients: string[];
      riskLevel: string;
      details: string;
    }> = [];

    if (validationResult.conflicts && validationResult.conflicts.length > 0) {
      // Group conflicts by restriction type
      const conflictsByRestriction = new Map<string, string[]>();
      
      for (const conflict of validationResult.conflicts) {
        const key = conflict.key;
        if (!conflictsByRestriction.has(key)) {
          conflictsByRestriction.set(key, []);
        }
        conflictsByRestriction.get(key)!.push(conflict.originalIngredient);
      }

      for (const [key, ingredients] of conflictsByRestriction.entries()) {
        const label = getIntoleranceLabel(key, safetyDatabase);
        
        // Determine risk level based on where ingredients were found
        const mainIngredients = analysisResult.analise_detalhada?.ingredientes_principais || [];
        const contaminations = analysisResult.analise_detalhada?.possiveis_contaminacoes || [];
        
        let riskLevel = "medio";
        if (ingredients.some(ing => 
          mainIngredients.some(mi => mi.toLowerCase().includes(ing.toLowerCase()))
        )) {
          riskLevel = "alto";
        } else if (ingredients.every(ing => 
          contaminations.some(c => c.toLowerCase().includes(ing.toLowerCase()))
        )) {
          riskLevel = "baixo";
        }

        conflicts.push({
          intolerance: key,
          intoleranceLabel: label,
          foundIngredients: ingredients,
          riskLevel,
          details: `Encontrado(s) ${ingredients.length} ingrediente(s) problemático(s) para ${label}`
        });
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
      analysisSource: "global_safety_engine_v1",
      safetyValidation: {
        isSafe: validationResult.isSafe,
        conflictsCount: validationResult.conflicts?.length || 0,
      },
      mappingsUsed: {
        totalIntolerances: safetyDatabase.intoleranceMappings.size,
        totalIngredients: Array.from(safetyDatabase.intoleranceMappings.values()).reduce((sum, arr) => sum + arr.length, 0),
        totalSafeKeywords: Array.from(safetyDatabase.safeKeywords.values()).reduce((sum, arr) => sum + arr.length, 0)
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

