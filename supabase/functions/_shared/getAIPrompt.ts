import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AIPromptData {
  function_id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  user_prompt_example: string | null;
  is_active: boolean;
}

export async function getAIPrompt(functionId: string): Promise<AIPromptData> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase configuration missing");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const { data, error } = await supabase
    .from("ai_prompts")
    .select("*")
    .eq("function_id", functionId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching AI prompt for ${functionId}:`, error);
    throw new Error(`Failed to fetch AI prompt for ${functionId} from database`);
  }

  if (!data) {
    throw new Error(`AI prompt for ${functionId} not configured. Please add it in Admin > Gemini.`);
  }

  return data as AIPromptData;
}
