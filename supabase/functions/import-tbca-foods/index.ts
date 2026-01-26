import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TBCA data URL from GitHub (line-delimited JSON)
const TBCA_URL = "https://raw.githubusercontent.com/resen-dev/web-scraping-tbca/main/alimentos.txt";

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function logStep(step: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${step}`, data ? JSON.stringify(data) : '');
}

function parseNutrientValue(value: string | null | undefined): number {
  if (value === null || value === undefined || value === '' || value === 'NA' || value === 'Tr' || value === 'tr') {
    return 0;
  }
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

function getNutrientValue(nutrientes: any[], componente: string, unidade?: string): number {
  // Find nutrient matching both component name and optionally unit
  const nutrient = nutrientes.find((n: any) => {
    const matchesComponent = n.Componente?.toLowerCase() === componente.toLowerCase();
    if (unidade) {
      return matchesComponent && n.Unidades?.toLowerCase() === unidade.toLowerCase();
    }
    return matchesComponent;
  });
  return nutrient ? parseNutrientValue(nutrient['Valor por 100g']) : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting TBCA import");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch TBCA data from GitHub
    logStep("Fetching TBCA data from GitHub");
    const response = await fetch(TBCA_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch TBCA data: ${response.status}`);
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    // Parse line-delimited JSON
    const tbcaData: any[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        tbcaData.push(parsed);
      } catch {
        // Skip invalid lines
      }
    }
    
    logStep(`Parsed ${tbcaData.length} foods from TBCA`);

    // Process in batches of 100
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < tbcaData.length; i += BATCH_SIZE) {
      const batch = tbcaData.slice(i, i + BATCH_SIZE);
      logStep(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tbcaData.length / BATCH_SIZE)}`);

      const foodsToInsert = batch.map((item: any) => {
        const name = item.descricao || '';
        const category = item.classe || null;
        const nutrientes = item.nutrientes || [];

        // Extract nutrients from array format - use kcal specifically, not kJ
        const calories = getNutrientValue(nutrientes, 'Energia', 'kcal');
        const protein = getNutrientValue(nutrientes, 'Proteína');
        const carbs = getNutrientValue(nutrientes, 'Carboidrato total');
        const fat = getNutrientValue(nutrientes, 'Lipídios');
        const fiber = getNutrientValue(nutrientes, 'Fibra alimentar');
        const sodium = getNutrientValue(nutrientes, 'Sódio');

        return {
          name: name.trim().replace(/,\s*$/, ''), // Remove trailing comma
          name_normalized: normalizeText(name.replace(/,\s*$/, '')),
          calories_per_100g: calories,
          protein_per_100g: protein,
          carbs_per_100g: carbs,
          fat_per_100g: fat,
          fiber_per_100g: fiber,
          sodium_per_100g: sodium,
          category: category,
          source: 'TBCA',
          cuisine_origin: 'brasileira',
          is_verified: true,
          confidence: 0.95,
          is_recipe: false,
          default_serving_size: 100,
          serving_unit: 'g'
        };
      }).filter((food: any) => food.name && food.name.length > 0);

      if (foodsToInsert.length === 0) {
        continue;
      }

      // Use upsert to avoid duplicates
      const { data, error } = await supabase
        .from('foods')
        .upsert(foodsToInsert, { 
          onConflict: 'name_normalized',
          ignoreDuplicates: true 
        })
        .select('id');

      if (error) {
        logStep(`Batch error: ${error.message}`);
        errorCount += batch.length;
        errors.push(error.message);
      } else {
        const inserted = data?.length || 0;
        insertedCount += inserted;
        skippedCount += foodsToInsert.length - inserted;
      }

      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      success: true,
      total_processed: tbcaData.length,
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errorCount,
      error_messages: errors.slice(0, 5)
    };

    logStep("TBCA import completed", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logStep("Error during import", { error: errorMessage });
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

