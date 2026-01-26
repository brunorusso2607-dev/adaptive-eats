import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Pricing per 1M tokens (USD)
const PRICING = {
  // Gemini models
  "gemini-2.5-flash-lite": { input: 0.075, output: 0.30 },
  "gemini-2.0-flash-lite": { input: 0.075, output: 0.30 },
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.0-flash": { input: 0.10, output: 0.40 },
  "gemini-2.5-pro": { input: 1.25, output: 5.00 },
  // Lovable AI models (estimated)
  "google/gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "google/gemini-2.5-flash-lite": { input: 0.075, output: 0.30 },
  "google/gemini-2.5-pro": { input: 1.25, output: 5.00 },
};

export interface AIUsageData {
  functionName: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  userId?: string | null;
  itemsGenerated?: number;
  metadata?: Record<string, any>;
}

export function extractUsageFromGeminiResponse(response: any): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const usage = response?.usageMetadata || {};
  return {
    promptTokens: usage.promptTokenCount || 0,
    completionTokens: usage.candidatesTokenCount || 0,
    totalTokens: usage.totalTokenCount || 0,
  };
}

export function extractUsageFromOpenAIResponse(response: any): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const usage = response?.usage || {};
  return {
    promptTokens: usage.prompt_tokens || 0,
    completionTokens: usage.completion_tokens || 0,
    totalTokens: usage.total_tokens || 0,
  };
}

export function calculateEstimatedCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Find pricing for model
  let pricing = PRICING["gemini-2.5-flash-lite"]; // default
  
  for (const [modelKey, modelPricing] of Object.entries(PRICING)) {
    if (model.toLowerCase().includes(modelKey.toLowerCase())) {
      pricing = modelPricing;
      break;
    }
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  
  return inputCost + outputCost;
}

export async function logAIUsage(data: AIUsageData): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.log("[AI Usage] Supabase not configured, skipping log");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const estimatedCost = calculateEstimatedCost(
      data.model,
      data.promptTokens,
      data.completionTokens
    );

    const { error } = await supabase.from("ai_usage_logs").insert({
      function_name: data.functionName,
      model_used: data.model,
      prompt_tokens: data.promptTokens,
      completion_tokens: data.completionTokens,
      total_tokens: data.totalTokens,
      estimated_cost_usd: estimatedCost,
      items_generated: data.itemsGenerated || 1,
      metadata: data.metadata || {},
      user_id: data.userId || null,
    });

    if (error) {
      console.error("[AI Usage] Failed to log usage:", error.message);
    } else {
      console.log(`[AI Usage] Logged: ${data.functionName} - ${data.totalTokens} tokens - $${estimatedCost.toFixed(6)}`);
    }
  } catch (err) {
    console.error("[AI Usage] Error logging usage:", err);
  }
}

