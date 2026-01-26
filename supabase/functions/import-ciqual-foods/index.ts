import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: any) => {
  console.log(`[IMPORT-CIQUAL] ${step}`, details ? JSON.stringify(details) : '');
};

// Normaliza texto: remove acentos e converte para minúsculas
function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Converte valor CIQUAL para número (trata "-", "traces", "<")
function parseNutrientValue(value: any): number | null {
  if (value === null || value === undefined || value === '-' || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const str = String(value).trim().toLowerCase();
  if (str === '-' || str === 'traces' || str === 'trace' || str === '') {
    return null;
  }
  // Handle "<" values (e.g., "< 0.5") - treat as half the value
  if (str.startsWith('<')) {
    const num = parseFloat(str.replace('<', '').trim().replace(',', '.'));
    return isNaN(num) ? null : num / 2;
  }
  // Replace comma with dot for French decimal format
  const parsed = parseFloat(str.replace(',', '.'));
  return isNaN(parsed) ? null : parsed;
}

// Mapeia categoria francesa para categoria do sistema
function mapCategory(groupName: string): string {
  const categoryMap: Record<string, string> = {
    'viandes': 'carnes',
    'volailles': 'aves',
    'poissons': 'peixes',
    'crustacés': 'frutos do mar',
    'mollusques': 'frutos do mar',
    'oeufs': 'ovos',
    'lait': 'laticinios',
    'produits laitiers': 'laticinios',
    'fromages': 'queijos',
    'légumes': 'legumes',
    'fruits': 'frutas',
    'céréales': 'cereais',
    'pains': 'paes',
    'farines': 'farinhas',
    'légumineuses': 'leguminosas',
    'noix': 'castanhas',
    'graines': 'sementes',
    'huiles': 'oleos',
    'matières grasses': 'manteigas',
    'sucres': 'adocantes',
    'épices': 'especiarias',
    'herbes': 'ervas',
    'condiments': 'temperos',
    'boissons': 'bebidas vegetais',
  };

  const normalized = normalizeText(groupName);
  for (const [french, portuguese] of Object.entries(categoryMap)) {
    if (normalized.includes(normalizeText(french))) {
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

    // Try storage first, then URL
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
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    log('Excel parsed', { 
      sheetName, 
      totalRows: jsonData.length,
      sampleColumns: jsonData[0] ? Object.keys(jsonData[0]).slice(0, 10) : []
    });

    if (jsonData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data found in Excel file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Identify column names (CIQUAL uses French names)
    const firstRow = jsonData[0] as Record<string, any>;
    const columns = Object.keys(firstRow);
    log('Columns found', { columns: columns.slice(0, 20) });

    // Common CIQUAL column mappings
    const columnMappings: Record<string, string[]> = {
      code: ['alim_code', 'code'],
      name: ['alim_nom_fr', 'alim_nom', 'nom_fr', 'nom'],
      group: ['alim_grp_nom_fr', 'groupe', 'group_fr'],
      energy_kj: ['Energie, Règlement UE N° 1169/2011 (kJ/100 g)', 'Energie (kJ/100 g)', 'energie_kj'],
      energy_kcal: ['Energie, Règlement UE N° 1169/2011 (kcal/100 g)', 'Energie (kcal/100 g)', 'energie_kcal'],
      protein: ['Protéines, N x facteur de Jones (g/100 g)', 'Protéines (g/100 g)', 'proteines'],
      carbs: ['Glucides (g/100 g)', 'glucides'],
      fat: ['Lipides (g/100 g)', 'lipides'],
      fiber: ['Fibres alimentaires (g/100 g)', 'fibres'],
      sodium: ['Sodium (mg/100 g)', 'sodium'],
    };

    // Find matching columns
    const findColumn = (possibleNames: string[]): string | null => {
      for (const name of possibleNames) {
        const found = columns.find(c => 
          normalizeText(c).includes(normalizeText(name)) || 
          normalizeText(name).includes(normalizeText(c))
        );
        if (found) return found;
      }
      return null;
    };

    const colMap = {
      code: findColumn(columnMappings.code),
      name: findColumn(columnMappings.name),
      group: findColumn(columnMappings.group),
      energy_kcal: findColumn(columnMappings.energy_kcal),
      protein: findColumn(columnMappings.protein),
      carbs: findColumn(columnMappings.carbs),
      fat: findColumn(columnMappings.fat),
      fiber: findColumn(columnMappings.fiber),
      sodium: findColumn(columnMappings.sodium),
    };

    log('Column mapping', colMap);

    if (!colMap.name) {
      return new Response(
        JSON.stringify({ error: 'Could not find name column in Excel', columns }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process rows
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
          source: 'CIQUAL',
          cuisine_origin: 'francesa',
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
      
      // Use upsert to avoid duplicates (based on name_normalized + source)
      const { data, error } = await supabase
        .from('foods')
        .upsert(batch, { 
          onConflict: 'name_normalized',
          ignoreDuplicates: true 
        })
        .select('id');

      if (error) {
        log('Batch insert error', { batch: i, error: error.message });
        // Try inserting one by one for this batch
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

