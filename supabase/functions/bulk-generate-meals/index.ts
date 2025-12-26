import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MEAL_TYPES = ['cafe_manha', 'almoco', 'lanche', 'jantar', 'ceia'];

const CATEGORIES = [
  'Tradicional brasileiro',
  'Fitness/Light',
  'Reconfortante',
  'Rápido e prático',
  'Vegetariano',
  'Rico em proteínas',
  'Low carb',
  'Regional nordestino',
  'Regional mineiro',
  'Regional sulista',
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase não configurado");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { targetTotal = 500, batchSize = 10, countryCode = 'BR' } = await req.json();

    // Verificar quantas receitas já existem
    const { count: existingCount } = await supabase
      .from('simple_meals')
      .select('*', { count: 'exact', head: true })
      .eq('country_code', countryCode)
      .eq('is_active', true);

    const currentCount = existingCount || 0;
    const remaining = Math.max(0, targetTotal - currentCount);

    if (remaining === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: `Já existem ${currentCount} receitas ativas. Meta atingida!`,
        current: currentCount,
        target: targetTotal,
        remaining: 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calcular distribuição por tipo de refeição
    const recipesPerType = Math.ceil(remaining / MEAL_TYPES.length);
    
    // Gerar jobs para processar
    const jobs = [];
    for (const mealType of MEAL_TYPES) {
      for (const category of CATEGORIES) {
        jobs.push({ mealType, category });
      }
    }

    // Embaralhar jobs para variedade
    const shuffledJobs = jobs.sort(() => Math.random() - 0.5);

    // Calcular quantos batches precisamos
    const totalBatches = Math.ceil(remaining / batchSize);
    const jobsToRun = shuffledJobs.slice(0, totalBatches);

    return new Response(JSON.stringify({
      success: true,
      current: currentCount,
      target: targetTotal,
      remaining,
      batchSize,
      totalBatches,
      jobs: jobsToRun,
      instructions: `Para gerar ${remaining} receitas, execute ${totalBatches} chamadas à função generate-simple-meals com os jobs listados.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Erro:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Erro desconhecido" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
