import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    console.log("Generating emoji for:", label);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GOOGLE_AI_API_KEY}`,
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
                  text: `You are an emoji expert. Given a food name, ingredient, dietary preference, or health goal, return ONLY a single emoji that best represents it. No text, no explanation, just one emoji character.

What emoji best represents: "${label}"`,
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    const rawEmoji = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "📌";

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
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
