import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// BLS Germany download URL (CC BY 4.0 license)
const BLS_ZIP_URL = "https://blsdb.de/assets/uploads/BLS_4_0_2025_DE.zip";

function log(step: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [BLS] ${step}`, data ? JSON.stringify(data) : '');
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseNutrientValue(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === '-' || value === 'NA') {
    return null;
  }
  const parsed = parseFloat(String(value).replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

function mapCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'Getreide': 'Cereais',
    'Gemüse': 'Vegetais',
    'Obst': 'Frutas',
    'Fleisch': 'Carnes',
    'Fisch': 'Peixes e Frutos do Mar',
    'Milch': 'Laticínios',
    'Milchprodukte': 'Laticínios',
    'Eier': 'Ovos',
    'Fette': 'Gorduras e Óleos',
    'Öle': 'Gorduras e Óleos',
    'Nüsse': 'Oleaginosas',
    'Hülsenfrüchte': 'Leguminosas',
    'Zucker': 'Açúcares e Doces',
    'Süßwaren': 'Açúcares e Doces',
    'Getränke': 'Bebidas',
    'Gewürze': 'Temperos e Condimentos',
    'Backwaren': 'Pães e Produtos de Panificação',
    'Teigwaren': 'Massas',
    'Fertiggerichte': 'Pratos Prontos',
    'Kartoffeln': 'Tubérculos',
    'Pilze': 'Cogumelos',
  };

  for (const [german, portuguese] of Object.entries(categoryMap)) {
    if (category.toLowerCase().includes(german.toLowerCase())) {
      return portuguese;
    }
  }
  return category;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { offset = 0, batchSize = 500, dryRun = false } = await req.json().catch(() => ({}));
    
    log("Starting BLS Germany import", { offset, batchSize, dryRun });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the ZIP file
    log("Fetching BLS ZIP file from blsdb.de");
    const response = await fetch(BLS_ZIP_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch BLS data: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    log("ZIP file downloaded", { size: arrayBuffer.byteLength });

    // Read the ZIP file
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    log("Available sheets", { sheets: workbook.SheetNames });

    // Find the main data sheet (usually first or named with data)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (rawData.length < 2) {
      throw new Error("No data found in spreadsheet");
    }

    // Get headers from first row
    const headers = rawData[0] as string[];
    log("Headers found", { count: headers.length, sample: headers.slice(0, 10) });

    // Find column indices
    const findColumn = (patterns: string[]): number => {
      return headers.findIndex(h => 
        h && patterns.some(p => 
          String(h).toLowerCase().includes(p.toLowerCase())
        )
      );
    };

    const nameCol = findColumn(['name', 'bezeichnung', 'lebensmittel']);
    const groupCol = findColumn(['gruppe', 'group', 'kategorie', 'category']);
    const energyCol = findColumn(['energie', 'energy', 'kcal', 'kalorien']);
    const proteinCol = findColumn(['protein', 'eiweiß', 'eiweiss']);
    const carbsCol = findColumn(['kohlenhydrat', 'carb', 'kh']);
    const fatCol = findColumn(['fett', 'fat', 'lipid']);
    const fiberCol = findColumn(['ballast', 'fiber', 'faser']);
    const sodiumCol = findColumn(['natrium', 'sodium', 'na']);

    log("Column mapping", { 
      nameCol, groupCol, energyCol, proteinCol, 
      carbsCol, fatCol, fiberCol, sodiumCol 
    });

    if (nameCol === -1) {
      throw new Error("Could not find name column in BLS data");
    }

    // Process data rows
    const dataRows = rawData.slice(1);
    const totalRows = dataRows.length;
    
    log(`Processing ${totalRows} total rows, offset: ${offset}, batchSize: ${batchSize}`);

    const batchRows = dataRows.slice(offset, offset + batchSize);
    const foodsToInsert: any[] = [];

    for (const row of batchRows) {
      if (!row || !row[nameCol]) continue;

      const name = String(row[nameCol]).trim();
      if (!name || name.length < 2) continue;

      const category = groupCol !== -1 ? String(row[groupCol] || '').trim() : null;
      const calories = energyCol !== -1 ? parseNutrientValue(row[energyCol]) : null;
      const protein = proteinCol !== -1 ? parseNutrientValue(row[proteinCol]) : null;
      const carbs = carbsCol !== -1 ? parseNutrientValue(row[carbsCol]) : null;
      const fat = fatCol !== -1 ? parseNutrientValue(row[fatCol]) : null;
      const fiber = fiberCol !== -1 ? parseNutrientValue(row[fiberCol]) : null;
      const sodium = sodiumCol !== -1 ? parseNutrientValue(row[sodiumCol]) : null;

      foodsToInsert.push({
        name,
        name_normalized: normalizeText(name),
        calories_per_100g: calories ?? 0,
        protein_per_100g: protein ?? 0,
        carbs_per_100g: carbs ?? 0,
        fat_per_100g: fat ?? 0,
        fiber_per_100g: fiber,
        sodium_per_100g: sodium,
        category: category ? mapCategory(category) : null,
        source: 'BLS',
        cuisine_origin: 'alemã',
        is_verified: true,
        confidence: 0.95,
        is_recipe: false,
        default_serving_size: 100,
        serving_unit: 'g'
      });
    }

    log(`Prepared ${foodsToInsert.length} foods for insertion`);

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        totalRows,
        offset,
        batchSize,
        foodsInBatch: foodsToInsert.length,
        hasMore: offset + batchSize < totalRows,
        nextOffset: offset + batchSize,
        sample: foodsToInsert.slice(0, 5)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert in smaller batches
    const BATCH_INSERT_SIZE = 100;
    let insertedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < foodsToInsert.length; i += BATCH_INSERT_SIZE) {
      const batch = foodsToInsert.slice(i, i + BATCH_INSERT_SIZE);
      
      const { data, error } = await supabase
        .from('foods')
        .upsert(batch, {
          onConflict: 'name_normalized',
          ignoreDuplicates: true
        })
        .select('id');

      if (error) {
        log(`Batch error: ${error.message}`);
        errorCount += batch.length;
        errors.push(error.message);
      } else {
        insertedCount += data?.length || 0;
      }

      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const summary = {
      success: true,
      source: 'BLS Germany',
      totalRows,
      offset,
      batchSize,
      processedInBatch: foodsToInsert.length,
      inserted: insertedCount,
      errors: errorCount,
      hasMore: offset + batchSize < totalRows,
      nextOffset: offset + batchSize,
      errorMessages: errors.slice(0, 5)
    };

    log("BLS import batch completed", summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Error during import", { error: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
