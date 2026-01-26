import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

export async function getGeminiApiKey(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration missing");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("api_integrations")
    .select("api_key_encrypted")
    .eq("name", "gemini")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching Gemini API key:", error);
    throw new Error("Failed to fetch Gemini API key from database");
  }

  if (!data?.api_key_encrypted) {
    throw new Error("Gemini API key not configured. Please add it in Admin > Gemini.");
  }

  return data.api_key_encrypted;
}

