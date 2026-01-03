import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getGeminiApiKey } from "../_shared/getGeminiKey.ts";
import { getLocaleFromCountry } from "../_shared/nutritionPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHAT-ASSISTANT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Check if user is admin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      throw new Error("Access denied: Admin role required");
    }

    logStep("Admin user authenticated", { userId: user.id });

    // Fetch admin's country for language context
    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("country")
      .eq("id", user.id)
      .maybeSingle();
    
    const userCountry = profileData?.country || "BR";
    const userLocale = getLocaleFromCountry(userCountry);
    logStep("User locale detected", { userCountry, userLocale });

    const { messages, images, currentPage } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Messages array is required");
    }

    const hasImages = images && Array.isArray(images) && images.length > 0;
    logStep("Processing chat", { 
      messageCount: messages.length, 
      hasImages, 
      imageCount: images?.length || 0,
      currentPage: currentPage?.path || "unknown"
    });

    const GOOGLE_AI_API_KEY = await getGeminiApiKey();

    // Use gemini-2.5-flash for vision (supports images) or flash-lite for text-only
    const model = hasImages ? "gemini-2.5-flash" : "gemini-2.5-flash-lite";
    logStep("Using model", { model });

    // Build conversation parts
    const conversationParts: any[] = [];

    // Add previous messages
    for (const msg of messages.slice(0, -1)) {
      conversationParts.push({
        text: `${msg.role === 'user' ? 'USER' : 'ASSISTANT'}: ${msg.content}`
      });
    }

    // Add the last user message with images if present
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      if (hasImages) {
        // Add text part first
        conversationParts.push({
          text: `USER: ${lastMessage.content}`
        });
        
        // Add each image
        for (const imageData of images) {
          // Extract base64 data (remove data:image/xxx;base64, prefix if present)
          let base64 = imageData;
          let mimeType = "image/png";
          
          if (imageData.startsWith("data:")) {
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
              mimeType = matches[1];
              base64 = matches[2];
            }
          }
          
          conversationParts.push({
            inlineData: {
              mimeType,
              data: base64
            }
          });
        }
      } else {
        conversationParts.push({
          text: `USER: ${lastMessage.content}`
        });
      }
    }

    conversationParts.push({ text: "ASSISTANT:" });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: conversationParts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logStep("Gemini API error", { status: response.status, error: errorText });
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    logStep("Gemini response received");

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
      "Sorry, I couldn't process your message.";

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: aiResponse.replace(/^ASSISTANT:\s*/i, '').trim() 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logStep("Error", { error: error instanceof Error ? error.message : "Unknown error" });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
