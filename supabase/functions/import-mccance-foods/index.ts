import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: any) => {
  console.log(`[IMPORT-MCCANCE] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jsonPath = 'data/mccance_foods.json', offset = 0, batchSize = 100 } = await req.json();
    
    log('Starting import from JSON', { jsonPath, offset, batchSize });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download JSON file (much smaller and faster than Excel)
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('app-assets')
      .download(jsonPath);
    
    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    const jsonText = await fileData.text();
    const allFoods = JSON.parse(jsonText);

    log('JSON loaded', { totalFoods: allFoods.length });

    // Process only the requested batch
    const endOffset = Math.min(offset + batchSize, allFoods.length);
    const batch = allFoods.slice(offset, endOffset);

    log('Processing batch', { from: offset, to: endOffset, count: batch.length });

    // Prepare foods for insert
    const foodsToInsert = batch.map((food: any) => ({
      ...food,
      sodium_per_100g: null,
      is_recipe: false,
      verified: true,
      is_verified: true,
      confidence: 1.0,
      serving_unit: 'g',
      default_serving_size: 100,
    }));

    // Insert batch
    const { data, error } = await supabase
      .from('foods')
      .upsert(foodsToInsert, { 
        onConflict: 'name_normalized',
        ignoreDuplicates: true 
      })
      .select('id');

    let inserted = 0;
    let errors = 0;

    if (error) {
      log('Batch error, inserting one by one', { error: error.message });
      for (const food of foodsToInsert) {
        const { error: singleError } = await supabase
          .from('foods')
          .upsert(food, { onConflict: 'name_normalized', ignoreDuplicates: true });
        
        if (singleError) {
          errors++;
        } else {
          inserted++;
        }
      }
    } else {
      inserted = data?.length ?? batch.length;
    }

    const hasMore = endOffset < allFoods.length;

    log('Batch completed', { inserted, errors, hasMore, nextOffset: endOffset });

    return new Response(
      JSON.stringify({
        success: true,
        totalFoods: allFoods.length,
        processedFrom: offset,
        processedTo: endOffset,
        inserted,
        errors,
        hasMore,
        nextOffset: hasMore ? endOffset : null,
        message: hasMore 
          ? `Inserted ${inserted} foods. Call again with offset=${endOffset} to continue.`
          : `Import complete! Total processed: ${endOffset}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log('Error', { error: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
