import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const USDA_API_KEY = Deno.env.get('USDA_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function logStep(step: string, data?: any) {
  console.log(`[lookup-ingredient] ${step}`, data ? JSON.stringify(data) : '');
}

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    value: number;
    unitName: string;
  }>;
}

interface NutrientData {
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number;
  sodium_per_100g: number;
  source: string;
  usda_fdc_id?: number;
}

function extractNutrients(food: USDAFood): NutrientData {
  const nutrients = food.foodNutrients || [];
  
  const findNutrient = (ids: number[]): number => {
    for (const id of ids) {
      const nutrient = nutrients.find(n => n.nutrientId === id);
      if (nutrient && nutrient.value !== undefined) {
        return nutrient.value;
      }
    }
    return 0;
  };

  // USDA nutrient IDs:
  // Energy (kcal): 1008
  // Protein: 1003
  // Carbohydrates: 1005
  // Fat: 1004
  // Fiber: 1079
  // Sodium: 1093

  return {
    name: food.description,
    calories_per_100g: Math.round(findNutrient([1008])),
    protein_per_100g: Math.round(findNutrient([1003]) * 10) / 10,
    carbs_per_100g: Math.round(findNutrient([1005]) * 10) / 10,
    fat_per_100g: Math.round(findNutrient([1004]) * 10) / 10,
    fiber_per_100g: Math.round(findNutrient([1079]) * 10) / 10,
    sodium_per_100g: Math.round(findNutrient([1093])),
    source: 'usda',
    usda_fdc_id: food.fdcId,
  };
}

async function searchUSDA(query: string): Promise<NutrientData | null> {
  if (!USDA_API_KEY) {
    logStep('USDA API key not configured');
    return null;
  }

  try {
    logStep('Searching USDA', { query });
    
    const url = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
    url.searchParams.set('api_key', USDA_API_KEY);
    url.searchParams.set('query', query);
    url.searchParams.set('dataType', 'Foundation,SR Legacy');
    url.searchParams.set('pageSize', '5');

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      logStep('USDA API error', { status: response.status });
      return null;
    }

    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      logStep('No USDA results found');
      return null;
    }

    // Prefer Foundation data over SR Legacy
    const foundationFood = data.foods.find((f: USDAFood) => f.dataType === 'Foundation');
    const selectedFood = foundationFood || data.foods[0];
    
    logStep('USDA food found', { 
      fdcId: selectedFood.fdcId, 
      description: selectedFood.description,
      dataType: selectedFood.dataType 
    });

    return extractNutrients(selectedFood);
  } catch (error: any) {
    logStep('USDA search error', { error: error?.message || String(error) });
    return null;
  }
}

async function saveToDatabase(
  supabase: any, 
  nutrientData: NutrientData
): Promise<any> {
  const nameNormalized = normalizeText(nutrientData.name);
  
  const insertData = {
    name: nutrientData.name,
    name_normalized: nameNormalized,
    calories_per_100g: nutrientData.calories_per_100g,
    protein_per_100g: nutrientData.protein_per_100g,
    carbs_per_100g: nutrientData.carbs_per_100g,
    fat_per_100g: nutrientData.fat_per_100g,
    fiber_per_100g: nutrientData.fiber_per_100g,
    sodium_per_100g: nutrientData.sodium_per_100g,
    source: nutrientData.source,
    is_verified: true,
    is_recipe: false,
    category: 'ingrediente',
  };

  logStep('Saving to database', { name: nutrientData.name });

  const { data, error } = await supabase
    .from('foods')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Check if it's a duplicate
    if (error.code === '23505') {
      logStep('Food already exists, fetching existing');
      const { data: existing } = await supabase
        .from('foods')
        .select('*')
        .eq('name_normalized', nameNormalized)
        .single();
      return existing;
    }
    logStep('Database insert error', { error });
    throw error;
  }

  logStep('Saved successfully', { id: data.id });
  return data;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, limit = 5 } = await req.json();

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query deve ter pelo menos 2 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const normalizedQuery = normalizeText(query);
    
    logStep('Starting lookup', { query, normalizedQuery });

    // Step 1: Search in verified local foods
    const { data: localFoods, error: localError } = await supabase
      .from('foods')
      .select('*')
      .eq('is_verified', true)
      .eq('is_recipe', false)
      .or(`name_normalized.ilike.%${normalizedQuery}%,name.ilike.%${query}%`)
      .order('name')
      .limit(limit);

    if (localError) {
      logStep('Local search error', { error: localError });
      throw localError;
    }

    if (localFoods && localFoods.length > 0) {
      logStep('Found in local database', { count: localFoods.length });
      return new Response(
        JSON.stringify({ 
          results: localFoods, 
          source: 'local',
          count: localFoods.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Search in ingredient aliases
    const { data: aliasResults } = await supabase
      .from('ingredient_aliases')
      .select('food_id, alias, foods!inner(*)')
      .ilike('alias', `%${normalizedQuery}%`)
      .limit(limit);

    if (aliasResults && aliasResults.length > 0) {
      const foods = aliasResults
        .map((a: any) => a.foods)
        .filter((f: any) => f && f.is_verified);
      
      if (foods.length > 0) {
        logStep('Found via alias', { count: foods.length });
        return new Response(
          JSON.stringify({ 
            results: foods, 
            source: 'alias',
            count: foods.length 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Step 3: Fallback to USDA API
    logStep('No local results, trying USDA API');
    const usdaResult = await searchUSDA(query);

    if (!usdaResult) {
      logStep('No results from USDA either');
      return new Response(
        JSON.stringify({ 
          results: [], 
          source: 'none',
          count: 0,
          message: 'Nenhum ingrediente encontrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save USDA result to local database for future lookups
    const savedFood = await saveToDatabase(supabase, usdaResult);

    logStep('Returning USDA result', { name: savedFood.name });
    return new Response(
      JSON.stringify({ 
        results: [savedFood], 
        source: 'usda',
        count: 1 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    logStep('Unhandled error', { error: error?.message || String(error) });
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
