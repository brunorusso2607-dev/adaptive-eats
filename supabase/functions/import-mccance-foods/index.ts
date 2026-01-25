import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
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
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function parseNutrientValue(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === 'N' || value === 'Tr') return null;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (str === 'N' || str === 'Tr' || str === '-' || str === '') return null;
  const cleaned = str.replace(/[()[\]]/g, '').trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function mapCategory(groupName: string): string {
  if (!groupName) return 'outros';
  const normalized = normalizeText(groupName);
  const categoryMap: Record<string, string> = {
    'meat': 'carnes', 'beef': 'carnes', 'lamb': 'carnes', 'pork': 'carnes',
    'poultry': 'aves', 'chicken': 'aves', 'turkey': 'aves',
    'fish': 'peixes', 'seafood': 'frutos do mar', 'shellfish': 'frutos do mar',
    'egg': 'ovos', 'milk': 'laticinios', 'dairy': 'laticinios',
    'cheese': 'queijos', 'yogurt': 'laticinios',
    'vegetable': 'legumes', 'fruit': 'frutas',
    'cereal': 'cereais', 'bread': 'paes', 'flour': 'farinhas',
    'pasta': 'massas', 'rice': 'cereais',
    'pulse': 'leguminosas', 'bean': 'leguminosas', 'lentil': 'leguminosas',
    'nut': 'castanhas', 'seed': 'sementes',
    'oil': 'oleos', 'fat': 'manteigas', 'butter': 'manteigas',
    'sugar': 'adocantes', 'sweet': 'doces', 'confectionery': 'doces',
    'spice': 'especiarias', 'herb': 'ervas', 'sauce': 'molhos',
    'beverage': 'bebidas', 'drink': 'bebidas', 'alcohol': 'bebidas alcoolicas',
    'soup': 'sopas', 'snack': 'snacks', 'crisp': 'snacks',
    'biscuit': 'biscoitos', 'cake': 'bolos', 'pudding': 'sobremesas', 'dessert': 'sobremesas',
  };
  for (const [english, portuguese] of Object.entries(categoryMap)) {
    if (normalized.includes(english)) return portuguese;
  }
  return 'outros';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { source = 'old_foods', offset = 0, batchSize = 100, dryRun = false } = await req.json();
    
    log('Starting import', { source, offset, batchSize, dryRun });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use the smaller "old foods" file (634KB) instead of main file (4.4MB)
    const fileUrl = source === 'old_foods' 
      ? 'https://assets.publishing.service.gov.uk/media/60538ba4e90e07527f645f88/CoFID_oldFoods.xlsx'
      : 'https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx';

    log('Fetching Excel file...', { fileUrl });
    
    const response = await fetch(fileUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)' }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    log('File loaded', { size: arrayBuffer.byteLength });

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    log('Sheets available', { sheets: workbook.SheetNames });

    // Find the proximates sheet
    let sheetName = workbook.SheetNames.find(s => 
      s.toLowerCase().includes('proximate') || s.includes('1.3')
    );
    
    if (!sheetName) {
      // For old_foods, use the first sheet
      sheetName = workbook.SheetNames[0];
    }

    log('Using sheet', { sheetName });

    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    log('Excel parsed', { totalRows: jsonData.length });

    if (jsonData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No data found in Excel file', sheets: workbook.SheetNames }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Identify columns
    const firstRow = jsonData[0] as Record<string, any>;
    const columns = Object.keys(firstRow);
    log('Columns', { columns: columns.slice(0, 20) });

    // Find column mappings dynamically
    const findColumn = (keywords: string[]) => {
      return columns.find(col => {
        const lower = col.toLowerCase();
        return keywords.some(k => lower.includes(k));
      });
    };

    const colMap = {
      name: findColumn(['food name', 'name']) || columns[1],
      group: findColumn(['group', 'category']),
      energy_kcal: findColumn(['energy', 'kcal']),
      protein: findColumn(['protein']),
      carbs: findColumn(['carbohydrate', 'carbs']),
      fat: findColumn(['fat']),
      fiber: findColumn(['fibre', 'fiber', 'nsp']),
    };

    log('Column mapping', colMap);

    // Process rows
    const endOffset = Math.min(offset + batchSize, jsonData.length);
    const rowsToProcess = jsonData.slice(offset, endOffset);
    const foodsToInsert: any[] = [];

    for (const row of rowsToProcess) {
      const r = row as Record<string, any>;
      const name = colMap.name ? r[colMap.name] : null;
      if (!name || typeof name !== 'string' || name.trim() === '') continue;

      const calories = parseNutrientValue(colMap.energy_kcal ? r[colMap.energy_kcal] : null);
      const protein = parseNutrientValue(colMap.protein ? r[colMap.protein] : null);
      const carbs = parseNutrientValue(colMap.carbs ? r[colMap.carbs] : null);
      const fat = parseNutrientValue(colMap.fat ? r[colMap.fat] : null);
      const fiber = parseNutrientValue(colMap.fiber ? r[colMap.fiber] : null);

      if (calories === null && protein === null && carbs === null && fat === null) continue;

      foodsToInsert.push({
        name: name.trim(),
        name_normalized: normalizeText(name),
        calories_per_100g: calories ?? 0,
        protein_per_100g: protein ?? 0,
        carbs_per_100g: carbs ?? 0,
        fat_per_100g: fat ?? 0,
        fiber_per_100g: fiber,
        sodium_per_100g: null,
        source: 'McCance',
        cuisine_origin: 'britanica',
        category: colMap.group && r[colMap.group] ? mapCategory(r[colMap.group]) : null,
        is_recipe: false,
        verified: true,
        is_verified: true,
        confidence: 1.0,
        serving_unit: 'g',
        default_serving_size: 100,
      });
    }

    log('Foods prepared', { count: foodsToInsert.length });

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          totalRows: jsonData.length,
          validFoods: foodsToInsert.length,
          columnMapping: colMap,
          sample: foodsToInsert.slice(0, 3),
          sheets: workbook.SheetNames
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert in small batches
    let inserted = 0;
    let errors = 0;
    const insertBatch = 25;

    for (let i = 0; i < foodsToInsert.length; i += insertBatch) {
      const batch = foodsToInsert.slice(i, i + insertBatch);
      
      const { data, error } = await supabase
        .from('foods')
        .upsert(batch, { onConflict: 'name_normalized', ignoreDuplicates: true })
        .select('id');

      if (error) {
        log('Batch error', { error: error.message });
        for (const food of batch) {
          const { error: singleError } = await supabase
            .from('foods')
            .upsert(food, { onConflict: 'name_normalized', ignoreDuplicates: true });
          if (singleError) errors++;
          else inserted++;
        }
      } else {
        inserted += data?.length ?? batch.length;
      }
    }

    const hasMore = endOffset < jsonData.length;

    log('Batch completed', { inserted, errors, hasMore, nextOffset: endOffset });

    return new Response(
      JSON.stringify({
        success: true,
        totalRows: jsonData.length,
        processedFrom: offset,
        processedTo: endOffset,
        inserted,
        errors,
        hasMore,
        nextOffset: hasMore ? endOffset : null,
        message: hasMore 
          ? `Inserted ${inserted}. Call again with offset=${endOffset} to continue.`
          : `Import complete! Total: ${inserted}`
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

