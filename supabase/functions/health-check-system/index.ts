import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  target_name: string;
  check_type: string;
  status: 'success' | 'error' | 'warning' | 'timeout';
  response_time_ms: number;
  error_message?: string;
  error_details?: Record<string, unknown>;
}

// Lista de edge functions críticas para testar
const CRITICAL_EDGE_FUNCTIONS = [
  'analyze-food-photo',
  'analyze-label-photo',
  'analyze-fridge-photo',
  'generate-ai-meal-plan',
  'regenerate-ai-meal-alternatives',
  'suggest-meal-alternatives',
  'chat-assistant',
  'send-meal-reminder',
  'send-water-reminder',
];

// Tabelas críticas para verificar
const CRITICAL_TABLES = [
  'profiles',
  'meal_plans',
  'meal_plan_items',
  'meal_consumption',
  'intolerance_mappings',
  'dietary_forbidden_ingredients',
];

async function checkEdgeFunction(
  supabaseUrl: string,
  functionName: string
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Apenas verifica se o endpoint responde (OPTIONS request)
    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'OPTIONS',
        headers: corsHeaders,
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok || response.status === 204) {
      return {
        target_name: functionName,
        check_type: 'edge_function',
        status: responseTime > 5000 ? 'warning' : 'success',
        response_time_ms: responseTime,
      };
    } else {
      return {
        target_name: functionName,
        check_type: 'edge_function',
        status: 'error',
        response_time_ms: responseTime,
        error_message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      target_name: functionName,
      check_type: 'edge_function',
      status: responseTime > 10000 ? 'timeout' : 'error',
      response_time_ms: responseTime,
      error_message: errorMessage,
    };
  }
}

async function checkDatabaseTable(
  supabaseUrl: string,
  supabaseKey: string,
  tableName: string
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${tableName}?select=*&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        target_name: tableName,
        check_type: 'database',
        status: responseTime > 3000 ? 'warning' : 'success',
        response_time_ms: responseTime,
      };
    } else {
      return {
        target_name: tableName,
        check_type: 'database',
        status: 'error',
        response_time_ms: responseTime,
        error_message: `HTTP ${response.status}`,
      };
    }
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      target_name: tableName,
      check_type: 'database',
      status: 'error',
      response_time_ms: responseTime,
      error_message: errorMessage,
    };
  }
}

async function checkGeminiAPI(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY');
  
  if (!apiKey) {
    return {
      target_name: 'gemini_api',
      check_type: 'api',
      status: 'error',
      response_time_ms: 0,
      error_message: 'GOOGLE_AI_API_KEY not configured',
    };
  }
  
  try {
    // Apenas verifica se a API está acessível
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET' }
    );
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return {
        target_name: 'gemini_api',
        check_type: 'api',
        status: responseTime > 5000 ? 'warning' : 'success',
        response_time_ms: responseTime,
      };
    } else {
      return {
        target_name: 'gemini_api',
        check_type: 'api',
        status: 'error',
        response_time_ms: responseTime,
        error_message: `HTTP ${response.status}`,
      };
    }
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      target_name: 'gemini_api',
      check_type: 'api',
      status: 'error',
      response_time_ms: responseTime,
      error_message: errorMessage,
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[HEALTH-CHECK] Starting system health check...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const results: HealthCheckResult[] = [];
    
    // 1. Check Edge Functions (em paralelo)
    console.log('[HEALTH-CHECK] Checking edge functions...');
    const edgeFunctionChecks = await Promise.all(
      CRITICAL_EDGE_FUNCTIONS.map(fn => checkEdgeFunction(supabaseUrl, fn))
    );
    results.push(...edgeFunctionChecks);
    
    // 2. Check Database Tables (em paralelo)
    console.log('[HEALTH-CHECK] Checking database tables...');
    const dbChecks = await Promise.all(
      CRITICAL_TABLES.map(table => checkDatabaseTable(supabaseUrl, supabaseServiceKey, table))
    );
    results.push(...dbChecks);
    
    // 3. Check Gemini API
    console.log('[HEALTH-CHECK] Checking Gemini API...');
    const geminiCheck = await checkGeminiAPI();
    results.push(geminiCheck);
    
    // Salvar resultados no banco
    const logsToInsert = results.map(r => ({
      check_type: r.check_type,
      target_name: r.target_name,
      status: r.status,
      response_time_ms: r.response_time_ms,
      error_message: r.error_message || null,
      error_details: r.error_details || null,
      checked_at: new Date().toISOString(),
    }));
    
    const { error: insertError } = await supabase
      .from('system_health_logs')
      .insert(logsToInsert);
    
    if (insertError) {
      console.error('[HEALTH-CHECK] Failed to save logs:', insertError);
    }
    
    // Calcular estatísticas
    const totalChecks = results.length;
    const successCount = results.filter(r => r.status === 'success').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const timeoutCount = results.filter(r => r.status === 'timeout').length;
    
    const summary = {
      totalChecks,
      success: successCount,
      warnings: warningCount,
      errors: errorCount,
      timeouts: timeoutCount,
      healthScore: Math.round((successCount / totalChecks) * 100),
      executionTimeMs: Date.now() - startTime,
      checkedAt: new Date().toISOString(),
    };
    
    console.log(`[HEALTH-CHECK] Complete: ${successCount}/${totalChecks} healthy (${summary.healthScore}%)`);
    
    // Se houver erros críticos, logar detalhes
    const criticalErrors = results.filter(r => r.status === 'error' || r.status === 'timeout');
    if (criticalErrors.length > 0) {
      console.error('[HEALTH-CHECK] Critical issues found:', criticalErrors);
    }
    
    return new Response(JSON.stringify({
      summary,
      results,
      criticalErrors,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[HEALTH-CHECK] Fatal error:', errorMessage);
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
