import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { extractUsageFromGeminiResponse, logAIUsage } from "../_shared/logAIUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(apiKey: string, label: string, category: string, maxRetries = 3): Promise<string> {
  const categoryContext: Record<string, string> = {
    intolerances: "Gere uma descrição curta listando os alimentos que contêm este alérgeno/intolerância",
    dietary_preferences: "Gere uma descrição curta explicando este tipo de dieta alimentar",
    goals: "Gere uma descrição curta sobre este objetivo de peso/saúde",
    calorie_goals: "Gere uma descrição curta sobre esta meta de calorias",
    complexity: "Gere uma descrição curta sobre este nível de complexidade de receitas",
    context: "Gere uma descrição curta sobre este contexto de quem vai consumir as refeições",
  };

  const context = categoryContext[category] || "Gere uma descrição curta para esta opção de onboarding";

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${context}. O nome da opção é: "${label}". 
                  
Regras:
- Máximo de 5 palavras
- Use vírgulas para separar itens quando for uma lista
- Sem pontos finais
- Sem emojis
- Apenas texto simples e direto

Exemplo para "Glúten": "Trigo, cevada, centeio"
Exemplo para "Vegano": "Sem produtos de origem animal"

Responda APENAS com a descrição, nada mais.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 50,
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      
      // Log AI usage
      const usage = extractUsageFromGeminiResponse(data);
      await logAIUsage({
        functionName: "generate-description",
        model: "gemini-2.5-flash-lite",
        ...usage,
        metadata: { label, category }
      });
      
      // Clean up any quotes or extra formatting
      return text.replace(/^["']|["']$/g, "").trim();
    }

    if (response.status === 429) {
      console.log(`Rate limited, attempt ${attempt + 1}/${maxRetries}. Waiting...`);
      if (attempt < maxRetries - 1) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
    }

    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  throw new Error("Max retries exceeded");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { label, category } = await req.json();
    
    if (!label || typeof label !== "string") {
      return new Response(
        JSON.stringify({ error: "Label is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = await getGeminiApiKey();

    console.log("Generating description for:", label, "category:", category);

    const description = await callGeminiWithRetry(GOOGLE_AI_API_KEY, label, category || "");

    console.log("Generated description:", description);

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating description:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isRateLimit = errorMessage.includes("429");
    
    return new Response(
      JSON.stringify({ 
        error: isRateLimit 
          ? "API com muitas requisições. Tente novamente em alguns segundos." 
          : errorMessage 
      }),
      { status: isRateLimit ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

