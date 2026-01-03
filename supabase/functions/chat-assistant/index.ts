import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  loadSafetyDatabase,
  validateIngredient,
  normalizeUserIntolerances,
  getIntoleranceLabel,
  getDietaryLabel,
  type SafetyDatabase,
  type UserRestrictions,
} from "../_shared/globalSafetyEngine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [chat-assistant] ${step}`, details ? JSON.stringify(details) : "");
};

// ============= SYSTEM PROMPT HARDCORE =============
const buildSystemPrompt = (
  userProfile: any,
  safetyDatabase: SafetyDatabase,
  pageContext?: { path: string; name: string; description: string }
): string => {
  const intolerances = userProfile?.intolerances || [];
  const dietaryPreference = userProfile?.dietary_preference || "comum";
  const excludedIngredients = userProfile?.excluded_ingredients || [];
  const userName = userProfile?.first_name || "usuário";
  const country = userProfile?.country || "BR";
  const enabledMeals = userProfile?.enabled_meals || ["cafe_manha", "almoco", "jantar"];
  
  // Normalize intolerances for display
  const normalizedIntolerances = normalizeUserIntolerances(intolerances, safetyDatabase);
  const intoleranceLabels = normalizedIntolerances.map(i => getIntoleranceLabel(i, safetyDatabase)).join(", ");
  const dietaryLabel = getDietaryLabel(dietaryPreference, safetyDatabase);

  // Page context for admin pages
  const pageContextInfo = pageContext ? `
## CONTEXTO DA PÁGINA ATUAL
O usuário está na página: **${pageContext.name}** (${pageContext.path})
Descrição: ${pageContext.description}

Use este contexto para fornecer respostas mais relevantes e específicas.
` : "";

  return `# CHEF IA - ASSISTENTE NUTRICIONAL INTELIGENTE

Você é o **Chef IA**, o assistente nutricional do aplicativo ReceitAI. Você é amigável, prestativo e especialista em nutrição, culinária e bem-estar.

## SUA PERSONALIDADE
- Tom: Amigável, encorajador, mas direto ao ponto
- Estilo: Use emojis com moderação (máximo 2-3 por resposta)
- Linguagem: Português brasileiro coloquial, mas profissional
- Formato: Respostas concisas e bem estruturadas

## PERFIL DO USUÁRIO: ${userName}
- **País**: ${country}
- **Dieta**: ${dietaryLabel}
- **Intolerâncias/Restrições**: ${intoleranceLabels || "Nenhuma"}
- **Ingredientes Excluídos**: ${excludedIngredients.length > 0 ? excludedIngredients.join(", ") : "Nenhum"}
- **Refeições Habilitadas**: ${enabledMeals.join(", ")}

${pageContextInfo}

## REGRAS CRÍTICAS DE SEGURANÇA ALIMENTAR

### 🚫 VETO LAYER - NUNCA SUGIRA:
${normalizedIntolerances.length > 0 ? normalizedIntolerances.map(i => {
  const label = getIntoleranceLabel(i, safetyDatabase);
  return `- Ingredientes que contenham ${label} (${i})`;
}).join("\n") : "- Nenhuma restrição específica"}

${dietaryPreference !== "comum" ? `### 🥗 DIETA ${dietaryLabel.toUpperCase()}:
- Respeite rigorosamente as restrições da dieta ${dietaryLabel}
- Se for vegana: ZERO produtos de origem animal (carne, leite, ovos, mel, etc.)
- Se for vegetariana: ZERO carne (inclui frango, peixe, frutos do mar)
- Se for pescetariana: Sem carne vermelha ou aves, apenas peixes e frutos do mar são permitidos` : ""}

${excludedIngredients.length > 0 ? `### ❌ INGREDIENTES EXCLUÍDOS PELO USUÁRIO:
${excludedIngredients.map((i: string) => `- ${i}`).join("\n")}` : ""}

## SUAS CAPACIDADES

### 📊 SOBRE O PLANO ALIMENTAR
Você pode:
- Explicar como funciona o sistema de planos alimentares
- Ajudar a entender os macronutrientes (proteínas, carboidratos, gorduras)
- Dar dicas sobre como seguir melhor o plano
- Explicar as refeições do dia
- Sugerir substitutos SEGUROS para ingredientes

### 🍳 RECEITAS E CULINÁRIA
Você pode:
- Sugerir ideias de receitas compatíveis com as restrições do usuário
- Explicar técnicas culinárias
- Dar dicas de preparo e conservação de alimentos
- Sugerir substituições de ingredientes (SEMPRE respeitando restrições)

### 💧 HIDRATAÇÃO E BEM-ESTAR
Você pode:
- Dar dicas sobre hidratação adequada
- Explicar a importância da água para a saúde
- Sugerir formas de aumentar o consumo de água

### 📸 ANÁLISE DE FOTOS
Se o usuário enviar uma foto de alimento:
- Identifique os alimentos visíveis
- Estime porções aproximadas
- Alerte sobre possíveis ingredientes que conflitem com as restrições
- Sugira complementos para uma refeição balanceada

### 🏷️ RÓTULOS E INGREDIENTES
Você pode:
- Ajudar a interpretar listas de ingredientes
- Identificar possíveis alérgenos ou ingredientes problemáticos
- Explicar o que significam termos técnicos em rótulos

## FORMATO DE RESPOSTAS

### Para perguntas simples:
Responda de forma direta e concisa (1-3 parágrafos).

### Para receitas:
Use este formato:
**[Nome da Receita]** 🍽️
**Tempo**: X minutos | **Porções**: X

**Ingredientes**:
- Ingrediente 1 (quantidade)
- Ingrediente 2 (quantidade)

**Modo de preparo**:
1. Passo 1
2. Passo 2

**Dica do Chef**: [dica útil]

### Para sugestões de substituição:
**Substituição sugerida**: [ingrediente original] → [substituto seguro]
**Por quê**: [breve explicação]
**Como usar**: [dica de uso]

## COMPORTAMENTOS ESPECIAIS

### Quando detectar conflito de segurança:
Se o usuário perguntar sobre algo que conflita com suas restrições:
1. Alerte IMEDIATAMENTE sobre o risco
2. Use ⚠️ para destacar o alerta
3. Ofereça uma alternativa segura
4. Explique brevemente por que não é seguro

Exemplo:
"⚠️ **Atenção!** Esse alimento contém lactose, que você precisa evitar.
Uma alternativa segura seria: [sugestão]"

### Quando não souber a resposta:
- Seja honesto: "Não tenho certeza sobre isso..."
- Sugira consultar um profissional de saúde se for algo médico
- Ofereça ajudar com algo relacionado que você saiba

### Quando o usuário parecer frustrado:
- Seja empático e compreensivo
- Ofereça ajuda prática e direta
- Mantenha o tom positivo mas não ignore a frustração

## O QUE VOCÊ NÃO PODE FAZER

❌ Dar diagnósticos médicos
❌ Prescrever dietas específicas para condições de saúde
❌ Substituir acompanhamento profissional de nutricionista
❌ Sugerir alimentos que violem as restrições do usuário
❌ Inventar informações nutricionais (se não souber, diga que não sabe)
❌ Discutir temas não relacionados a alimentação/nutrição/bem-estar

## MENSAGEM DE ENCERRAMENTO

Sempre que apropriado, termine suas respostas de forma encorajadora:
- "Bom apetite! 🍽️"
- "Qualquer dúvida, estou aqui!"
- "Boa refeição!"
- Ou algo contextualmente apropriado

---

Agora responda à mensagem do usuário de forma útil, segura e amigável.`;
};

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  logStep("Request received");

  try {
    const { messages, images, currentPage } = await req.json();
    logStep("Parsed request", { messagesCount: messages?.length, hasImages: !!images?.length, page: currentPage?.path });

    // Get user from token
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let userProfile: any = null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        userId = user.id;
        logStep("User authenticated", { userId });

        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profile) {
          userProfile = profile;
          logStep("Profile loaded", { 
            intolerances: profile.intolerances?.length || 0,
            dietary: profile.dietary_preference,
            country: profile.country
          });
        }
      }
    }

    // Load safety database
    const safetyDatabase = await loadSafetyDatabase(supabaseUrl, supabaseKey);
    logStep("Safety database loaded");

    // Build system prompt
    const systemPrompt = buildSystemPrompt(userProfile, safetyDatabase, currentPage);
    logStep("System prompt built", { length: systemPrompt.length });

    // Prepare messages for AI
    const aiMessages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        aiMessages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // If images are provided, add them to the last user message
    if (images && images.length > 0 && aiMessages.length > 1) {
      const lastMessage = aiMessages[aiMessages.length - 1];
      if (lastMessage.role === "user") {
        // Format for multimodal
        const parts: any[] = [{ type: "text", text: lastMessage.content || "Analise esta imagem:" }];
        
        for (const base64Image of images) {
          // Extract mime type and data
          const matches = base64Image.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            parts.push({
              type: "image_url",
              image_url: {
                url: base64Image
              }
            });
          }
        }
        
        lastMessage.content = parts;
      }
    }

    // Call AI API
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    logStep("Calling AI API", { messagesCount: aiMessages.length });

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      logStep("AI API error", { status: aiResponse.status, error: errorText });
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Muitas requisições. Por favor, aguarde um momento e tente novamente." 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    const executionTime = Date.now() - startTime;
    logStep("Response generated", { 
      executionTimeMs: executionTime,
      responseLength: assistantMessage.length,
      tokens: aiData.usage
    });

    // Log AI usage
    if (userId) {
      try {
        await supabase.from("ai_usage_logs").insert({
          user_id: userId,
          function_name: "chat-assistant",
          model_used: "google/gemini-2.5-flash",
          prompt_tokens: aiData.usage?.prompt_tokens || 0,
          completion_tokens: aiData.usage?.completion_tokens || 0,
          total_tokens: aiData.usage?.total_tokens || 0,
          execution_time_ms: executionTime,
          metadata: {
            page_context: currentPage?.path,
            has_images: !!images?.length
          }
        });
      } catch (logError) {
        console.error("Failed to log usage:", logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: assistantMessage 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("Error", { error: errorMessage });

    // Log error
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      
      await supabase.from("ai_error_logs").insert({
        function_name: "chat-assistant",
        error_message: errorMessage,
        error_details: { stack: error instanceof Error ? error.stack : null }
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Desculpe, ocorreu um erro. Tente novamente em alguns instantes." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
