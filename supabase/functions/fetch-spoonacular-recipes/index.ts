import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const logStep = (step: string, data?: any) => {
  console.log(`[SPOONACULAR] ${step}`, data ? JSON.stringify(data) : '');
};

// Map cuisine to country code
const CUISINE_TO_COUNTRY: Record<string, string> = {
  'brazilian': 'BR',
  'latin american': 'BR',
  'italian': 'IT',
  'mexican': 'MX',
  'chinese': 'CN',
  'indian': 'IN',
  'japanese': 'JP',
  'thai': 'TH',
  'greek': 'GR',
  'mediterranean': 'ES',
  'korean': 'KR',
  'vietnamese': 'VN',
  'french': 'FR',
  'german': 'DE',
  'british': 'GB',
  'american': 'US',
  'spanish': 'ES',
  'middle eastern': 'SA',
  'caribbean': 'CU'
};

// Map meal type
const MEAL_TYPE_MAP: Record<string, string> = {
  'breakfast': 'cafe_manha',
  'brunch': 'cafe_manha',
  'lunch': 'almoco',
  'dinner': 'jantar',
  'snack': 'lanche_tarde',
  'dessert': 'lanche_tarde'
};

interface SpoonacularRecipe {
  id: number;
  title: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  sourceName: string;
  image: string;
  nutrition?: {
    nutrients: Array<{ name: string; amount: number }>;
  };
  extendedIngredients?: Array<{
    original: string;
    name: string;
    amount: number;
    unit: string;
  }>;
  dishTypes?: string[];
  cuisines?: string[];
  spoonacularScore?: number;
}

async function fetchSpoonacularRecipes(apiKey: string, cuisine: string, count: number = 5): Promise<SpoonacularRecipe[]> {
  const url = `https://api.spoonacular.com/recipes/complexSearch?cuisine=${cuisine}&number=${count}&addRecipeNutrition=true&addRecipeInformation=true&apiKey=${apiKey}`;
  
  logStep('Fetching from Spoonacular', { cuisine, count });
  
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Spoonacular API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  logStep('Spoonacular response', { resultsCount: data.results?.length });
  
  return data.results || [];
}

async function translateWithGemini(text: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    logStep('No LOVABLE_API_KEY, skipping translation');
    return text;
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Você é um tradutor. Traduza o texto para português brasileiro de forma natural. Retorne APENAS a tradução, sem explicações.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      logStep('Gemini translation failed', { status: response.status });
      return text;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch (error: any) {
    logStep('Translation error', { error: error?.message });
    return text;
  }
}

async function translateIngredients(ingredients: any[]): Promise<any[]> {
  if (!LOVABLE_API_KEY || !ingredients.length) return ingredients;

  try {
    const ingredientNames = ingredients.map(i => i.original || i.name).join('\n');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Traduza cada ingrediente para português brasileiro. Retorne um JSON array com objetos {name: string, quantity: string}. Apenas o JSON, sem markdown.'
          },
          {
            role: 'user',
            content: ingredientNames
          }
        ],
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      return ingredients.map(i => ({ name: i.name, quantity: `${i.amount} ${i.unit}` }));
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Try to parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return ingredients.map(i => ({ name: i.name, quantity: `${i.amount} ${i.unit}` }));
  } catch (error: any) {
    logStep('Ingredients translation error', { error: error?.message });
    return ingredients.map(i => ({ name: i.name, quantity: `${i.amount} ${i.unit}` }));
  }
}

function getNutrient(nutrients: any[], name: string): number {
  const nutrient = nutrients?.find(n => n.name.toLowerCase() === name.toLowerCase());
  return Math.round(nutrient?.amount || 0);
}

function getMealType(dishTypes: string[]): string {
  for (const type of dishTypes || []) {
    const mapped = MEAL_TYPE_MAP[type.toLowerCase()];
    if (mapped) return mapped;
  }
  return 'almoco'; // default
}

