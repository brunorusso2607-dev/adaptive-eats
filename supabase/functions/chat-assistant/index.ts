import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Mensagem fixa - função em manutenção/reprogramação
  return new Response(
    JSON.stringify({ 
      success: true,
      message: "Sistema em manutenção. Em breve estarei de volta! 🔧" 
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
