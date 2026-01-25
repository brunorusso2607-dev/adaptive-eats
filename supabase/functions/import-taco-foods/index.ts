import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// TACO data URL from GitHub (official TACO table in JSON format)
const TACO_URL = "https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/TACO.json";

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

function parseNutrientValue(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '' || value === 'NA' || value === 'Tr' || value === 'tr') {
    return 0;
  }
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting TACO import");

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch TACO data from GitHub
    logStep("Fetching TACO data from GitHub");
    const response = await fetch(TACO_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch TACO data: ${response.status}`);
    }

    const tacoData: any[] = await response.json();
    
    logStep(`Parsed ${tacoData.length} foods from TACO`);

    // Process in batches of 100
    const BATCH_SIZE = 100;
    let insertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < tacoData.length; i += BATCH_SIZE) {
      const batch = tacoData.slice(i, i + BATCH_SIZE);
      logStep(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(tacoData.length / BATCH_SIZE)}`);

      const foodsToInsert = batch.map((item: any) => {
        const name = item.description || '';
        const category = item.category || null;

        // Extract nutrients from TACO format
        const calories = parseNutrientValue(item.energy_kcal);
        const protein = parseNutrientValue(item.protein_g);
        const carbs = parseNutrientValue(item.carbohydrate_g);
        const fat = parseNutrientValue(item.lipid_g);
        const fiber = parseNutrientValue(item.fiber_g);
        const sodium = parseNutrientValue(item.sodium_mg);

        return {
          name: name.trim(),
          name_normalized: normalizeText(name),
          calories_per_100g: calories,
          protein_per_100g: protein,
          carbs_per_100g: carbs,
          fat_per_100g: fat,
          fiber_per_100g: fiber,
          sodium_per_100g: sodium,
          category: category,
          source: 'TACO',
          cuisine_origin: 'brasileira',
          is_verified: true,
          confidence: 0.98, // Official government table
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
      total_processed: tacoData.length,
      inserted: insertedCount,
      skipped: skippedCount,
      errors: errorCount,
      error_messages: errors.slice(0, 5)
    };

    logStep("TACO import completed", summary);

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

