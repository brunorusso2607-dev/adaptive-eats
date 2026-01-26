import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { extractUsageFromGeminiResponse, logAIUsage } from "../_shared/logAIUsage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lista de ícones Lucide disponíveis para sugestão
const AVAILABLE_ICONS = [
  "wheat", "milk", "nut", "fish", "egg", "bean", "check", "utensils", "salad", 
  "leaf", "flame", "trending-down", "trending-up", "scale", "clock", "zap", 
  "timer", "chef-hat", "user", "users", "baby", "target", "minus", "arrow-down", 
  "arrow-up", "heart", "apple", "carrot", "pizza", "coffee", "droplet", "sun",
  "moon", "star", "shield", "alert-triangle", "ban", "x-circle", "check-circle",
  "banana", "cherry", "citrus", "grape", "sandwich", "soup", "cookie", "cake",
  "ice-cream-cone", "popcorn", "candy", "beer", "wine", "martini", "cup-soda"
];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(apiKey: string, label: string, maxRetries = 3): Promise<string> {
  const availableIconsList = AVAILABLE_ICONS.join(", ");
  
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
                  text: `You are helping to select a minimalist line-art icon for a food/nutrition app.

Given this food, ingredient or dietary concept: "${label}"

Choose the BEST matching icon name from this list: ${availableIconsList}

Rules:
- Return ONLY the icon name, nothing else
- Choose the most semantically relevant icon
- For grains/gluten/wheat/bread/pasta use "wheat"
- For dairy/milk/cheese/yogurt use "milk" or "droplet"
- For nuts/seeds/almonds/cashews use "nut"
- For seafood/fish/shrimp/shellfish use "fish"
- For eggs use "egg"
- For legumes/beans/lentils/soy use "bean"
- For vegetables/plants/herbs use "leaf" or "salad" or "carrot"
- For meat/beef/chicken/pork use "flame"
- For apple specifically use "apple"
- For banana specifically use "banana"
- For cherry specifically use "cherry"
- For grape/grapes/raisins use "grape"
- For citrus fruits (orange, lemon, lime, grapefruit) use "citrus"
- For tropical fruits (pineapple, mango, papaya, kiwi) use "leaf"
- For other berries (strawberry, blueberry, raspberry) use "cherry"
- For sandwiches/burgers/wraps use "sandwich"
- For soups/stews/broths use "soup"
- For cookies/biscuits use "cookie"
- For cakes/pastries/desserts use "cake"
- For ice cream/frozen desserts use "ice-cream-cone"
- For snacks/popcorn use "popcorn"
- For candy/sweets/chocolate use "candy"
- For beer use "beer"
- For wine use "wine"
- For cocktails use "martini"
- For soda/soft drinks use "cup-soda"
- For coffee/tea use "coffee"
- For water/other drinks use "droplet"
- For allergies/warnings use "alert-triangle" or "shield"
- For goals/targets use "target"
- For calories/energy use "flame" or "zap"
- For weight loss use "trending-down"
- For weight gain use "trending-up"
- For cooking use "chef-hat" or "utensils"
- For time use "clock" or "timer"
- If nothing fits well, use "utensils"

Respond with only the icon name, no quotes, no punctuation.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 20,
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()?.toLowerCase() || "utensils";
      
      // Log AI usage
      const usage = extractUsageFromGeminiResponse(data);
      await logAIUsage({
        functionName: "generate-emoji",
        model: "gemini-2.5-flash-lite",
        ...usage,
        metadata: { label }
      });
      
      // Validate that the response is one of the available icons
      const cleanedIcon = rawResponse.replace(/[^a-z-]/g, '');
      if (AVAILABLE_ICONS.includes(cleanedIcon)) {
        return cleanedIcon;
      }
      
      // If not found, try to find a partial match
      const partialMatch = AVAILABLE_ICONS.find(icon => 
        cleanedIcon.includes(icon) || icon.includes(cleanedIcon)
      );
      
      return partialMatch || "utensils";
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

    console.log("Generating icon for:", label);

    const iconName = await callGeminiWithRetry(GOOGLE_AI_API_KEY, label);

    console.log("Generated icon:", iconName);

    return new Response(
      JSON.stringify({ emoji: iconName, icon_name: iconName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating icon:", error);
    
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

