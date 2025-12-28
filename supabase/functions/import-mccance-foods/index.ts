import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: any) => {
  console.log(`[IMPORT-MCCANCE] ${step}`, details ? JSON.stringify(details) : '');
};

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseNutrientValue(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === 'N' || value === 'Tr') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const str = String(value).trim();
  if (str === 'N' || str === 'Tr' || str === '-' || str === '') {
    return null;
  }
  // Handle bracketed values like "(50)" - estimated values
  const cleaned = str.replace(/[()[\]]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function mapCategory(groupName: string): string {
  if (!groupName) return 'outros';
  const normalized = normalizeText(groupName);
  
  const categoryMap: Record<string, string> = {
    'meat': 'carnes',
    'beef': 'carnes',
    'lamb': 'carnes',
    'pork': 'carnes',
    'poultry': 'aves',
    'chicken': 'aves',
    'turkey': 'aves',
    'fish': 'peixes',
    'seafood': 'frutos do mar',
    'shellfish': 'frutos do mar',
    'egg': 'ovos',
    'milk': 'laticinios',
    'dairy': 'laticinios',
    'cheese': 'queijos',
    'yogurt': 'laticinios',
    'vegetable': 'legumes',
    'fruit': 'frutas',
    'cereal': 'cereais',
    'bread': 'paes',
    'flour': 'farinhas',
    'pasta': 'massas',
    'rice': 'cereais',
    'pulse': 'leguminosas',
    'bean': 'leguminosas',
    'lentil': 'leguminosas',
    'nut': 'castanhas',
    'seed': 'sementes',
    'oil': 'oleos',
    'fat': 'manteigas',
    'butter': 'manteigas',
    'sugar': 'adocantes',
    'sweet': 'doces',
    'confectionery': 'doces',
    'spice': 'especiarias',
    'herb': 'ervas',
    'sauce': 'molhos',
    'beverage': 'bebidas',
    'drink': 'bebidas',
    'alcohol': 'bebidas alcoolicas',
    'soup': 'sopas',
    'snack': 'snacks',
    'crisp': 'snacks',
    'biscuit': 'biscoitos',
    'cake': 'bolos',
    'pudding': 'sobremesas',
    'dessert': 'sobremesas',
  };

  for (const [english, portuguese] of Object.entries(categoryMap)) {
    if (normalized.includes(english)) {
      return portuguese;
    }
  }
  return 'outros';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, storagePath, dryRun = false, limit = 0 } = await req.json();
    
    log('Starting import', { fileUrl, storagePath, dryRun, limit });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let arrayBuffer: ArrayBuffer;

    if (storagePath) {
      log('Downloading from storage...', { storagePath });
      const { data, error } = await supabase.storage
        .from('app-assets')
        .download(storagePath);
      
      if (error) {
        throw new Error(`Failed to download from storage: ${error.message}`);
      }
      arrayBuffer = await data.arrayBuffer();
    } else if (fileUrl) {
      log('Fetching Excel file from URL...');
      const response = await fetch(fileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      arrayBuffer = await response.arrayBuffer();
    } else {
      throw new Error('Either fileUrl or storagePath is required');
    }

    log('File loaded', { size: arrayBuffer.byteLength });

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    
    // McCance has multiple sheets - find the main one with food data
    log('Available sheets', { sheets: workbook.SheetNames });
    
    // McCance main data is in "1.3 Proximates" sheet
    const mainSheet = '1.3 Proximates';
    
    if (!workbook.SheetNames.includes(mainSheet)) {
      throw new Error(`Sheet "${mainSheet}" not found. Available: ${workbook.SheetNames.join(', ')}`);
    }
    
    log('Using sheet', { sheetName: mainSheet });
    
    const worksheet = workbook.Sheets[mainSheet];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    log('Excel parsed', { 
      sheetName: mainSheet, 
      totalRows: jsonData.length,
      sampleColumns: jsonData[0] ? Object.keys(jsonData[0]).slice(0, 15) : []
    });

    if (jsonData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data found in Excel file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firstRow = jsonData[0] as Record<string, any>;
    const columns = Object.keys(firstRow);
    log('Columns found', { columns: columns.slice(0, 25) });

    // McCance column mappings for "1.3 Proximates" sheet
    // Sodium is in a different sheet (1.4 Inorganics), so we skip it
    const colMap = {
      code: 'Food Code',
      name: 'Food Name',
      group: 'Group',
      energy_kcal: 'Energy (kcal) (kcal)',
      protein: 'Protein (g)',
      carbs: 'Carbohydrate (g)',
      fat: 'Fat (g)',
      fiber: 'NSP (g)', // Non-starch polysaccharides = fiber
      sodium: null as string | null, // Not in this sheet
    };

    log('Column mapping', colMap);

    if (!colMap.name) {
      return new Response(
        JSON.stringify({ 
          error: 'Could not find name column in Excel', 
          columns,
          sampleRow: firstRow
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const foodsToInsert: any[] = [];
    const errors: string[] = [];
    const rowsToProcess = limit > 0 ? jsonData.slice(0, limit) : jsonData;

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i] as Record<string, any>;
      
      try {
        const name = row[colMap.name!];
        if (!name || typeof name !== 'string' || name.trim() === '') {
          continue;
        }

        const calories = parseNutrientValue(colMap.energy_kcal ? row[colMap.energy_kcal] : null);
        const protein = parseNutrientValue(colMap.protein ? row[colMap.protein] : null);
        const carbs = parseNutrientValue(colMap.carbs ? row[colMap.carbs] : null);
        const fat = parseNutrientValue(colMap.fat ? row[colMap.fat] : null);
        const fiber = parseNutrientValue(colMap.fiber ? row[colMap.fiber] : null);
        const sodium = parseNutrientValue(colMap.sodium ? row[colMap.sodium] : null);
        const groupName = colMap.group ? row[colMap.group] : null;

        // Skip if no nutritional data at all
        if (calories === null && protein === null && carbs === null && fat === null) {
          continue;
        }

        const food = {
          name: name.trim(),
          name_normalized: normalizeText(name),
          calories_per_100g: calories ?? 0,
          protein_per_100g: protein ?? 0,
          carbs_per_100g: carbs ?? 0,
          fat_per_100g: fat ?? 0,
          fiber_per_100g: fiber,
          sodium_per_100g: sodium,
          source: 'McCance',
          cuisine_origin: 'britanica',
          category: groupName ? mapCategory(groupName) : null,
          is_recipe: false,
          verified: true,
          is_verified: true,
          confidence: 1.0,
          serving_unit: 'g',
          default_serving_size: 100,
        };

        foodsToInsert.push(food);
      } catch (rowError) {
        errors.push(`Row ${i}: ${rowError}`);
      }
    }

    log('Processed rows', { 
      total: rowsToProcess.length, 
      valid: foodsToInsert.length, 
      errors: errors.length 
    });

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: 'Dry run completed',
          stats: {
            totalRows: jsonData.length,
            processedRows: rowsToProcess.length,
            validFoods: foodsToInsert.length,
            errors: errors.length,
          },
          sample: foodsToInsert.slice(0, 5),
          columnMapping: colMap,
          availableColumns: columns,
          errors: errors.slice(0, 10),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert in batches
    const batchSize = 100;
    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < foodsToInsert.length; i += batchSize) {
      const batch = foodsToInsert.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('foods')
        .upsert(batch, { 
          onConflict: 'name_normalized',
          ignoreDuplicates: true 
        })
        .select('id');

      if (error) {
        log('Batch insert error', { batch: i, error: error.message });
        for (const food of batch) {
          const { error: singleError } = await supabase
            .from('foods')
            .upsert(food, { onConflict: 'name_normalized', ignoreDuplicates: true });
          
          if (singleError) {
            skipped++;
          } else {
            inserted++;
          }
        }
      } else {
        inserted += data?.length ?? batch.length;
      }

      log(`Batch ${Math.floor(i / batchSize) + 1} completed`, { inserted, skipped });
    }

    log('Import completed', { inserted, skipped });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Import completed: ${inserted} foods inserted, ${skipped} skipped`,
        stats: {
          totalRows: jsonData.length,
          processedRows: rowsToProcess.length,
          validFoods: foodsToInsert.length,
          inserted,
          skipped,
          errors: errors.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    log('Import error', { error: errorMessage, stack: errorStack });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
