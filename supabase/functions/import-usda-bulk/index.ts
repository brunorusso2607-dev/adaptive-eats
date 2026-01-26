import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// USDA Nutrient IDs
const NUTRIENT_MAP: Record<number, string> = {
  1008: 'calories',      // Energy (kcal)
  1003: 'protein',       // Protein
  1005: 'carbs',         // Carbohydrate
  1004: 'fat',           // Total lipid (fat)
  1079: 'fiber',         // Fiber, total dietary
  1093: 'sodium',        // Sodium, Na
};

interface USDAFood {
  fdcId: number;
  description: string;
  foodCategory?: { description: string };
  foodNutrients: Array<{
    nutrient: { id: number; name: string; unitName: string };
    amount?: number;
  }>;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function extractNutrient(food: USDAFood, nutrientId: number): number {
  const nutrient = food.foodNutrients.find(n => n.nutrient?.id === nutrientId);
  return nutrient?.amount ?? 0;
}

function mapCategory(usdaCategory: string | undefined): string {
  if (!usdaCategory) return 'outros';
  
  const cat = usdaCategory.toLowerCase();
  
  if (cat.includes('beef') || cat.includes('pork') || cat.includes('lamb') || cat.includes('veal')) return 'carnes';
  if (cat.includes('poultry') || cat.includes('chicken') || cat.includes('turkey')) return 'aves';
  if (cat.includes('fish') || cat.includes('seafood') || cat.includes('shellfish')) return 'peixes_frutos_mar';
  if (cat.includes('dairy') || cat.includes('milk') || cat.includes('cheese') || cat.includes('yogurt')) return 'laticinios';
  if (cat.includes('egg')) return 'ovos';
  if (cat.includes('vegetable') || cat.includes('legume')) return 'vegetais';
  if (cat.includes('fruit')) return 'frutas';
  if (cat.includes('grain') || cat.includes('cereal') || cat.includes('bread') || cat.includes('pasta')) return 'graos_cereais';
  if (cat.includes('nut') || cat.includes('seed')) return 'oleaginosas';
  if (cat.includes('legume') || cat.includes('bean') || cat.includes('lentil') || cat.includes('pea')) return 'leguminosas';
  if (cat.includes('oil') || cat.includes('fat')) return 'oleos_gorduras';
  if (cat.includes('spice') || cat.includes('herb')) return 'temperos';
  if (cat.includes('beverage') || cat.includes('drink')) return 'bebidas';
  if (cat.includes('sweet') || cat.includes('sugar') || cat.includes('candy')) return 'doces';
  
  return 'outros';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(`[USDA-BULK] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jsonUrl, batchSize = 100, startFrom = 0, dryRun = false } = await req.json();

    if (!jsonUrl) {
      throw new Error('jsonUrl is required - provide URL to USDA Foundation Foods JSON file');
    }

    log(`Fetching USDA data from: ${jsonUrl}`);
    log(`Config: batchSize=${batchSize}, startFrom=${startFrom}, dryRun=${dryRun}`);

    // Fetch the JSON file
    const response = await fetch(jsonUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Foundation Foods structure: { FoundationFoods: [...] }
    // SR Legacy structure: { SRLegacyFoods: [...] }
    const foods: USDAFood[] = data.FoundationFoods || data.SRLegacyFoods || data.foods || [];
    
    log(`Total foods in file: ${foods.length}`);

    if (foods.length === 0) {
      throw new Error('No foods found in JSON file. Check file structure.');
    }

    // Get existing foods to avoid duplicates
    const { data: existingFoods } = await supabase
      .from('foods')
      .select('name_normalized')
      .eq('source', 'USDA');
    
    const existingNames = new Set((existingFoods || []).map(f => f.name_normalized));
    log(`Existing USDA foods in database: ${existingNames.size}`);

    // Process foods in batch
    const endIndex = Math.min(startFrom + batchSize, foods.length);
    const batch = foods.slice(startFrom, endIndex);
    
    log(`Processing batch: ${startFrom} to ${endIndex} (${batch.length} foods)`);

    const toInsert: any[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const food of batch) {
      try {
        const nameNormalized = normalizeText(food.description);
        
        // Skip if already exists
        if (existingNames.has(nameNormalized)) {
          skipped.push(food.description);
          continue;
        }

        const calories = extractNutrient(food, 1008);
        const protein = extractNutrient(food, 1003);
        const carbs = extractNutrient(food, 1005);
        const fat = extractNutrient(food, 1004);
        const fiber = extractNutrient(food, 1079);
        const sodium = extractNutrient(food, 1093);

        // Skip foods without basic nutrition data
        if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
          skipped.push(`${food.description} (no nutrition data)`);
          continue;
        }

        const category = mapCategory(food.foodCategory?.description);

        toInsert.push({
          name: food.description,
          name_normalized: nameNormalized,
          calories_per_100g: Math.round(calories),
          protein_per_100g: Math.round(protein * 10) / 10,
          carbs_per_100g: Math.round(carbs * 10) / 10,
          fat_per_100g: Math.round(fat * 10) / 10,
          fiber_per_100g: Math.round(fiber * 10) / 10,
          sodium_per_100g: Math.round(sodium),
          category,
          source: 'USDA',
          is_verified: true,
          is_recipe: false,
          default_serving_size: 100,
          serving_unit: 'g',
        });

      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        errors.push(`${food.description}: ${errMsg}`);
      }
    }
    log(`Prepared ${toInsert.length} foods for insert`);
    log(`Skipped ${skipped.length} foods (duplicates or no data)`);
    log(`Errors: ${errors.length}`);

    let inserted = 0;
    if (!dryRun && toInsert.length > 0) {
      // Insert in smaller chunks to avoid timeout
      const chunkSize = 50;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { error: insertError, data: insertedData } = await supabase
          .from('foods')
          .insert(chunk)
          .select('id');
        
        if (insertError) {
          log(`Insert error at chunk ${i}: ${insertError.message}`);
          errors.push(`Chunk ${i}: ${insertError.message}`);
        } else {
          inserted += insertedData?.length || 0;
        }
      }
      log(`Successfully inserted ${inserted} foods`);
    }

    const duration = Date.now() - startTime;
    const hasMore = endIndex < foods.length;

    const result = {
      success: true,
      stats: {
        totalInFile: foods.length,
        batchProcessed: batch.length,
        inserted: dryRun ? 0 : inserted,
        skipped: skipped.length,
        errors: errors.length,
        duration: `${duration}ms`,
      },
      pagination: {
        startFrom,
        endIndex,
        hasMore,
        nextStartFrom: hasMore ? endIndex : null,
        remainingFoods: foods.length - endIndex,
      },
      sample: toInsert.slice(0, 3),
      skippedSample: skipped.slice(0, 5),
      errorsSample: errors.slice(0, 5),
      logs,
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log(`Fatal error: ${errMsg}`);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errMsg,
      logs 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

