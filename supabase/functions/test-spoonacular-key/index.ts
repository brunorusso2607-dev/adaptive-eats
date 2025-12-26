import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey } = await req.json();
    
    if (!apiKey) {
      return new Response(JSON.stringify({ 
        valid: false, 
        error: 'API key não fornecida' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Test the API key with a simple request
    const testUrl = `https://api.spoonacular.com/recipes/complexSearch?query=pasta&number=1&apiKey=${apiKey}`;
    
    console.log('[TEST-SPOONACULAR] Testing API key...');
    
    const response = await fetch(testUrl);
    const data = await response.json();
    
    if (!response.ok) {
      console.log('[TEST-SPOONACULAR] API error:', data);
      return new Response(JSON.stringify({ 
        valid: false, 
        error: data.message || 'API key inválida',
        status: response.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check quota info from headers
    const quotaUsed = response.headers.get('X-API-Quota-Used');
    const quotaLeft = response.headers.get('X-API-Quota-Left');
    
    console.log('[TEST-SPOONACULAR] Success! Quota:', { quotaUsed, quotaLeft });
    
    return new Response(JSON.stringify({ 
      valid: true,
      message: 'API key válida!',
      quota: {
        used: quotaUsed ? parseInt(quotaUsed) : null,
        remaining: quotaLeft ? parseInt(quotaLeft) : null
      },
      totalRecipes: data.totalResults || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[TEST-SPOONACULAR] Error:', error);
    return new Response(JSON.stringify({ 
      valid: false, 
      error: error?.message || 'Erro ao testar API key'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