function getCompatibleMealTimes(dishTypes: string[]): string[] {
  const times = new Set<string>();
  for (const type of dishTypes || []) {
    const mapped = MEAL_TYPE_MAP[type.toLowerCase()];
    if (mapped) times.add(mapped);
  }
  return times.size > 0 ? Array.from(times) : ['almoco', 'jantar'];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get config from database
    const { data: config, error: configError } = await supabase
      .from('spoonacular_config')
      .select('*')
      .single();

    if (configError || !config?.api_key_encrypted) {
      throw new Error('API key do Spoonacular não configurada');
    }

    const apiKey = config.api_key_encrypted;
    
    const { cuisine, count = config.daily_limit || 15, translateToPortuguese = true } = await req.json().catch(() => ({}));
    
    logStep('Starting fetch', { cuisine, count, translate: translateToPortuguese });

    // Fetch recipes from Spoonacular
    const recipes = await fetchSpoonacularRecipes(apiKey, cuisine, count);
    
    if (!recipes.length) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No recipes found',
        imported: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const importedMeals = [];
    let failedCount = 0;
    
    for (const recipe of recipes) {
      try {
        // Check if already exists by source_url
        const { data: existing } = await supabase
          .from('simple_meals')
          .select('id')
          .eq('source_url', recipe.sourceUrl)
          .single();
        
        if (existing) {
          logStep('Recipe already exists', { title: recipe.title });
          continue;
        }

        // Translate name and prepare ingredients
        const translatedName = translateToPortuguese 
          ? await translateWithGemini(recipe.title)
          : recipe.title;
        
        const ingredients = translateToPortuguese
          ? await translateIngredients(recipe.extendedIngredients || [])
          : (recipe.extendedIngredients || []).map(i => ({ 
              name: i.name, 
              quantity: `${i.amount} ${i.unit}` 
            }));

        const nutrients = recipe.nutrition?.nutrients || [];
        const recipeCuisine = recipe.cuisines?.[0]?.toLowerCase() || cuisine;
        
        const mealData = {
          name: translatedName,
          description: `Receita ${recipeCuisine} do Spoonacular`,
          meal_type: getMealType(recipe.dishTypes || []),
          compatible_meal_times: getCompatibleMealTimes(recipe.dishTypes || []),
          calories: getNutrient(nutrients, 'Calories'),
          protein: getNutrient(nutrients, 'Protein'),
          carbs: getNutrient(nutrients, 'Carbohydrates'),
          fat: getNutrient(nutrients, 'Fat'),
          prep_time: recipe.readyInMinutes || 30,
          ingredients: ingredients,
          image_url: recipe.image,
          source_url: recipe.sourceUrl,
          source_name: recipe.sourceName || 'Spoonacular',
          country_code: CUISINE_TO_COUNTRY[recipeCuisine] || CUISINE_TO_COUNTRY[cuisine] || 'US',
          language_code: translateToPortuguese ? 'pt-BR' : 'en',
          rating: recipe.spoonacularScore ? (recipe.spoonacularScore / 20) : null, // Convert 0-100 to 0-5
          rating_count: 1,
          ai_generated: false,
          is_active: true
        };

        const { data: inserted, error } = await supabase
          .from('simple_meals')
          .insert(mealData)
          .select()
          .single();

        if (error) {
          logStep('Insert error', { error: error.message, recipe: recipe.title });
          failedCount++;
        } else {
          importedMeals.push(inserted);
          logStep('Imported recipe', { name: translatedName });
        }
      } catch (recipeError: any) {
        logStep('Error processing recipe', { 
          title: recipe.title, 
          error: recipeError?.message 
        });
        failedCount++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      cuisine,
      imported: importedMeals.length,
      failed: failedCount,
      recipes: importedMeals.map(m => ({ id: m.id, name: m.name }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    logStep('Error', { message: error?.message });
    return new Response(JSON.stringify({ 
      error: error?.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
