import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: any) => {
  console.log(`[CONVERT-MCCANCE] ${step}`, details ? JSON.stringify(details) : '');
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
    'biscuit': 'biscoitos', 'cake': 'bolos',
    'pudding': 'sobremesas', 'dessert': 'sobremesas',
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
    const { storagePath } = await req.json();
    
    log('Starting conversion', { storagePath });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    log('Downloading Excel...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('app-assets')
      .download(storagePath);
    
    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    const arrayBuffer = await fileData.arrayBuffer();
    log('File loaded', { size: arrayBuffer.byteLength });

    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    const worksheet = workbook.Sheets['1.3 Proximates'];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    log('Excel parsed', { totalRows: jsonData.length });

    const colMap = {
      name: 'Food Name',
      group: 'Group',
      energy_kcal: 'Energy (kcal) (kcal)',
      protein: 'Protein (g)',
      carbs: 'Carbohydrate (g)',
      fat: 'Fat (g)',
      fiber: 'NSP (g)',
    };

    const foods: any[] = [];

    for (const row of jsonData) {
      const r = row as Record<string, any>;
      const name = r[colMap.name];
      if (!name || typeof name !== 'string' || name.trim() === '') continue;

      const calories = parseNutrientValue(r[colMap.energy_kcal]);
      const protein = parseNutrientValue(r[colMap.protein]);
      const carbs = parseNutrientValue(r[colMap.carbs]);
      const fat = parseNutrientValue(r[colMap.fat]);
      const fiber = parseNutrientValue(r[colMap.fiber]);

      if (calories === null && protein === null && carbs === null && fat === null) continue;

      foods.push({
        name: name.trim(),
        name_normalized: normalizeText(name),
        calories_per_100g: calories ?? 0,
        protein_per_100g: protein ?? 0,
        carbs_per_100g: carbs ?? 0,
        fat_per_100g: fat ?? 0,
        fiber_per_100g: fiber,
        source: 'McCance',
        cuisine_origin: 'britanica',
        category: r[colMap.group] ? mapCategory(r[colMap.group]) : null,
      });
    }

    log('Foods processed', { count: foods.length });

    // Save as JSON to storage
    const jsonContent = JSON.stringify(foods);
    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload('data/mccance_foods.json', jsonContent, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    log('JSON saved to storage');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Converted ${foods.length} foods to JSON`,
        jsonPath: 'data/mccance_foods.json',
        foodCount: foods.length,
        sample: foods.slice(0, 3)
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

