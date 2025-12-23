import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(apiKey: string, label: string, maxRetries = 3): Promise<string> {
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
                  text: `Return ONLY a single emoji that best represents this food/ingredient: "${label}". No text, just one emoji.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 10,
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "📌";
    }

    if (response.status === 429) {
      console.log(`Rate limited, attempt ${attempt + 1}/${maxRetries}. Waiting...`);
      if (attempt < maxRetries - 1) {
        await sleep(1000 * (attempt + 1)); // 1s, 2s, 3s backoff
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
    const { label } = await req.json();
    
    if (!label || typeof label !== "string") {
      return new Response(
        JSON.stringify({ error: "Label is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GOOGLE_AI_API_KEY = await getGeminiApiKey();

    console.log("Generating emoji for:", label);

    const rawEmoji = await callGeminiWithRetry(GOOGLE_AI_API_KEY, label);

    // Extract just the first emoji if there's extra text
    const emojiMatch = rawEmoji.match(/\p{Emoji}/u);
    const cleanEmoji = emojiMatch ? emojiMatch[0] : "📌";

    console.log("Generated emoji:", cleanEmoji);

    return new Response(
      JSON.stringify({ emoji: cleanEmoji }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating emoji:", error);
    
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
